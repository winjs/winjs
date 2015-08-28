// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
/// <reference path="../TestLib/Helper.ts"/>
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {

    "use strict";

    var Node = WinJS.Class.define(function (data) {
        this.data = data;
    });
    WinJS.Class.mix(Node, WinJS.Utilities._linkedListMixin("Node"));

    function assertSequenceEquals(a, b) {
        LiveUnit.Assert.areEqual(a.length, b.length);
        var i, len;
        for (i = 0, len = a.length; i < len; i++) {
            LiveUnit.Assert.isTrue(a[i] === b[i], "Element at index '" + i + "' expected to be the same");
        }
    }

    function toArray(list) {
        var array = [];
        array.push(list.data);
        while (list = list._nextNode) {
            array.push(list.data);
        }
        return array;
    }

    export class LinkedListMixin {

        testBasic() {

            var list = new Node(1);
            list._insertNodeAfter(new Node(2));
            list._insertNodeAfter(new Node(3));
            list._insertNodeAfter(new Node(4));

            assertSequenceEquals(toArray(list), [1, 4, 3, 2]);

        }

        testBasicTwo() {

            var current, list = current = new Node(1);
            current = current._insertNodeAfter(new Node(2));
            current = current._insertNodeAfter(new Node(3));
            current = current._insertNodeAfter(new Node(4));

            assertSequenceEquals(toArray(list), [1, 2, 3, 4]);

        }

        testInsertBefore() {

            var current, list = current = new Node(1);
            current = current._insertNodeBefore(new Node(2));
            current = current._insertNodeBefore(new Node(3));
            current = current._insertNodeBefore(new Node(4));

            assertSequenceEquals(toArray(list._prevNode._prevNode._prevNode), [4, 3, 2, 1]);

        }

        testRemove() {

            var current, list = current = new Node(1);
            current = current._insertNodeAfter(new Node(2));
            current = current._insertNodeAfter(new Node(3));
            current = current._insertNodeAfter(new Node(4));

            assertSequenceEquals(toArray(list), [1, 2, 3, 4]);

            list._nextNode._nextNode._removeNode();

            assertSequenceEquals(toArray(list), [1, 2, 4]);

            list._nextNode._nextNode._removeNode();

            assertSequenceEquals(toArray(list), [1, 2]);

        }

    }
}

module CorsicaTests {

    "use strict";

    var Promise = WinJS.Promise;
    var S = WinJS.Utilities.Scheduler;

    function assertSequenceEquals(a, b) {
        LiveUnit.Assert.areEqual(a.length, b.length);
        var i, len;
        for (i = 0, len = a.length; i < len; i++) {
            LiveUnit.Assert.isTrue(a[i] === b[i], "Element at index '" + i + "' expected to be the same");
        }
    }

    // Convert an Array-like object to an array. Useful when you want to treat
    //  the "arguments" local variable as an Array.
    function toArray(list) {
        return Array.prototype.slice.call(list);
    }

    function async(test, expectedExceptions?) {
        var wrappedTest = function (complete) {
            var p = test();
            if (p) {
                p
                    .then(null, function (msg) {
                        try {
                            LiveUnit.Assert.fail('There was an unhandled error in your test: ' + msg);
                        } catch (ex) {
                            // purposefully empty
                        }
                    })
                    .then(function () {
                        complete();
                    });
            } else {
                complete();
            }
        };

        if (expectedExceptions) {
            wrappedTest["LiveUnit.ExpectedException"] = expectedExceptions;
        }

        return wrappedTest;
    }

    function schedulePromise(priority) {
        var s = new WinJS._Signal();
        S.schedule(s.complete.bind(s), priority, null, "Scheduled Promise");
        return s.promise;
    }

    function immediate() {
        return new WinJS.Promise(function (c) {
            WinJS.Utilities._setImmediate(c);
        });
    }

    // Repeatedly calls fn until msecs have elapsed
    //
    function repeatForDuration(msecs, fn?) {
        var start = WinJS.Utilities._now(),
            end = start + msecs;
        while (WinJS.Utilities._now() < end) {
            if (fn) { fn(); }
        }
    }

    // Ensure that the constants for the WWA scheduler are available on MSApp in contexts
    //  where the WWA scheduler isn't available. They are needed for the mimicSchedulePump
    //  function.
    //
    var MSApp = (window['MSApp'] && window['MSApp'].HIGH ? window['MSApp'] : {
        HIGH: "high",
        NORMAL: "normal",
        IDLE: "idle"
    });

    var wwaPriorityToInt = {};
    wwaPriorityToInt[MSApp.IDLE] = 1;
    wwaPriorityToInt[MSApp.NORMAL] = 2;
    wwaPriorityToInt[MSApp.HIGH] = 3;

    function isEqualOrHigherWwaPriority(priority1, priority2) {
        return wwaPriorityToInt[priority1] >= wwaPriorityToInt[priority2];
    }

    // Useful for enumerating the WWA to WinJS priority boundaries. Calls callback
    //  with two parameters: a WinJS priority and the corresponding WWA priority.
    //  If callback returns a promise, waits for the promise to complete before
    //  calling callback again. Returns a promise which completes after the last
    //  call to callback has completed.
    //
    function forEachPriorityBoundary(callback) {
        return WinJS.Promise.wrap().then(function () {
            return callback(S.Priority.aboveNormal + 1, MSApp.HIGH);
        }).then(function () {
                return callback(S.Priority.aboveNormal, MSApp.NORMAL);
            }).then(function () {
                return callback(S.Priority.belowNormal, MSApp.NORMAL);
            }).then(function () {
                return callback(S.Priority.belowNormal - 1, MSApp.IDLE);
            });
    }

    // When the WWA scheduler is disabled, same as forEachPriorityBoundary. When
    //  it is enabled, only test WWA high priority. We do this because when using
    //  lower priority jobs, we cannot guarantee that the WinJS scheduler will not
    //  yield to high priority platform jobs that are out of our control such as layout.
    //
    function forEachPriorityBoundaryLimited(callback) {
        if (S._usingWwaScheduler) {
            return callback(S.Priority.aboveNormal + 1, MSApp.HIGH);
        } else {
            return forEachPriorityBoundary(callback);
        }
    }

    // Mimics the method that the scheduler uses for scheduling its pump with
    //  the platform. Useful for getting code to run in between calls to the
    //  scheduler pump to verify that the pump yields.
    //
    var scheduleWithHost = window.setImmediate ? window.setImmediate.bind(window) : function (callback) {
        setTimeout(callback, 16);
    };
    function mimicSchedulePump(fn, wwaPriority) {
        var ran = false;
        var runner = function () {
            if (!ran) {
                ran = true;
                fn();
            }
        };
        if (S._usingWwaScheduler) {
            MSApp.execAsyncAtPriority(runner, wwaPriority);
        } else {
            if (wwaPriority === MSApp.HIGH) {
                setTimeout(runner, 0);
            }
            scheduleWithHost(runner);
        }
    }

    // Useful for hooking the WWA scheduler's APIs which are on the MSApp object.
    //  When the WWA scheduler is enabled, calls fn and returns. Otherwise, provides
    //  the below semantics for hooking MSApp.
    //
    //  This only affects the scheduler's private version of the MSApp object. Parameters:
    //   - hooks: an object mapping MSApp function names to hook functions. Hook functions
    //     are called instead of their MSApp counterparts. Each hook function has the
    //     following signature:
    //
    //      hookFunction(originalFunction, originalArgs, ...)
    //       - originalFunction: the unhooked function
    //       - originalArgs: an Array containing the arguments with which originalFunction
    //         would have been called if it hadn't been hooked
    //       - ...: the arguments with which originalFunction would have been called
    //
    //       If you'd like your hook function to have the same behavior as its MSApp
    //       counterpart, end it with this: return originalFunction.apply(this, originalArgs);
    //
    //   - fn is the function that should be executed with the MSApp hooks in effect. If
    //     fn returns a promise, then the hooks will be removed when that promise completes.
    //     Otherwise, the hooks will be removed as soon as fn returns.
    //
    //   - options supports a forceHooksInWwa flag which, when true, will cause the hooks
    //     to be applied even when the WWA scheduler is enabled.
    //
    // Returns the return value of fn.
    //
    function withMSAppHooks(hooks, fn, options?) {
        options = options || {};
        var forceHooksInWwa = options.forceHooksInWwa;

        if (S._usingWwaScheduler && !forceHooksInWwa) {
            return fn();
        } else {
            var originalMSApp = S._MSApp,
                hookedMSApp = Object.create(originalMSApp),
                result;

            Object.keys(hooks).forEach(function (key) {
                var originalFn = originalMSApp[key];

                hookedMSApp[key] = function () {
                    var args = toArray(arguments),
                        allArgs = [originalFn, args].concat(args);
                    return hooks[key].apply(hookedMSApp, allArgs);
                };
            });

            try {
                S._MSApp = hookedMSApp;
                result = fn();
            } finally {
                return WinJS.Promise.as(result).then(function (value) {
                    S._MSApp = originalMSApp;
                    return value;
                }, function (error) {
                        S._MSApp = originalMSApp;
                        return WinJS.Promise.wrapError(error);
                    });
            }
        }
    }

    function verifyDump(description, expected) {
        LiveUnit.Assert.areEqual(expected, S.retrieveState(), "S.retrieveState() returned unexpected string: " + description);
    }

    var origUsingWwaScheduler;

    // @TODO: tests of .completed
    // @TODO: tests for exception scenario - verify that the queue doesn't stall
    // @TODO: tests for verifying that a yield occurs within a reasonable timeframe (how to test this under varying conditions)?
    // @TODO: tests for illegal priorities - should clamp
    // @TODO: tests for passing a non-function as a work item - should we eagerly throw or blow up later or ignore?
    // @TODO: Test scenarios where pieces of the scheduler are re-entered. We can do this by doing an action in the 2nd list
    //        from within the context of an item in the 1st list:
    //          1. User code that is called into from the scheduler:
    //            - work functions
    //            - drain request promise callbacks (success and cancelation handlers)
    //          2. How can user code enter the scheduler?:
    //            - calling S.schedule
    //            - calling S.requestDrain
    //            - canceling a drain request
    //
    export class Scheduler {


        setUp() {
            origUsingWwaScheduler = S._usingWwaScheduler;
        }

        tearDown() {
            S._usingWwaScheduler = origUsingWwaScheduler;
        }

        testBasic = async(function () {
            var count = 0;
            S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(1, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testJobMetaData = async(function () {
            var count = 0;
            var job = S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                LiveUnit.Assert.areEqual(10, this.x, "incorrect thisArg");
                LiveUnit.Assert.areEqual("TestJob", job.name, "incorrect job name");
                LiveUnit.Assert.areEqual(winjs, job.owner, "incorrect job owner");
            }, S.Priority.normal, { x: 10 }, "");

            var winjs = S.createOwnerToken();
            job.owner = winjs;
            job.name = "TestJob";

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(1, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies that a job info's properties throw when they are used after the job info
        //  object is no longer valid. A job info object becomes invalid as soon as the job's
        //  work function returns.
        //
        testJobInfoOutOfContext = async(function () {
            var signal = new WinJS._Signal();
            var count = 0;

            function verifyThrowsWhenOutOfContext(work) {
                S.schedule(function (jobInfo) {
                    WinJS.Promise.timeout().then(function () {
                        try {
                            work(jobInfo);
                            LiveUnit.Assert.fail("The work function should have thrown due to using jobInfo out of context");
                        } catch (error) {
                            LiveUnit.Assert.areEqual("WinJS.Utilities.Scheduler.JobInfoIsNoLongerValid", error.name);
                            count++;
                        }
                    });
                });
            }

            function moreWork() {
                LiveUnit.Assert.fail("This function shouldn't have run");
            }

            verifyThrowsWhenOutOfContext(function (jobInfo) {
                jobInfo.job;
            });
            verifyThrowsWhenOutOfContext(function (jobInfo) {
                jobInfo.shouldYield;
            });
            verifyThrowsWhenOutOfContext(function (jobInfo) {
                jobInfo.setWork(moreWork);
            });
            verifyThrowsWhenOutOfContext(function (jobInfo) {
                S.schedule(function () {
                    signal.complete();
                });

                jobInfo.setPromise(WinJS.Promise.timeout().then(function () {
                    return moreWork;
                }));
            });

            return signal.promise.then(function () {
                LiveUnit.Assert.areEqual(4, count);
            });
        });

        testMultipleJobsAtSameLevel = async(function () {
            var count = 0;
            S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
            });
            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            });
            S.schedule(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testBasicPriorityLevels = async(function () {
            var count = 0;
            S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
            }, S.Priority.high);
            S.schedule(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            }, S.Priority.normal);
            S.schedule(function () {
                LiveUnit.Assert.areEqual(4, count);
                count++;
            }, S.Priority.idle);
            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            }, S.Priority.high);
            S.schedule(function () {
                LiveUnit.Assert.areEqual(3, count);
                count++;
            }, S.Priority.normal);
            S.schedule(function () {
                LiveUnit.Assert.areEqual(5, count);
                count++;
            }, S.Priority.idle);

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(6, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testAdvancedPriorityLevels = async(function () {
            var count = 0;
            S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
            }, S.Priority.high);
            S.schedule(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            }, S.Priority.normal);
            S.schedule(function () {
                LiveUnit.Assert.areEqual(4, count);
                count++;
            }, S.Priority.idle);
            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            }, S.Priority.high - 1);
            S.schedule(function () {
                LiveUnit.Assert.areEqual(3, count);
                count++;
            }, S.Priority.normal - 1);
            S.schedule(function () {
                LiveUnit.Assert.areEqual(5, count);
                count++;
            }, S.Priority.idle - 1);

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(6, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testBasicPausing = async(function () {
            var count = 0;
            var first = S.schedule(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            });
            S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
            });
            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
                first.resume();
            });

            first.pause();

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
                LiveUnit.Assert.isTrue(first.completed);
            });
        });

        testBasicYielding = async(function () {
            var count = 0;

            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                // Since this is scheduled at the same priority as the yielding job in which
                //  it is scheduled it will run after.
                //
                S.schedule(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                });
                LiveUnit.Assert.areEqual(1, count);
                info.setWork(function () {
                    LiveUnit.Assert.areEqual(1, count);
                    count++;
                });
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testChangePriorityWhileYielding = async(function () {
            var count = 0;

            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;

                // this should be executed after setWork of current job
                S.schedule(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                }, S.Priority.high);

                // make yourself high priority
                info.job.priority = S.Priority.max;

                info.setWork(function (info1) {
                    LiveUnit.Assert.areEqual(1, count);
                    count++;
                    // change priority to normal
                    info1.job.priority = S.Priority.normal;
                    info1.setWork(function () {
                        LiveUnit.Assert.areEqual(4, count);
                        count++;
                    });
                });
            });

            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(3, count);
                count++;
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(5, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testYieldingWithSetWork = async(function () {
            var count = 0;
            var iter = 0;
            WinJS.Utilities.startLog();
            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                // Since this is scheduled at the same priority as the yielding job in which
                //  it is scheduled it will run after.
                //
                S.schedule(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    LiveUnit.Assert.areEqual(10, iter)
                count++;
                });
                LiveUnit.Assert.areEqual(1, count);

                var work = function (jobInfo) {
                    if (iter < 10) {
                        iter++;
                        jobInfo.setWork(work);
                    }
                }

            info.setWork(work);
                count++;
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.areEqual(10, iter);
                LiveUnit.Assert.isTrue(S._isEmpty);
                WinJS.Utilities.stopLog();
            });
        });

        testStopAfterExceptionWhileYielding = async(function () {
            var count = 0;
            var iter = 0;
            WinJS.Utilities.startLog();
            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                // Since this is scheduled at the same priority as the yielding job in which
                //  it is scheduled it will run after.
                //
                S.schedule(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    LiveUnit.Assert.areEqual(2, iter)
                count++;
                });
                LiveUnit.Assert.areEqual(1, count);

                var work = function (jobInfo) {
                    if (iter === 2) {
                        jobInfo.setWork(work);
                        throw new Error("Exception from yielding job");
                    }

                    if (iter < 10) {
                        // this shouldn't be hit after exception
                        if (iter >= 2)
                            LiveUnit.Assert.fail("This shouldn't have been hit");
                        iter++;
                        jobInfo.setWork(work);
                    }
                }

            info.setWork(work);
                count++;
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.areEqual(2, iter);
                LiveUnit.Assert.isTrue(S._isEmpty);
                WinJS.Utilities.stopLog();
            });
        }, [{ message: "Exception from yielding job" }]);


        testBasicYieldingAndPauseTheYieldingJob = async(function () {
            var count = 0;

            var j = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                // Normally this would run after the yielded job since it is at the same priority level, however
                //  we are going to pause the yielding job so this will end up running first. We will then resume
                //  the job and we can see that it gets put back at the end of the queue.
                //
                S.schedule(function () {
                    j.resume();
                    LiveUnit.Assert.areEqual(1, count);
                    count++;
                });
                S.schedule(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                });
                LiveUnit.Assert.areEqual(1, count);
                // Pause the job which will mean this continuation won't run. Then resume it in the other job.
                //  We will verify that it is added to the end of the queue by adding two jobs, resuming in the
                //  first and verifying that the continuation runs in the second.
                //
                j.pause();
                info.setWork(function () {
                    LiveUnit.Assert.areEqual(3, count);
                    count++;
                });
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(4, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
                LiveUnit.Assert.isTrue(j.completed);
            });
        });

        testBasicCancelation = async(function () {
            var count = 0;

            var j = S.schedule(function () {
                LiveUnit.Assert.fail("Should not be here");
            });

            j.cancel();

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(0, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
                LiveUnit.Assert.isFalse(j.completed);
            });
        });

        testCancelationOnceQueueStartsRunning = async(function () {
            var count = 0;
            var j;

            S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                j.cancel();
            });
            j = S.schedule(function () {
                LiveUnit.Assert.fail("Should not be here");
                count++;
            });
            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(2, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
                LiveUnit.Assert.isFalse(j.completed);
            });
        });

        testNoOpAfterCancelation = async(function () {
            var count = 0;

            var j = S.schedule(function () {
                LiveUnit.Assert.fail("Should not be here");
            });

            j.cancel();
            j.resume();
            j.pause();
            j.cancel();
            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(0, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
                LiveUnit.Assert.isFalse(j.completed);
            });
        });

        testShouldYieldAfterHighPriJobSchedule = async(function () {
            var count = 0;

            var j = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                // schedule high pri job and this should set shouldYield to true
                var j1 = S.schedule(function (info1) {
                    LiveUnit.Assert.areEqual(1, count);
                    count++;
                    LiveUnit.Assert.isFalse(info1.shouldYield);
                }, S.Priority.high);

                LiveUnit.Assert.isTrue(info.shouldYield);
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(2, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testShouldYieldAfterLowPriJobSchedule = async(function () {
            var count = 0;

            var j = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                // schedule low pri job and this shouldn't change shouldYield
                var j1 = S.schedule(function (info) {
                    LiveUnit.Assert.areEqual(1, count);
                    count++;
                    LiveUnit.Assert.isFalse(info.shouldYield);
                });
                LiveUnit.Assert.isFalse(info.shouldYield);
            }, S.Priority.high);

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(2, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testHighPriJobBetweenLowPriJobs = async(function () {
            var count = 0;
            var signal = new WinJS._Signal();

            // schedule max job between two high pri jobs and verify max job runs after first high job
            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                // schedule max winjs job
                S.schedule(function (info) {
                    LiveUnit.Assert.areEqual(1, count);
                    count++;
                    LiveUnit.Assert.isFalse(info.shouldYield);
                }, S.Priority.max);

                LiveUnit.Assert.isTrue(info.shouldYield);
            }, S.Priority.high);

            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            }, S.Priority.high);

            // schedule platform job but this would be running below winjs max priority
            mimicSchedulePump(function () {
                LiveUnit.Assert.areEqual(3, count);
                count++;
                signal.complete();
            }, "high");

            return signal.promise.then(function () {
                LiveUnit.Assert.areEqual(4, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testHighPriJobBetweenLowPriYieldingJobs = async(function () {
            var count = 0;
            // schedule max winjs job and exhaust its time slice to yield to platform job
            var j = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                // schedule high pri job and this should set shouldYield to true
                var j1 = S.schedule(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                }, S.Priority.max);

                LiveUnit.Assert.isTrue(info.shouldYield);
                // exhaust its time slice so that it would yield to platform
                repeatForDuration(S._TIME_SLICE + 10);
            }, S.Priority.high);

            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(3, count);
                count++;
            }, S.Priority.high);

            mimicSchedulePump(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            }, "high");

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(4, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testGetRightArgumentsInWorkFunction = async(function () {
            var count = 0;

            var j = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;

                LiveUnit.Assert.areEqual("boolean", typeof info.shouldYield);
                LiveUnit.Assert.areEqual(j, info.job);
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(1, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testShouldYieldReturnsTrueAfterSelfCancel = async(function () {
            var count = 0;

            var job = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                LiveUnit.Assert.isFalse(info.shouldYield);
                info.job.cancel();
                LiveUnit.Assert.isTrue(info.shouldYield);
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(1, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
                LiveUnit.Assert.isFalse(job.completed);
            });
        });

        testShouldYieldReturnsTrueAfterSelfPause = async(function () {
            var count = 0;

            var job = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                LiveUnit.Assert.isFalse(info.shouldYield);
                // Note that pausing a job and then letting go of it has the same effect as
                //  canceling it since you no longer have the token with which to resume.
                //
                info.job.pause();
                LiveUnit.Assert.isTrue(info.shouldYield);
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(1, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
                LiveUnit.Assert.isTrue(job.completed);
            });
        });

        testThrottling = async(function () {
            var count = 0;

            var job = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                var iters = 0;
                while (!info.shouldYield) {
                    iters++;
                }
                // Should eventually reach here and complete. Failure mode is test timeout.
                //
                LiveUnit.Assert.isTrue(iters > 0);
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(1, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
                LiveUnit.Assert.isTrue(job.completed);
            });
        });

        testYieldingAndAlsoSchedulingHigherPriorityJob = async(function () {
            var count = 0;

            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                // Since this is scheduled at a higher priority from the yielding job in which
                //  it is scheduled it will run before the yielded function
                //
                S.schedule(function () {
                    LiveUnit.Assert.areEqual(1, count);
                    count++;
                }, S.Priority.high);
                LiveUnit.Assert.areEqual(1, count);
                info.setWork(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                });
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testPriorityRelations = function () {
            LiveUnit.Assert.isTrue(S.Priority.max > S.Priority.high);
            LiveUnit.Assert.isTrue(S.Priority.high > S.Priority.aboveNormal);
            LiveUnit.Assert.isTrue(S.Priority.aboveNormal > S.Priority.normal);
            LiveUnit.Assert.isTrue(S.Priority.normal > S.Priority.belowNormal);
            LiveUnit.Assert.isTrue(S.Priority.belowNormal > S.Priority.idle);
            LiveUnit.Assert.isTrue(S.Priority.idle > S.Priority.min);
        }

    testReprioritization = async(function () {
            var count = 0;

            var j0 = S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
            });
            var j1 = S.schedule(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            });
            var j2 = S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            });

            // Should NOT affect ordering
            j0.priority = j0.priority;

            // Should move this to the back of the queue;
            j1.priority = S.Priority.high;
            j1.priority = S.Priority.normal;

            // End result is we expect j0, j2, j1

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testReprioritizationBetweenStates = async(function () {
            var count = 0;

            var j0 = S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            });
            var j1 = S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
            });
            var j2 = S.schedule(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            });

            j1.pause();
            j1.priority = S.Priority.high;
            j1.resume();

            // End result is we expect j1, j0, j2

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });


        // Verifies that the scheduler doesn't schedule its pump while pumping.
        //  Instead, it schedules its pump immediately before yielding if necessary.
        // Regression test for WinBlue#143089.
        //
        testDontSchedulePumpWhilePumping = async(function () {
            var count = 0;

            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;

                // After running this job, the WinJS scheduler should yield
                //  giving the "mimicSchedulePump" callback a chance to run.
                //
                S.schedule(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                    repeatForDuration(S._TIME_SLICE + 10);
                }, S.Priority.high);

                S.schedule(function () {
                    LiveUnit.Assert.areEqual(4, count);
                    count++;
                }, S.Priority.high);

                mimicSchedulePump(function () {
                    LiveUnit.Assert.areEqual(3, count);
                    count++;
                }, MSApp.HIGH);
            }, S.Priority.normal);

            LiveUnit.Assert.areEqual(0, count);
            count++;

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(5, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies that execHigh:
        //  - calls its callback thru execAtPriority with priority=MSApp.HIGH
        //    exactly 1 time
        //  - returns the return value of its callback
        //
        testExecHigh = async(function () {
            S._usingWwaScheduler = false;

            function return4() {
                LiveUnit.Assert.areEqual(0, return4Called);
                return4Called++;
                return 4;
            }

            var return4Called = 0;
            var execAtPriorityCalled = 0;

        return withMSAppHooks({
                execAtPriority: function (origFn, args, callback, priority) {
                    if (callback === return4) {
                        LiveUnit.Assert.areEqual(0, execAtPriorityCalled);
                        execAtPriorityCalled++;
                        LiveUnit.Assert.areEqual(MSApp.HIGH, priority);
                    }
                    return origFn.apply(this, args);
                }
            }, function () {
                    var returnValue = S.execHigh(return4);

                    LiveUnit.Assert.areEqual(4, returnValue,
                        "execHigh should have returned the return value of the callback");
                    LiveUnit.Assert.areEqual(1, return4Called, "return4 should have been called exactly 1 time");
                    LiveUnit.Assert.areEqual(1, execAtPriorityCalled,
                        "execAtPriority should have been called exactly 1 time for return4");
                    LiveUnit.Assert.isTrue(S._isEmpty);
                })
    });



        // Verifies that scheduled jobs get executed thru execAtPriority at the
        //  appropriate priority. The workFunction and execAtPriority should get
        //  called exactly 1 time.
        //
        testPriorityContextOfScheduledJob = async(function () {
            S._usingWwaScheduler = false;

            function test(winjsPriority, wwaPriority) {
                function workFunction() {
                    LiveUnit.Assert.areEqual(0, workFunctionCalled);
                    workFunctionCalled++;
                }

                var workFunctionCalled = 0;
                var execAtPriorityCalled = 0;

            return withMSAppHooks({
                    execAtPriority: function (origFn, args, callback, priority) {
                        if (execAtPriorityCalled === 0) {
                            // This should be the workFunction
                            //
                            LiveUnit.Assert.areEqual(0, execAtPriorityCalled);
                            execAtPriorityCalled++;
                            LiveUnit.Assert.areEqual(wwaPriority, priority);
                        } else {
                            // This should be the function scheduled at Priority.min
                            //  which does the final test verification.
                            //
                            LiveUnit.Assert.areEqual(1, execAtPriorityCalled);
                            execAtPriorityCalled++;
                            LiveUnit.Assert.areEqual(MSApp.IDLE, priority);
                        }
                        return origFn.apply(this, args);
                    }
                }, function () {
                        S.schedule(workFunction, winjsPriority);

                        return schedulePromise(S.Priority.min).then(function () {
                            LiveUnit.Assert.areEqual(1, workFunctionCalled);
                            LiveUnit.Assert.areEqual(2, execAtPriorityCalled);
                            LiveUnit.Assert.isTrue(S._isEmpty);
                        });
                    })
        }

            return forEachPriorityBoundary(test);
        });



        // Verifies that when the WinJS scheduler and the WWA scheduler have equally
        //  important jobs to run, the WinJS scheduler does not yield to the platform.
        //
        testDontYieldToPlatformJob = async(function () {
            // When converted to a WWA priority, priorityOfWinjsJob
            //  should equal priorityOfPlatformJob.
            //
            function test(priorityOfWinjsJob, priorityOfPlatformJob) {
                var platformJobQueued = false;
                var signal = new WinJS._Signal();

                return withMSAppHooks({
                    isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                        return platformJobQueued && isEqualOrHigherWwaPriority(priorityOfPlatformJob, priority);
                    }
                }, function () {
                        var count = 0;

                        // This outer job is needed to ensure that the WinJS scheduler
                        //  gets to run before the platform job.
                        //
                        S.schedule(function () {
                            S.schedule(function () {
                                LiveUnit.Assert.areEqual(1, count);
                                count++;
                            }, priorityOfWinjsJob);

                            mimicSchedulePump(function () {
                                platformJobQueued = false;
                                LiveUnit.Assert.areEqual(2, count);
                                count++;
                                signal.complete();
                            }, priorityOfPlatformJob);
                            platformJobQueued = true;

                            LiveUnit.Assert.areEqual(0, count);
                            count++;
                        }, priorityOfWinjsJob);

                        return signal.promise.then(function () {
                            LiveUnit.Assert.areEqual(3, count);
                            LiveUnit.Assert.isTrue(S._isEmpty);
                        });
                    });
            }

            return forEachPriorityBoundaryLimited(test);
        });

        // Same as testDontYieldToPlatformJob but scheduler is run due to a drain
        //  started from outside of the scheduler.
        //
        testDontYieldToPlatformJobInExternalDrain = async(function () {
            // When converted to a WWA priority, priorityOfWinjsJob
            //  should equal priorityOfPlatformJob.
            //
            function test(priorityOfWinjsJob, priorityOfPlatformJob) {
                var platformJobQueued = false;
                var signal = new WinJS._Signal();

                return withMSAppHooks({
                    isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                        return platformJobQueued && isEqualOrHigherWwaPriority(priorityOfPlatformJob, priority);
                    }
                }, function () {
                        var count = 0;

                        S.schedule(function () {
                            LiveUnit.Assert.areEqual(1, count);
                            count++;
                        }, priorityOfWinjsJob);

                        mimicSchedulePump(function () {
                            platformJobQueued = false;
                            LiveUnit.Assert.areEqual(3, count);
                            count++;
                            signal.complete();
                        }, priorityOfPlatformJob);
                        platformJobQueued = true;

                        S.requestDrain(priorityOfWinjsJob).then(function () {
                            LiveUnit.Assert.areEqual(2, count);
                            count++;
                        });

                        LiveUnit.Assert.areEqual(0, count);
                        count++;

                        return signal.promise.then(function () {
                            LiveUnit.Assert.areEqual(4, count);
                            LiveUnit.Assert.isTrue(S._isEmpty);
                        });
                    });
            }

            return forEachPriorityBoundaryLimited(test);
        });

        // Same as testDontYieldToPlatformJob but scheduler is run due to a drain
        //  started from inside of a job.
        //
        testDontYieldToPlatformJobInInternalDrain = async(function () {
            // When converted to a WWA priority, priorityOfWinjsJob
            //  should equal priorityOfPlatformJob.
            //
            function test(priorityOfWinjsJob, priorityOfPlatformJob) {
                var platformJobQueued = false;
                var signal = new WinJS._Signal();

                return withMSAppHooks({
                    isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                        return platformJobQueued && isEqualOrHigherWwaPriority(priorityOfPlatformJob, priority);
                    }
                }, function () {
                        var count = 0;

                        S.schedule(function () {
                            S.schedule(function () {
                                LiveUnit.Assert.areEqual(1, count);
                                count++;
                            }, priorityOfWinjsJob);

                            mimicSchedulePump(function () {
                                platformJobQueued = false;
                                LiveUnit.Assert.areEqual(3, count);
                                count++;
                                signal.complete();
                            }, priorityOfPlatformJob);
                            platformJobQueued = true;

                            S.requestDrain(priorityOfWinjsJob).then(function () {
                                LiveUnit.Assert.areEqual(2, count);
                                count++;
                            });

                            LiveUnit.Assert.areEqual(0, count);
                            count++;
                        }, priorityOfWinjsJob);

                        return signal.promise.then(function () {
                            LiveUnit.Assert.areEqual(4, count);
                            LiveUnit.Assert.isTrue(S._isEmpty);
                        });
                    });
            }

            return forEachPriorityBoundaryLimited(test);
        });

        // Verifies that when a platform job is scheduled within a WinJS job at
        //  the same priority as the WinJS job, the WinJS scheduler does not yield.
        //
        testSchedulePlatformJobInJobDontYield = async(function () {
            // When converted to a WWA priority, priorityOfWinjsJob
            //  should equal priorityOfPlatformJob.
            //
            function test(priorityOfWinjsJob, priorityOfPlatformJob) {
                var platformJobQueued = false;
                var signal = new WinJS._Signal();

                return withMSAppHooks({
                    isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                        return platformJobQueued && isEqualOrHigherWwaPriority(priorityOfPlatformJob, priority);
                    }
                }, function () {
                        var count = 0;

                        // A WinJS job that schedules a platform job at the same priority
                        //
                        S.schedule(function (info) {
                            mimicSchedulePump(function () {
                                platformJobQueued = false;
                                LiveUnit.Assert.areEqual(3, count);
                                count++;
                                signal.complete();
                            }, priorityOfPlatformJob);
                            platformJobQueued = true;

                            LiveUnit.Assert.isFalse(info.shouldYield);
                            LiveUnit.Assert.areEqual(1, count);
                            count++;
                        }, priorityOfWinjsJob);

                        // A WinJS job that should run before the platform job
                        //
                        S.schedule(function () {
                            LiveUnit.Assert.areEqual(2, count);
                            count++;
                        }, priorityOfWinjsJob);

                        LiveUnit.Assert.areEqual(0, count);
                        count++;

                        return signal.promise.then(function () {
                            LiveUnit.Assert.areEqual(4, count);
                            LiveUnit.Assert.isTrue(S._isEmpty);
                        });
                    });
            }

            return forEachPriorityBoundaryLimited(test);
        });

        // Verifies that the WinJS scheduler yields to the platform when the WWA
        //  scheduler has a more important job to run.
        //
        testYieldToPlatformJob = async(function () {
            var platformJobQueued = false;

            return withMSAppHooks({
                isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                    // The platform job is high priority so as long as it is queued,
                    //  this function should return true.
                    //
                    return platformJobQueued;
                }
            }, function () {
                    var count = 0;

                    S.schedule(function () {
                        LiveUnit.Assert.areEqual(2, count);
                        count++;
                    }, S.Priority.normal);

                    mimicSchedulePump(function () {
                        platformJobQueued = false;
                        LiveUnit.Assert.areEqual(1, count);
                        count++;
                    }, MSApp.HIGH);
                    platformJobQueued = true;

                    LiveUnit.Assert.areEqual(0, count);
                    count++;

                    return schedulePromise(S.Priority.min).then(function () {
                        LiveUnit.Assert.areEqual(3, count);
                        LiveUnit.Assert.isTrue(S._isEmpty);
                    });
                });
        });

        // Same as testYieldToPlatformJob but scheduler is run due to a drain
        //  started from outside of the scheduler.
        //
        testYieldToPlatformJobInExternalDrain = async(function () {
            var platformJobQueued = false;

            return withMSAppHooks({
                isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                    // The platform job is high priority so as long as it is queued,
                    //  this function should return true.
                    //
                    return platformJobQueued;
                }
            }, function () {
                    var count = 0;

                    S.schedule(function () {
                        LiveUnit.Assert.areEqual(2, count);
                        count++;
                    }, S.Priority.normal);

                    mimicSchedulePump(function () {
                        platformJobQueued = false;
                        LiveUnit.Assert.areEqual(1, count);
                        count++;
                    }, MSApp.HIGH);
                    platformJobQueued = true;

                    S.requestDrain(S.Priority.normal).then(function () {
                        LiveUnit.Assert.areEqual(3, count);
                        count++;
                    });

                    LiveUnit.Assert.areEqual(0, count);
                    count++;

                    return schedulePromise(S.Priority.min).then(function () {
                        LiveUnit.Assert.areEqual(4, count);
                        LiveUnit.Assert.isTrue(S._isEmpty);
                    });
                });
        });

        // Same as testYieldToPlatformJob but scheduler is run due to a drain
        //  started from inside of a job.
        //
        testYieldToPlatformJobInInternalDrain = async(function () {
            var platformJobQueued = false;

            return withMSAppHooks({
                isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                    // The platform job is high priority so as long as it is queued,
                    //  this function should return true.
                    //
                    return platformJobQueued;
                }
            }, function () {
                    var count = 0;

                    S.schedule(function () {
                        S.schedule(function () {
                            LiveUnit.Assert.areEqual(2, count);
                            count++;
                        }, S.Priority.normal);

                        mimicSchedulePump(function () {
                            platformJobQueued = false;
                            LiveUnit.Assert.areEqual(1, count);
                            count++;
                        }, MSApp.HIGH);
                        platformJobQueued = true;

                        S.requestDrain(S.Priority.normal).then(function () {
                            LiveUnit.Assert.areEqual(3, count);
                            count++;
                        });

                        LiveUnit.Assert.areEqual(0, count);
                        count++;
                    });

                    return schedulePromise(S.Priority.min).then(function () {
                        LiveUnit.Assert.areEqual(4, count);
                        LiveUnit.Assert.isTrue(S._isEmpty);
                    });
                });
        });

        // Verifies that when a platform job is scheduled within a WinJS job at
        //  a higher priority than the WinJS job, the WinJS scheduler yields.
        //
        testSchedulePlatformJobInJobYield = async(function () {
            var platformJobQueued = false;

            return withMSAppHooks({
                isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                    // The platform job is high priority so as long as it is queued,
                    //  this function should return true.
                    //
                    return platformJobQueued;
                }
            }, function () {
                    var count = 0;

                    // A WinJS job that schedules a platform job at a higher priority
                    //
                    S.schedule(function (info) {
                        LiveUnit.Assert.isFalse(info.shouldYield);
                        mimicSchedulePump(function () {
                            platformJobQueued = false;
                            LiveUnit.Assert.areEqual(2, count);
                            count++;
                        }, MSApp.HIGH);
                        platformJobQueued = true;
                        LiveUnit.Assert.isTrue(info.shouldYield);

                        LiveUnit.Assert.areEqual(1, count);
                        count++;
                    }, S.Priority.normal);

                    // A WinJS job that should run after the platform job
                    //
                    S.schedule(function () {
                        LiveUnit.Assert.areEqual(3, count);
                        count++;
                    }, S.Priority.normal);

                    LiveUnit.Assert.areEqual(0, count);
                    count++;

                    return schedulePromise(S.Priority.min).then(function () {
                        LiveUnit.Assert.areEqual(4, count);
                        LiveUnit.Assert.isTrue(S._isEmpty);
                    });
                });
        });

        // Verifies that when the WinJS scheduler and the WWA scheduler start off with
        //  equally important jobs but the high priority WinJS job gets canceled, the
        //  WinJS scheduler yields to the platform.
        //
        testYieldToPlatformJobWithCancel = async(function () {
            var platformJobQueued = false;

            return withMSAppHooks({
                isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                    // The platform job is high priority so as long as it is queued,
                    //  this function should return true.
                    //
                    return platformJobQueued;
                }
            }, function () {
                    var count = 0;

                    var jobHigh = S.schedule(function () {
                        LiveUnit.Assert.fail("This job shouldn't run due to cancellation");
                    }, S.Priority.high);

                    S.schedule(function () {
                        LiveUnit.Assert.areEqual(2, count);
                        count++;
                    }, S.Priority.normal);

                    mimicSchedulePump(function () {
                        platformJobQueued = false;
                        LiveUnit.Assert.areEqual(1, count);
                        count++;
                    }, MSApp.HIGH);
                    platformJobQueued = true;

                    jobHigh.cancel();

                    LiveUnit.Assert.areEqual(0, count);
                    count++;

                    return schedulePromise(S.Priority.min).then(function () {
                        LiveUnit.Assert.areEqual(3, count);
                        LiveUnit.Assert.isTrue(S._isEmpty);
                    });
                });
        });

        // Verifies that when the WinJS scheduler and the WWA scheduler each have
        //  multiple jobs at different priorities, they get run in the proper order.
        //
        testYieldToPlatformJobMultiple = async(function () {
            var priorityOfPlatformJob;
            var signal = new WinJS._Signal();

            return withMSAppHooks({
                isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                    // The platform job is high priority so as long as it is queued,
                    //  this function should return true.
                    //
                    return priorityOfPlatformJob && isEqualOrHigherWwaPriority(priorityOfPlatformJob, priority);
                }
            }, function () {
                    var count = 0;

                    // We cannot guarantee the relative ordering of WinJS jobs and WWA jobs
                    //  of equal priority. Consequently, we just verify that jobs at different
                    //  priorities run in the correct order.
                    //
                    function assertHigh() {
                        LiveUnit.Assert.isTrue(count >= 1 && count <= 2);
                    }
                    function assertNormal() {
                        LiveUnit.Assert.isTrue(count >= 3 && count <= 5);
                    }
                    function assertIdle() {
                        LiveUnit.Assert.isTrue(count >= 6 && count <= 8);
                    }

                    // Maps to MSApp.HIGH
                    //
                    S.schedule(function () {
                        assertHigh();
                        count++;
                    }, S.Priority.aboveNormal + 1);

                    // These map to MSApp.NORMAL
                    //

                    S.schedule(function () {
                        assertNormal();
                        count++;
                    }, S.Priority.aboveNormal);

                    S.schedule(function () {
                        assertNormal();
                        count++;
                    }, S.Priority.belowNormal);

                    // These map to MSApp.IDLE
                    //

                    S.schedule(function () {
                        assertIdle();
                        count++;
                        if (count === 9) {
                            signal.complete();
                        }
                    }, S.Priority.belowNormal - 1);

                    S.schedule(function () {
                        assertIdle();
                        count++;
                        if (count === 9) {
                            signal.complete();
                        }
                    }, S.Priority.min);

                    // 1 platform job for each WWA priority. Rather than scheduling all of the
                    //  platform jobs up front, each platform job schedules the next platform
                    //  job. This is to ensure that the WinJS scheduler's pump runs in
                    //  between platform jobs.
                    //

                    function scheduleHighPlatformJob() {
                        mimicSchedulePump(function () {
                            scheduleNormalPlatformJob();
                            priorityOfPlatformJob = MSApp.NORMAL;

                            assertHigh();
                            count++;
                        }, MSApp.HIGH);
                    }

                    function scheduleNormalPlatformJob() {
                        mimicSchedulePump(function () {
                            scheduleIdlePlatformJob();
                            priorityOfPlatformJob = MSApp.IDLE;

                            assertNormal();
                            count++;
                        }, MSApp.NORMAL);
                    }

                    function scheduleIdlePlatformJob() {
                        mimicSchedulePump(function () {
                            priorityOfPlatformJob = null;

                            assertIdle();
                            count++;
                            if (count === 9) {
                                signal.complete();
                            }
                        }, MSApp.IDLE);
                    }

                    scheduleHighPlatformJob();
                    priorityOfPlatformJob = MSApp.HIGH;

                    LiveUnit.Assert.areEqual(0, count);
                    count++;

                    return signal.promise.then(function () {
                        LiveUnit.Assert.areEqual(9, count);
                        LiveUnit.Assert.isTrue(S._isEmpty);
                    });
                });
        });

        //
        // Scheduler.createOwnerToken and cancelAll tests
        //

        // Verifies cancel by owner when called from outside of any job
        //
        testCancelByOwnerOutsideJob = async(function () {
            var count = 0;
            var runMeToken = S.createOwnerToken();
            var cancelMeToken = S.createOwnerToken();

            var j0 = S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
            }, S.Priority.high);
            j0.owner = runMeToken;

            var j1 = S.schedule(function () {
                LiveUnit.Assert.fail("This job should have been canceled");
            });
            j1.owner = cancelMeToken;

            var j2 = S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            });
            j2.owner = runMeToken;

            var j3 = S.schedule(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            }, S.Priority.idle);
            j3.owner = runMeToken;

            var j4 = S.schedule(function () {
                LiveUnit.Assert.fail("This job should have been canceled");
            });
            j4.owner = cancelMeToken;

            cancelMeToken.cancelAll();

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies cancel by owner when called from within a job that does not belong to owner
        //
        testCancelByOwnerInsideUnownedJob = async(function () {
            var count = 0;
            var runMeToken = S.createOwnerToken();
            var cancelMeToken = S.createOwnerToken();

            var j0 = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                LiveUnit.Assert.isFalse(info.shouldYield);
                cancelMeToken.cancelAll();
                LiveUnit.Assert.isFalse(info.shouldYield, "Job should not have been canceled and shouldn't have to yield");
            });
            j0.owner = runMeToken;

            var j1 = S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            });
            j1.owner = runMeToken;

            var j2 = S.schedule(function () {
                LiveUnit.Assert.fail("This job should have been canceled");
            });
            j2.owner = cancelMeToken;

            var j3 = S.schedule(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            });
            j3.owner = runMeToken;

            var j4 = S.schedule(function () {
                LiveUnit.Assert.fail("This job should have been canceled");
            });
            j4.owner = cancelMeToken;

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies cancel by owner when called from within a job that belongs to owner. The running
        //  job should be asked to yield.
        //
        testCancelByOwnerInsideOwnedJob = async(function () {
            var count = 0;
            var runMeToken = S.createOwnerToken();
            var cancelMeToken = S.createOwnerToken();

            var j0 = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                LiveUnit.Assert.isFalse(info.shouldYield);
                cancelMeToken.cancelAll();
                LiveUnit.Assert.isTrue(info.shouldYield, "Job should have been canceled and should be asked to yield");
            });
            j0.owner = cancelMeToken;

            var j1 = S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            });
            j1.owner = runMeToken;

            var j2 = S.schedule(function () {
                LiveUnit.Assert.fail("This job should have been canceled");
            });
            j2.owner = cancelMeToken;

            var j3 = S.schedule(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            });
            j3.owner = runMeToken;

            var j4 = S.schedule(function () {
                LiveUnit.Assert.fail("This job should have been canceled");
            });
            j4.owner = cancelMeToken;

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testCancelMoreThanOneJobOfOwner = async(function () {
            var count = 0;
            var rneela = S.createOwnerToken();
            WinJS.Utilities.startLog();
            var j1 = S.schedule(function () {
                LiveUnit.Assert.fail("This job should have been canceled");
            });
            j1.owner = rneela;

            var j2 = S.schedule(function () {
                LiveUnit.Assert.fail("This job should have been canceled");
            });
            j2.owner = rneela;

            var j3 = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                info.setWork(function () {
                    rneela.cancelAll();
                });
            }, S.Priority.high);
            j3.owner = rneela;

            var j4 = S.schedule(function () {
                LiveUnit.Assert.fail("This job should have been canceled");
            }, S.Priority.high);
            j4.owner = rneela;

            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            }, S.Priority.idle);

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(2, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
                WinJS.Utilities.stopLog();
            });

        });

        testCancelOwnerWithoutJobs = async(function () {
            var emptyOwner = S.createOwnerToken();
            var rneela = S.createOwnerToken();

            var j1 = S.schedule(function () { }); // job with no owner

            var j2 = S.schedule(function () { });
            j2.owner = rneela;

            var j3 = S.schedule(function (info) {
                info.setWork(function () { });
            }, S.Priority.high);
            j3.owner = rneela;

            var j4 = S.schedule(function () {
            }, S.Priority.high);

            S.schedule(function () {
            }, S.Priority.idle);

            // This owner doesn't have any jobs associated with it so
            //  no jobs should be canceled.
            //
            emptyOwner.cancelAll();

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.isTrue(S._isEmpty);
                LiveUnit.Assert.isTrue(j1.completed && j2.completed && j3.completed && j4.completed);
            });

        });

        testScheduleAfterCancelWithSameOwnerToken = async(function () {
            var count = 0;
            var cancelMeToken = S.createOwnerToken();

            var j1 = S.schedule(function () {
                LiveUnit.Assert.fail("This job should have been canceled");
            });
            j1.owner = cancelMeToken;

            var j2 = S.schedule(function () {
                LiveUnit.Assert.fail("This job should have been canceled");
            });
            j2.owner = cancelMeToken;

            cancelMeToken.cancelAll();

            j1 = S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
            });
            j1.owner = cancelMeToken;

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(1, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testCancelByOwnerOnJobs = async(function () {
            var count = 0;
            var cancelMeToken = S.createOwnerToken();

            var j1 = S.schedule(function () {
                LiveUnit.Assert.fail("This job should have been canceled");
            });
            j1.owner = cancelMeToken;
            j1.cancel();

            var j2 = S.schedule(function () {
                LiveUnit.Assert.fail("This job should have been canceled");
            });
            j2.owner = cancelMeToken;
            j2.pause();
            //TODO: add blocked job too
            cancelMeToken.cancelAll();

            // verify resumming cancled jobs
            j2.resume();
            j1.resume();

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(0, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        //
        // requestDrain tests
        //  An external request drain is one that is called from outside of any scheduler jobs.
        //  An internal request drain is one that is called from within a scheduler job.
        //

        // Verifies that:
        //  - requestDrain is asyncronous when called from outside the scheduler
        //
        testExternalDrain = async(function () {
            var count = 0;

            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            }, S.Priority.high);

            S.requestDrain(S.Priority.high).then(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            });

            LiveUnit.Assert.areEqual(0, count);
            count++;

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testExternalDrainWithDefaultPriority = async(function () {
            var count = 0;
            var s = new WinJS._Signal();

            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            }, S.Priority.min);

            // Default drain priority should be S.Priority.min
            //
            S.requestDrain().then(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
                s.complete();
            });

            LiveUnit.Assert.areEqual(0, count);
            count++;

            return s.promise.then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testInternalDrain = async(function () {
            var count = 0;

            S.schedule(function () {
                S.requestDrain(S.Priority.normal).then(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                });

                LiveUnit.Assert.areEqual(0, count);
                count++;
            });
            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies that a drain request made from outside of the scheduler completes
        //  asynchronously when there aren't any jobs scheduled.
        //
        testOutsideSchedulerDrainWithEmptyQueue = async(function () {
            var count = 0;
            var signal = new WinJS._Signal();

            S.requestDrain(S.Priority.aboveNormal).then(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
                signal.complete();
            });

            LiveUnit.Assert.areEqual(0, count);
            count++;

            return signal.promise.then(function () {
                LiveUnit.Assert.areEqual(2, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Like testOutsideSchedulerDrainWithEmptyQueue but there are jobs scheduled
        //  that have a lower priority than the drain request.
        //
        testOutsideSchedulerNoJobsToDrain = async(function () {
            var count = 0;

            S.schedule(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            }, S.Priority.normal);

            S.requestDrain(S.Priority.aboveNormal).then(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            });

            LiveUnit.Assert.areEqual(0, count);
            count++;

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies that making a drain request and then scheduling work to
        //  be completed within that drain request causes the work to be
        //  executed before completing the drain request.
        //
        testOutsideSchedulerDrainThenSchedule = async(function () {
            var count = 0;

            S.requestDrain(S.Priority.aboveNormal).then(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            });

            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            }, S.Priority.aboveNormal);

            LiveUnit.Assert.areEqual(0, count);
            count++;

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies that a drain request made from within the scheduler completes
        //  asynchronously when there aren't any jobs scheduled.
        //
        testWithinSchedulerDrainWithEmptyQueue = async(function () {
            function test(drainPriority) {
                var count = 0;
                var signal = new WinJS._Signal();

                S.schedule(function () {
                    S.requestDrain(drainPriority).then(function () {
                        LiveUnit.Assert.areEqual(1, count);
                        count++;
                        signal.complete();
                    });

                    LiveUnit.Assert.areEqual(0, count);
                    count++;
                }, S.Priority.normal);

                return signal.promise.then(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    LiveUnit.Assert.isTrue(S._isEmpty);
                });
            }

            // Test with drain request priorities that are higher than, equal to, and
            //  lower than that of the job from within which the drain request is made.
            //
            return WinJS.Promise.wrap().then(function () {
                return test(S.Priority.aboveNormal);
            }).then(function () {
                    return test(S.Priority.normal);
                }).then(function () {
                    return test(S.Priority.belowNormal);
                });
        });

        // Like testWithinSchedulerDrainWithEmptyQueue but there are jobs scheduled
        //  that have a lower priority than the drain request.
        //
        testWithinSchedulerNoJobsToDrain = async(function () {
            var count = 0;

            S.schedule(function () {
                S.requestDrain(S.Priority.aboveNormal).then(function () {
                    LiveUnit.Assert.areEqual(1, count);
                    count++;
                });

                LiveUnit.Assert.areEqual(0, count);
                count++;
            }, S.Priority.normal);

            S.schedule(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            }, S.Priority.normal);

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies that making a drain request and then scheduling work to
        //  be completed within that drain request causes the work to be
        //  executed before completing the drain request.
        //
        testWithinSchedulerDrainThenSchedule = async(function () {
            function test(drainPriority) {
                var count = 0;
                var signal = new WinJS._Signal();

                S.schedule(function () {
                    S.requestDrain(drainPriority).then(function () {
                        LiveUnit.Assert.areEqual(2, count);
                        count++;
                        signal.complete();
                    });

                    S.schedule(function () {
                        LiveUnit.Assert.areEqual(1, count);
                        count++;
                    }, drainPriority);

                    LiveUnit.Assert.areEqual(0, count);
                    count++;
                }, S.Priority.normal);

                return signal.promise.then(function () {
                    LiveUnit.Assert.areEqual(3, count);
                    LiveUnit.Assert.isTrue(S._isEmpty);
                });
            }

            // Test with drain request priorities that are higher than, equal to, and
            //  lower than that of the job from within which the drain request is made.
            //
            return WinJS.Promise.wrap().then(function () {
                return test(S.Priority.aboveNormal);
            }).then(function () {
                    return test(S.Priority.normal);
                }).then(function () {
                    return test(S.Priority.belowNormal);
                });
        });

        // Verifies that the scheduler's yielding policy uses an infinite timeslice
        //  when in drain mode.
        //
        testDrainNoTimeSlice = async(function () {
            var count = 0;

            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(1, count);
                count++;
                repeatForDuration(S._TIME_SLICE + 10, function () { LiveUnit.Assert.isFalse(info.shouldYield); });

            }, S.Priority.high);

            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(2, count);
                count++;
                repeatForDuration(S._TIME_SLICE + 10, function () { LiveUnit.Assert.isFalse(info.shouldYield); });
            }, S.Priority.high);

            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(3, count);
                count++;
                repeatForDuration(S._TIME_SLICE + 10, function () { LiveUnit.Assert.isFalse(info.shouldYield); });
            }, S.Priority.high);

            S.requestDrain(S.Priority.high);

            mimicSchedulePump(function () {
                LiveUnit.Assert.areEqual(4, count);
                count++;
            }, MSApp.HIGH);

            LiveUnit.Assert.areEqual(0, count);
            count++;

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(5, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies that the scheduler yielding to high proirity job
        //  when in drain mode.
        //
        testYeildingInDrain = async(function () {
            var count = 0;

            var h1 = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                repeatForDuration(S._TIME_SLICE + 10, function () { LiveUnit.Assert.isFalse(info.shouldYield); });
                h2.cancel();
                // schedule max job
                var max = S.schedule(function (info) {
                    LiveUnit.Assert.areEqual(1, count);
                    count++;
                    repeatForDuration(S._TIME_SLICE + 10, function () { LiveUnit.Assert.isFalse(info.shouldYield); });
                }, S.Priority.max);

            }, S.Priority.high);

            var h2 = S.schedule(function (info) {
                LiveUnit.Assert.fail("This job should have been canceled");
            }, S.Priority.high);
            var h3 = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(2, count);
                count++;
                repeatForDuration(S._TIME_SLICE + 10, function () { LiveUnit.Assert.isFalse(info.shouldYield); });
            }, S.Priority.high);

            S.requestDrain(S.Priority.high);

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies that the scheduler's yielding policy once again uses a finite
        //  timeslice when the drain request is canceled.
        //
        testDrainNoTimeSliceWithCancel = async(function () {
            var count = 0,
                drainRequest;

            S.schedule(function () {
                S.schedule(function (info) {
                    mimicSchedulePump(function () {
                        LiveUnit.Assert.areEqual(3, count);
                        count++;
                    }, MSApp.HIGH);
                    LiveUnit.Assert.areEqual(1, count);
                    count++;
                    repeatForDuration(S._TIME_SLICE + 10, function () { LiveUnit.Assert.isFalse(info.shouldYield); });
                }, S.Priority.high);

                // Cancels the drain request moving the scheduler out of drain mode.
                //  The pump should yield after this job.
                //
                S.schedule(function (info) {
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                    drainRequest.cancel();
                    while (!info.shouldYield) {
                        // Scheduler is in normal mode so shouldYield===true when timeslice is exhausted
                        //
                    }
                }, S.Priority.high);

                S.schedule(function (info) {
                    // Verifies that the pump yields after this job.
                    //
                    mimicSchedulePump(function () {
                        LiveUnit.Assert.areEqual(5, count);
                        count++;
                    }, MSApp.HIGH);

                    LiveUnit.Assert.areEqual(4, count);
                    count++;
                    while (!info.shouldYield) {
                        // Scheduler is in normal mode so shouldYield===true when timeslice is exhausted
                        //
                    }
                }, S.Priority.high);

                drainRequest = S.requestDrain(S.Priority.high);

                LiveUnit.Assert.areEqual(0, count);
                count++;
            }, S.Priority.high);

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(6, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies that if the last drain request notification handler (i.e. it moves
        //  the scheduler out of drain mode) is slow, the scheduler properly
        //  reschedules itself to complete the rest of its jobs.
        //
        testDrainSlowHandler = async(function () {
            var count = 0,
                drainRequest;

            // Requests a normal drain with a slow drain request notification handler
            //
            S.schedule(function () {
                drainRequest = S.requestDrain(S.Priority.aboveNormal).then(function () {
                    repeatForDuration(S._TIME_SLICE + 10);

                    LiveUnit.Assert.areEqual(1, count);
                    count++;
                });

                LiveUnit.Assert.areEqual(0, count);
                count++;
            }, S.Priority.high);

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(2, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies that when there are multiple drain requests, the drain request promises
        //  are completed in FIFO order (even when there aren't any jobs associated with
        //  the drain request).
        //
        testDrainMultiple = async(function () {
            var count = 0;

            S.schedule(function () {
                S.requestDrain(S.Priority.aboveNormal).then(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                });
                S.requestDrain(S.Priority.high).then(function () {
                    LiveUnit.Assert.areEqual(3, count);
                    count++;
                });
                S.requestDrain(S.Priority.normal).then(function () {
                    LiveUnit.Assert.areEqual(5, count);
                    count++;
                });
                S.requestDrain(S.Priority.high).then(function () {
                    LiveUnit.Assert.areEqual(6, count);
                    count++;
                });

                LiveUnit.Assert.areEqual(0, count);
                count++;
            }, S.Priority.high);

            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            }, S.Priority.high);

            S.schedule(function () {
                LiveUnit.Assert.areEqual(4, count);
                count++;
            }, S.Priority.normal);

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(7, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testDrainCancelation = async(function () {
            var count = 0,
                drainRequest;

            // Requests a high drain
            //
            S.schedule(function () {
                drainRequest = S.requestDrain(S.Priority.high).then(null, function (error) {
                    LiveUnit.Assert.areEqual("Canceled", error.name, "Drain promise should have been canceled");
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                });

                LiveUnit.Assert.areEqual(0, count);
                count++;
            }, S.Priority.high);

            // Cancels the drain request
            //
            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
                drainRequest.cancel();
            }, S.Priority.high);

            return schedulePromise(S.Priority.high).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies that canceling one drain request doesn't cancel other drain requests
        //  at the same priority.
        //
        testDrainMultipleAtSamePriWithCancelation = async(function () {
            var count = 0,
                drainNormal1,
                drainNormal2;

            // Requests 2 normal draines
            //
            S.schedule(function () {
                drainNormal1 = S.requestDrain(S.Priority.normal).then(null, function (error) {
                    LiveUnit.Assert.areEqual("Canceled", error.name, "Drain promise should have been canceled");
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                });

                drainNormal2 = S.requestDrain(S.Priority.normal).then(function () {
                    LiveUnit.Assert.areEqual(4, count);
                    count++;
                });

                LiveUnit.Assert.areEqual(0, count);
                count++;
            }, S.Priority.high);

            // Cancels 1 normal drain
            //
            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
                drainNormal1.cancel();
            }, S.Priority.high);

            S.schedule(function () {
                LiveUnit.Assert.areEqual(3, count);
                count++;
            }, S.Priority.normal);

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(5, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies that canceling one drain request doesn't cancel other drain requests
        //  at lower priorities.
        //  Specifically, verifies that when you request a high drain and a normal drain
        //  and cancel the normal drain, the high drain still happens.
        //
        testDrainMultipleAtDiffPrisWithCancelation = async(function () {
            var count = 0,
                drainHigh,
                drainNormal;

            // Requests high and normal draines
            //
            S.schedule(function () {
                drainHigh = S.requestDrain(S.Priority.high).then(function () {
                    LiveUnit.Assert.areEqual(4, count);
                    count++;
                });

                drainNormal = S.requestDrain(S.Priority.normal).then(null, function (error) {
                    LiveUnit.Assert.areEqual("Canceled", error.name, "Drain promise should have been canceled");
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                });

                LiveUnit.Assert.areEqual(0, count);
                count++;
            }, S.Priority.high);

            // Cancels the normal drain
            //
            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
                drainNormal.cancel();
            }, S.Priority.high);

            S.schedule(function () {
                LiveUnit.Assert.areEqual(3, count);
                count++;
                drainNormal.cancel();
            }, S.Priority.high);

            return schedulePromise(S.Priority.normal).then(function () {
                LiveUnit.Assert.areEqual(5, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies that scheduling a job in a drain request notification handler
        //  works properly. Specifically, this test has an aboveNormal and a normal
        //  drain request handler. Without the side effects of the drain request
        //  handlers, the code flow should be:
        //   - aboveNormal drain request handler
        //   - normal drain request handler
        //   - belowNormal job
        //  However, the aboveNormal drain request handler schedules an aboveNormal
        //  job so the code flow should acutally be:
        //   - aboveNormal drain request handler (schedules an aboveNormal job)
        //   - aboveNormal job
        //   - normal drain request handler
        //   - belowNormal job
        testDrainScheduleInNotify = async(function () {
            var count = 0,
                drainNormal,
                drainAboveNormal;

            // Requests aboveNormal and normal draines
            //
            S.schedule(function () {
                drainAboveNormal = S.requestDrain(S.Priority.aboveNormal).then(function () {
                    S.schedule(function () {
                        LiveUnit.Assert.areEqual(2, count);
                        count++;
                    }, S.Priority.aboveNormal);

                    LiveUnit.Assert.areEqual(1, count);
                    count++;
                });

                drainNormal = S.requestDrain(S.Priority.normal).then(function () {
                    LiveUnit.Assert.areEqual(3, count);
                    count++;
                });

                LiveUnit.Assert.areEqual(0, count);
                count++;
            }, S.Priority.high);

            S.schedule(function () {
                LiveUnit.Assert.areEqual(4, count);
                count++;
            }, S.Priority.belowNormal);

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(5, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        //
        // tests for exception scenario - verify that the queue doesn't stall
        //

        // verify scheduler doesn't stall after job throws exception
        testWithException = async(function () {
            var count = 0;
            S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                throw new Error("error in HIGH 1");
                count++;
            }, S.Priority.high, null, "HIGH 1");

            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                throw new Error("error in NORMAL 1");
                count++;
            }, S.Priority.normal, null, "NORMAL 1");

            S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
            }, S.Priority.high, null, "HIGH 2");

            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            }, S.Priority.normal, null, "NORMAL 2");

            LiveUnit.Assert.areEqual(0, count);
            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(2, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        }, [{ message: "error in HIGH 1" }, { message: "error in NORMAL 1" }]);

        // verify there for no errors when job that was failed with exception is resumed
        testResumeJobAfterException = async(function () {
            var count = 0;
            var deadJob = S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                throw new Error("error in HIGH 1");
                count++;
            }, S.Priority.high, null, "HIGH 1");

            S.schedule(function () {
                deadJob.pause();
                deadJob.resume(); // this shouldn't throw exception
                LiveUnit.Assert.areEqual(0, count);
                count++;
            }, S.Priority.high, null, "HIGH 2");

            LiveUnit.Assert.areEqual(0, count);
            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(1, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        }, [{ message: "error in HIGH 1" }]);

        testCurrentPriority = async(function () {
            var count = 0;
            LiveUnit.Assert.areEqual(S.Priority.normal, S.currentPriority);

            S.schedule(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
                LiveUnit.Assert.areEqual(S.Priority.normal, S.currentPriority);
            });

            S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                LiveUnit.Assert.areEqual(S.Priority.high, S.currentPriority);
            }, S.Priority.high);

            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
                LiveUnit.Assert.areEqual(S.Priority.aboveNormal, S.currentPriority);
            }, S.Priority.aboveNormal);

            S.schedule(function () {
                LiveUnit.Assert.areEqual(3, count);
                count++;
                LiveUnit.Assert.areEqual(S.Priority.normal, S.currentPriority);
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(4, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testBlocking = async(function () {
            var count = 0;
            var s = new WinJS._Signal();

            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                info.setPromise(Promise.timeout().then(function () {
                    S.schedule(function () {
                        LiveUnit.Assert.areEqual(2, count);
                        count++;
                        s.complete();
                    });
                    return function () {
                        LiveUnit.Assert.areEqual(1, count);
                        count++;
                    };
                }));
            });

            return s.promise.then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testBlockingHighPriJob = async(function () {
            var count = 0;
            var s = new WinJS._Signal();

            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                // block high pri job for 2 seconds to allow execute low pri jobs
                info.setPromise(Promise.timeout(2000).then(function () {
                    S.schedule(function () {
                        LiveUnit.Assert.areEqual(3, count);
                        count++;
                        s.complete();
                    });
                    return function () {
                        LiveUnit.Assert.areEqual(2, count);
                        count++;
                    };
                }));
            }, S.Priority.high);

            // this should be executed before high pri blocked job
            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            });

            return s.promise.then(function () {
                LiveUnit.Assert.areEqual(4, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testBlockingYieldsForHighJob = async(function () {
            var count = 0;
            var s = new WinJS._Signal();

            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                info.setPromise(Promise.timeout().then(function () {
                    // this job should be run before blocked
                    S.schedule(function () {
                        LiveUnit.Assert.areEqual(2, count);
                        count++;
                    }, S.Priority.high);

                    return function () {
                        LiveUnit.Assert.areEqual(3, count);
                        count++;
                        s.complete();
                    };
                }));
            });


            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            });

            return s.promise.then(function () {
                LiveUnit.Assert.areEqual(4, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testBlockingCompletes = async(function () {
            var count = 0;
            var s = new WinJS._Signal();

            S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                // promise doesn't return anything
                info.setPromise(Promise.timeout().then(function () {
                    S.schedule(function () {
                        LiveUnit.Assert.areEqual(1, count);
                        count++;
                        s.complete();
                    });
                }));
            });

            return s.promise.then(function () {
                LiveUnit.Assert.areEqual(2, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        testBlockingCanceled = async(function () {
            var count = 0;

            var j = S.schedule(function (info) {
                info.setPromise(new Promise(function () { /* promise will never complete */ }, function () {
                    // Assert that we get cancel called on this promise when we cancel the job which is blocked
                    //
                    LiveUnit.Assert.areEqual(1, count);
                    count++;
                }));
            });
            var j2 = S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                j.cancel();
            });


            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.isFalse(j.completed);
                LiveUnit.Assert.isTrue(j2.completed);
                LiveUnit.Assert.areEqual(2, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });

        });

        testBlockAfterCancelation = async(function () {
            var count = 0;

            var j = S.schedule(function (info) {
                j.cancel();
                count++;
                info.setPromise(Promise.timeout().then(function () {
                return function () {
                        LiveUnit.Assert.fail("Should not be here");
                    }
            }));
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(1, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
                LiveUnit.Assert.isFalse(j.completed);
            });
        });

        testBlockedThrowsException = async(function () {
            WinJS.Utilities.startLog();
            var count = 0;
            var s = new WinJS._Signal();

            var j = S.schedule(function (info) {
                info.setPromise(Promise.timeout().then(function () {
                    count++;
                    throw new Error("error from blocked");
                }).then(null, function (e) { s.complete(); }));
            });

            var j2 = S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
            });

            return s.promise.then(function () {
                LiveUnit.Assert.isFalse(j.completed);
                LiveUnit.Assert.isTrue(j2.completed);
                LiveUnit.Assert.areEqual(2, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
                WinJS.Utilities.stopLog();
            });
        });

        testCancelThenBlock = async(function () {
            var count = 0;
            WinJS.Utilities.startLog();
            var j = S.schedule(function (info) {
                j.cancel();
                info.setPromise(new Promise(function () { /* promise will never complete */ }, function () {
                    // Assert that we get cancel called on this promise when we cancel the job which is blocked
                    //
                    LiveUnit.Assert.areEqual(0, count);
                    count++;
                }));
            });

            var j2 = S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;

            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(2, count);
                LiveUnit.Assert.isFalse(j.completed);
                LiveUnit.Assert.isTrue(j2.completed);
                LiveUnit.Assert.isTrue(S._isEmpty);
                WinJS.Utilities.stopLog();
            });

        });

        testBlockingPausedSelf = async(function () {
            var count = 0;
            var s = new WinJS._Signal();

            var j = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                info.setPromise(WinJS.Promise.timeout().then(function () {
                return function () {
                        LiveUnit.Assert.areEqual(2, count);
                        count++;

                        // Need to complete async so that we can test the "completed" bit of this job
                        //
                        WinJS.Promise.timeout().then(function () {
                            s.complete();
                        });
                    }
            }));
                // We pause the job before the promise is completed. This means that the next scheduled job should
                //  run which can then resume the job.
                //
                j.pause();
            });
            var j2 = S.schedule(function () {
                LiveUnit.Assert.isFalse(j.completed);
                LiveUnit.Assert.areEqual(1, count);
                count++;
                j.resume();
            });


            return s.promise.then(function () {
                LiveUnit.Assert.isTrue(j.completed);
                LiveUnit.Assert.isTrue(j2.completed);
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });

        });


        testBlockedPausedThenCancel = async(function () {
            var count = 0;

            var j = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                info.setPromise(new Promise(function () { }, function (e) {
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                }));

                j.pause();
            });

            var j2 = S.schedule(function () {
                LiveUnit.Assert.isFalse(j.completed);
                LiveUnit.Assert.areEqual(1, count);
                count++;
                j.cancel();
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isFalse(j.completed);
                LiveUnit.Assert.isTrue(j2.completed);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });

        });

        testBlockingPausedByOtherJob = async(function () {
            var count = 0;
            var s = new WinJS._Signal();

            var j = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                info.setPromise(WinJS.Promise.timeout().then(function () {
                return function () {
                        LiveUnit.Assert.areEqual(3, count);
                        count++;

                        // Need to complete async so that we can test the "completed" bit of this job
                        //
                        WinJS.Promise.timeout().then(function () {
                            s.complete();
                        });
                    }
            }));
            });

            S.schedule(function () {
                LiveUnit.Assert.isFalse(j.completed);
                LiveUnit.Assert.areEqual(1, count);
                count++;
                // We pause the job before the promise is completed. This means that the next scheduled job should
                //  run which can then resume the job.
                //
                j.pause();
            });

            WinJS.Promise.timeout().then(function () {
                S.schedule(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                    j.resume();
                });
            });

            return s.promise.then(function () {
                LiveUnit.Assert.isTrue(j.completed);
                LiveUnit.Assert.areEqual(4, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });

        });

        testBlockingPausedByOtherJobWithNoPromise = async(function () {
            var count = 0;
            var s = new WinJS._Signal();

            var j = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                info.setPromise(WinJS.Promise.timeout().then(function () {
                    // Need to complete async so that we can test the "completed" bit of this job
                    WinJS.Promise.timeout().then(function () {
                        s.complete();
                    });
                    return; // returning no promise should lead to job complete
                }));
            });

            S.schedule(function () {
                LiveUnit.Assert.isFalse(j.completed);
                LiveUnit.Assert.areEqual(1, count);
                count++;
                // We pause the job before the promise is completed. This means that the next scheduled job should
                //  run which can then resume the job.
                //
                j.pause();
            });

            WinJS.Promise.timeout().then(function () {
                S.schedule(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                    j.resume();
                });
            });

            return s.promise.then(function () {
                LiveUnit.Assert.isTrue(j.completed);
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });

        });

        testBlockingPausedSelfWithSyncPromise = async(function () {
            var count = 0;
            var s = new WinJS._Signal();

            var j = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                info.setPromise(WinJS.Promise.wrap().then(function () {
                return function () {
                        LiveUnit.Assert.areEqual(2, count);
                        count++;

                        // Need to complete async so that we can test the "completed" bit of this job
                        //
                        WinJS.Promise.timeout().then(function () {
                            s.complete();
                        });
                    }
            }));
                // We pause the job before the promise is completed. This means that the next scheduled job should
                //  run which can then resume the job.
                //
                j.pause();
            });

            WinJS.Promise.timeout().then(function () {
                S.schedule(function () {
                    LiveUnit.Assert.isFalse(j.completed);
                    LiveUnit.Assert.areEqual(1, count);
                    count++;
                    j.resume();
                });
            });

            return s.promise.then(function () {
                LiveUnit.Assert.isTrue(j.completed);
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });

        });

        testCancelPausedBlockedJobByOtherJob = async(function () {
            var count = 0;
            WinJS.Utilities.startLog();
            var s = new WinJS._Signal();
            var complete;

            var j = S.schedule(function (info) {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                info.setPromise(new WinJS.Promise(
                    function (c) {
                        complete = c;
                    }, function () {
                        complete();
                        s.complete();
                    }));
                LiveUnit.Assert.isFalse(S._isEmpty, "Job queue shouldn't be empty");
            });

            S.schedule(function () {
                LiveUnit.Assert.isFalse(j.completed);
                LiveUnit.Assert.areEqual(1, count);
                count++;
                WinJS.Promise.timeout(500).then(function () {
                    j.cancel();
                });

            });

            return s.promise.then(function () {
                LiveUnit.Assert.isFalse(j.completed);
                LiveUnit.Assert.areEqual(2, count);
                LiveUnit.Assert.isTrue(S._isEmpty, "Job queue should be empty");
                WinJS.Utilities.stopLog();
            });

        });

        //
        // Promise helper tests
        //

        // Verifies that each promise helper:
        //  - executes its promise under the correct priority context
        //  - completes its promise with the correct value
        //
        testPromiseHelperPriorityContexts = async(function () {
            var count = 0;

            function forEachPromiseHelper(fn) {
                [
                    { f: S.schedulePromiseHigh.bind(S), p: S.Priority.high },
                    { f: S.schedulePromiseAboveNormal.bind(S), p: S.Priority.aboveNormal },
                    { f: S.schedulePromiseNormal.bind(S), p: S.Priority.normal },
                    { f: S.schedulePromiseBelowNormal.bind(S), p: S.Priority.belowNormal },
                    { f: S.schedulePromiseIdle.bind(S), p: S.Priority.idle }
                ].forEach(function (helper) {
                        fn(helper.f, helper.p);
                    });
            }

            forEachPromiseHelper(function (promiseHelper, helperPriority) {
                // Promise helper usage pattern 1
                //
                promiseHelper(45).done(function (value) {
                    LiveUnit.Assert.areEqual(helperPriority, S.currentPriority, "Promise helper executed in wrong priority context");
                    LiveUnit.Assert.areEqual(45, value, "Promise helper's promise completed with wrong value");
                    count++;
                });

                // Promise helper usage pattern 2
                //
                immediate().then(function () {
                    return 36;
                }).then(promiseHelper).done(function (value) {
                        LiveUnit.Assert.areEqual(helperPriority, S.currentPriority, "Promise helper executed in wrong priority context");
                        LiveUnit.Assert.areEqual(36, value, "Promise helper's promise completed with wrong value");
                        count++;
                    });
            });

            return immediate().then(function () {
                return schedulePromise(S.Priority.min);
            }).then(function () {
                    LiveUnit.Assert.isTrue(S._isEmpty);
                    LiveUnit.Assert.areEqual(10, count);
                });
        });

        // Verifies that callbacks associated with the promise helpers get executed in
        //  the proper order (order of descending priority).
        //
        testPromiseHelperPriorityOrdering = async(function () {
            var count = 0;

            S.schedulePromiseNormal().done(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            });

            S.schedulePromiseHigh().done(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
            });

            S.schedulePromiseNormal().done(function () {
                LiveUnit.Assert.areEqual(3, count);
                count++;
            });

            S.schedulePromiseBelowNormal().done(function () {
                LiveUnit.Assert.areEqual(4, count);
                count++;
            });

            S.schedulePromiseIdle().done(function () {
                LiveUnit.Assert.areEqual(5, count);
                count++;
            });

            S.schedulePromiseAboveNormal().done(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            });

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.isTrue(S._isEmpty);
                LiveUnit.Assert.areEqual(6, count);
            });
        });

        // Verifies that callbacks associated with canceled promise helpers
        //  do not run.
        //
        testPromiseHelperCancellation = async(function () {
            var count = 0;

            S.schedulePromiseNormal().done(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
            });

            var high = S.schedulePromiseHigh().then(function () {
                LiveUnit.Assert.fail("Job should have been canceled");
                count++;
            });

            var normal2 = S.schedulePromiseNormal();
            normal2.done(function () {
                LiveUnit.Assert.fail("Job should have been canceled");
                count++;
            });

            S.schedulePromiseBelowNormal().done(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            });

            S.schedulePromiseIdle().done(function () {
                LiveUnit.Assert.areEqual(3, count);
                count++;
            });

            S.schedulePromiseAboveNormal().done(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
            });

            high.cancel();
            normal2.cancel();

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.isTrue(S._isEmpty);
                LiveUnit.Assert.areEqual(4, count);
            });
        });

        //
        // retrieveState tests
        //



        // Verifies retrieveState when there aren't any jobs or drain requests.
        //
        testRetrieveStateEmpty = function () {
            verifyDump("retrieveState with no jobs and no drain requests",
                "Jobs:\n" +
                "     None\n" +
                "Drain requests:\n" +
                "     None\n"
                );
        };

        // Verifies retrieveState for jobs. Specifically, verifies:
        //  - id, priority, and name are printed for jobs
        //  - priority name rather than number is printed when possible
        //  - name is left out of dump for jobs without a name
        //  - when retrieveState is called while a job is running, it is marked with an asterisk
        //  - the jobs are printed in the order in which they're expected to run
        //
        testRetrieveStateWithJobs = async(function () {
            var count = 0;
            var finalJob;

            var unnamedJob = S.schedule(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
            });
            var anotherJob = S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
                verifyDump("retrieveState inside running job",
                    "Jobs:\n" +
                    "    *id: " + anotherJob.id + ", priority: normal, name: Verify retrieveState while I'm running\n" +
                    "     id: " + unnamedPriority.id + ", priority: -1, name: My priority has no name\n" +
                    "     id: " + namedJob.id + ", priority: belowNormal, name: A job with a name\n" +
                    "     id: " + finalJob.id + ", priority: min\n" +
                    "Drain requests:\n" +
                    "     None\n"
                    );
            }, S.Priority.normal, null, "Verify retrieveState while I'm running");
            var namedJob = S.schedule(function () {
                LiveUnit.Assert.areEqual(3, count);
                count++;
            }, S.Priority.belowNormal, null, "A job with a name");
            var unnamedPriority = S.schedule(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
            }, S.Priority.normal - 1, null, "My priority has no name");

            verifyDump("retrieveState with a variety of jobs",
                "Jobs:\n" +
                "     id: " + unnamedJob.id + ", priority: normal\n" +
                "     id: " + anotherJob.id + ", priority: normal, name: Verify retrieveState while I'm running\n" +
                "     id: " + unnamedPriority.id + ", priority: -1, name: My priority has no name\n" +
                "     id: " + namedJob.id + ", priority: belowNormal, name: A job with a name\n" +
                "Drain requests:\n" +
                "     None\n"
                );

            return new WinJS.Promise(function (c) {
                finalJob = S.schedule(function () {
                    LiveUnit.Assert.isTrue(S._isEmpty);
                    LiveUnit.Assert.areEqual(4, count);
                    c();
                }, S.Priority.min);
            });
        });

        // Verifies retrieveState for drain requests. Specifically, verifies:
        //  - priority and name are printed for each drain request
        //  - priority name rather than number is printed when possible
        //  - the current drain request is marked with an asterisk
        //    (the first drain request is always the current one)
        //  - the drain requests are printed in the order in which they will be processed
        //
        testRetrieveStateWithDrainRequests = async(function () {
            var finalJob;

            var j1 = S.schedule(function () {
            }, S.Priority.high);
            var j2 = S.schedule(function () {
            }, S.Priority.normal);
            var j3 = S.schedule(function () {
            }, S.Priority.normal - 1);

            S.requestDrain(S.Priority.normal, "First drain").then(function () {
                verifyDump("retrieveState after 1 drain request completed",
                    "Jobs:\n" +
                    "     id: " + j3.id + ", priority: -1\n" +
                    "     id: " + finalJob.id + ", priority: min\n" +
                    "Drain requests:\n" +
                    "    *priority: high, name: Drain with named priority\n" +
                    "     priority: -1, name: Drain with unnamed priority\n"
                    );
            });
            S.requestDrain(S.Priority.high, "Drain with named priority");
            S.requestDrain(S.Priority.normal - 1, "Drain with unnamed priority");

            verifyDump("retrieveState with a variety of drain requests",
                "Jobs:\n" +
                "     id: " + j1.id + ", priority: high\n" +
                "     id: " + j2.id + ", priority: normal\n" +
                "     id: " + j3.id + ", priority: -1\n" +
                "Drain requests:\n" +
                "    *priority: normal, name: First drain\n" +
                "     priority: high, name: Drain with named priority\n" +
                "     priority: -1, name: Drain with unnamed priority\n"
                );

            return new WinJS.Promise(function (c) {
                finalJob = S.schedule(function () {
                    LiveUnit.Assert.isTrue(S._isEmpty);
                    c();
                }, S.Priority.min);
            });
        });

        //
        // test yielding at WWA priority boundaries
        //

        // Verifies that the WinJS scheduler schedules itself on the WWA scheduler at the
        //  priority of its most important job before yielding (rather than at a priority
        //  that is >= the priority of its most important job).
        //
        testUpdatingOfHighWaterMarkBeforeYielding = async(function () {
            var count = 0;

            S.schedule(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
                mimicSchedulePump(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    count++;
                }, MSApp.NORMAL);
                repeatForDuration(S._TIME_SLICE + 10);
            }, S.Priority.high);

            S.schedule(function () {
                LiveUnit.Assert.areEqual(3, count);
                count++;
            }, S.Priority.aboveNormal);

            LiveUnit.Assert.areEqual(0, count);
            count++;

            return schedulePromise(S.Priority.min).then(function () {
                LiveUnit.Assert.areEqual(4, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Verifies that the WinJS scheduler yields at WWA priority boundaries.
        //
        testYieldWhenDecreasingWwaPriority = async(function () {
            function test(winjsHigherPri, winjsLowerPri, wwaLowerPri) {
                var platformJobScheduled = false;

                return withMSAppHooks({
                    isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                        return WinJS.Utilities.hasWinRT && platformJobScheduled && isEqualOrHigherWwaPriority(wwaLowerPri, priority);
                    }
                }, function () {
                        var count = 0;

                        S.schedule(function () {
                            LiveUnit.Assert.areEqual(1, count);
                            count++;
                        }, winjsHigherPri);

                        mimicSchedulePump(function () {
                            platformJobScheduled = false;
                            LiveUnit.Assert.areEqual(2, count);
                            count++;
                        }, wwaLowerPri);
                        platformJobScheduled = true;

                        S.schedule(function () {
                            LiveUnit.Assert.areEqual(3, count);
                            count++;
                        }, winjsLowerPri);

                        LiveUnit.Assert.areEqual(0, count);
                        count++;

                        return schedulePromise(S.Priority.min).then(function () {
                            LiveUnit.Assert.areEqual(4, count);
                            LiveUnit.Assert.isTrue(S._isEmpty);
                        });
                    }, { forceHooksInWwa: true });
            }

            return WinJS.Promise.wrap().then(function () {
                return test(S.Priority.aboveNormal + 1, S.Priority.aboveNormal, MSApp.NORMAL);
            }).then(function () {
                    return test(S.Priority.belowNormal, S.Priority.belowNormal - 1, MSApp.IDLE);
                });
        });

        // Verifies that the WinJS scheduler yields at WWA priority boundaries even when
        //  it didn't execute any jobs during the timeslice.
        //
        testYieldWhenDecreasingWwaPriorityWithoutExecutingAJob = async(function () {
            function test(winjsHigherPri, winjsLowerPri, wwaLowerPri) {
                var platformJobScheduled = false;

                return withMSAppHooks({
                    isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                        return WinJS.Utilities.hasWinRT && platformJobScheduled && isEqualOrHigherWwaPriority(wwaLowerPri, priority);
                    }
                }, function () {
                        var count = 0;

                        var j1 = S.schedule(function () {
                            LiveUnit.Assert.fail("job should not have run");
                        }, winjsHigherPri);

                        mimicSchedulePump(function () {
                            platformJobScheduled = false;
                            LiveUnit.Assert.areEqual(1, count);
                            count++;
                        }, wwaLowerPri);
                        platformJobScheduled = true;

                        S.schedule(function () {
                            LiveUnit.Assert.areEqual(2, count);
                            count++;
                        }, winjsLowerPri);

                        j1.cancel();

                        LiveUnit.Assert.areEqual(0, count);
                        count++;

                        return schedulePromise(S.Priority.min).then(function () {
                            LiveUnit.Assert.areEqual(3, count);
                            LiveUnit.Assert.isTrue(S._isEmpty);
                        });
                    }, { forceHooksInWwa: true });
            }

            return WinJS.Promise.wrap().then(function () {
                return test(S.Priority.aboveNormal + 1, S.Priority.aboveNormal, MSApp.NORMAL);
            }).then(function () {
                    return test(S.Priority.belowNormal, S.Priority.belowNormal - 1, MSApp.IDLE);
                });
        });



        // Verifies that the WinJS scheduler can run jobs of 2 different WWA priorities
        //  in a single timeslice as long as the second WWA priority is higher than the
        //  first.
        //
        testDontYieldWhenIncreasingWwaPriority = async(function () {
            function test(winjsHigherPri, winjsLowerPri, wwaHigherPri) {
                var platformJobScheduled = false;

                return withMSAppHooks({
                    isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                        return WinJS.Utilities.hasWinRT && platformJobScheduled && isEqualOrHigherWwaPriority(wwaHigherPri, priority);
                    }
                }, function () {
                        var count = 0;

                        S.schedule(function () {
                            LiveUnit.Assert.areEqual(1, count);
                            count++;

                            mimicSchedulePump(function () {
                                platformJobScheduled = false;
                                LiveUnit.Assert.areEqual(3, count);
                                count++;
                            }, wwaHigherPri);
                            platformJobScheduled = true;

                            S.schedule(function () {
                                LiveUnit.Assert.areEqual(2, count);
                                count++;
                            }, winjsHigherPri);

                        }, winjsLowerPri);

                        LiveUnit.Assert.areEqual(0, count);
                        count++;

                        return schedulePromise(S.Priority.min).then(function () {
                            LiveUnit.Assert.areEqual(4, count);
                            LiveUnit.Assert.isTrue(S._isEmpty);
                        });
                    }, { forceHooksInWwa: true });
            }

            return WinJS.Promise.wrap().then(function () {
                return test(S.Priority.aboveNormal + 1, S.Priority.aboveNormal, MSApp.HIGH);
            }).then(function () {
                    return test(S.Priority.belowNormal, S.Priority.belowNormal - 1, MSApp.NORMAL);
                });
        });

        // Verifies that the WinJS scheduler can run jobs of different WinJS priorties
        //  but of the same WWA priority in the same timeslice.
        //
        testDontYieldBetweenSameWwaPriority = async(function () {
            function test(winjsHigherPri, winjsLowerPri, wwaPri) {
                var platformJobScheduled = false;
                var signal = new WinJS._Signal();

                return withMSAppHooks({
                    isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                        return WinJS.Utilities.hasWinRT && platformJobScheduled && isEqualOrHigherWwaPriority(wwaPri, priority);
                    }
                }, function () {
                        var count = 0;

                        S.schedule(function () {
                            LiveUnit.Assert.areEqual(1, count);
                            count++;
                        }, winjsHigherPri);

                        mimicSchedulePump(function () {
                            platformJobScheduled = false;
                            LiveUnit.Assert.areEqual(3, count);
                            count++;
                            signal.complete();
                        }, wwaPri);
                        platformJobScheduled = true;

                        S.schedule(function () {
                            LiveUnit.Assert.areEqual(2, count);
                            count++;
                        }, winjsLowerPri);

                        LiveUnit.Assert.areEqual(0, count);
                        count++;

                        return signal.promise.then(function () {
                            LiveUnit.Assert.areEqual(4, count);
                            LiveUnit.Assert.isTrue(S._isEmpty);
                            return WinJS.Promise.timeout();
                        });
                    }, { forceHooksInWwa: true });
            }

            return WinJS.Promise.wrap().then(function () {
                return test(S.Priority.aboveNormal + 2, S.Priority.aboveNormal + 1, MSApp.HIGH);
            }).then(function () {
                    return test(S.Priority.aboveNormal, S.Priority.aboveNormal - 1, MSApp.NORMAL);
                }).then(function () {
                    return test(S.Priority.belowNormal + 1, S.Priority.belowNormal, MSApp.NORMAL);
                }).then(function () {
                    return test(S.Priority.belowNormal - 1, S.Priority.belowNormal - 2, MSApp.IDLE);
                });
        });
    };

    export class SchedulerLocalContext {
        //
        // Test usage of WWA scheduler APIs
        //

        testUsingWwaScheduler = function () {
            LiveUnit.Assert.isTrue(S._usingWwaScheduler,
                "When running in the local context, the WinJS scheduler should be using the WWA scheduler");
        };

        // WWA scheduler integration test for testExecHigh
        //
        testWwaExecHigh = function () {
            function return4() {
                LiveUnit.Assert.areEqual(0, return4Called);
                return4Called++;
                LiveUnit.Assert.areEqual(S.currentPriority, S.Priority.high,
                    "Expected to be in high WinJS priority context");
                LiveUnit.Assert.areEqual(MSApp.getCurrentPriority(), MSApp.HIGH,
                    "Expected to be in high WWA priority context");
                return 4;
            }

            var return4Called = 0;

            var returnValue = S.execHigh(return4);

            LiveUnit.Assert.areEqual(4, returnValue,
                "execHigh should have returned the return value of the callback");
            LiveUnit.Assert.areEqual(1, return4Called, "return4 should have been called exactly 1 time");
            LiveUnit.Assert.isTrue(S._isEmpty);
        };

        // WWA scheduler integration test for testPriorityContextOfScheduledJob
        //
        testWwaPriorityContextOfScheduledJob = async(function () {
            function test(winjsPriority, wwaPriority) {
                function workFunction() {
                    LiveUnit.Assert.areEqual(0, workFunctionCalled);
                    workFunctionCalled++;
                    LiveUnit.Assert.areEqual(winjsPriority, S.currentPriority);
                    LiveUnit.Assert.areEqual(wwaPriority, MSApp.getCurrentPriority());
                }

                var workFunctionCalled = 0;

                S.schedule(workFunction, winjsPriority);

                return schedulePromise(S.Priority.min).then(function () {
                    LiveUnit.Assert.areEqual(1, workFunctionCalled);
                    LiveUnit.Assert.areEqual(S.Priority.min, S.currentPriority);
                    LiveUnit.Assert.areEqual(MSApp.IDLE, MSApp.getCurrentPriority());
                    LiveUnit.Assert.isTrue(S._isEmpty);
                });
            }

            return forEachPriorityBoundary(test);
        });

        // Verifies that when the WinJS scheduler is not pumping, currentPriority
        //  returns the current WWA priority context. WWA scheduler integration test.
        //
        testWwaCurrentPriority = async(function () {
            var count = 0;
            var s = new WinJS._Signal();
            LiveUnit.Assert.areEqual(S.Priority.normal, S.currentPriority);

            MSApp.execAsyncAtPriority(function () {
                LiveUnit.Assert.areEqual(1, count);
                count++;
                LiveUnit.Assert.areEqual(S.Priority.normal, S.currentPriority);
            }, MSApp.NORMAL);

            MSApp.execAsyncAtPriority(function () {
                LiveUnit.Assert.areEqual(2, count);
                count++;
                LiveUnit.Assert.areEqual(S.Priority.idle, S.currentPriority);
                s.complete();
            }, MSApp.IDLE);

            MSApp.execAsyncAtPriority(function () {
                LiveUnit.Assert.areEqual(0, count);
                count++;
                LiveUnit.Assert.areEqual(S.Priority.high, S.currentPriority);
            }, MSApp.HIGH);

            return s.promise.then(function () {
                LiveUnit.Assert.areEqual(3, count);
                LiveUnit.Assert.isTrue(S._isEmpty);
            });
        });

        // Local context only. Verifies that the WinJS scheduler doesn't yield at WWA
        //  priority boundaries when the WWA scheduler doesn't have any work that is
        //  at least as important as the scheduled WinJS work.
        //
        // In the web context, we cannot determine whether or not the host has any work
        //  so we always yield at WWA priority boundaries. This behavior is verified by
        //  the other WWA priority boundary unit tests.
        //
        testDontYieldWhenDecreasingWwaPriorityWhenHostHasNoWork = async(function () {
            function test(winjsHigherPri, winjsLowerPri, wwaLowerPri) {
                return withMSAppHooks({
                    isTaskScheduledAtPriorityOrHigher: function (origFn, args, priority) {
                        // WWA scheduler doesn't have any work that is at
                        //  least as important as ours.
                        //
                        return false;
                    }
                }, function () {
                        var count = 0;
                        var signal = new WinJS._Signal();

                        S.schedule(function () {
                            LiveUnit.Assert.areEqual(1, count);
                            count++;
                        }, winjsHigherPri);

                        // This job is not meant to simulate WWA host work. It's just
                        //  here to ensure that the WinJS scheduler runs its two jobs
                        //  without yielding.
                        //
                        mimicSchedulePump(function () {
                            LiveUnit.Assert.areEqual(3, count);
                            count++;
                            signal.complete();
                        }, wwaLowerPri);

                        S.schedule(function () {
                            LiveUnit.Assert.areEqual(2, count);
                            count++;
                        }, winjsLowerPri);

                        LiveUnit.Assert.areEqual(0, count);
                        count++;

                        return signal.promise.then(function () {
                            LiveUnit.Assert.areEqual(4, count);
                            LiveUnit.Assert.isTrue(S._isEmpty);
                        });
                    }, { forceHooksInWwa: true });
            }

            return WinJS.Promise.wrap().then(function () {
                return test(S.Priority.aboveNormal + 1, S.Priority.aboveNormal, MSApp.NORMAL);
            }).then(function () {
                    return test(S.Priority.belowNormal, S.Priority.belowNormal - 1, MSApp.IDLE);
                });
        });
    }
    
    var disabledTestRegistry = {
        testDontYieldBetweenSameWwaPriority: [Helper.Browsers.android, Helper.Browsers.safari],
        testYieldWhenDecreasingWwaPriorityWithoutExecutingAJob: Helper.Browsers.android,
		testDontYieldWhenIncreasingWwaPriority: Helper.Browsers.android,
		testYieldWhenDecreasingWwaPriority: Helper.Browsers.android,
        testDrainNoTimeSlice: Helper.Browsers.android,
        testDontYieldToPlatformJobInExternalDrain: Helper.Browsers.android,
		testHighPriJobBetweenLowPriYieldingJobs: Helper.Browsers.android
    };
    Helper.disableTests(Scheduler, disabledTestRegistry);
}

LiveUnit.registerTestClass("CorsicaTests.LinkedListMixin");
LiveUnit.registerTestClass("CorsicaTests.Scheduler");

if (WinJS.Utilities.hasWinRT) {
    LiveUnit.registerTestClass("CorsicaTests.SchedulerLocalContext");
}