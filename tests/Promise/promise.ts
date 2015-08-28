// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
/// <reference path="../TestLib/Helper.ts"/>

module CorsicaTests {

    "use strict";
    var timeoutMax = 33 * 2;  // expected duration for use with timeout() or timeout(0), 33ms was not always reliable

    var AsyncWorkQueue = function () {
        this._queue = [];
        this._token = 0;
    };
    function errorHandler(msg) {
        try {
            LiveUnit.Assert.fail('There was an unhandled error in your test: ' + msg);
        } catch (ex) { }
    }

    AsyncWorkQueue.prototype = {
        cancel: function (token) {
            for (var i = 0, len = this._queue.length; i < len; i++) {
                if (this._queue[i].token === token) {
                    this._queue[i].canceled = true;
                    return true;
                }
            }
            return false;
        },
        clear: function () {
            this._queue = [],
            this._token = 0;
        },
        drain: function () {
            while (this._queue.length > 0) {
                this.process();
            }
        },
        getItem: function (pos) {
            return this._queue[pos];
        },
        process: function () {
            var len = this._queue.length;
            for (var i = 0; i < len; i++) {
                var item = this._queue[i];
                if (item.canceled) {
                    continue;
                }
                item.code();
            }
            this._queue.splice(0, len);
        },
        processN: function (cnt) {
            var len = Math.min(cnt || 0, this._queue.length);
            for (var i = 0; cnt > 0 && i < len; i++) {
                var item = this._queue[i];
                if (item.canceled) {
                    continue;
                }
                item.code();
                cnt--;
            }
            this._queue.splice(0, len);
        },
        schedule: function (item) {
            var token = ++this._token;
            this._queue.push({ code: item, token: token });
            return token;
        }
    };
    var q = new AsyncWorkQueue();

    function asyncAdd(x, y): WinJS.Promise<number> {
        return new WinJS.Promise(function (complete) {
            q.schedule(function () { complete(x + y); }, 0);
        });
    }
    function asyncAddWithCancellation(x, y, onCancel?) {
        var token;
        return new WinJS.Promise(
            function (complete) {
                token = q.schedule(function () { complete(x + y); }, 0);
            },
            function () {
                q.cancel(token);
                if (onCancel) { onCancel(); }
            }
            );
    }
    function asyncAddWithProgress(x, y) {
        return new WinJS.Promise(function (complete, error, progress) {
            q.schedule(
                function () {
                    progress("almost!");
                    q.schedule(
                        function () {
                            progress("really!");
                            q.schedule(
                                function () { complete(x + y); },
                                0
                                );
                        },
                        0
                        );
                },
                0
                );
        });
    }
    function asyncAddWithError(x, y) {
        return new WinJS.Promise(function (complete, error) {
            q.schedule(function () { error("I refuse to do math!"); }, 0);
        });
    }

    // This is how one would be able to protected a Promise from a cancelation request.
    //
    var NoncancelablePromise = function (promise) {
        return new WinJS.Promise(function (c, e, p) {
            promise.then(c, e, p);
        });
    }

    function addAsyncNoQueue(l, r, options?): WinJS.Promise<number> {
        // if options not passed in, define it as an empty object so we can just check if members are present
        options = options || {};

        return new WinJS.Promise(
            function (complete, error) {
                try {
                    if (options.throwException) {
                        throw "addAsyncNoQueue throwing requested exception";
                    }

                    var sum = l + r;
                    complete(sum);
                } catch (e) {
                    error(e);
                }
            }
            );
    }

    export class Promise {


        testInitializationError = function () {
            q.clear();

            var p = new WinJS.Promise(function () {
                throw "Error initializing";
            });

            var hitCompleteCount = 0, hitErrorCount = 0;

            p.then(
                function () { hitCompleteCount++; },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual("Error initializing", e);
                }
                );

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        }

    testCallingCompleteMultipleTimes = function () {
            q.clear();

            var p = new WinJS.Promise(function (c) {
                q.schedule(function () {
                    c(1);
                    c(2);
                });
            });
            var hitCompleteCount = 0, hitErrorCount = 0;

            p.then(function (v) {
                hitCompleteCount++;
                LiveUnit.Assert.areEqual(1, v);
            }, function () { hitErrorCount++; });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
        }

    testCallingErrorMultipleTimes = function () {
            q.clear();

            var p = new WinJS.Promise(function (c, e) {
                q.schedule(function () {
                    e(1);
                    e(2);
                });
            });
            var hitCompleteCount = 0, hitErrorCount = 0;

            p.then(
                function (v) { hitCompleteCount++; },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual(e, 1);
                }
                );

            q.drain();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        }

    testCallingCompleteAndThenError = function () {
            q.clear();

            var p = new WinJS.Promise(function (c, e) {
                q.schedule(function () {
                    c(1);
                    e(2);
                });
            });

            var hitCompleteCount = 0, hitErrorCount = 0;

            p.then(function (v) {
                hitCompleteCount++;
                LiveUnit.Assert.areEqual(1, v);
            }).then(null, function (e) {
                    hitErrorCount++;
                });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
        }

    testCallingErrorAndThenComplete = function () {
            q.clear();

            var p = new WinJS.Promise(function (c, e) {
                q.schedule(function () {
                    e(2);
                    c(1);
                });
            });

            var hitCompleteCount = 0, hitErrorCount = 0;

            p.
                then(function (v) { hitCompleteCount++; }).
                then(null, function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual(2, e);
                });

            q.drain();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        }

    testCallingCompleteAfterProgress = function () {
            q.clear();

            var p = new WinJS.Promise(function (c, e, p) {
                q.schedule(function () {
                    p(0);
                    p(1);
                    c(2);
                });
            });

            var hitCompleteCount = 0, hitErrorCount = 0, hitProgressCount = 0;

            p.
                then(
                function (v) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(2, v);
                },
                function () { hitErrorCount++; },
                function () { hitProgressCount++; }
                );

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
            LiveUnit.Assert.areEqual(2, hitProgressCount);
        }

    testCallingProgressAfterComplete = function () {
            q.clear();

            var p = new WinJS.Promise(function (c, e, p) {
                q.schedule(function () {
                    p(0);
                    c(2);
                    p(1);
                });
            });

            var hitCompleteCount = 0, hitErrorCount = 0, hitProgressCount = 0;

            p.
                then(
                function (v) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(2, v);
                },
                function () { hitErrorCount++; },
                function (v) {
                    hitProgressCount++;
                    LiveUnit.Assert.areEqual(0, v);
                }
                );

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
            LiveUnit.Assert.areEqual(1, hitProgressCount);
        }

    testCallingErrorAfterProgress = function () {
            q.clear();

            var p = new WinJS.Promise(function (c, e, p) {
                q.schedule(function () {
                    p(0);
                    p(1);
                    e(2);
                });
            });

            var hitCompleteCount = 0, hitErrorCount = 0, hitProgressCount = 0;

            p.
                then(
                function () { hitCompleteCount++; },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual(2, e);
                },
                function () { hitProgressCount++; }
                );

            q.drain();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
            LiveUnit.Assert.areEqual(2, hitProgressCount);
        }

    testCallingProgressAfterError = function () {
            q.clear();

            var p = new WinJS.Promise(function (c, e, p) {
                q.schedule(function () {
                    p(0);
                    e(2);
                    p(1);
                });
            });

            var hitCompleteCount = 0, hitErrorCount = 0, hitProgressCount = 0;

            p.
                then(
                function () { hitCompleteCount++; },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual(2, e);
                },
                function (v) {
                    hitProgressCount++;
                    LiveUnit.Assert.areEqual(0, v);
                }
                );

            q.drain();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
            LiveUnit.Assert.areEqual(1, hitProgressCount);
        }

    testThenPartialRegistration1 = function () {
            q.clear();

            var hitCompleteCount = 0, hitErrorCount = 0, hitProgressCount = 0;

            asyncAddWithProgress(1, 2).
                then(function () { hitCompleteCount++; }).
                then(null, function (e) { hitErrorCount++; throw e; }).
                then(null, null, function () { hitProgressCount++; });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
            // Because the progress handler is registered after a complete or
            // error handler it doesn't see the progress.
            //
            LiveUnit.Assert.areEqual(0, hitProgressCount);
        }

    testThenPartialRegistration2 = function () {
            q.clear();

            var hitCompleteCount = 0, hitErrorCount = 0, hitProgressCount = 0;

            asyncAddWithProgress(1, 2).
                then(null, null, function () { hitProgressCount++; }).
                then(null, function (e) { hitErrorCount++; throw e; }).
                then(function () { hitCompleteCount++; });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
            LiveUnit.Assert.areEqual(2, hitProgressCount);
        }

    testThenPartialRegistration3 = function () {
            q.clear();

            var hitCompleteCount = 0, hitErrorCount = 0, hitProgressCount = 0;

            asyncAddWithError(1, 2).
                then(null, function (e) { hitErrorCount++; throw e; }).
                then(null, null, function () { hitProgressCount++; }).
                then(function () { hitCompleteCount++; }).
                then(null, function () { });

            q.drain();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
            LiveUnit.Assert.areEqual(0, hitProgressCount);
        }

    testThenPartialRegistration4 = function () {
            q.clear();

            var hitCompleteCount = 0, hitErrorCount = 0, hitProgressCount = 0;

            asyncAddWithError(1, 2).
                then(null, null, function () { hitProgressCount++; }).
                then(function () { hitCompleteCount++; }).
                then(null, function (e) { hitErrorCount++; throw e; }).
                then(null, function () { });

            q.drain();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
            LiveUnit.Assert.areEqual(0, hitProgressCount);
        }

    testThenPartialRegistration5 = function () {
            q.clear();

            var hitCompleteCount = 0, hitErrorCount = 0, hitProgressCount = 0;

            asyncAddWithProgress(1, 2).
                then(null, function (e) { hitErrorCount++; throw e; }).
                then(null, null, function () { hitProgressCount++; }).
                then(function () { hitCompleteCount++; });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
            // Because the progress handler is registered after a complete or
            // error handler it doesn't see the progress.
            //
            LiveUnit.Assert.areEqual(0, hitProgressCount);
        }
    testProgressIsNotBuffered = function () {
            q.clear();

            var p = new WinJS.Promise(function (c, e, p) {
                q.schedule(function () { p(1); });
                q.schedule(function () { p(2); });
                q.schedule(function () { c(3); });
            });

            var hitCompleteCount = 0, hitErrorCount = 0, hitProgressCount = 0;

            q.processN(1);

            p.then(
                function () { hitCompleteCount++; },
                function () { hitErrorCount++; },
                function (v) {
                    hitProgressCount++;
                    LiveUnit.Assert.areEqual(2, v);
                }
                );

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
            LiveUnit.Assert.areEqual(0, hitProgressCount);

            q.processN(1);

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
            LiveUnit.Assert.areEqual(1, hitProgressCount);

            q.processN(1);

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
            LiveUnit.Assert.areEqual(1, hitProgressCount);

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
            LiveUnit.Assert.areEqual(1, hitProgressCount);
        }

    testProgressWaterfall = function () {
            q.clear();

            var p = new WinJS.Promise(function (c, e, p) {
                q.schedule(function () { p(1); });
                q.schedule(function () { c(2); });
            });

            var hitProgress1Count = 0, hitProgress2Count = 0, hitProgress3Count = 0,
                hitProgress4Count = 0, hitCompleteCount = 0;

            p.then(null, null, function (v) {
                hitProgress1Count++;
                LiveUnit.Assert.areEqual(1, v);
            }).then(null, null, function (v) {
                    hitProgress2Count++;
                    LiveUnit.Assert.areEqual(1, v);
                }).then(function (v) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(2, v);
                }, null, function (v) {
                    hitProgress3Count++;
                    LiveUnit.Assert.areEqual(1, v);
                }).then(null, null, function (v) { hitProgress4Count++; });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitProgress1Count);
            LiveUnit.Assert.areEqual(1, hitProgress2Count);
            LiveUnit.Assert.areEqual(1, hitProgress3Count);
            LiveUnit.Assert.areEqual(0, hitProgress4Count);
            LiveUnit.Assert.areEqual(1, hitCompleteCount);
        }

    testCancellationOfConstantPromise = function () {
            q.clear();

            var hitCompleteCount = 0, hitErrorCount = 0;
            WinJS.Promise.as(1).
                then(function (value) { return asyncAddWithCancellation(value, 1); }).
                then(function (value) { hitCompleteCount++; }, function (error) { hitErrorCount++; }).
                cancel();

            q.drain();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        };

        testCancellationOfInFlightPromise = function () {
            q.clear();

            var hitCompleteCount = 0, hitErrorCount = 0;
            asyncAddWithCancellation(1, 1).
                then(function (value) { return asyncAdd(value, 1); }).
                then(function (value) { hitCompleteCount++; }, function (error) { hitErrorCount++; }).
                cancel();

            LiveUnit.Assert.isTrue(q.getItem(0).canceled);
            q.drain();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        };

        testCancellationOfTree = function () {
            q.clear();

            var cancelCount = 0;
            var onCancel = function () { cancelCount++; };

            var p1 = asyncAddWithCancellation(1, 1, onCancel);
            q.drain();

            LiveUnit.Assert.areEqual(0, cancelCount);

            p1 = p1.then(function (value) { return asyncAddWithCancellation(value, 3, onCancel); });

            var p2 = asyncAddWithCancellation(1, 2, onCancel);

            var p3 = WinJS.Promise.join({ p1: p1, p2: p2 }).
                then(function (values) { return asyncAddWithCancellation(values, 4, onCancel); });

            p3.cancel();

            q.drain();

            LiveUnit.Assert.areEqual(2, cancelCount);
        };

        testPromiseDeadlock = function () {
            q.clear();

            var hitCompleteCount = 0;

            var a, b;

            var c = asyncAdd(1, 2);

            a = c.then(function (v) {
                hitCompleteCount++;
                return b;
            }).
                then(function (v) {
                    hitCompleteCount++;
                });

            b = c.then(function (v) {
                hitCompleteCount++; return a;
            }).
                then(function (v) {
                    hitCompleteCount++;
                });

            q.drain();

            // These promises deadlock on each other and never make forward progress.
            LiveUnit.Assert.areEqual(2, hitCompleteCount);
        };

        testPromiseDeadlockCancellation = function () {
            q.clear();

            var hitCompleteCount = 0, hitFirstErrorCount = 0, hitSecondErrorCount = 0;

            var c: any = asyncAdd(1, 2);

            var a0: any = c.then(
                function (v) { hitCompleteCount++; return b; },
                function () { hitFirstErrorCount++; }
                );
            var a: any = a0.then(
                function () { hitCompleteCount++; },
                function (e) {
                    hitSecondErrorCount++;
                    LiveUnit.Assert.areEqual("Canceled", e.message);
                    throw e;
                }
                );

            var b0: any = c.then(
                function (v) { hitCompleteCount++; return a; },
                function () { hitFirstErrorCount++; }
                )
            var b: any = b0.then(
                function () { hitCompleteCount++; },
                function (e) {
                    hitSecondErrorCount++;
                    LiveUnit.Assert.areEqual("Canceled", e.message);
                    throw e;
                }
                );

            c.name = "c";
            a0.name = "a0";
            a.name = "a";
            b0.name = "b0";
            b.name = "b";

            q.drain();

            // These promises deadlock on each other and never make forward progress.
            LiveUnit.Assert.areEqual(2, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitFirstErrorCount);
            LiveUnit.Assert.areEqual(0, hitSecondErrorCount);

            // Should cancel both.
            b.cancel();

            LiveUnit.Assert.areEqual(2, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitFirstErrorCount);
            LiveUnit.Assert.areEqual(2, hitSecondErrorCount);
        };



        testBlockingOfCancelation = function () {
            q.clear();

            var hitCancelCount = 0, hitProtectedCompleteCount = 0, hitCompleteCount = 0,
                hitErrorCount = 0;

            var a = NoncancelablePromise(
                asyncAddWithCancellation(1, 2, function () { hitCancelCount++; }).
                    then(function () { hitProtectedCompleteCount++; })
                ).then(
                function () { hitCompleteCount++; },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual("Canceled", e.message);
                }
                );

            a.cancel();

            q.drain();

            LiveUnit.Assert.areEqual(0, hitCancelCount);
            LiveUnit.Assert.areEqual(1, hitProtectedCompleteCount);
            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        }

    testCancellationOnJoinOfSamePromise = function () {
            q.clear();

            var hitCancelCount = 0, hitCompleteCount = 0, hitErrorCount = 0;

            var p = asyncAddWithCancellation(1, 2, function () { hitCancelCount++; }).
                then(function () { hitCompleteCount++; }, function () { hitErrorCount++; });

            WinJS.Promise.join([p, p, p]).cancel();

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCancelCount);
            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        };

        testCycle = function () {
            q.clear();

            var hitCompleteCount = 0, hitErrorCount = 0;

            var p = asyncAdd(1, 2);
            p.
                then(
                function (v) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(3, v);
                    return p;
                },
                function () { hitErrorCount++; }
                ).
                then(
                function (v) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(3, v);
                    return p;
                },
                function () { hitErrorCount++; }
                ).
                then(
                function (v) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(3, v);
                },
                function () { hitErrorCount++; }
                );

            q.drain();

            LiveUnit.Assert.areEqual(3, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
        };

        testChainedAdds = function () {
            q.clear();

            var hitCompleteCount = 0;
            WinJS.Promise.as(1).
                then(function (value) { hitCompleteCount++; return asyncAdd(value, 1); }).
                then(function (value) { hitCompleteCount++; LiveUnit.Assert.areEqual(2, value); return asyncAdd(value, 2); }).
                then(function (value) { hitCompleteCount++; LiveUnit.Assert.areEqual(4, value); return asyncAdd(value, 3); }).
                then(function (value) { hitCompleteCount++; LiveUnit.Assert.areEqual(7, value); });

            q.drain();

            LiveUnit.Assert.areEqual(4, hitCompleteCount);
        };

        testError = function () {
            q.clear();

            var hitCompleteCount = 0, hitErrorCount = 0;
            WinJS.Promise.as(1).
                then(function (value) { return asyncAddWithError(value, 1); }).
                then(function () { hitCompleteCount++; }, function () { hitErrorCount++; throw 1; }).
                then(function () { hitCompleteCount++; }, function () { hitErrorCount++; });

            q.drain();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(2, hitErrorCount);
        };

        testErrorRecovery = function () {
            q.clear();

            var hitCompleteCount = 0, hitErrorCount = 0;
            WinJS.Promise.as(1).
                then(function (value) { return asyncAddWithError(value, 1); }).
                then(function () { hitCompleteCount++; }, function () { hitErrorCount++; return 10; }).
                then(function (value) { hitCompleteCount++; LiveUnit.Assert.areEqual(10, value); }, function () { hitErrorCount++; });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        };

        testErrorWithFork = function () {
            q.clear();

            var hitCompleteCount = 0, hitErrorCount = 0;
            var p = WinJS.Promise.as(1).
                then(function (value) { return asyncAddWithError(value, 1); });

            p.then(function () { hitCompleteCount++; }, function () { hitErrorCount++; });
            p.then(function () { hitCompleteCount++; }, function () { hitErrorCount++; });

            q.drain();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(2, hitErrorCount);
        };

        testExceptionFromCompleteHandler = function () {
            q.clear();

            var hit1stCompleteCount = 0, hit1stErrorCount = 0,
                hit2ndCompleteCount = 0, hit2ndErrorCount = 0;

            asyncAdd(1, 2).
                then(
                function () { hit1stCompleteCount++; throw 1; },
                function () { hit1stErrorCount++; }
                ).
                then(
                function () { hit2ndCompleteCount++; },
                function () { hit2ndErrorCount++; }
                );

            q.drain();

            LiveUnit.Assert.areEqual(1, hit1stCompleteCount);
            LiveUnit.Assert.areEqual(0, hit1stErrorCount);
            LiveUnit.Assert.areEqual(0, hit2ndCompleteCount);
            LiveUnit.Assert.areEqual(1, hit2ndErrorCount);
        };

        testFallthroughComplete = function () {
            q.clear();

            var hitCompleteCount = 0;
            WinJS.Promise.as(1).
                then(function (value) { return asyncAdd(value, 1); }).
                then(function (value) { LiveUnit.Assert.areEqual(2, value); hitCompleteCount++; return value; }).
                then(function (value) { LiveUnit.Assert.areEqual(2, value); hitCompleteCount++; return value; }).
                then(function (value) { LiveUnit.Assert.areEqual(2, value); hitCompleteCount++; return value; });

            q.drain();

            LiveUnit.Assert.areEqual(3, hitCompleteCount);
        };

        testProgess = function () {
            q.clear();

            var hitProgressCount = 0, hitCompleteCount = 0, hitErrorCount = 0;
            WinJS.Promise.as(1).
                then(function (value) { return asyncAddWithProgress(value, 1); }).
                then(function () { hitCompleteCount++; }, function () { hitErrorCount++; }, function () { hitProgressCount++; });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
            LiveUnit.Assert.areEqual(2, hitProgressCount);
        };

        testProgressExceptionIsIgnored = function () {
            q.clear();

            var hitProgressCount = 0, hitCompleteCount = 0, hitErrorCount = 0;
            WinJS.Promise.as(1).
                then(function (value) { return asyncAddWithProgress(value, 1); }).
                then(function () { hitCompleteCount++; }, function () { hitErrorCount++; }, function () { hitProgressCount++; throw 1; });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
            LiveUnit.Assert.areEqual(2, hitProgressCount);
        }

    testPromise_As = function () {
            q.clear();

            var p = asyncAdd(1, 2);
            LiveUnit.Assert.isTrue(p instanceof WinJS.Promise);
            LiveUnit.Assert.areEqual(p, WinJS.Promise.as(p));

            var o = { a: 1 };
            var p1 = WinJS.Promise.as(o);
            LiveUnit.Assert.areNotEqual(o, p1);
            var hitCompleteCount = 0;
            var p1Value;
            // This will run synchronously because it is already complete.
            p1.then(function (value) { hitCompleteCount++; p1Value = value; });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.isTrue(o === p1Value);

            // The contract we look for in 'as' is the same as 'is', you must have
            // a function which is named 'then'.
            var o2 = { then: function () { } };
            LiveUnit.Assert.isTrue(o2 === WinJS.Promise.as(o2));
        };

        testPromise_Any = function () {
            q.clear();

            var hitCompleteCount = 0;

            var input = [
                asyncAdd(1, 2),
                asyncAdd(3, 4)
            ];
            WinJS.Promise.any(input).
                then(function (item) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(input[0], item.value);
                    LiveUnit.Assert.areNotEqual(input[1], item.value);
                });

            q.processN(1);

            LiveUnit.Assert.areEqual(1, hitCompleteCount);

            q.drain();
        };

        testPromise_AnyWithNonPromiseInput = function () {
            q.clear();

            var hitCompleteCount = 0;

            var input: any[] = [
                asyncAdd(1, 2),
                asyncAdd(3, 4),
                5
            ];
            WinJS.Promise.any(input).
                then(function (item) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(5, item.value);
                    LiveUnit.Assert.areEqual(input[2], item.value);
                    LiveUnit.Assert.areNotEqual(input[0], item.value);
                    LiveUnit.Assert.areNotEqual(input[1], item.value);
                });

            LiveUnit.Assert.areEqual(1, hitCompleteCount);

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
        };

        testPromise_AnyWithAllNonPromiseInput = function () {
            q.clear();

            var hitCompleteCount = 0;

            var input: any[] = [
                3,
                7,
                5
            ];
            WinJS.Promise.any(input).
                then(function (item) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(3, item.value);
                    LiveUnit.Assert.areEqual(input[0], item.value);
                    LiveUnit.Assert.areNotEqual(input[1], item.value);
                    LiveUnit.Assert.areNotEqual(input[2], item.value);
                });

            LiveUnit.Assert.areEqual(1, hitCompleteCount);

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
        };

        testPromise_AnyWithError = function () {
            q.clear();

            var hitCompleteCount = 0, hitErrorCount = 0;

            var input = [
                asyncAddWithError(1, 2),
                asyncAdd(3, 4)
            ];
            WinJS.Promise.any(input).
                then(
                function () { hitCompleteCount++; },
                function (item) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual(input[0], item.value);
                    // One promise is fulfilled, remove it from the array, and block until
                    // the other one is fulfilled
                    input.splice(input.indexOf(item.value), 1);
                    return WinJS.Promise.any(input);
                }
                ).
                then(
                function (item) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(input[0], item.value);
                },
                function () { hitErrorCount++; }
                );

            q.processN(1);

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        };

        testPromise_AnyWithError2 = function () {
            q.clear();

            var hitCompleteCount = 0, hitErrorCount = 0;

            var p0 = asyncAddWithError(1, 2);
            var p1 = asyncAdd(3, 4);

            // Make sure the later element in the array completes earlier.
            //
            var input = [p1, p0];

            WinJS.Promise.any(input).
                then(
                function () { hitCompleteCount++; },
                function (item) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual(input[1], item.value);
                    // One promise is fulfilled, remove it from the array, and block until
                    // the other one is fulfilled
                    input.splice(input.indexOf(item.value), 1);
                    return WinJS.Promise.any(input);
                }
                ).
                then(
                function (item) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(input[0], item.value);
                },
                function () { hitErrorCount++; }
                );

            q.processN(1);

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        };

        testPromise_AnyCancellation = function () {
            q.clear();

            var hitCancelCount = 0, hitCompleteCount = 0, hitErrorCount = 0;
            var p0 = asyncAddWithCancellation(1, 2, function () { hitCancelCount++; });
            var p1 = asyncAddWithCancellation(1, 2, function () { hitCancelCount++; });

            var a = WinJS.Promise.any([p0, p1]).
                then(
                function () { hitCompleteCount++; },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual("Canceled", e.message);
                }
                );

            a.cancel();

            LiveUnit.Assert.areEqual(2, hitCancelCount);
            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);

            q.drain();

            WinJS.Promise.any([p0, p1]).
                then(
                function () { hitCompleteCount++; },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual("Canceled", e.message);
                }
                );

            LiveUnit.Assert.areEqual(2, hitCancelCount);
            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(2, hitErrorCount);

            q.drain();

            LiveUnit.Assert.areEqual(2, hitCancelCount);
            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(2, hitErrorCount);
        };

        testPromise_AnyWithRecord = function () {
            q.clear();

            var hitCompleteCount = 0;

            var input = {
                first: asyncAdd(1, 2),
                second: asyncAdd(3, 4)
            };
            WinJS.Promise.any(input).
                then(function (item) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual("first", item.key);
                    LiveUnit.Assert.areEqual(input.first, item.value);
                    LiveUnit.Assert.areNotEqual(input.second, item.value);
                });

            q.processN(1);

            LiveUnit.Assert.areEqual(1, hitCompleteCount);

            q.drain();
        }

    testPromise_Is = function () {
            LiveUnit.Assert.isTrue(WinJS.Promise.is(WinJS.Promise.wrap(12)));
            LiveUnit.Assert.isFalse(WinJS.Promise.is(12));

            LiveUnit.Assert.isTrue(WinJS.Promise.is({ then: function () { return 1; } }));
            LiveUnit.Assert.isFalse(WinJS.Promise.is({ then: 1 }));
        };

        testPromise_wrapCancellation = function () {
            var hitCompleteCount = 0;

            var a = WinJS.Promise.wrap(1);
            a.cancel();
            a.then(function () { hitCompleteCount++; });

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
        };

        testPromise_wrapErrorCancellation = function () {
            var hitCompleteCount = 0, hitErrorCount = 0;

            var a = WinJS.Promise.wrapError(1);
            a.cancel();
            a.then(
                function () { hitCompleteCount++; },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual(1, e);
                }
                );

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        };

        testPromise_Join = function () {
            q.clear();

            var hitCompleteCount = 0;
            var result;
            WinJS.Promise.join({
                first: asyncAdd(1, 2),
                second: asyncAdd(3, 4)
            }).
                then(function (value) {
                    hitCompleteCount++;
                    result = value.first + value.second;
                });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(10, result);
        };

        testPromise_JoinProgress = function () {
            q.clear();

            var hitCompleteCount = 0, hitProgressCount = 0;
            var result;
            var input = {
                first: asyncAddWithProgress(1, 2),
                second: asyncAddWithProgress(3, 4),
                third: asyncAddWithProgress(6, 7)
            };
            WinJS.Promise.join(input).
                then(
                function (value) {
                    hitCompleteCount++;
                    result = value.first + value.second + value.third;
                },
                null,
                function (value) {
                    LiveUnit.Assert.areEqual(Object.keys(input)[hitProgressCount], value.Key);
                    hitProgressCount++;
                }
                );

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            // We don't get a progress callback for the last item to complete.
            //
            LiveUnit.Assert.areEqual(2, hitProgressCount);
            LiveUnit.Assert.areEqual(23, result);
        };

        testPromise_JoinWithArray = function () {
            q.clear();

            var hitCompleteCount = 0;
            var result;
            WinJS.Promise.join([
                asyncAdd(1, 2),
                asyncAdd(3, 4)
            ]).
                then(function (value) {
                    hitCompleteCount++;
                    result = value[0] + value[1];
                });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(10, result);
        };

        testPromise_JoinWithError = function () {
            q.clear();

            var hitCompleteCount = 0, hitErrorCount = 0;
            WinJS.Promise.join({
                first: asyncAdd(1, 2),
                second: asyncAddWithError(3, 4)
            }).
                then(function (value) { hitCompleteCount++; return 12; }).
                then(null, function (error) {
                    hitErrorCount++;
                    LiveUnit.Assert.isTrue(error.second !== undefined);
                    LiveUnit.Assert.isTrue(error.first === undefined);
                });

            q.drain();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        };

        testPromise_JoinWithNonPromiseInput = function () {
            q.clear();

            var hitCompleteCount = 0;
            var result;
            WinJS.Promise.join({
                first: asyncAdd(1, 2),
                second: asyncAdd(3, 4),
                third: 24
            }).
                then(function (value) {
                    hitCompleteCount++;
                    result = value.first + value.second + value.third;
                });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(34, result);
        };

        testPromise_JoinWithAllNonPromiseInput = function () {
            q.clear();

            var hitCompleteCount = 0;
            var result;
            WinJS.Promise.join({
                first: 3,
                second: 7,
                third: 24
            }).
                then(function (value) {
                    hitCompleteCount++;
                    result = value.first + value.second + value.third;
                });

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(34, result);

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(34, result);
        };

        testPromise_Then = function () {
            q.clear();

            var hitCompleteCount = 0;
            var p = WinJS.Promise.as(1);
            p = WinJS.Promise.then(p, function (value) { hitCompleteCount++; return asyncAdd(value, 1); });
            p = WinJS.Promise.then(p, function (value) { hitCompleteCount++; LiveUnit.Assert.areEqual(2, value); return asyncAdd(value, 2); });
            p = WinJS.Promise.then(p, function (value) { hitCompleteCount++; LiveUnit.Assert.areEqual(4, value); return asyncAdd(value, 3); });
            p = WinJS.Promise.then(p, function (value) { hitCompleteCount++; LiveUnit.Assert.areEqual(7, value); });

            q.drain();

            LiveUnit.Assert.areEqual(4, hitCompleteCount);
        };

        // @TODO, how do we do this? Include jQuery or dojo in the test tree?
        testInterop = function () {
        };

        testTimeoutNoWait = function (complete) {
            var i = 0;
            var hit1 = false, hit2 = false;

            WinJS.Utilities._setImmediate(function () {
                hit1 = true;
            });

            // calling timeout() without a parameter results in calling WinJS.Utilities._setImmediate() which will
            // execute immediately after the browser has processed outstanding work.
            WinJS.Promise.timeout().then(function () {
                i++;
                LiveUnit.Assert.areEqual(1, i);
                LiveUnit.Assert.isTrue(hit1, "expected to run after the above explicit WinJS.Utilities._setImmediate");
                LiveUnit.Assert.isFalse(hit2, "expected to run before the below explicit WinJS.Utilities._setImmediate");
            }).
                then(null, errorHandler).
                then(complete);

            LiveUnit.Assert.areEqual(0, i);

            WinJS.Utilities._setImmediate(function () {
                hit2 = true;
            });
        };


        testTimeoutOfPromises = function (complete) {
            var p = new WinJS.Promise(function () { });
            var hitCompleteCount = 0, hitErrorCount = 0;
            p.then(
                function () {
                    hitCompleteCount++;
                    LiveUnit.Assert.fail("Should not complete");
                },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual("Canceled", e.name);
                });

            WinJS.Promise.timeout(0, p).
                then(
                function () {
                    hitCompleteCount++;
                    LiveUnit.Assert.fail("Should not complete");
                },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual("Canceled", e.name);
                }
                ).
                then(function () {
                    LiveUnit.Assert.areEqual(0, hitCompleteCount);
                    LiveUnit.Assert.areEqual(2, hitErrorCount);
                }).
                then(null, errorHandler).
                then(complete);
        };

        testTimeoutOfPromisesWhichComplete = function (complete) {
            var completeP;
            var p = new WinJS.Promise(function (c) { completeP = c; });
            var hitCompleteCount = 0, hitErrorCount = 0;
            p.then(
                function (v) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(1, v);
                },
                function () {
                    hitErrorCount++;
                    LiveUnit.Assert.fail("should not error");
                });

            WinJS.Promise.timeout(0, p).
                then(
                function (v) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(1, v);
                },
                function () {
                    hitErrorCount++;
                    LiveUnit.Assert.fail("should not errror");
                }
                ).
                then(function () {
                    LiveUnit.Assert.areEqual(2, hitCompleteCount);
                    LiveUnit.Assert.areEqual(0, hitErrorCount);
                }).
                then(null, errorHandler).
                then(complete);

            completeP(1);
        };

        testTimeoutZeroWait = function (complete) {
            var i = 0;
            var start = new Date();

            // We were seeing some occaisional failures when expecting delay < 33ms so using larger value now
            // to increase test reliability.
            WinJS.Promise.timeout(0).then(function () {
                i++;
                LiveUnit.Assert.areEqual(1, i);
                var delay = new Date().valueOf() - start.valueOf();
                LiveUnit.Assert.isTrue(delay < timeoutMax, "expected timeout < " + timeoutMax + ", got=" + delay);
            }).
                then(null, errorHandler).
                then(complete);
            LiveUnit.Assert.areEqual(0, i);
        };

        testTimeoutWait = function (complete) {
            var timeoutDuration = 100;
            var i = 0;
            var start = new Date();

            // expecting this timeout to fire within 50% of requested time out at the earliest
            WinJS.Promise.timeout(timeoutDuration).then(function () {
                i++;
                LiveUnit.Assert.areEqual(1, i);
                var delay = new Date().valueOf() - start.valueOf();
                LiveUnit.Assert.isTrue(delay >= timeoutDuration / 2, "expected delay to be at least " + timeoutDuration / 2 + "; got actual delay=" + delay);
            }).
                then(null, errorHandler).
                then(complete);
            LiveUnit.Assert.areEqual(0, i);
        };

        testTimeoutNoWaitCancel = function (complete) {
            var i = 0;
            var a = WinJS.Promise.timeout().then(function () {
                i++;
                LiveUnit.Assert.fail("this should never get called!");
            });
            WinJS.Promise.timeout(35).then(function () {
                i++;
                LiveUnit.Assert.areEqual(1, i);
            }).
                then(null, errorHandler).
                then(complete);
            a.cancel();
            LiveUnit.Assert.areEqual(0, i);
        };

        testTimeoutWaitCancel = function (complete) {
            var i = 0;
            var a = WinJS.Promise.timeout(25).then(function () {
                i++;
                LiveUnit.Assert.fail("this should never get called!");
            });
            WinJS.Promise.timeout(35).then(function () {
                i++;
                LiveUnit.Assert.areEqual(1, i);
            }).
                then(null, errorHandler).
                then(complete);
            a.cancel();
            LiveUnit.Assert.areEqual(0, i);
        };

        testThenEach = function (complete) {

            q.clear();

            WinJS.Promise.thenEach([asyncAdd(1, 2), asyncAdd(3, 4), asyncAdd(5, 6)],
                function (value) {
                    LiveUnit.Assert.areEqual("number", typeof value);
                    return value;
                }).
                then(function (values) {
                    LiveUnit.Assert.areEqual(3, values[0]);
                    LiveUnit.Assert.areEqual(7, values[1]);
                    LiveUnit.Assert.areEqual(11, values[2]);
                }).
                then(null, errorHandler).
                then(complete);

            q.drain();

        }

    testCompletePromise = function () {
            var hitCompleteCount = 0, hitErrorCount = 0, hitProgressCount = 0;

            var c = new (<any>WinJS.Promise).wrap(1);
            var r1 = c.then(
                function (v) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(1, v);
                },
                function () { hitErrorCount++; },
                function () { hitProgressCount++; }
                );
            var r2 = r1.then(
                function () {
                    hitCompleteCount++;
                }
                );
            LiveUnit.Assert.isTrue(r1 === r2, "Because of our optimization in the sync completion path we should not allocate a new promise unless there is a new return value");
            LiveUnit.Assert.areEqual(2, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
            LiveUnit.Assert.areEqual(0, hitProgressCount);
        }

    testErrorPromise = function () {
            var hitCompleteCount = 0, hitErrorCount = 0, hitProgressCount = 0;

            var c = new (<any>WinJS.Promise).wrapError(1);
            c.then(
                function () { hitCompleteCount++; },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual(1, e);
                },
                function () { hitProgressCount++; }
                );

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
            LiveUnit.Assert.areEqual(0, hitProgressCount);
        }

    testOnErrorHandler = function () {

            q.clear();

            var hitCount = 0;
            WinJS.Promise.onerror = function (evt) {
                LiveUnit.Assert.isTrue(!!evt.detail.error);
                hitCount++;
            };
            var errorPromise = WinJS.Promise.wrapError(1);
            LiveUnit.Assert.areEqual(1, hitCount);

            var p = new WinJS.Promise(function (c, e) {
                q.schedule(function () { e(1); });
            });
            LiveUnit.Assert.areEqual(1, hitCount);

            q.drain();

            LiveUnit.Assert.areEqual(2, hitCount);

            var hitComplete = false;
            p.then(null, function (value) {
                return 7;
            }).then(function (value) {
                    hitComplete = true;
                    LiveUnit.Assert.areEqual(7, value);
                });
            LiveUnit.Assert.isTrue(hitComplete);
            LiveUnit.Assert.areEqual(3, hitCount);

        }

    testOnErrorDoesNotSeeCancelation = function () {

            q.clear();

            var hitCount = 0;
            WinJS.Promise.onerror = function (evt) {
                LiveUnit.Assert.isTrue(!!evt.detail.error);
                hitCount++;
            };
            try {
                LiveUnit.Assert.areEqual(0, hitCount);

                var p = new WinJS.Promise(function (c, e) {
                    q.schedule(function () { e(1); });
                });
                LiveUnit.Assert.areEqual(0, hitCount);

                var completedHitCount = 0;
                var canceledHitCount = 0;

                p.then(
                    function () {
                        completedHitCount++;
                    },
                    function (e) {
                        if (e.name === "Canceled") {
                            canceledHitCount++;
                        }
                    }
                    );

                p.cancel();

                LiveUnit.Assert.areEqual(0, hitCount);
                LiveUnit.Assert.areEqual(1, canceledHitCount);
                LiveUnit.Assert.areEqual(0, completedHitCount);

                q.drain();

                LiveUnit.Assert.areEqual(0, hitCount);
                LiveUnit.Assert.areEqual(1, canceledHitCount);
                LiveUnit.Assert.areEqual(0, completedHitCount);
            } finally {
                WinJS.Promise.onerror = undefined;
            }
        }

    testOnErrorHandlerPolicyWithHandledError = function (complete) {
            var onerrorCallbackCount = 0;
            var unhandledAfterPostCount = 0;
            var unhandledErrors = [];
            WinJS.Promise.onerror = function (evt) {
                onerrorCallbackCount++;
                var details = evt.detail;
                var id = details.id;
                if (!details.parent) {
                    unhandledErrors[id] = details;
                    WinJS.Promise.timeout().then(function () {
                        var error = unhandledErrors[id];
                        if (error) {
                            //
                            // in real code here we would either log or rethrow the exception
                            //
                            unhandledAfterPostCount++;
                            delete unhandledErrors[id]
                    }
                    });
                } else if (details.handler) {
                    delete unhandledErrors[id];
                }
            };
            var p: any = new WinJS.Promise(function (c, e) {
                e("This promise is broken");
            });
            LiveUnit.Assert.areEqual(1, onerrorCallbackCount);
            LiveUnit.Assert.areEqual(1, Object.keys(unhandledErrors).length);
            LiveUnit.Assert.areEqual(0, unhandledAfterPostCount);
            var hitCompleteCount = 0;
            var hitErrorCount = 0;
            var p = p.
                then(function (v) { /* never get here */ hitCompleteCount++; }).
                then(function (v) { /* never get here either */ hitCompleteCount++; });
            // since we optimize the case where a promise has already been completed in error and
            // no error handler was specified we will only see a single onerrorCallbackCount
            LiveUnit.Assert.areEqual(1, onerrorCallbackCount);
            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
            LiveUnit.Assert.areEqual(1, Object.keys(unhandledErrors).length);
            LiveUnit.Assert.areEqual(0, unhandledAfterPostCount);

            p.
                then(null, function (v) { hitErrorCount++; return 1; }).
                then(function (v) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(1, v);
                });
            LiveUnit.Assert.areEqual(2, onerrorCallbackCount);
            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
            LiveUnit.Assert.areEqual(0, Object.keys(unhandledErrors).length);
            LiveUnit.Assert.areEqual(0, unhandledAfterPostCount);

            WinJS.Promise.timeout().then(function () {
                LiveUnit.Assert.areEqual(1, hitCompleteCount);
                LiveUnit.Assert.areEqual(1, hitErrorCount);
                LiveUnit.Assert.areEqual(0, Object.keys(unhandledErrors).length);
                LiveUnit.Assert.areEqual(0, unhandledAfterPostCount);

                WinJS.Promise.onerror = undefined;

                complete();
            });
        }

    testOnErrorHandlerPolicyWithUnhandledError = function (complete) {
            var unhandledAfterPostCount = 0;
            var unhandledErrors = [];
            WinJS.Promise.onerror = function (evt) {
                var details = evt.detail;
                var id = details.id;
                if (!details.parent) {
                    unhandledErrors[id] = details;
                    WinJS.Promise.timeout().then(function () {
                        var error = unhandledErrors[id];
                        if (error) {
                            //
                            // in real code here we would either log or rethrow the exception
                            //
                            unhandledAfterPostCount++;
                            delete unhandledErrors[id]
                    }
                    });
                } else if (details.handler) {
                    delete unhandledErrors[id];
                }
            };
            var p = new WinJS.Promise<void>(function (c, e) {
                e("This promise is broken");
            });
            var hitCompleteCount = 0;
            var hitErrorCount = 0;
            var p = p.
                then(function (v) { /* never get here */ hitCompleteCount++; }).
                then(function (v) { /* never get here either */ hitCompleteCount++; });
            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
            LiveUnit.Assert.areEqual(1, Object.keys(unhandledErrors).length);
            LiveUnit.Assert.areEqual(0, unhandledAfterPostCount);

            var errorHandler = function () { return true; }
        WinJS.Application.addEventListener("error", errorHandler);

            WinJS.Promise.timeout().then(function () {
                LiveUnit.Assert.areEqual(0, hitCompleteCount);
                LiveUnit.Assert.areEqual(0, hitErrorCount);
                // After hitting the unhandled handler it cleared out the unhandled error
                LiveUnit.Assert.areEqual(0, Object.keys(unhandledErrors).length);
                LiveUnit.Assert.areEqual(1, unhandledAfterPostCount);

                p.
                    then(null, function (v) { hitErrorCount++; return 1; }).
                    then(function (v) {
                        hitCompleteCount++;
                        LiveUnit.Assert.areEqual(1, v);
                    });
                LiveUnit.Assert.areEqual(1, hitCompleteCount);
                LiveUnit.Assert.areEqual(1, hitErrorCount);
                LiveUnit.Assert.areEqual(0, Object.keys(unhandledErrors).length);
                LiveUnit.Assert.areEqual(1, unhandledAfterPostCount);

                WinJS.Promise.timeout().then(function () {
                    LiveUnit.Assert.areEqual(1, hitCompleteCount);
                    LiveUnit.Assert.areEqual(1, hitErrorCount);
                    LiveUnit.Assert.areEqual(0, Object.keys(unhandledErrors).length);
                    LiveUnit.Assert.areEqual(1, unhandledAfterPostCount);

                    WinJS.Promise.onerror = undefined;

                    WinJS.Application.removeEventListener("error", errorHandler);
                    complete();
                });
            });
        }
    // Testing basic error functionality and throwing an error inside complete
    testBasicOnErrorFunctionality = function () {

            var errorHitCount = 0, completeHitCount = 0;
            var onErrorHitCount = 0;
            try {
                WinJS.Promise.onerror = function (evt) {
                    onErrorHitCount++;
                    var detail = evt.detail;
                    if (!!detail.parent)
                        LiveUnit.Assert.isTrue(!!detail.handler);
                    LiveUnit.Assert.isTrue(!!detail.id);
                    LiveUnit.Assert.isTrue(!!detail.exception);
                    LiveUnit.Assert.isTrue(!detail.error);
                }
            var p = new WinJS.Promise(function () { throw "exception inside function"; }).
                    then(function () { completeHitCount++; }, function () { errorHitCount++; }).
                    then(
                    function () {
                        LiveUnit.Assert.areEqual(1, errorHitCount);
                        LiveUnit.Assert.areEqual(0, completeHitCount);
                        LiveUnit.Assert.areEqual(2, onErrorHitCount);
                    }
                    );
            } finally {
                WinJS.Promise.onerror = undefined;
            }
        }

    // Test removing the onerror handler before an error takes place and make sure that onerror will not be called
    testUnRegisterHandlerBeforeCallingPromise = function () {

            var handlerHitCount = 0;

            var errroHandler = function () { return true; }
        WinJS.Application.addEventListener("error", errorHandler);
            WinJS.Promise.onerror = function (evt) {
                var detail = evt.detail;
                handlerHitCount++;
            }
        try {
                WinJS.Promise.onerror = undefined;

                var p = new WinJS.Promise(function () { throw "exception inside function"; }, function () { }).
                    then(function () { LiveUnit.Assert.areEqual(0, handlerHitCount); });
            } finally {
                WinJS.Application.removeEventListener("error", errorHandler);
                WinJS.Promise.onerror = undefined;
            }
        }

    // Making sure that the errorID is the same for all the promise tree
    testVerifySameErrorId = function () {

            var handlerHitCount = 0;
            var id = undefined;
            WinJS.Promise.onerror = function (evt) {
                var detail = evt.detail;
                id = id || detail.id;
                LiveUnit.Assert.areEqual(id, detail.id);
                handlerHitCount++;
            }
        try {
                var p = new WinJS.Promise(function () { throw "error"; }).
                    then(function () { }, function () { }).
                    then(function () { LiveUnit.Assert.areEqual(2, handlerHitCount); });
            } finally {
                WinJS.Promise.onerror = undefined;
            }
        }

    testThrowingUndefined = function () {

            WinJS.Promise.onerror = function (evt) {
                var detail = evt.detail;
                LiveUnit.Assert.isTrue(!detail.exception);
                LiveUnit.Assert.areEqual("undefined", typeof detail.exception);
            }
        try {
                var p = new WinJS.Promise(function () { throw undefined; });
            } finally {
                WinJS.Promise.onerror = undefined;
            }
        }

    testThrowingNull = function () {

            WinJS.Promise.onerror = function (evt) {
                var detail = evt.detail;
                LiveUnit.Assert.areEqual(null, detail.exception);
                LiveUnit.Assert.areEqual("object", typeof detail.exception);
            }
        try {
                var p = new WinJS.Promise(function () { throw null; });
            } finally {
                WinJS.Promise.onerror = undefined;
            }
        }

    testThrowingNumber = function () {

            WinJS.Promise.onerror = function (evt) {
                var detail = evt.detail;
                LiveUnit.Assert.areEqual(1, detail.exception);
                LiveUnit.Assert.areEqual("number", typeof detail.exception);
            }
        try {
                var p = new WinJS.Promise(function () { throw 1; });
            } finally {
                WinJS.Promise.onerror = undefined;
            }
        }

    testThrowingObject = function () {

            WinJS.Promise.onerror = function (evt) {
                var detail = evt.detail;
                var temp = detail.exception;
                var type = typeof temp;
                LiveUnit.Assert.areEqual("object", type);
                LiveUnit.Assert.areEqual(10, temp.x);
            }
        try {
                var p = new WinJS.Promise(function () { throw { x: 10 }; });
            } finally {
                WinJS.Promise.onerror = undefined;
            }
        }

    // Making sure that different IDs are generated for errors produced by different promise trees
    testDifferentIdsForDifferentPromises = function () {

            var handlerHitCount = 0;
            var id = undefined;
            WinJS.Promise.onerror = function (evt) {
                var detail = evt.detail;
                handlerHitCount++;
                if (!detail.parent) {
                    if (id)
                        LiveUnit.Assert.areNotEqual(id, detail.id);
                    else
                        id = detail.id;
                }

            }
        try {
                var p1 = new WinJS.Promise(function () { throw "exception inside function"; }).
                    then(function () { }, function () { }).
                    then(function () { });

                var p2 = new WinJS.Promise(function () { }).
                    then(function () { LiveUnit.Assert.areEqual(4, handlerHitCount) }); //To make sure that the onerror is called 4 times;
            } finally {
                WinJS.Promise.onerror = undefined;
            }
        }

    // Making sure that same object is passed to onerror for an error on the same promise tree
    testVerifySameObjectInMultipleErrorHandlers = function () {

            function Equal(evt1, evt2) {
                for (var i in evt1) {
                    if (typeof evt1[i] === "object")
                        return Equal(evt1[i], evt2[i]);
                    else if (typeof evt1[i] !== "object" && evt1[i] !== evt2[i])
                        return false;
                }
                return true;
            }
            function eventHandler1(evt) {
                detail1 = evt.detail;
                handlerHitCount++;
            }
            function eventHandler2(evt) {
                detail2 = evt.detail;

                LiveUnit.Assert.isTrue(Equal(detail1, detail2));
                handlerHitCount++;
            }
            function eventHandler3(evt) {
                detail3 = evt.detail;
                LiveUnit.Assert.isTrue(Equal(detail3, detail2));
                handlerHitCount++;
            }

            WinJS.Promise.addEventListener("error", eventHandler1);
            WinJS.Promise.addEventListener("error", eventHandler2);
            WinJS.Promise.addEventListener("error", eventHandler3);
            try {
                var detail1, detail2, detail3;
                var handlerHitCount = 0, hitCount = 0;

                var p = new WinJS.Promise(function () { throw "Error initializing"; });

                p.then(function () { hitCount++; }, function (e) { });

                LiveUnit.Assert.areEqual(0, hitCount);
                LiveUnit.Assert.areEqual(6, handlerHitCount);
            } finally {
                WinJS.Promise.removeEventListener("error", eventHandler1);
                WinJS.Promise.removeEventListener("error", eventHandler2);
                WinJS.Promise.removeEventListener("error", eventHandler3);
            }
        }

    //Making sure that error property exists in the parameter and exception does not exist
    testCorrectnessOfErrors = function () {

            var errorString = "This is an error";
            WinJS.Promise.onerror = function (evt) {
                var detail = evt.detail;
                LiveUnit.Assert.isTrue(!detail.exception);
                LiveUnit.Assert.isTrue(!!detail.error);
                LiveUnit.Assert.isTrue(!!detail.id);
                LiveUnit.Assert.areEqual(errorString, detail.error);
            }
        try {
                var p = new WinJS.Promise(function (c, e) { e(errorString); });
            } finally {
                WinJS.Promise.onerror = undefined;
            }
        }

    // Testing parent list and making sure that the parent is falsy only in case of the root
    // This will still work work the first time because the parent is undefined for the initial error
    testOnErrorParentsList = function () {

            var parent = undefined;

            WinJS.Promise.onerror = function (evt) {
                var detail = evt.detail;
                LiveUnit.Assert.areEqual(parent, detail.parent);

                parent = detail.promise;

            }
        try {
                var p = new WinJS.Promise(function () { throw "exception inside function"; }).
                    then(function () { }).
                    then(function () { }).
                    then(null, function () { });
            } finally {
                WinJS.Promise.onerror = undefined;
            }
        }

    testOnErrorParameterProperties = function () {

            var exceptionStr = "exception inside function";
            WinJS.Promise.onerror = function (evt) {
                var detail = evt.detail;
                if (!detail.parent) {
                    LiveUnit.Assert.isTrue(!!detail.exception);
                    LiveUnit.Assert.isTrue(!detail.handler);
                    LiveUnit.Assert.isTrue(!detail.error);
                    LiveUnit.Assert.areEqual(exceptionStr, detail.exception);
                }
            }
        try {
                var p = new WinJS.Promise(function () { throw exceptionStr; }).
                    then(function () { }, function () { });
            } finally {
                WinJS.Promise.onerror = undefined;
            }
        }

    // Throwing an error in error handler
    // This will result in throwing a new error with a new id which will result in a new a tree of onerror function call
    testThrowingAnErrorInErrorHandler = function () {

            var handlerHitCount = 0, hitCount = 0;
            var str;

            function eventHandler(evt) {
                handlerHitCount++;
                var detail = evt.detail;
                str = str || detail.exception;
                LiveUnit.Assert.areEqual(str, detail.exception);
            }

            WinJS.Promise.addEventListener("error", eventHandler);
            try {
                var p = new WinJS.Promise(function () { throw "Error initializing"; });

                p.
                    then(function () { hitCount++; }, function (e) { throw e; }).
                    then(function () { hitCount++; }, function (e) { throw e; }).
                    then(function () { hitCount++; }, function (e) { throw e; });

                LiveUnit.Assert.areEqual(0, hitCount);
                LiveUnit.Assert.areEqual(4, handlerHitCount);
            } finally {
                WinJS.Promise.removeEventListener("error", eventHandler);
            }
        }

    // Testing an error chain
    testHugeErrorWithChain = function () {

            var handlerHitCount = 0, hitCount = 0;

            function eventHandler(evt) {
                handlerHitCount++;
            }

            WinJS.Promise.addEventListener("error", eventHandler);
            try {
                var p = new WinJS.Promise(function () { throw "Error initializing"; });

                p.
                    then(function () { hitCount++; }).
                    then(function () { hitCount++; }).
                    then(null, function (e) { throw e; });

                LiveUnit.Assert.areEqual(0, hitCount);
                LiveUnit.Assert.areEqual(2, handlerHitCount);
            } finally {
                WinJS.Promise.removeEventListener("error", eventHandler);
            }

        }

    // Testing unregistering the onerror inside an error chain by using removeEventListener
    testUnregisterInHugeChain = function () {

            var handlerHitCount = 0, hitCount = 0;

            function eventHandler(evt) {
                handlerHitCount++;
            }

            WinJS.Promise.addEventListener("error", eventHandler);

            try {
                var p = new WinJS.Promise(function () { throw "Error initializing"; });

                p.
                    then(
                    function () { hitCount++; },
                    function (e) { throw e; }
                    ).
                    then(
                    function () { hitCount++; },
                    function (e) {
                        WinJS.Promise.removeEventListener("error", eventHandler);
                        throw e;
                    }
                    ).
                    then(
                    function () { hitCount++; },
                    function (e) { throw e; }
                    );

                LiveUnit.Assert.areEqual(0, hitCount);
                LiveUnit.Assert.areEqual(3, handlerHitCount);
            } finally {
                WinJS.Promise.removeEventListener("error", eventHandler);
            }
        }

    // Testing unregistering the onerror inside an error chain by setting onerror to undefined
    testSettingOnErrorToUndefinedInHugeChain = function () {

            var handlerHitCount = 0, hitCount = 0;

            WinJS.Promise.onerror = function (evt) {
                handlerHitCount++;
            }
        try {
                var p = new WinJS.Promise(function () { throw "Error initializing"; });

                p.
                    then(
                    function () { hitCount++; },
                    function (e) { throw e; }
                    ).
                    then(
                    function () { hitCount++; },
                    function (e) {
                        WinJS.Promise.onerror = undefined;
                        throw e;
                    }
                    ).
                    then(
                    function () { hitCount++; },
                    function (e) { }
                    );

                LiveUnit.Assert.areEqual(0, hitCount);
                LiveUnit.Assert.areEqual(3, handlerHitCount);
            } finally {
                WinJS.Promise.onerror = undefined;
            }
        }

    // Testing chaining when the then does not have an error handler so the error or the exception
    // gets chained to the next then so that it can be handled by an errorHandler
    testSettingOnErrorToUndefinedInHugeChain2 = function () {

            var handlerHitCount = 0, hitCount = 0;

            WinJS.Promise.onerror = function (evt) {
                handlerHitCount++;
            }
        try {
                var p = new WinJS.Promise(function () { throw "Error initializing"; });

                p.
                    then(function () { hitCount++; }).
                    then(
                    function () {
                        hitCount++;
                    },
                    function (e) {
                        WinJS.Promise.onerror = undefined;
                        throw e;
                    }
                    ).
                    then(function () { hitCount++; }, function (e) { });

                LiveUnit.Assert.areEqual(0, hitCount);
                LiveUnit.Assert.areEqual(2, handlerHitCount);
            } finally {
                WinJS.Promise.onerror = undefined;
            }
        }

    testRemovingOnErrorInHugeChain2 = function () {

            var handlerHitCount = 0, hitCount = 0;

            function eventHandler(evt) {
                handlerHitCount++;
            }
            WinJS.Promise.addEventListener("error", eventHandler);

            try {
                var p = new WinJS.Promise(function () { throw "Error initializing"; });

                p.
                    then(function () { hitCount++; }).
                    then(
                    function () {
                        hitCount++;
                    },
                    function (e) {
                        WinJS.Promise.removeEventListener("error", eventHandler);
                        throw e;
                    }
                    ).
                    then(function () { hitCount++; }, function (e) { });

                LiveUnit.Assert.areEqual(0, hitCount);
                LiveUnit.Assert.areEqual(2, handlerHitCount);

            } finally {
                WinJS.Promise.removeEventListener("error", eventHandler);
            }
        }

    // adding multiple listeners to onerror and make sure that they all get called
    testAddingMultipleListeners = function () {

            function eventHandler1(evt) {
                var detail = evt.detail;
                if (!detail.parent)
                    handlerHitCount++;
            }
            function eventHandler2(evt) {
                var detail = evt.detail;

                if (!detail.parent)
                    handlerHitCount++;
            }
            function eventHandler3(evt) {
                var detail = evt.detail;
                if (!detail.parent)
                    handlerHitCount++;
            }

            WinJS.Promise.addEventListener("error", eventHandler1);
            WinJS.Promise.addEventListener("error", eventHandler1);
            WinJS.Promise.addEventListener("error", eventHandler2);
            WinJS.Promise.addEventListener("error", eventHandler3);
            try {
                var handlerHitCount = 0;

                var p = new WinJS.Promise(function () { throw "Error initializing"; });

                var hitCompleteCount = 0;

                p.
                    then(function () { hitCompleteCount++; }, function (e) { });
                LiveUnit.Assert.areEqual(0, hitCompleteCount);
                LiveUnit.Assert.areEqual(3, handlerHitCount);
            } finally {
                WinJS.Promise.removeEventListener("error", eventHandler1);
                WinJS.Promise.removeEventListener("error", eventHandler2);
                WinJS.Promise.removeEventListener("error", eventHandler3);
            }
        }

    // deleting the last listener of the error and make sure that it won't get called in future errors
    testDeletingMultipleErrorHandlers = function () {

            function eventHandler1(evt) {
                var detail = evt.detail;
                if (!detail.parent)
                    handlerHitCount++;
            }
            function eventHandler2(evt) {
                var detail = evt.detail;
                WinJS.Promise.removeEventListener("error", eventHandler3);
                if (!detail.parent)
                    handlerHitCount++;
            }
            function eventHandler3(evt) {
                var detail = evt.detail;
                if (!detail.parent)
                    handlerHitCount++;
            }

            WinJS.Promise.addEventListener("error", eventHandler1);
            WinJS.Promise.addEventListener("error", eventHandler2);
            WinJS.Promise.addEventListener("error", eventHandler3);
            try {
                var handlerHitCount = 0;
                var p = new WinJS.Promise(function () { throw "Error initializing"; });

                var hitCompleteCount = 0;

                p.
                    then(function () { hitCompleteCount++; }, function (e) { });

                var p2 = new WinJS.Promise(function () { throw "Error initializing 2"; });

                LiveUnit.Assert.areEqual(0, hitCompleteCount);
                LiveUnit.Assert.areEqual(5, handlerHitCount);
            } finally {
                WinJS.Promise.removeEventListener("error", eventHandler1);
                WinJS.Promise.removeEventListener("error", eventHandler2);
                WinJS.Promise.removeEventListener("error", eventHandler3);
            }

        }

    // deleting the listener in the middle of the onerror and make sure that it won't get called in future errors
    testDeletingMultipleErrorHandlers2 = function () {

            function eventHandler1(evt) {
                var detail = evt.detail;
                WinJS.Promise.removeEventListener("error", eventHandler2);
                if (!detail.parent)
                    handlerHitCount++;
            }
            function eventHandler2(evt) {
                var detail = evt.detail;

                if (!detail.parent)
                    handlerHitCount++;
            }
            function eventHandler3(evt) {
                var detail = evt.detail;
                if (!detail.parent)
                    handlerHitCount++;
            }
            WinJS.Promise.addEventListener("error", eventHandler1);
            WinJS.Promise.addEventListener("error", eventHandler2);
            WinJS.Promise.addEventListener("error", eventHandler3);
            try {
                var handlerHitCount = 0;

                var p = new WinJS.Promise(function () { throw "Error initializing"; });

                var hitCompleteCount = 0;

                var p2 = new WinJS.Promise(function () { throw "Error initializing2"; });

                LiveUnit.Assert.areEqual(0, hitCompleteCount);
                LiveUnit.Assert.areEqual(5, handlerHitCount);
            } finally {
                WinJS.Promise.removeEventListener("error", eventHandler1);
                WinJS.Promise.removeEventListener("error", eventHandler2);
                WinJS.Promise.removeEventListener("error", eventHandler3);
            }
        }

    testAddingFinally = function () {
            Object.getPrototypeOf(WinJS.Promise.prototype).cleanup = function (func) {
                return this.then(
                    function (v) {
                        func();
                        return v;
                    },
                    function (e) {
                        func();
                        throw e;
                    }
                    );
            };

            q.clear();

            var hitCompleteCount = 0;
            var hitFirstFinallyCount = 0;
            var hitSecondFinallyCount = 0;
            var hitErrorCount = 0;
            (<any>asyncAdd(1, 2)).
                cleanup(function () {
                    hitFirstFinallyCount++;
                    // the return value from cleanup is irrelevant
                    return 5;
                }).
                then(function (v) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(3, v);
                    throw "MyError";
                }).
                cleanup(function () {
                    hitSecondFinallyCount++;
                }).
                then(null, function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.areEqual("MyError", e);
                });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitFirstFinallyCount);
            LiveUnit.Assert.areEqual(1, hitSecondFinallyCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        }

    testAddingAlways = function () {
            Object.getPrototypeOf(WinJS.Promise.prototype).always = function (func) {
                return this.then(func, func);
            };

            q.clear();

            var hitCompleteCount = 0;
            (<any>asyncAdd(1, 2)).
                always(function () { return 5; }).
                then(function (v) {
                    hitCompleteCount++;
                    LiveUnit.Assert.areEqual(5, v);
                });

            q.drain();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
        }

    testDoneSimple = function () {
            var old = WinJS.Promise['_doneHandler'];
            try {
                WinJS.Promise['_doneHandler'] = function (v) { throw v; };

                var p: any = new WinJS.Promise(function (c, e) {
                    e(1);
                });

                var hitErrorCount = 0;
                p = p.then(null, function (e) {
                    LiveUnit.Assert.areEqual(1, e);
                    hitErrorCount++;
                    throw e;
                });

                LiveUnit.Assert.areEqual(1, hitErrorCount);

                var hitCatchCount = 0;
                try {
                    p.done();
                } catch (ex) {
                    hitCatchCount++;
                    LiveUnit.Assert.areEqual(1, ex);
                }
                LiveUnit.Assert.areEqual(1, hitCatchCount);
            }
            finally {
                WinJS.Promise['_doneHandler'] = old;
            }
        };
        testDoneAsynchronous = function () {
            var old = WinJS.Promise['_doneHandler'];
            try {
                WinJS.Promise['_doneHandler'] = function (v) { throw v; };


                q.clear();

                var p: any = new WinJS.Promise(function (c, e) {
                    q.schedule(function () { e(1) });
                });

                var hitErrorCount = 0;
                p = p.then(null, function (e) {
                    LiveUnit.Assert.areEqual(1, e);
                    hitErrorCount++;
                    throw e;
                });

                LiveUnit.Assert.areEqual(0, hitErrorCount);

                var hitCatchCount = 0;
                try {
                    p.done();
                } catch (ex) {
                    hitCatchCount++;
                }
                LiveUnit.Assert.areEqual(0, hitErrorCount);
                LiveUnit.Assert.areEqual(0, hitCatchCount);

                // The exception will be thrown while the queue is draining
                try {
                    q.drain();
                } catch (ex) {
                    hitCatchCount++;
                    LiveUnit.Assert.areEqual(1, hitErrorCount);
                    LiveUnit.Assert.areEqual(1, ex);
                }

                LiveUnit.Assert.areEqual(1, hitErrorCount);
                LiveUnit.Assert.areEqual(1, hitCatchCount);
            }
            finally {
                WinJS.Promise['_doneHandler'] = old;
            }
        };
        testDoneDoesNotLetCancelEscape = function () {
            var old = WinJS.Promise['_doneHandler'];
            try {
                WinJS.Promise['_doneHandler'] = function (v) { throw v; };


                q.clear();

                var p: any = new WinJS.Promise(function (c, e) {
                    q.schedule(function () { e(1) });
                });

                var hitErrorCount = 0;
                p = p.then(null, function (e) {
                    LiveUnit.Assert.isTrue(e instanceof Error);
                    LiveUnit.Assert.areEqual("Canceled", e.name);
                    hitErrorCount++;
                    throw e;
                });

                LiveUnit.Assert.areEqual(0, hitErrorCount);

                var hitCatchCount = 0;
                try {
                    p.done();
                } catch (ex) {
                    hitCatchCount++;
                }
                LiveUnit.Assert.areEqual(0, hitErrorCount);
                LiveUnit.Assert.areEqual(0, hitCatchCount);

                p.cancel();

                // The exception will be thrown while the queue is draining
                try {
                    q.drain();
                } catch (ex) {
                    hitCatchCount++;
                }

                LiveUnit.Assert.areEqual(1, hitErrorCount);
                LiveUnit.Assert.areEqual(0, hitCatchCount);
            }
            finally {
                WinJS.Promise['_doneHandler'] = old;
            }
        };



        testDoneChainedSuccess = function (complete) {
            // test success case where done() chained to successful promise
            addAsyncNoQueue(1, 2).
                then(function (result) {
                    LiveUnit.Assert.areEqual(3, result);
                    return result;
                }).
                done(function (result) {
                    LiveUnit.Assert.areEqual(3, result);
                    complete();
                });
        }

    testErrorHandledDoneSuccess = function (complete) {
            // generate error in promise, handle error in then(), verify success in done()
            addAsyncNoQueue(1, 2, { throwException: 1 }).
                then(function () {
                    LiveUnit.Assert.fail("expected error from prev promise");
                },
                function (e) {
                    // handle the error
                    LiveUnit.Assert.areEqual(e, "addAsyncNoQueue throwing requested exception");
                }).
                done(function (result) {
                    // should get here
                    LiveUnit.Assert.areEqual(undefined, result, "expecting result to be undefined after handled error");
                    complete();
                });
        }

    testDoneChainedError = function (complete) {
            // chain done() to a promise chain that throws an exception not handled by intermediate then()
            addAsyncNoQueue(1, 2, { throwException: 1 }).
                then(function (result) {
                    LiveUnit.Assert.fail("1 expecting error, not complete from done()");
                    return result;
                }).
                done(function () {
                    LiveUnit.Assert.fail("2 expecting error, not complete from done()");
                    complete();
                },
                function (e) {
                    LiveUnit.Assert.areEqual(e, "addAsyncNoQueue throwing requested exception");
                    complete();
                }
                );
        }

    testDoneAsErrorHandler = function (complete) {
            // use done() as an error handler
            addAsyncNoQueue(1, 2, { throwException: 1 }).
                done(function () {
                    LiveUnit.Assert.fail("expected error, not complete from done()");
                    complete();
                },
                function (e) {
                    LiveUnit.Assert.areEqual(e, "addAsyncNoQueue throwing requested exception");
                    complete();
                }
                );
        }

    testDoneUnhandledError = function (complete) {
            var old = WinJS.Promise['_doneHandler'];
            try {
                WinJS.Promise['_doneHandler'] = function (v) { throw v; };

                // done() without error handler, expect throw() and onerror()
                var hitCount = 0;
                var catchHit = 0;

                WinJS.Promise.onerror = function (evt) {
                    LiveUnit.Assert.isTrue(!!evt.detail.error);
                    // verify error msg
                    hitCount++;
                };

                try {
                    addAsyncNoQueue(1, 2, { throwException: 1 }).
                        done(function () {
                            LiveUnit.Assert.fail("expected error, not complete from done()");
                            complete();
                        });
                } catch (ex) {
                    LiveUnit.Assert.areEqual(ex, "addAsyncNoQueue throwing requested exception");
                    catchHit++;
                } finally {
                    LiveUnit.Assert.areEqual(1, hitCount);  // verify onerror was called
                    LiveUnit.Assert.areEqual(1, catchHit);  // verify catch was called

                    // reset the onerror handler
                    WinJS.Promise.onerror = undefined;

                    complete();
                }
            }
            finally {
                WinJS.Promise['_doneHandler'] = old;
            }
        }

    testDoneUnhandledError2 = function (complete) {
            var old = WinJS.Promise['_doneHandler'];
            try {
                WinJS.Promise['_doneHandler'] = function (v) { throw v; };

                // empty done() without error handler, expect throw() and onerror()
                var hitCount = 0;
                var catchHit = 0;

                WinJS.Promise.onerror = function (evt) {
                    LiveUnit.Assert.isTrue(!!evt.detail.error);
                    // verify error msg
                    hitCount++;
                };

                try {
                    addAsyncNoQueue(1, 2, { throwException: 1 }).
                        done();
                } catch (ex) {
                    LiveUnit.Assert.areEqual(ex, "addAsyncNoQueue throwing requested exception");
                    catchHit++;
                } finally {
                    LiveUnit.Assert.areEqual(1, hitCount);  // verify onerror was called
                    LiveUnit.Assert.areEqual(1, catchHit);  // verify catch was called

                    // reset the onerror handler
                    WinJS.Promise.onerror = undefined;

                    complete();
                }
            }
            finally {
                WinJS.Promise['_doneHandler'] = old;
            }
        }

    testDoneCanceled = function (complete) {
            // validate canceled promise goes through done() error function
            var cancelCount = 0;
            var token;

            // create promise with a cancel handler.
            // This promise waits 500ms before completing to give time to cancel
            var x = new WinJS.Promise(
                function (c) {
                    token = setTimeout(function () { cancelCount = -1; c(); }, 5);
                },
                function () {
                    clearTimeout(token);
                    ++cancelCount;
                });

            // call the promise
            x.
                then(function () {
                    LiveUnit.Assert.fail("1 expected error from canceled promise");
                }).
                done(
                function () {
                    LiveUnit.Assert.fail("2 expected error from canceled promise");
                    complete();
                },
                function (e) {
                    if (e.description) {
                        LiveUnit.Assert.areEqual(e.description, "Canceled", "expected e.description == 'Canceled'");
                    }
                    LiveUnit.Assert.areEqual(e.message, "Canceled", "expected e.message == 'Canceled'");
                    LiveUnit.Assert.areEqual(e.name, "Canceled", "expected e.name == 'Canceled'");
                    LiveUnit.Assert.areEqual(1, cancelCount, "expected cancel count == 1 in done()");
                    complete();
                });

            // since the promise is async and waiting 500ms in this case, we have time to cancel it
            x.cancel();
        }

    testDoneProgress = function (complete) {
            // validate progress calls get to done()
            var expectedCount = 50;
            var progressCount = 0;

            // Create a promise which counts to 50, notifying done() of progress
            // We need to delay via setTimeout so we can hook up the done() statement to
            // monitor the progress calls.
            var x = new WinJS.Promise(function (c, e, p) {
                setTimeout(function () {
                    for (var count = 0; count < expectedCount; count++) {
                        p(count);
                    };
                    c(1);
                },
                    5);
            });

            x.done(
                function (c) {
                    LiveUnit.Assert.areEqual(1, c, "expected return value from complete == 1 from done()");
                    LiveUnit.Assert.areEqual(50, progressCount, "expected progressCount == 50 from done()");
                    complete();
                },
                function (e) {
                    LiveUnit.Assert.fail("not expecting error in done(), got=" + e);
                    complete();
                },
                function (p) {
                    LiveUnit.Assert.areEqual(p, progressCount, "expected p == progressCount");
                    progressCount++;
                });
        }

    testEmptyJoin = function (complete) {
            WinJS.Promise.join([]).
                then(null, errorHandler).
                then(complete);
        };

        testEmptyAny = function (complete) {
            WinJS.Promise.any([]).
                then(null, errorHandler).
                then(complete);
        };

        testStaticCanceledPromise = function (complete) {
            var hitCount = 0;
            WinJS.Promise.as()
                .then(function () { return WinJS.Promise.cancel; })
                .then(null, function (error) {
                    hitCount++;
                    LiveUnit.Assert.areEqual("Canceled", error.name);
                    LiveUnit.Assert.areEqual("Canceled", error.message);
                })
                .then(null, errorHandler)
                .then(function () {
                    LiveUnit.Assert.areEqual(1, hitCount);
                })
                .then(null, errorHandler)
                .then(complete);
        };

        testSignal = function (complete) {
            var hitComplete = 0;
            var hitError = 0;
            var hitProgress = 0;
            var s = new WinJS._Signal();
            s.promise
                .then(
                function (value) {
                    hitComplete++;
                    LiveUnit.Assert.areEqual("complete value", value);
                },
                function (error) {
                    hitError++;
                },
                function (progress) {
                    hitProgress++;
                    LiveUnit.Assert.areEqual(hitProgress, progress);
                }
                )
                .then(null, errorHandler)
                .then(function () {
                    LiveUnit.Assert.areEqual(1, hitComplete);
                    LiveUnit.Assert.areEqual(0, hitError);
                    LiveUnit.Assert.areEqual(2, hitProgress);
                })
                .then(null, errorHandler)
                .then(complete);

            s.progress(1);
            s.progress(2);
            s.complete("complete value");
            // shouldn't hit handlers for any of these
            s.progress(27);
            s.complete("other complete value");
            s.error("an error?");
        };

        testSignalError = function (complete) {
            var hitComplete = 0;
            var hitError = 0;
            var hitProgress = 0;
            var s = new WinJS._Signal();
            s.promise
                .then(
                function (value) {
                    hitComplete++;
                },
                function (error) {
                    hitError++;
                    LiveUnit.Assert.areEqual("error value", error);
                },
                function (progress) {
                    hitProgress++;
                    LiveUnit.Assert.areEqual(hitProgress, progress);
                }
                )
                .then(null, errorHandler)
                .then(function () {
                    LiveUnit.Assert.areEqual(0, hitComplete);
                    LiveUnit.Assert.areEqual(1, hitError);
                    LiveUnit.Assert.areEqual(2, hitProgress);
                })
                .then(null, errorHandler)
                .then(complete);

            s.progress(1);
            s.progress(2);
            s.error("error value");
            // shouldn't hit handlers for any of these
            s.progress(27);
            s.complete("complete value");
            s.error("another error?");
        };

        testNestedCancelationRecovery = function (complete) {
            var hitUnexpected = 0;
            var hitP1Complete = 0;
            var hitP2Complete = 0;
            var hitP3Complete = 0;

            function neverCompletes() {
                return new WinJS.Promise(function () {
                });
            }

            var p1 = neverCompletes().then(
                function () {
                    hitUnexpected++;
                },
                function (e) {
                    if (e instanceof Error && e.name === "Canceled") {
                        return p2;
                    }
                    hitUnexpected++;
                }
                );
            p1.then(
                function (v) {
                    hitP1Complete++;
                },
                function () {
                    hitUnexpected++;
                }
                );
            var p2 = neverCompletes().then(
                function () {
                    hitUnexpected++;
                },
                function (e) {
                    if (e instanceof Error && e.name === "Canceled") {
                        return p3;
                    }
                    hitUnexpected++;
                }
                );
            p2.then(
                function (v) {
                    hitP2Complete++;
                },
                function () {
                    hitUnexpected++;
                }
                );
            p1.cancel();
            var p3 = WinJS.Promise.timeout().then(function () {
                LiveUnit.Assert.areEqual(0, hitUnexpected);
                LiveUnit.Assert.areEqual(0, hitP1Complete);
                LiveUnit.Assert.areEqual(0, hitP2Complete);
                hitP3Complete++;
                return 1;
            }).then(function (v) {
                    hitP3Complete++;
                    return v;
                });
            p2.cancel();

            WinJS.Promise.timeout().then(function () {
                LiveUnit.Assert.areEqual(0, hitUnexpected);
                LiveUnit.Assert.areEqual(1, hitP1Complete);
                LiveUnit.Assert.areEqual(1, hitP2Complete);
                LiveUnit.Assert.areEqual(2, hitP3Complete);
            })
                .then(null, errorHandler)
                .then(complete);
        };

        testJoiningCanceledPromisesCancels = function () {
            var hitCompleteCount = 0, hitErrorCount = 0;

            var p1 = new WinJS.Promise(function () { });
            var p2 = new WinJS.Promise(function () { });
            var p3 = new WinJS.Promise(function () { });
            var p = WinJS.Promise.join([p1, p2, p3]);

            p.then(
                function (v) {
                    hitCompleteCount++;
                },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.isTrue(e instanceof Error);
                    LiveUnit.Assert.areEqual("Canceled", e.name);
                }
                );

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p1.cancel();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p2.cancel();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p3.cancel();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        };

        testJoinSomeCanceledAndOtherFailedPromisesFails = function () {
            var hitCompleteCount = 0, hitErrorCount = 0;

            var p1 = new WinJS.Promise(function () { });
            var p2 = new WinJS.Promise(function () { });
            var p3e;
            var p3 = new WinJS.Promise(function (c, e) { p3e = e; });
            var p = WinJS.Promise.join([p1, p2, p3]);

            p.then(
                function (v) {
                    hitCompleteCount++;
                },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.isFalse(e instanceof Error);
                }
                );

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p1.cancel();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p2.cancel();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p3e();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        };

        testJoinSomeCanceledAndOtherCompletedPromisesCancels = function () {
            var hitCompleteCount = 0, hitErrorCount = 0;

            var p1 = new WinJS.Promise(function () { });
            var p2 = new WinJS.Promise(function () { });
            var p3c;
            var p3 = new WinJS.Promise(function (c) { p3c = c; });
            var p = WinJS.Promise.join([p1, p2, p3]);

            p.then(
                function (v) {
                    hitCompleteCount++;
                },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.isTrue(e instanceof Error);
                    LiveUnit.Assert.areEqual("Canceled", e.name);
                }
                );

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p1.cancel();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p2.cancel();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p3c();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        };

        testAnyCanceledPromisesCancels = function () {
            var hitCompleteCount = 0, hitErrorCount = 0;

            var p1 = new WinJS.Promise(function () { });
            var p2 = new WinJS.Promise(function () { });
            var p3 = new WinJS.Promise(function () { });
            var p = WinJS.Promise.any([p1, p2, p3]);

            p.then(
                function (v) {
                    hitCompleteCount++;
                },
                function (e) {
                    hitErrorCount++;
                    LiveUnit.Assert.isTrue(e instanceof Error);
                    LiveUnit.Assert.areEqual("Canceled", e.name);
                }
                );

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p1.cancel();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p2.cancel();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p3.cancel();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(1, hitErrorCount);
        };

        testAnySomeCanceledPromisesStillSucceeds = function () {
            var hitCompleteCount = 0, hitErrorCount = 0;

            var p1 = new WinJS.Promise(function () { });
            var p2 = new WinJS.Promise(function () { });
            var p3c;
            var p3 = new WinJS.Promise(function (c) { p3c = c; });
            var p = WinJS.Promise.any([p1, p2, p3]);

            p.then(
                function (v) {
                    hitCompleteCount++;
                },
                function (e) {
                    hitErrorCount++;
                }
                );

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p1.cancel();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p2.cancel();

            LiveUnit.Assert.areEqual(0, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);

            p3c();

            LiveUnit.Assert.areEqual(1, hitCompleteCount);
            LiveUnit.Assert.areEqual(0, hitErrorCount);
        };

        testCancelingPromiseWhichErrorCorrectsTheCancel = function () {
            var hitCount = 0;
            var complete;
            var p = new WinJS.Promise(
                function (c) { complete = c; },
                function () { complete(1); }
                );
            p.cancel();
            p.then(function (v) {
                hitCount++;
                LiveUnit.Assert.areEqual(1, v);
            });
            LiveUnit.Assert.areEqual(1, hitCount);
        };

        testFIFODelivery = function () {
            var c;
            var p = new WinJS.Promise(function (complete) {
                c = complete;
            });
            var count = 0;

            var p1 = p.then(function () { LiveUnit.Assert.areEqual(0, count); count++; });
            p1.then(function () { LiveUnit.Assert.areEqual(3, count); count++; });
            p1.then(function () { LiveUnit.Assert.areEqual(4, count); count++; });

            var p2 = p.then(function () { LiveUnit.Assert.areEqual(1, count); count++; });
            p1.then(function () { LiveUnit.Assert.areEqual(5, count); count++; });
            p1.then(function () { LiveUnit.Assert.areEqual(6, count); count++; });

            var p3 = p.then(function () { LiveUnit.Assert.areEqual(2, count); count++; });
            p1.then(function () { LiveUnit.Assert.areEqual(7, count); count++; });
            p1.then(function () { LiveUnit.Assert.areEqual(8, count); count++; });

            c();
        };

        testRecursivelyChainingPromises = function (complete) {

            q.clear();

            var count = 3000;
            var i = 0;

            function run() {
                if (i < count) {
                    console.log("Execution #" + i, i);
                    i++;
                    return new WinJS.Promise(function (c) {
                        q.schedule(function () { c(); });
                    }).then(run);
                }
            }

            run()
                .then(function () {
                    LiveUnit.Assert.areEqual(count, i);
                })
                .then(null, function () { LiveUnit.Assert.fail("should not get here"); })
                .then(null, function () { ; })
                .then(complete);

            q.drain();

        };

    };
    
    var disabledTestRegistry = {
        testTimeoutZeroWait: [Helper.Browsers.firefox, Helper.Browsers.safari],
		testNestedCancelationRecovery: Helper.Browsers.android
    };
    Helper.disableTests(Promise, disabledTestRegistry);
}
LiveUnit.registerTestClass("CorsicaTests.Promise");
