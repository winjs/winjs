// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="../TestLib/util.ts" />
///<reference path="../../bin/typings/tsd.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

//used for intentional errors below
declare var thisFunctionNotDefined;
declare var thisVariableNotDefined;
// WinRT tests
declare var Windows;

module CorsicaTests {

    "use strict";

    // Returns a promise which completes after the event queue is given an opportunity to run
    //
    function yieldForEventQueue() {
        return new WinJS.Promise(function (c) {
            WinJS.Utilities.Scheduler.schedule(c, WinJS.Utilities.Scheduler.Priority.high);
        });
    }

    // Returns a promise which completes after a promise's done handler is given the opportunity to
    //  throw an exception
    //
    function yieldForDoneToThrow() {
        return new WinJS.Promise(function (c) {
            WinJS.Utilities.Scheduler.schedule(c, WinJS.Utilities.Scheduler.Priority.normal);
        });
    }

    function post(v) {
        return WinJS.Promise.timeout().
            then(function () { return v; });
    }
    function errorHandler(msg) {
        try {
            LiveUnit.Assert.fail('There was an unhandled error in your test: ' + msg);
        } catch (ex) { }
    }

    function stopAppAndIgnoreHandler() {
        WinJS.Application.stop();
        return true;
    }

    export class ApplicationTests {



        testApplicationLifecycleEvents(complete) {
            var app = WinJS.Application;
            WinJS.Application.stop();
            WinJS.Application.queueEvent({ type: "loaded" });
            WinJS.Application.queueEvent({ type: "ready" });

            window.addEventListener("error", stopAppAndIgnoreHandler, true);

            var count = 0;
            app.addEventListener("loaded", function (e) {
                LiveUnit.Assert.areEqual(0, count, "Loaded should fire first.");
                count++;
            }, true);
            app.addEventListener("ready", function (e) {
                LiveUnit.Assert.areEqual(1, count, "Ready should fire last.");
                WinJS.Application.stop();
                window.removeEventListener("error", stopAppAndIgnoreHandler, true);
                complete();
            }, true);
            app.start();
        }
        testApplicationLifecycleEventsTyped(complete) {
            var app = WinJS.Application;
            WinJS.Application.stop();
            WinJS.Application.queueEvent({ type: "loaded" });
            WinJS.Application.queueEvent({ type: "ready" });

            window.addEventListener("error", stopAppAndIgnoreHandler, true);

            var count = 0;
            app.onloaded = function (e) {
                LiveUnit.Assert.areEqual(0, count, "Loaded should fire first.");
                count++;
            };
            app.onready = function (e) {
                LiveUnit.Assert.areEqual(1, count, "Ready should fire last.");
                WinJS.Application.stop();
                window.removeEventListener("error", stopAppAndIgnoreHandler, true);
                complete();
            };
            app.start();
        }
        testApplicationLifecycleEventsAsync(complete) {
            var app = WinJS.Application;
            WinJS.Application.stop();
            WinJS.Application.queueEvent({ type: "loaded" });
            WinJS.Application.queueEvent({ type: "ready" });

            window.addEventListener("error", stopAppAndIgnoreHandler, true);

            var count = 0;
            app.addEventListener("loaded", function (e) {
                LiveUnit.Assert.areEqual(0, count, "Loaded should fire first.");
                e.setPromise(WinJS.Promise.timeout(16).
                    then(function () { count++ }));
            }, true);
            app.addEventListener("ready", function (e) {
                LiveUnit.Assert.areEqual(1, count, "Ready should fire last.");
                WinJS.Application.stop();
                window.removeEventListener("error", stopAppAndIgnoreHandler, true);
                complete();
            }, true);
            app.start();
        }


        testOutOfOrderAsync(complete) {
            var app = WinJS.Application;
            app.stop();

            window.addEventListener("error", stopAppAndIgnoreHandler, true);

            var count = 0;
            app.addEventListener("loaded", function (e) {
                LiveUnit.Assert.areEqual(0, count, "Loaded should fire second.");
                e.setPromise(WinJS.Promise.timeout(16).
                    then(function () { count++ }));
            }, true);
            app.addEventListener("ready", function (e) {
                LiveUnit.Assert.areEqual(1, count, "Ready should fire last.");
                WinJS.Application.stop();
                window.removeEventListener("error", stopAppAndIgnoreHandler, true);
                complete();
            }, true);
            app.start();

            app.queueEvent({ type: "loaded" });

            setTimeout(function () {
                app.queueEvent({ type: "activated" });
            }, 32);
        }

        testOutOfOrderAsync2(complete) {
            var app = WinJS.Application;
            app.stop();

            window.addEventListener("error", stopAppAndIgnoreHandler, true);

            var count = 0;
            app.addEventListener("loaded", function (e) {
                LiveUnit.Assert.areEqual(0, count, "Loaded should fire second.");
                e.setPromise(WinJS.Promise.timeout(16).
                    then(function () { count++ }));
            }, true);
            app.addEventListener("ready", function (e) {
                LiveUnit.Assert.areEqual(1, count, "Ready should fire last.");
                WinJS.Application.stop();
                window.removeEventListener("error", stopAppAndIgnoreHandler, true);
                complete();
            }, true);
            app.start();

            app.queueEvent({ type: "loaded" });

            setTimeout(function () {
                app.queueEvent({ type: "activated" });
            }, 32);
        }

        testCheckpoint(complete) {
            var app = WinJS.Application;
            app.stop();

            window.addEventListener("error", stopAppAndIgnoreHandler, true);

            var count = 0;
            app.addEventListener("checkpoint", function (e) {
                LiveUnit.Assert.areEqual(0, count);
                app.stop();
                window.removeEventListener("error", stopAppAndIgnoreHandler, true);
                WinJS.Application.stop();
                complete();
            }, true);
            app.start();

            app.checkpoint();
        }
        //        P0- Ensure on start() loaded, ready and checkpoint events   are fired   in the order
        testApplication_orderOfStartEvents(complete) {
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "loaded" });
            app.queueEvent({ type: "ready" });

            var count = 0;
            app.addEventListener("loaded", function (e) {
                LiveUnit.Assert.areEqual(0, count, "Loaded should fire first.");
                count++;
            }, true);
            app.addEventListener("ready", function (e) {
                LiveUnit.Assert.areEqual(1, count, "Ready should fire last.");
            }, true);

            app.start();
            WinJS.Application.stop();
            complete();
        }

        //        P2- Testing addEventListener with undefined eventType
        testApplication_addEventListenerWithUndefined(complete) {
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });

            app.addEventListener(undefined, function (e) {
                LiveUnit.Assert.areEqual(0, 1, "an exception should happen");

            }, true);
            app.addEventListener("error", function (e) {
                LiveUnit.Assert.areEqual(0, 1, "an exception should happen");
                return true;
            });
            app.start();
            WinJS.Application.stop();
            complete();
        }

        //        P0- verifying argument to listener has object with props:{detail, type}
        testApplication_addEventListenerWithNonFunctionObject(complete) {
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            var count = 0;
            app.addEventListener("test1", function (e) {
                count++;
                if (e.detail)
                    count++;
                if (e.type)
                    count++;
            });
            app.start();
            LiveUnit.Assert.areEqual(3, count, "an exception should happen");
            WinJS.Application.stop();
            complete();
        }

        //        P0- verify that throwing an exception in the eventhandler will not affecting calling the event handler again
        testApplication_addEventListenerWithException(complete) {
            function test() {
                count++;
                throw "error";
            }
            function errorHandler() {
                return true;
            }

            var app = WinJS.Application;
            app.stop();
            var count = 0;
            app.addEventListener("test1", test);
            app.addEventListener("error", errorHandler);
            app.queueEvent({ type: "test1" });
            app.queueEvent({ type: "test1" });
            app.queueEvent({ type: "test1" });

            app.start();
            LiveUnit.Assert.areEqual(3, count, "an exception should happen");
            WinJS.Application.stop();
            complete();
        }

        //        P0- events queue are NOT dispatched until previous event's asynchronous (promise) operation is complete
        testApplication_firingEventsAfterPromiseComplete(complete) {
            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("test1", function (e) {
                e.setPromise(WinJS.Promise.timeout());
                LiveUnit.Assert.areEqual(0, count, "This should be executed first");
                count++;
            });

            app.addEventListener("test2", function (e) {
                LiveUnit.Assert.areEqual(1, count, "This should be executed second");
            });
            app.queueEvent({ type: "test1" });
            app.queueEvent({ type: "test2" });

            app.start();
            WinJS.Application.stop();
            complete();
        }

        testApplication_firingSameListenersWhereFirstIsDeferred(complete) {
            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("test", function (e) {
                e.setPromise(WinJS.Promise.timeout().then(function () {
                    count++;
                    LiveUnit.Assert.areEqual(3, count, "This should be executed third");
                    WinJS.Application.stop();
                    complete();
                }));
                count++;
                LiveUnit.Assert.areEqual(1, count, "This should be executed first");
            });
            app.addEventListener("test", function (e) {
                count++;
                LiveUnit.Assert.areEqual(2, count, "This should be executed second");
            });
            app.queueEvent({ type: "test" });
            app.start();
        }

        testApplication_firingDifferentListenersWhereFirstIsDeferred(complete) {
            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("test1", function (e) {
                e.setPromise(WinJS.Promise.timeout().then(function () {
                    count++;
                    LiveUnit.Assert.areEqual(2, count, "This should be executed second");
                }));
                count++;
                LiveUnit.Assert.areEqual(1, count, "This should be executed first");
            });

            app.addEventListener("test2", function (e) {
                count++;
                LiveUnit.Assert.areEqual(3, count, "This should be executed third");
                WinJS.Application.stop();
                complete();
            });
            app.queueEvent({ type: "test1" });
            app.queueEvent({ type: "test2" });
            app.start();
        }

        ///////////////////////// WinJS.Application.removeEventListener(eventType, listener, useCapture)//////////////

        //        P0 - Ensure handler is called when event is dispatched
        testApplication_handlerForEventDispatched(complete) {
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            var isHandlerCalled = false;
            app.addEventListener("test1", function (e) {
                e.setPromise(WinJS.Promise.timeout());
                isHandlerCalled = true;
            });

            app.start();
            LiveUnit.Assert.areEqual(true, isHandlerCalled, "Event handler is not called");
            WinJS.Application.stop();
            complete();
        }

        //        P1 - Verify adding multiple listeners for same event  type
        testApplication_multipleListenersToSameEvent(complete) {
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            var count = 0;

            app.addEventListener("test1", function (e) {
                e.setPromise(WinJS.Promise.timeout());
                count++;
            });

            app.addEventListener("test1", function (e) {
                count++;
            });

            app.addEventListener("test1", function (e) {
                e.setPromise(WinJS.Promise.timeout());
                count++;
            });

            app.addEventListener("test1", function (e) {
                count++;
            });

            app.start();
            LiveUnit.Assert.areEqual(4, count, "Event handler is not called desired no. of times");
            WinJS.Application.stop();
            complete();
        }


        //         P2 - Verify adding single handler for multiple event types.
        testApplication_singleHandlerForMultipleEvents(complete) {
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.queueEvent({ type: "test2" });
            app.queueEvent({ type: "test3" });
            app.queueEvent({ type: "test4" });
            var count = 0;

            app.addEventListener("test1", handler);
            app.addEventListener("test2", handler);
            app.addEventListener("test3", handler);
            app.addEventListener("test4", handler);

            function handler(e) {
                count++;
                if (count === 4) {
                    WinJS.Application.stop();
                    complete();
                }
                // else test gets timed out
            }

            app.start();
        }

        /////////////////////////////////////////////////////////////////////////

        //        P0- creating three events and see whether they will be called on start
        testApplication_testNewlyAddedEvent(complete) {

            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("test1", listener, true);
            app.addEventListener("test2", listener, true);
            app.addEventListener("test3", listener, true);

            app.queueEvent({ type: "test1" });
            app.queueEvent({ type: "test2" });

            function listener(e) {
                count++;
            }

            app.start();
            app.queueEvent({ type: "test3" });
            yieldForEventQueue().done(function () {
                LiveUnit.Assert.areEqual(3, count, "Testing DrainQueue through start function");
                WinJS.Application.stop();
                complete();
            });
        }

        testApplication_queueAfterStartIsAsync(complete) {
            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("test1", listener, true);


            function listener(e) {
                count++;
            }

            app.start();
            app.queueEvent({ type: "test1" });
            LiveUnit.Assert.areEqual(0, count, "Event was queued synchronously after start()");
            yieldForEventQueue().done(function () {
                LiveUnit.Assert.areEqual(1, count, "QueueEvent after app.start() is fired async");
                WinJS.Application.stop();
                complete();
            });
        }

        testApplication_startQueueStopKillsEvent(complete) {
            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("test1", listener, true);

            function listener(e) {
                count++;
            }

            app.start();
            app.queueEvent({ type: "test1" });
            app.stop();
            yieldForEventQueue().done(function () {
                WinJS.Application.stop();
                LiveUnit.Assert.areEqual(0, count, "Testing Events after start() are not fired when stop() is called synchronously");
                complete();
            });
        }



        testApplication_maxPriJobAfterSchedulingEvent(complete) {
            var S = WinJS.Utilities.Scheduler;
            var app = WinJS.Application;
            app.stop();
            var count = 0;

            try {

                WinJS.Application.addEventListener("test", function () {
                    count++;
                    LiveUnit.Assert.areEqual(2, count, "runs second");
                });

                WinJS.Application.start();
                WinJS.Application.queueEvent({ type: "test" });
                S.schedule(function () {
                    count++;
                    LiveUnit.Assert.areEqual(1, count, "runs first");
                }, S.Priority.max);
                LiveUnit.Assert.areEqual(0, count);
            } finally {
                yieldForEventQueue().done(function () {
                    WinJS.Application.stop();
                    LiveUnit.Assert.areEqual(2, count, "Scheduled job and error handlers were all called");
                    complete();
                });
            }
        }


        //         P0- make sure that stop removes events from the queue
        testApplication_removeEventsUsingStop(complete) {

            var app = WinJS.Application;
            app.stop();

            app.addEventListener("test1", function (e) {
                LiveUnit.Assert.fail("should never be called");
            }, true);
            app.queueEvent({ type: "test1" });

            app.stop();

            app.start();
            WinJS.Application.stop();
            complete();

        }


        //     P0- listener should not be called as long as the event is not queued
        testApplication_eventListnerNotCalled(complete) {

            var app = WinJS.Application;
            app.stop();

            app.addEventListener("test1", listener, true);

            function listener(e) {
                LiveUnit.Assert.areEqual(1, 0, "should never be fired");
                app.queueEvent({ type: "test1" });
            }

            app.start();
            WinJS.Application.stop();
            complete();
        }

        //        P2- event listener should not be called again after being removed in the event handler
        testApplication_removeEventinEventHandler(complete) {
            // BugID: 286177
            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", listener, true);

            function listener(e) {
                count++;
                LiveUnit.Assert.areEqual(1, count, "fired once");
                app.removeEventListener("test1", listener, true);
                app.queueEvent({ type: "test1" });
            }

            app.start();
            WinJS.Application.stop();
            complete();
        }

        //         P0- making sure that removing one of the eventhandlers will result in not calling it
        testApplication_removeOneOfTheEventHandlers(complete) {
            // BugID: 287595
            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("test1", foo1, true);
            app.addEventListener("test1", foo2, true);
            app.addEventListener("test1", foo3, true);

            app.removeEventListener("test1", foo2, true);
            app.queueEvent({ type: "test1" });

            function foo1() {
                count++;
            }
            function foo2() {
                LiveUnit.Assert.areEqual(1, 0, "foo2 should not be fired");
            }
            function foo3() {
                count++;
            }
            app.start();

            LiveUnit.Assert.areEqual(2, count, "foo3 should be fired");
            WinJS.Application.stop();
            complete();
        }

        //         P0- removing one of the eventhandlers after the event is queued will result in not calling it
        testApplication_removeOneOfTheEventHandlersAfterDispatching(complete) {
            // BugID: 287595
            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("test1", foo1, true);
            app.addEventListener("test1", foo2, true);
            app.addEventListener("test1", foo3, true);

            app.queueEvent({ type: "test1" });
            app.removeEventListener("test1", foo2, true);

            function foo1() {
                count++;
            }
            function foo2() {
                count += 10;
                LiveUnit.Assert.areEqual(1, count, "foo2 should not be fired");
            }
            function foo3() {
                count++;
            }
            app.start();
            LiveUnit.Assert.areEqual(2, count, "foo3 should be fired");
            WinJS.Application.stop();
            complete();
        }

        //         P2- removing non-existing eventType
        testApplication_removeNonExistingEventType(complete) {

            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("test1", foo1, true);
            app.addEventListener("test1", foo2, true);
            app.addEventListener("test1", foo3, true);

            app.queueEvent({ type: "test1" });
            app.removeEventListener("test2", foo2, true);

            function foo1() {
                count++;
            }
            function foo2() {
                count++;
            }
            function foo3() {
                count++;
            }
            app.start();
            LiveUnit.Assert.areEqual(3, count, "removing non-existent event type does not affect current events");
            WinJS.Application.stop();
            complete();
        }

        //         P2- verifying invalid values for eventType and listener
        testApplication_invalidValuesForParameters(complete) {

            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("test1", foo1, true);
            app.addEventListener("test1", foo2, true);
            app.addEventListener("test1", foo3, true);

            app.queueEvent({ type: "test1" });
            app.removeEventListener("test1", undefined, true);

            function foo1() {
                count++;
            }
            function foo2() {
                count++;
            }
            function foo3() {
                count++;
            }
            app.start();
            LiveUnit.Assert.areEqual(3, count, "verifying invalid value for event listener");
            WinJS.Application.stop();
            complete();
        }

        //         P2- verifying invalid values for eventType
        testApplication_invalidValuesForParameters2(complete) {

            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("test1", foo1, true);
            app.addEventListener("test1", foo2, true);
            app.addEventListener("test1", foo3, true);

            app.queueEvent({ type: "test1" });
            app.removeEventListener(undefined, foo2, true);

            function foo1() {
                count++;
            }
            function foo2() {
                count++;
            }
            function foo3() {
                count++;
            }
            app.start();
            LiveUnit.Assert.areEqual(3, count, "verifying invalid value for eventType");
            WinJS.Application.stop();
            complete();
        }

        //         P0- testing funtion checkpoint
        testApplication_testingCheckpoint(complete) {

            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("checkpoint", function (e) {
                count++;
            });

            app.start();
            app.checkpoint();
            yieldForEventQueue().done(function () {
                LiveUnit.Assert.areEqual(count, 1, "checkpoint is called based on the app.checkpoint()");
                WinJS.Application.stop();
                complete();
            });
        }

        //         P0- testing funtion checkpoint before call to start
        testApplication_testingCheckpointBeforeStart(complete) {

            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("checkpoint", function (e) {
                count++;
            });

            app.checkpoint();
            app.start();

            LiveUnit.Assert.areEqual(count, 1, "checkpoint is called based on the app.checkpoint()");
            WinJS.Application.stop();
            complete();
        }

        //         P0- testing funtion checkpoint using queueEvent
        testApplication_testingQueueCheckpoint(complete) {

            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("checkpoint", function (e) {
                count++;
            });

            app.queueEvent({ type: "checkpoint" });
            app.start();

            LiveUnit.Assert.areEqual(count, 1, "checkpoint is called based on the app.checkpoint()");
            WinJS.Application.stop();
            complete();
        }

        //         P2- testing funtion checkpoint before call to stop
        testApplication_testingCheckpointBeforeStop(complete) {

            var app = WinJS.Application;
            app.checkpoint();
            app.start();
            app.stop();

            var count = 0;
            app.addEventListener("checkpoint", function (e) {
                count++;
            });
            app.start();
            app.checkpoint();
            yieldForEventQueue().done(function () {
                LiveUnit.Assert.areEqual(count, 1, "checkpoint is called based on the app.checkpoint()");
                WinJS.Application.stop();
                complete();
            });
        }

        // calling checkpoint without setting an event handler
        testApplication_testingCheckpointWithoutEventHandler(complete) {

            var app = WinJS.Application;
            app.stop();
            app.start();
            app.checkpoint();
            WinJS.Application.stop();
            complete();
        }

        //testing the loaded event
        testApplication_testLoadEvent(complete) {

            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "loaded" }); //because stop will clear the whole state
            var count = 0;
            app.addEventListener("loaded", function (e) {
                count++;

                LiveUnit.Assert.areEqual("loaded", e.type, "check the presence of type parameter in the eventArgs");
                var setPromiseAvailable = 0;
                if (e.setPromise)
                    setPromiseAvailable = 1;
                LiveUnit.Assert.areEqual(1, setPromiseAvailable, "check the presence of the setPromise parameter in the eventArgs");

            });
            app.start();
            LiveUnit.Assert.areEqual(1, count, "load event listener is called");
            WinJS.Application.stop();
            complete();
        }

        //testing the activated event
        testApplication_testActivated(complete) {

            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "activated" }); //because stop will clear the whole state
            var count = 0;
            app.addEventListener("activated", function (e) {
                count++;

                LiveUnit.Assert.areEqual("activated", e.type, "check the presence of type parameter in the eventArgs");
                var setPromiseAvailable = 0;
                if (e.setPromise)
                    setPromiseAvailable = 1;
                LiveUnit.Assert.areEqual(1, setPromiseAvailable, "check the presence of the setPromise parameter in the eventArgs");
                var detailAvailable = 0;
                if (e.detail)
                    detailAvailable = 1;
                LiveUnit.Assert.areEqual(1, detailAvailable, "check the presence of the detailAvailable parameter in the eventArgs");

            });
            app.start();
            LiveUnit.Assert.areEqual(1, count, "activated event listener is called");
            WinJS.Application.stop();
            complete();
        }

        //        P0- eventlistener for the unload event
        testApplication_unloadEvent(complete) {
            var app = WinJS.Application;
            app.stop();

            var count = 0;

            app.addEventListener("unload", unloadHandler, true);

            function unloadHandler(e) {
                count++;

                LiveUnit.Assert.areEqual("unload", e.type, "e.type = unloaded in the unloaded handler");
                var promiseAvailable = 0;
                if (e.setPromise)
                    promiseAvailable = 1;
                LiveUnit.Assert.areEqual(1, promiseAvailable, "check the presence of the setPromise parameter in the eventArgs");
            }

            app.start();
            app.queueEvent({ type: "unload" }); //because stop will clear the whole state
            yieldForEventQueue().done(function () {
                LiveUnit.Assert.areEqual(1, count, "unloaded event got fired");
                WinJS.Application.stop();
                complete();
            });
        }

        //        P2- event listener should not be called again after being removed in asynchronous function
        testApplication_stopEventinEventHandlerWithPromise(complete) {

            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", listener, true);

            function check() {
                count++;
                LiveUnit.Assert.areEqual(1, count, "fired once");
                app.removeEventListener("test1", listener, true);
                app.queueEvent({ type: "test1" });
            }
            function listener(e) {
                var t = new WinJS.Promise(check, function () { });
            }

            app.start();
            WinJS.Application.stop();
            complete();
        }

        //        P1- throw error in promise of event handler
        testApplication_throwErrorInEventHandlerPromise(complete) {

            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", listener, true);
            app.addEventListener("error", function (e) {
                count++;
                return true;
            }, true);

            function check() {
                throw "error in promise";
            }
            function listener(e) {
                var t = new WinJS.Promise(check, function () { });
                e.setPromise(t);
            }

            app.start();
            LiveUnit.Assert.areEqual(1, count, "Error handler was called when error is thrown in promise");
            WinJS.Application.stop();
            complete();
        }

        //        P2 - set eventRecord type which doesn't have a handler
        testApplication_queueEventWithoutHandler(complete) {

            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });

            app.start();
            WinJS.Application.stop();
            complete();
        }

        //        P0- testing the Error eventhandler
        testApplication_errorEventHandler(complete) {
            //BUGID: 287821
            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);
            app.addEventListener("error", errorHandler);

            function test() {
                throw "error in handler";
            }
            function errorHandler(e) {
                count++;
                LiveUnit.Assert.areEqual("error", e.type, "e.type is available in the parameter object");
                var promiseAvailable = 0;
                if (e.setPromise)
                    promiseAvailable = 1;
                LiveUnit.Assert.areEqual(1, promiseAvailable, "e.setPromise is available in the parameter object");
                var errorObject = 0;
                if (e.detail)
                    errorObject = 1;
                LiveUnit.Assert.areEqual(1, errorObject, "e.errror is available in the parameter object");
                return true;
            }
            app.start();
            LiveUnit.Assert.areEqual(1, count, "Error handler was called");
            WinJS.Application.stop();
            complete();
        }

        testApplication_BackClickEventFiresBeforeNavigationEvents1(complete) {
            // Scenario 1: WinJS.Application 'backclick' fires even when the navigation backStack is empty
            //
            var createBackClickEvent = function () {
                var fakeWinRTBackPressedEvent = { handled: false };
                return { type: 'backclick', _winRTBackPressedEvent: fakeWinRTBackPressedEvent };
            }

        var backPressedHappensFirst = function (e) {
                WinJS.Application.removeEventListener("backclick", backPressedHappensFirst, true);
                LiveUnit.Assert.areEqual("backclick", e.type);
                cleanup(); // Test passed.
            }

        var beforeNavShouldntFire = function (e) {
                // This eventhandler code should never be reached.
                WinJS.Navigation.removeEventListener("beforenavigate", beforeNavShouldntFire, true);
                LiveUnit.Assert.areEqual("beforenavigate", e.type);

                // Sanity check our expectation that WinJS.Navigation will never fire navigation when navigating backwards if their is no history backStack.
                LiveUnit.Assert.fail("It's expected that WinJS.Navigation events won't fire when there is no history backStack... has the implementation of WinJS.Navigation changed?");
            };

            WinJS.Application.start();

            // Setup
            WinJS.Navigation.history = { backStack: [] };
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack)
        WinJS.Application.addEventListener("backclick", backPressedHappensFirst, true);
            WinJS.Application.addEventListener("beforenavigate", beforeNavShouldntFire, true);

            // Simulate
            var eventRecord = createBackClickEvent();
            WinJS.Application.queueEvent(eventRecord);

            // Cleanup
            function cleanup() {
                WinJS.Application.removeEventListener("backclick", backPressedHappensFirst, true);
                WinJS.Navigation.removeEventListener("beforenavigate", beforeNavShouldntFire, true);
                WinJS.Application.stop();
                complete();
            }

        }

        testApplication_BackClickEventFiresBeforeNavigationEvents2(complete) {
            // Scenario2: WinJS.Application 'backclick' fires before navigation events, whenever WinJS.Navigation CAN go back.
            //
            var createBackClickEvent = function () {
                var fakeWinRTBackPressedEvent = { handled: false };
                return { type: 'backclick', _winRTBackPressedEvent: fakeWinRTBackPressedEvent };
            }

        var backPressedHappensFirst = function (e) {
                WinJS.Application.removeEventListener("backclick", backPressedHappensFirst, true);
                LiveUnit.Assert.areEqual("backclick", e.type);
                LiveUnit.Assert.isFalse(beforeNavHit, "WinJS.Navigation 'beforeNavigate' event should never occurr before WinJS.Application 'backclick'");
                backPressedHit = true;
            }
        var beforeNavHappensSecond = function (e) {
                WinJS.Navigation.removeEventListener("beforenavigate", beforeNavHappensSecond, true);
                LiveUnit.Assert.areEqual("beforenavigate", e.type);
                LiveUnit.Assert.isTrue(backPressedHit, "WinJS.Application 'backclick' event should have fired before WinJS.Navigation 'beforenavigate' event");

                cleanup();
            };

            WinJS.Application.start();

            // Setup
            WinJS.Navigation.history = { backStack: [{}] };
            LiveUnit.Assert.isTrue(WinJS.Navigation.canGoBack)
        var backPressedHit = false;
            var beforeNavHit = false;
            WinJS.Application.addEventListener("backclick", backPressedHappensFirst, true);
            WinJS.Navigation.addEventListener("beforenavigate", beforeNavHappensSecond, true);

            // Simulate
            var eventRecord = createBackClickEvent();
            WinJS.Application.queueEvent(eventRecord);

            // Cleanup
            function cleanup() {
                WinJS.Application.removeEventListener("backclick", backPressedHappensFirst, true);
                WinJS.Navigation.removeEventListener("beforenavigate", beforeNavHappensSecond, true);
                WinJS.Application.stop();
                complete();
            }
        }

        testApplication_CancellingApplicationBackClickPreventsNavigationEvents(complete) {
            // Scenario: Cancelling backclick event, prevents navigation events from firing.
            //
            var createBackClickEvent = function () {
                var fakeWinRTBackPressedEvent = { handled: false };
                return { type: 'backclick', _winRTBackPressedEvent: fakeWinRTBackPressedEvent };
            }

        var cancelBackClick = function (e) {
                WinJS.Application.removeEventListener("backclick", cancelBackClick, true);
                backPressedHit = true;
                return true; // signify's to the App model that the event is cancelled.
            };
            var beforeNav = function (e) {
                WinJS.Navigation.removeEventListener("beforenavigate", beforeNav, true);
                LiveUnit.Assert.areEqual("beforenavigate", e.type);
                LiveUnit.Assert.isTrue(backPressedHit, "WinJS.Application 'backclick' event should have fired before WinJS.Navigation 'beforenavigate' event");
                beforeNavHit = true;
            };

            var verify = function (e) {
                WinJS.Application.removeEventListener("verification", verify, true);
                LiveUnit.Assert.isTrue(backPressedHit)
            LiveUnit.Assert.isFalse(beforeNavHit, "Cancelling WinJS.Application 'backclick' event should prevent any WinJS.Navigation 'beforenavigate' from firing.");

                cleanup();
            }

        WinJS.Application.start();

            // Setup
            WinJS.Navigation.history = { backStack: [{}] };
            LiveUnit.Assert.isTrue(WinJS.Navigation.canGoBack)
        var backPressedHit = false;
            var beforeNavHit = false;
            WinJS.Application.addEventListener("backclick", cancelBackClick, true);
            WinJS.Navigation.addEventListener("beforenavigate", beforeNav, true);
            WinJS.Application.addEventListener("verification", verify, true);

            // Simulate
            var eventRecord = createBackClickEvent();
            WinJS.Application.queueEvent(eventRecord);

            // Verify
            WinJS.Application.queueEvent({ type: 'verification' });

            // Cleanup
            function cleanup() {
                WinJS.Application.removeEventListener("backclick", cancelBackClick, true);
                WinJS.Navigation.removeEventListener("beforenavigate", beforeNav, true);
                WinJS.Application.removeEventListener("verification", verify, true);
                WinJS.Application.stop();
                complete();
            }
        }

        testApplication_WinRTBackPressedEventHandling1(complete) {
            // Scenario 1: _winRTBackPressed event is not handled if the WinJS.Application 'backclick' event is not cancelled and WinJS.Navigation.canGoBack is false.
            //
            var createBackClickEvent = function () {
                var fakeWinRTBackPressedEvent = { handled: false };
                return { type: 'backclick', _winRTBackPressedEvent: fakeWinRTBackPressedEvent };
            }

        var backPressed = function (e) {
                WinJS.Application.removeEventListener("backclick", backPressed, true);
                LiveUnit.Assert.areEqual("backclick", e.type);
                backPressedHit = true;
            }

        var verify = function (e) {
                WinJS.Application.removeEventListener("verification", verify, true);

                // Verify that both 'backclick' and 'beforenavigate' handlers fired already.
                LiveUnit.Assert.isTrue(backPressedHit)

            // Verify that the _winRTBackPressed event shows as being unhandled.
            LiveUnit.Assert.isFalse(eventRecord._winRTBackPressedEvent.handled, "'_winRTBackPressed' event should not be handled if the WinJS.Application 'backclick' event is not cancelled and WinJS.Navigation.canGoBack is false.");
                cleanup();
            }

        WinJS.Application.start();
            // Setup
            WinJS.Navigation.history = { backStack: [] };
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack)
        var backPressedHit = false;
            var beforeNavHit = false;
            WinJS.Application.addEventListener("backclick", backPressed, true);
            WinJS.Application.addEventListener("verification", verify, true);

            // Simulate
            var eventRecord = createBackClickEvent();
            WinJS.Application.queueEvent(eventRecord);

            // Verify
            WinJS.Application.queueEvent({ type: "verification" });

            // Cleanup
            function cleanup() {
                WinJS.Application.removeEventListener("backclick", backPressed, true);
                WinJS.Application.removeEventListener("verification", verify, true);
                WinJS.Application.stop();
                complete();
            }
        }

        testApplication_WinRTBackPressedEventHandling2(complete) {
            // Scenario 2: _winRTBackPressed event is handled when the WinJS.Application 'backclick' event is cancelled.
            //
            var createBackClickEvent = function () {
                var fakeWinRTBackPressedEvent = { handled: false };
                return { type: 'backclick', _winRTBackPressedEvent: fakeWinRTBackPressedEvent };
            }

        var cancelBackClick = function (e) {
                WinJS.Application.removeEventListener("backclick", cancelBackClick, true);
                backPressedHit = true;
                return true;
            };

            var verify = function (e) {
                WinJS.Application.removeEventListener("verification", verify, true);

                // Verify that 'backclick' fired already.
                LiveUnit.Assert.isTrue(backPressedHit)

            // Verify that the _winRTBackPressed event shows as being handled.
            LiveUnit.Assert.isTrue(eventRecord._winRTBackPressedEvent.handled, "_winRTBackPressed should be handled when the WinJS.Application 'backclick' event is cancelled.");
                cleanup();
            }

        WinJS.Application.start();

            // Setup
            WinJS.Navigation.history = { backStack: [] };
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack)
        var backPressedHit = false;
            var beforeNavHit = false;
            WinJS.Application.addEventListener("backclick", cancelBackClick, true);
            WinJS.Application.addEventListener("verification", verify, true);

            // Simulate
            var eventRecord = createBackClickEvent();
            WinJS.Application.queueEvent(eventRecord);

            // Verify
            WinJS.Application.queueEvent({ type: "verification" });

            // Cleanup
            function cleanup() {
                WinJS.Application.removeEventListener("backclick", cancelBackClick, true);
                WinJS.Application.removeEventListener("verification", verify, true);
                WinJS.Application.stop();
                complete();
            }
        }
        testApplication_WinRTBackPressedEventHandling3(complete) {
            // Scenario 3: _winRTBackPressed event is handled when the WinJS.Application 'backclick' is not cancelled but WinJS.Navigation.canGoBack is true.
            //
            var createBackClickEvent = function () {
                var fakeWinRTBackPressedEvent = { handled: false };
                return { type: 'backclick', _winRTBackPressedEvent: fakeWinRTBackPressedEvent };
            }

        var verify = function (e) {
                WinJS.Application.removeEventListener("verification", verify, true);

                LiveUnit.Assert.isTrue(eventRecord._winRTBackPressedEvent.handled, "_winRTBackPressed should be handled whenever WinJS.Navigation.canGoBack is true");
                cleanup();
            }

        WinJS.Application.start();

            // Setup
            WinJS.Navigation.history = { backStack: [{}] };
            LiveUnit.Assert.isTrue(WinJS.Navigation.canGoBack)
        var backPressedHit = false;
            var beforeNavHit = false;

            WinJS.Application.addEventListener("verification", verify, true);

            // Simulate
            var eventRecord = createBackClickEvent();
            WinJS.Application.queueEvent(eventRecord);

            // Verify
            WinJS.Application.queueEvent({ type: "verification" });

            // Cleanup
            function cleanup() {
                WinJS.Application.removeEventListener("verification", verify, true);
                WinJS.Application.stop();
                complete();
            }
        }
    }

    export class ApplicationWinRTTests {

        testApplication_maxPriJobAfterStartHitsDeferredEvent(complete) {
            var S = WinJS.Utilities.Scheduler;
            var app = WinJS.Application;
            app.stop();
            var count = 0;
            var signal = new WinJS._Signal();

            try {

                WinJS.Application.addEventListener("test1", function (data) {
                    count++;
                    LiveUnit.Assert.areEqual(1, count, "This runs first");
                    // defer the event until signal completes
                    data.setPromise(signal.promise);
                });
                WinJS.Application.addEventListener("test2", function (data) {
                    count++;
                    LiveUnit.Assert.areEqual(3, count, "This runs third");
                });

                WinJS.Application.queueEvent({ type: "test1" });
                WinJS.Application.queueEvent({ type: "test2" });
                WinJS.Application.start();
                S.schedule(function () {
                    count++;
                    LiveUnit.Assert.areEqual(2, count, "This runs second");
                    signal.complete();
                }, S.Priority.max);
                LiveUnit.Assert.areEqual(1, count);
            } finally {
                yieldForEventQueue().done(function () {
                    WinJS.Application.stop();
                    LiveUnit.Assert.areEqual(3, count, "Scheduled job and error handlers were all called");
                    complete();
                }, function (e) {
                        debugger;
                    });
            }
        }

        testApplication_firingSameListenersWhereFirstIsDeferredThenScheduleHighPriJob(complete) {
            var S = WinJS.Utilities.Scheduler;
            var app = WinJS.Application;
            app.stop();

            var count = 0;
            app.addEventListener("test", function (e) {
                e.setPromise(S.schedulePromiseNormal().then(function () {
                    count++;
                    LiveUnit.Assert.areEqual(4, count, "This should be executed fourth");
                    WinJS.Application.stop();
                    complete();
                }));
                count++;
                LiveUnit.Assert.areEqual(1, count, "This should be executed first");
            });
            app.addEventListener("test", function (e) {
                count++;
                LiveUnit.Assert.areEqual(2, count, "This should be executed second");
                S.schedule(function () {
                    count++;
                    LiveUnit.Assert.areEqual(3, count, "runs third");
                }, S.Priority.high);
            });
            app.queueEvent({ type: "test" });
            app.start();
        }

        testApplication_highPriJobInOrderWithSchedulingADeferredEvent(complete) {
            var S = WinJS.Utilities.Scheduler;
            var app = WinJS.Application;
            app.stop();
            var count = 0;
            var signal = new WinJS._Signal();

            try {
                WinJS.Application.addEventListener("test1", function (data) {
                    count++;
                    // defer the event
                    data.setPromise(signal.promise);
                    LiveUnit.Assert.areEqual(1, count, "runs first");
                });
                WinJS.Application.addEventListener("test2", function (data) {
                    count++;
                    LiveUnit.Assert.areEqual(3, count, "runs third");
                    return true;
                });

                WinJS.Application.start();
                S.schedule(function () {
                    count++;
                    LiveUnit.Assert.areEqual(2, count, "runs second");
                    signal.complete();
                }, S.Priority.high);
                WinJS.Application.queueEvent({ type: "test1" });
                WinJS.Application.queueEvent({ type: "test2" });
                LiveUnit.Assert.areEqual(0, count);
            } finally {
                yieldForEventQueue().done(function () {
                    WinJS.Application.stop();
                    LiveUnit.Assert.areEqual(3, count, "Scheduled job and error handlers were all called");
                    complete();
                });
            }
        }

        testApplication_normalPriJobInOrderWithSchedulingADeferredEvent(complete) {
            var S = WinJS.Utilities.Scheduler;
            var app = WinJS.Application;
            app.stop();
            var count = 0;
            var signal = new WinJS._Signal();

            WinJS.Application.addEventListener("test1", function (data) {
                count++;
                // defer the event
                data.setPromise(signal.promise);
                LiveUnit.Assert.areEqual(1, count, "runs first");
            });
            WinJS.Application.addEventListener("test2", function (data) {
                count++;
                LiveUnit.Assert.areEqual(3, count, "runs third");
                WinJS.Application.stop();
                complete();
                return true;
            });

            WinJS.Application.start();
            S.schedule(function () {
                count++;
                LiveUnit.Assert.areEqual(2, count, "runs second");
                signal.complete();
            }, S.Priority.normal);
            WinJS.Application.queueEvent({ type: "test1" });
            WinJS.Application.queueEvent({ type: "test2" });
            LiveUnit.Assert.areEqual(0, count);

        }

        testApplication_highPriJobInOrderWithQueuingAnError(complete) {
            var S = WinJS.Utilities.Scheduler;
            var app = WinJS.Application;
            app.stop();
            var old = WinJS.Application._terminateApp;
            var count = 0;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.areEqual(2, count, "This runs second");
                }

                WinJS.Application.onerror = function () {
                    count++;
                    // do nothing, error is not handled
                }

                WinJS.Application.start();
                S.schedule(function () {
                    count++;
                    LiveUnit.Assert.areEqual(3, count, "This runs third");
                }, S.Priority.high);
                WinJS.Application.queueEvent({ type: "error" });
                LiveUnit.Assert.areEqual(0, count);
            } finally {
                yieldForEventQueue().done(function () {
                    WinJS.Application._terminateApp = old;
                    WinJS.Application.stop();
                    LiveUnit.Assert.areEqual(3, count, "Scheduled job and error handlers were all called");
                    complete();
                });
            }
        }


        /* Testing the file operation winRts*/
        //        P0- testing the exists function when file does not exist
        testApplication_notExistingLocalFile(complete) {
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);
            function test() {
                var count = 0;
                app.local.exists("notfound.txt").then(post).then(function (exists) {
                    count++;
                    LiveUnit.Assert.areEqual(false, exists, "file not found");
                }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(1, count, "function exists got called");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }

        //        P0- testing the exists function when file does not exist in the roaming
        testApplication_notExistingRoamingFile(complete) {


            var app = WinJS.Application;
            app.stop();

            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);
            function test() {

                var count = 0;

                app.roaming.exists("notfound.txt").then(post).then(function (exists) {
                    count++;
                    LiveUnit.Assert.areEqual(false, exists, "file not found");
                }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(1, count, "function exists got called");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P0- trying to writeText to a file
        testApplication_writeTextToLocalFile(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();

            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "test.txt";
                var text = "testing the writeText method";
                app.local.writeText(fileName, text).
                    then(function () {
                        count++;
                        return app.local.readText(fileName);
                    }).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file in the local folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P1- trying to writeText to a file with a unicode character
        testApplication_writeTextToLocalFileWithUnicode(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();

            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "\u0066\u006F\u0075\u006E\u0064.txt";
                var text = "testing the writeText method";
                app.local.writeText(fileName, text).
                    then(function () {
                        count++;
                        return app.local.readText(fileName);
                    }).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the local folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P0- trying to overwrite the content of a file using writeText to a file
        testApplication_overwriteTextToLocalFile(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "test.txt";
                var tempText = "this will be overwritten";
                var text = "testing the writeText method";
                app.local.writeText(fileName, tempText).
                    then(function () {
                        return app.local.writeText(fileName, text);
                    }).
                    then(post).
                    then(function () {
                        count++;
                        return app.local.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the local folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P1- trying to overwrite the content of a file with a unicode character using writeText to a file
        testApplication_overwriteTextToLocalFileWithUnicode(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "\u0066\u006F\u0075\u006E\u0064.txt";
                var tempText = "this will be overwritten";
                var text = "testing the writeText method";
                app.local.writeText(fileName, tempText).
                    then(function () {
                        return app.local.writeText(fileName, text);
                    }).
                    then(post).
                    then(function () {
                        count++;
                        return app.local.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the local folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P1- trying to overwrite the content of a file with a unicode character using writeText to a file
        testApplication_bug(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "\u0066\u006F\u0075\u006E\u0064.txt";
                var tempText = "this will be overwritten";
                var text = "testing the writeText method";
                app.local.writeText(fileName, tempText).
                    then(function () {
                        return app.local.writeText(fileName, text);
                    }).
                    then(function () {
                        count++;
                        return app.local.readText(fileName);
                    }).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the local folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P0- trying to overwrite the content of a file with unicode string using writeText to a file
        testApplication_overwriteUnicodeTextToLocalFile(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "test.txt";
                var tempText = "this will be overwritten";
                var text = "testing the writeText meth\u006Fd";
                app.local.writeText(fileName, tempText).
                    then(function () {
                        return app.local.writeText(fileName, text);
                    }).
                    then(post).
                    then(function () {
                        count++;
                        return app.local.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the local folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P1- trying to overwrite the content of a file with a unicode character with unicode string using writeText to a file
        testApplication_overwriteUnicodeTextToLocalFileWithUnicode(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();

            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "\u0066\u006F\u0075\u006E\u0064.txt";
                var tempText = "this will be overwritten";

                var text = "testing the writeText meth\u006Fd";
                app.local.writeText(fileName, tempText).
                    then(function () {
                        return app.local.writeText(fileName, text);
                    }).
                    then(post).
                    then(function () {
                        count++;
                        return app.local.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the local folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }

        //        P2- trying to write objects with properties using writeText to a file
        // I am not sure about the assertion in this case. Not obvious in the spec
        testApplication_writeObjectToLocalFile0(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();

            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "found.txt";
                var text = { x: 1 };
                app.local.writeText(fileName, JSON.stringify(text)).
                    then(function () {
                        count++;
                        return app.local.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(JSON.stringify(text), str, "file not found");
                    }).then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the local folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P2- trying to write the largest possible string using writeText to a file
        //        This is sort of stress testing
        testApplication_writeObjectToLocalFile1(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "found.txt";
                var text = "";
                var n = 1000;
                for (var i = 0; i < n; i++)
                    text += 'a';

                app.local.writeText(fileName, text).
                    then(function () {
                        count++;
                        return app.local.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text.toString(), str, "file not found");
                    }).then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the local folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        Read methods are tested within the write methods
        //        P0- Trying to read a non existing file
        testApplication_readNonExistingFile(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();

            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "notfound.txt";

                app.local.readText(fileName).
                    then(function (str) {
                        count++;

                    }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(1, count, "writing to a file with unicode character in the local folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P0- trying to writeText to a temp file
        testApplication_writeTextTotempFile(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();

            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "test.txt";
                var text = "testing the writeText method";
                app.temp.writeText(fileName, text).
                    then(function () {
                        count++;
                        return app.temp.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file in the temp folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P1- trying to writeText to a temp file with a unicode character
        testApplication_writeTextTotempFileWithUnicode(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "\u0066\u006F\u0075\u006E\u0064.txt";
                var text = "testing the writeText method";
                app.temp.writeText(fileName, text).
                    then(function () {
                        count++;
                        return app.temp.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the temp folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P0- trying to overwrite the content of a file using writeText to a file
        testApplication_overwriteTextTotempFile(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "test.txt";
                var tempText = "this will be overwritten";
                var text = "testing the writeText method";
                app.temp.writeText(fileName, tempText).
                    then(function () {
                        return app.temp.writeText(fileName, text);
                    }).
                    then(post).
                    then(function () {
                        count++;
                        return app.temp.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the temp folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P1- trying to overwrite the content of a file with a unicode character using writeText to a file
        testApplication_overwriteTextTotempFileWithUnicode(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();

            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "\u0066\u006F\u0075\u006E\u0064.txt";
                var tempText = "this will be overwritten";
                var text = "testing the writeText method";
                app.temp.writeText(fileName, tempText).
                    then(function () {
                    return app.temp.writeText(fileName, text)
                }).
                    then(post).
                    then(function () {
                        count++;
                        return app.temp.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the temp folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P0- trying to overwrite the content of a file with unicode string using writeText to a file
        testApplication_overwriteUnicodeTextTotempFile(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "test.txt";
                var tempText = "this will be overwritten";
                var text = "testing the writeText meth\u006Fd";
                app.temp.writeText(fileName, tempText).
                    then(function () {
                        return app.temp.writeText(fileName, text);
                    }).
                    then(post).
                    then(function () {
                        count++;
                        return app.temp.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the temp folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P1- trying to overwrite the content of a file with a unicode character with unicode string using writeText to a file
        testApplication_overwriteUnicodeTextTotempFileWithUnicode(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "\u0066\u006F\u0075\u006E\u0064.txt";
                var tempText = "this will be overwritten";
                var text = "testing the writeText meth\u006Fd";
                app.temp.writeText(fileName, tempText).
                    then(function () {
                        return app.temp.writeText(fileName, text);
                    }).
                    then(post).
                    then(function () {
                        count++;
                        return app.temp.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the temp folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P2- trying to write objects with properties using writeText to a file
        // I am not sure about the assertion in this case. Not obvious in the spec
        testApplication_writeObjectTotempFile1(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "found.txt";
                var text = { x: 1 };
                app.temp.writeText(fileName, JSON.stringify(text)).
                    then(function () {
                        count++;
                        return app.temp.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        LiveUnit.Assert.areEqual(JSON.stringify(text), str, "file not found");
                        LiveUnit.Assert.areEqual(1, count, "writing to a file with unicode character in the temp folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P2- trying to write the largest possible string using writeText to a file
        //        This is sort of stress testing
        testApplication_writeObjectTotempFile2(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "found.txt";
                var text = "";
                var n = 1000;
                for (var i = 0; i < n; i++)
                    text += 'a';

                app.temp.writeText(fileName, text).
                    then(function () {
                        count++;
                        return app.temp.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text.toString(), str, "file not found");
                    }).then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the temp folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        Read methods are tested within the write methods
        //        P0- Trying to read a non existing file
        testApplication_readNonExistingFileTemp(complete) {

            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "notfound.txt";

                app.temp.readText(fileName).then(post).
                    then(function (str) {
                        //it should contue even if the file is not existing
                        count++;
                    }).then(function () {
                        LiveUnit.Assert.areEqual(1, count, "writing to a file with unicode character in the temp folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P0- trying to writeText to a roaming file
        testApplication_writeTextToroamingFile(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "test.txt";
                var text = "testing the writeText method";
                app.roaming.writeText(fileName, text).
                    then(function () {
                        count++;
                        return app.roaming.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file in the roaming folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }

        //        P1- trying to writeText to a roaming file with a unicode character
        testApplication_writeTextToroamingFileWithUnicode(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "\u0066\u006F\u0075\u006E\u0064.txt";
                var text = "testing the writeText method";
                app.roaming.writeText(fileName, text).
                    then(function () {
                        count++;
                        return app.roaming.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the roaming folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P0- trying to overwrite the content of a file using writeText to a file
        testApplication_overwriteTextToroamingFile(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "test.txt";
                var roamingText = "this will be overwritten";
                var text = "testing the writeText method";
                app.roaming.writeText(fileName, roamingText).then(post).
                    then(function () {
                        return app.roaming.writeText(fileName, text);
                    }).
                    then(post).
                    then(function () {
                        count++;
                        return app.roaming.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the roaming folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P1- trying to overwrite the content of a file with a unicode character using writeText to a file
        testApplication_overwriteTextToroamingFileWithUnicode(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "\u0066\u006F\u0075\u006E\u0064.txt";
                var roamingText = "this will be overwritten";
                var text = "testing the writeText method";
                app.roaming.writeText(fileName, roamingText).
                    then(function () {
                        return app.roaming.writeText(fileName, text);
                    }).
                    then(post).
                    then(function () {
                        count++;
                        return app.roaming.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the roaming folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P0- trying to overwrite the content of a file with unicode string using writeText to a file
        testApplication_overwriteUnicodeTextToroamingFile(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "test.txt";
                var roamingText = "this will be overwritten";
                var text = "testing the writeText meth\u006Fd";
                app.roaming.writeText(fileName, roamingText).
                    then(function () {
                        return app.roaming.writeText(fileName, text);
                    }).
                    then(post).
                    then(function () {
                        count++;
                        return app.roaming.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the roaming folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P1- trying to overwrite the content of a file with a unicode character with unicode string using writeText to a file
        testApplication_overwriteUnicodeTextToroamingFileWithUnicode(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "\u0066\u006F\u0075\u006E\u0064.txt";
                var roamingText = "this will be overwritten";
                var text = "testing the writeText meth\u006Fd";
                app.roaming.writeText(fileName, roamingText).
                    then(function () {
                        return app.roaming.writeText(fileName, text);
                    }).
                    then(post).
                    then(function () {
                        count++;
                        return app.roaming.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text, str, "file not found");
                    }).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the roaming folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P2- trying to write objects with properties using writeText to a file
        // I am not sure about the assertion in this case. Not obvious in the spec
        testApplication_writeObjectToroamingFile1(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "found.txt";
                var text = { x: 1 };
                app.roaming.writeText(fileName, JSON.stringify(text)).
                    then(function () {
                        count++;
                        return app.roaming.readText(fileName);
                    }).
                    then(post).then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(JSON.stringify(text), str, "file not found");
                    }).then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the roaming folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        P2- trying to write the largest possible string using writeText to a file
        //        This is sort of stress testing
        testApplication_writeObjectToRoamingFile2(complete) {
            //BUGID: 584128
            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "found.txt";
                var text = "";
                var n = 1000;
                for (var i = 0; i < n; i++)
                    text += 'a';

                app.roaming.writeText(fileName, text).
                    then(function () {
                        count++;
                        return app.roaming.readText(fileName);
                    }).
                    then(post).
                    then(function (str) {
                        count++;
                        LiveUnit.Assert.areEqual(text.toString(), str, "file not found");
                    }).
                    then(function () {
                        LiveUnit.Assert.areEqual(2, count, "writing to a file with unicode character in the roaming folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }
        //        Read methods are tested within the write methods
        //        P0- Trying to read a non existing file
        testApplication_readNonExistingFileRoaming(complete) {

            var app = WinJS.Application;
            app.stop();
            app.queueEvent({ type: "test1" });
            app.addEventListener("test1", test, true);

            function test() {
                var count = 0;
                var fileName = "notfound.txt";

                app.roaming.readText(fileName).
                    then(function (str) {
                        //it should contue even if the file is not existing
                        count++;
                    }).
                    then(post).
                    then(function () {
                        LiveUnit.Assert.areEqual(1, count, "writing to a file with unicode character in the roaming folder");
                    }).
                    then(null, errorHandler).
                    then(complete);
            }
            app.start();
        }

        testOnErrorAppTermination = function () {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.number);
                    LiveUnit.Assert.areEqual('{"setPromise":"[function]"}', data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.areEqual(0, data.number);
                }

                WinJS.Application.onerror = function () {
                    // do nothing
                }

                WinJS.Application.queueEvent({ type: "error" });
                WinJS.Application.start();

                LiveUnit.Assert.areEqual(1, count);
            } finally {
                WinJS.Application.stop();
                WinJS.Application._terminateApp = old;
            }
        }

        testOnErrorHandled = function () {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.areEqual("{}", data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.isNotNull(data.number);
                }

                WinJS.Application.onerror = function () {
                    return true;
                }

                WinJS.Application.queueEvent({ type: "error" });
                WinJS.Application.start();

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Application.stop();
                WinJS.Application._terminateApp = old;
            }
        }

        testOnErrorHandledByAtLeastOneHandler = function () {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.areEqual("{}", data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.isNotNull(data.number);
                }

                WinJS.Application.onerror = function () {
                    return false;
                }

                WinJS.Application.addEventListener("error", function () {
                    return true;
                });
                WinJS.Application.addEventListener("error", function () {
                    return false;
                });

                WinJS.Application.queueEvent({ type: "error" });
                WinJS.Application.start();

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Application.stop();
                WinJS.Application._terminateApp = old;
            }
        }

        testOnErrorAppTerminationPromiseError(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    var e = JSON.parse(data.description);
                    error = e.error;
                }

                WinJS.Application.start();

                var p = new WinJS.Promise(function (c, e) {
                    e("my error");
                });

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    LiveUnit.Assert.areEqual(1, count);
                    LiveUnit.Assert.areEqual("my error", error);
                    complete();
                });
            }
        }

        testOnErrorAppTerminationPromiseError2(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.isNotNull(data.number);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    var e = JSON.parse(data.description);
                    error = e.error;
                }

                WinJS.Application.start();

                var p = new WinJS.Promise(function (c, e) {
                    c("my value");
                })
                    .then(function (v) {
                        return WinJS.Promise.wrapError("an error");
                    });

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    LiveUnit.Assert.areEqual(1, count);
                    LiveUnit.Assert.areEqual("an error", error);
                    complete();
                });
            }
        }

        testOnErrorAppTerminationPromiseException(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.isNotNull(data.number);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    var e = JSON.parse(data.description);
                    error = e.exception;
                }

                WinJS.Application.start();

                var p = new WinJS.Promise(function (c, e) {
                    c("my value");
                })
                    .then(function (v) {
                        throw "an error";
                    });

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    LiveUnit.Assert.areEqual(1, count);
                    LiveUnit.Assert.areEqual("an error", error);
                    complete();
                });
            }
        }

        testOnErrorPromiseHandledException(complete) {
            WinJS.Application.stop();

            var count = 0;
            var eHit = 0;
            var old = WinJS.Application._terminateApp;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.isNotNull(data.number);
                }

                WinJS.Application.start();

                var p = new WinJS.Promise(function (c, e) {
                    c("my value");
                })
                    .then(function (v) {
                        throw "error from then()";
                    })
                    .then(null, function (e) {
                        LiveUnit.Assert.areEqual("error from then()", e);
                        eHit++;
                    });

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    LiveUnit.Assert.areEqual(0, count);
                    LiveUnit.Assert.areEqual(1, eHit);
                    complete();
                });
            }
        }

        testOnErrorSerializeCircular(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;

            var prevWindowOnError = window.onerror;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.isNotNull(data.number);
                    error = JSON.parse(data.description);
                }

                window.onerror = function () {
                    return true;
                }

                enableWebunitErrorHandler(false);

                WinJS.Application.onactivated = function () {
                    var x: any = {};
                    x.y = x;
                    throw x;
                };

                WinJS.Application.start();

                WinJS.Utilities._setImmediate(function () {
                    WinJS.Application.queueEvent({ type: "activated" });
                });

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    yieldForEventQueue().then(function () {
                        enableWebunitErrorHandler(true);
                        window.onerror = prevWindowOnError;
                        WinJS.Application.stop();
                        WinJS.Application._terminateApp = old;

                        LiveUnit.Assert.areEqual(1, count);
                        LiveUnit.Assert.areEqual("[circular]", error.y);
                        complete();
                    });
                });
            }
        }

        testOnErrorSerializeCircularThrowingANumber(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;

            var prevWindowOnError = window.onerror;

            try {
                WinJS.Application._terminateApp = function (data, e) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.isNotNull(data.number);
                    error = JSON.parse(data.description);
                    LiveUnit.Assert.areEqual(1, error, "making sure that the correct error is captured");
                    LiveUnit.Assert.isNotNull(e.detail);
                    LiveUnit.Assert.areEqual("error", e.type, "making sure that the type is error");
                }
                window.onerror = function () {
                    return true;
                }
                enableWebunitErrorHandler(false);

                WinJS.Application.onactivated = function () {
                    throw 1;
                };

                WinJS.Application.start();

                WinJS.Utilities._setImmediate(function () {
                    WinJS.Application.queueEvent({ type: "activated" });
                });

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    yieldForEventQueue().done(function () {
                        LiveUnit.Assert.areEqual(1, count);
                        enableWebunitErrorHandler(true);
                        window.onerror = prevWindowOnError;
                        WinJS.Application.stop();
                        WinJS.Application._terminateApp = old;
                        complete();
                    });
                });
            }
        }

        testOnErrorSerializeCircularThrowingAnObject(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;

            var prevWindowOnError = window.onerror;

            try {
                WinJS.Application._terminateApp = function (data, e) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.isNotNull(data.number);
                    error = JSON.parse(data.description);

                    LiveUnit.Assert.areEqual(error.x, e.detail.x, "getting the correct content of thrown exception");
                    LiveUnit.Assert.areEqual("error", e.type, "making sure that the type is error");
                }
                window.onerror = function () {
                    return true;
                }
                enableWebunitErrorHandler(false);

                WinJS.Application.onactivated = function () {
                    throw { x: 1 };
                };

                WinJS.Application.start();

                WinJS.Utilities._setImmediate(function () {
                    WinJS.Application.queueEvent({ type: "activated" });
                });

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    yieldForEventQueue().done(function () {
                        LiveUnit.Assert.areEqual(1, count);
                        enableWebunitErrorHandler(true);
                        window.onerror = prevWindowOnError;
                        WinJS.Application.stop();
                        WinJS.Application._terminateApp = old;
                        complete();
                    });
                });
            }
        }

        testOnErrorSerializeCircularThrowingString(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;
            var str = "throwing a string";
            var prevWindowOnError = window.onerror;

            try {
                WinJS.Application._terminateApp = function (data, e) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.areEqual(0, data.number);

                    error = JSON.parse(data.description);

                    LiveUnit.Assert.areEqual(str, e.detail, "getting the correct content of thrown exception");
                    LiveUnit.Assert.areEqual("error", e.type, "making sure that the type is error");
                }
                window.onerror = function () {
                    return true;
                }
                enableWebunitErrorHandler(false);

                WinJS.Application.onactivated = function () {
                    throw str;
                };

                WinJS.Application.start();

                WinJS.Utilities._setImmediate(function () {
                    WinJS.Application.queueEvent({ type: "activated" });
                });

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    yieldForEventQueue().done(function () {
                        LiveUnit.Assert.areEqual(1, count);
                        enableWebunitErrorHandler(true);
                        window.onerror = prevWindowOnError;
                        WinJS.Application.stop();
                        WinJS.Application._terminateApp = old;
                        complete();
                    });
                });
            }
        }

        testOnErrorSerializeCircularThrowingException(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;
            var str = "throwing a string";
            var prevWindowOnError = window.onerror;

            try {
                WinJS.Application._terminateApp = function (data, e) {
                    count++;
                    LiveUnit.Assert.isNotNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual("error", e.type, "making sure that the type is error");
                }
                window.onerror = function () {
                    return true;
                }
                enableWebunitErrorHandler(false);

                WinJS.Application.onactivated = function () {
                    var x;
                    var exception = x.y.x;
                };

                WinJS.Application.start();

                WinJS.Utilities._setImmediate(function () {
                    WinJS.Application.queueEvent({ type: "activated" });
                });

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    yieldForEventQueue().done(function () {
                        LiveUnit.Assert.areEqual(1, count);
                        enableWebunitErrorHandler(true);
                        window.onerror = prevWindowOnError;
                        WinJS.Application.stop();
                        WinJS.Application._terminateApp = old;
                        complete();
                    });
                });
            }
        }

        testOnErrorUnhandledException(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;

            var prevWindowOnError = window.onerror;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.areEqual(0, data.number);
                    error = JSON.parse(data.description);
                }

                window.onerror = function () {
                    return true;
                }

                enableWebunitErrorHandler(false);

                WinJS.Application.start();

                WinJS.Utilities._setImmediate(function () {
                    throw "catch me if you can";
                });

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    enableWebunitErrorHandler(true);
                    window.onerror = prevWindowOnError;
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    LiveUnit.Assert.areEqual(1, count);
                    LiveUnit.Assert.areEqual("error", error.error.type);
                    LiveUnit.Assert.isTrue(error.errorUrl.indexOf("application.js") > 0, "errorUrl=" + error.errorUrl);
                    complete();
                });
            }
        }

        testOnErrorAppTerminationPromiseExceptionWithDone(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;
            var prevWindowOnError = window.onerror;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.areEqual(0, data.number);
                    error = JSON.parse(data.description);
                }

                enableWebunitErrorHandler(false);

                window.onerror = function () {
                    return true;
                };

                WinJS.Application.start();

                var p = new WinJS.Promise(function (c, e) {
                    c("my value");
                })
                    .then(function (v) {
                        throw "error from then()";
                    })
                    .done()

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                yieldForDoneToThrow().done(function () {
                    enableWebunitErrorHandler(true);
                    window.onerror = prevWindowOnError;
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    // first count when exception is actually thrown, second count from done()
                    LiveUnit.Assert.areEqual(2, count);
                    // other browsers prefix uncaught error message strings
                    LiveUnit.Assert.areNotEqual(-1, error.errorMessage.indexOf("error from then()"));
                    LiveUnit.Assert.areEqual(undefined, error.promise);
                    LiveUnit.Assert.isTrue(error.errorUrl.indexOf("base.js") > 0);
                    complete();
                });
            }
        }

        testThrowExceptionInsideDoneAppTermination(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;
            var prevWindowOnError = window.onerror;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.areEqual(0, data.number);
                    error = JSON.parse(data.description);
                }

                enableWebunitErrorHandler(false);

                window.onerror = function () {
                    return true;
                };

                WinJS.Application.start();

                var p = new WinJS.Promise(function (c, e) {
                    c("my value");
                })
                    .then(function (v) {
                        return 1;
                    })
                    .done(function () {
                        throw "exception thrown from done()";
                    })

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                yieldForDoneToThrow().done(function () {
                    enableWebunitErrorHandler(true);
                    window.onerror = prevWindowOnError;
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    // count from done()
                    LiveUnit.Assert.areEqual(1, count);
                    LiveUnit.Assert.areNotEqual(-1, error.errorMessage.indexOf("exception thrown from done()"));
                    LiveUnit.Assert.areEqual(undefined, error.promise);
                    complete();
                });
            }
        }

        testUndefinedErrorInsideDoneAppTermination(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;
            var prevWindowOnError = window.onerror;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.areEqual(0, data.number);
                    error = JSON.parse(data.description);
                }

                enableWebunitErrorHandler(false);

                window.onerror = function () {
                    return true;
                };

                WinJS.Application.start();

                var p = new WinJS.Promise(function (c, e) {
                    c("my value");
                })
                    .then(function (v) {
                        return 1;
                    })
                    .done(function () {
                        // next line is an intentional syntax error
                        thisFunctionNotDefined();
                    })

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                yieldForDoneToThrow().done(function () {
                    enableWebunitErrorHandler(true);
                    window.onerror = prevWindowOnError;
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    // count from done()
                    LiveUnit.Assert.areEqual(1, count);
                    LiveUnit.Assert.isTrue(error.errorMessage.indexOf('thisFunctionNotDefined') > 0, "errorMessage=" + error.errorMessage);
                    complete();
                });
            }
        }

        testReferenceErrorInsideDoneAppTermination(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;
            var prevWindowOnError = window.onerror;

            // Query the system for Localized "'x' of undefined or null reference"
            var errorText = "'x' of undefined or null reference";
            try { null.x(); }
            catch (e) {
                errorText = e.message;
            }

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.areEqual(0, data.number);
                    error = JSON.parse(data.description);
                }

                enableWebunitErrorHandler(false);

                window.onerror = function () {
                    return true;
                };

                WinJS.Application.start();

                var p = new WinJS.Promise(function (c, e) {
                    c("my value");
                })
                    .then(function (v) {
                        return 1;
                    })
                    .done(function () {
                        // next line is an intentional reference error
                        null.x();
                    })

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                yieldForDoneToThrow().done(function () {
                    enableWebunitErrorHandler(true);
                    window.onerror = prevWindowOnError;
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    // count from done()
                    LiveUnit.Assert.areEqual(1, count);
                    LiveUnit.Assert.isTrue(error.errorMessage.indexOf(errorText) >= 0, "errorMessage=" + error.errorMessage);
                    complete();
                });
            }
        }

        testPromiseStaticWrapErrorAppTermination(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;
            var prevWindowOnError = window.onerror;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.areEqual(0, data.number);
                    error = JSON.parse(data.description);
                }

                enableWebunitErrorHandler(false);

                window.onerror = function () {
                    return true;
                };

                WinJS.Application.start();

                var initPromise = WinJS.Promise.wrap(250).then(function () {
                    return WinJS.Promise.wrapError(123);
                });

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    enableWebunitErrorHandler(true);
                    window.onerror = prevWindowOnError;
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    // count from done()
                    LiveUnit.Assert.areEqual(1, count);
                    LiveUnit.Assert.areEqual(123, error.error);
                    complete();
                });
            }
        }

        testThrowAppTerminationFrom3ChainPromise(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.areEqual(0, data.number);
                    error = JSON.parse(data.description);
                }

                enableWebunitErrorHandler(false);

                WinJS.Application.start();

                var p = new WinJS.Promise(function (c, e) {
                    throw "exception thrown from level 1 promise";
                })
                    .then(function () {
                        count++;            // should not execute
                    })
                    .then(function () {
                        count++;            // should not execute
                    });

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    enableWebunitErrorHandler(true);
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    // count from initial throw
                    LiveUnit.Assert.areEqual(1, count);

                    LiveUnit.Assert.areNotEqual(-1, error.exception.indexOf("exception thrown from level 1 promise"));
                    LiveUnit.Assert.isTrue(error.promise._isException, "expected promise._isException to be true, but it was false");

                    complete();
                });
            }
        }

        testThrowAppTerminationFrom3ChainPromiseWithDone(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var errorFromPromise, errorFromDone;
            var prevWindowOnError = window.onerror;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.areEqual(0, data.number);
                    var e = JSON.parse(data.description);
                    if (count == 1) {
                        errorFromPromise = e;
                    } else {
                        errorFromDone = e;
                    }
                }

                enableWebunitErrorHandler(false);

                window.onerror = function () {
                    return true;
                };

                WinJS.Application.start();

                var p = new WinJS.Promise(function (c, e) {
                    throw "exception thrown from level 1 promise";
                })
                    .then(function () {
                        count++;            // should not execute
                    })
                    .then(function () {
                        count++;            // should not execute
                    })
                    .done();

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                yieldForDoneToThrow().done(function () {
                    enableWebunitErrorHandler(true);
                    window.onerror = prevWindowOnError;
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    // count from initial throw, #2 from done()
                    LiveUnit.Assert.areEqual(2, count);

                    LiveUnit.Assert.areNotEqual(-1, errorFromPromise.exception.indexOf("exception thrown from level 1 promise"));
                    LiveUnit.Assert.isTrue(errorFromPromise.promise._isException, "expected promise._isException to be true, but it was false");

                    LiveUnit.Assert.areNotEqual(-1, errorFromDone.errorMessage.indexOf("exception thrown from level 1 promise"));
                    LiveUnit.Assert.areEqual(undefined, errorFromDone.promise);

                    complete();
                });
            }
        }

        testPromiseErrorAppTerminationFrom3ChainPromise(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var errorFromPromise;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.areEqual(0, data.number);
                    errorFromPromise = JSON.parse(data.description);
                }

                enableWebunitErrorHandler(false);

                WinJS.Application.start();

                var p = new WinJS.Promise(function (c, e) {
                    return WinJS.Promise.wrapError("promise error from level 1");
                })
                    .then(function (v) {
                        count++;            // should not execute
                    })
                    .then(function () {
                        count++;            // should not execute
                    });

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    enableWebunitErrorHandler(true);
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    // count from promise error
                    LiveUnit.Assert.areEqual(1, count);

                    LiveUnit.Assert.areEqual("promise error from level 1", errorFromPromise.error);
                    complete();
                });
            }
        }

        testUndefinedErrorInsidePromiseAppTermination(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNotNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    error = JSON.parse(data.description);
                }

                enableWebunitErrorHandler(false);

                WinJS.Application.start();

                var p = new WinJS.Promise(function (c, e) {
                    // generate intentional error
                    return thisFunctionNotDefined();
                })
                    .then(function (v) {
                        count++;        // should not execute
                    })
                    .then(function () {
                        count++;        // should not execute
                    });

                LiveUnit.Assert.areEqual(0, count);
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    enableWebunitErrorHandler(true);
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    // count from promise
                    LiveUnit.Assert.areEqual(1, count);

                    LiveUnit.Assert.isTrue(error.exception.message.indexOf('thisFunctionNotDefined') >= 0, "message=" + error.exception.message);
                    LiveUnit.Assert.isTrue(error.promise._isException, "expected promise._isException to be true, but was false");
                    LiveUnit.Assert.isNotNull(error.exception.stack, "expected error.exception.stack != null, but it was null");

                    complete();
                });
            }
        }


        testOnErrorWinRTInteropHandled(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var error;

            WinJS.Application._terminateApp = function (data) {
                count++;
                LiveUnit.Assert.isNull(data.stack);
                LiveUnit.Assert.isNotNull(data.description);
                LiveUnit.Assert.areEqual(0, data.errorNumber);
                LiveUnit.Assert.areEqual(0, data.number);
                var e = JSON.parse(data.description);
                error = e.exception;
            }

                WinJS.Application.start();

            Windows.Storage.PathIO.readTextAsync("Some file that definitely doesn't exist, right?")
                .then(
                function () {
                    LiveUnit.Assert.fail("Shouldn't be able to load a file that doesn't exist");
                },
                function (e) {
                    // catch the error
                    return;
                }
                )
                .then(function () {
                    return new WinJS.Promise(function (c, e) {
                        e("this is an error");
                    });
                })
                .then(null, function () {
                    return WinJS.Promise.timeout().then(function () {
                        WinJS.Application.stop();
                        WinJS.Application._terminateApp = old;

                        LiveUnit.Assert.areEqual(0, count);
                    });
                })
                .then(null, errorHandler)
                .then(complete);
        }


        // generate an error that will propagate through window.onerror, verify details show up in Application error event
        testWindowOnErrorEventOrdering(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var oldOnError = window.onerror;
            var error;
            var onerrorMessage;
            var onerrorUrl;
            var onerrorLinenumber;
            var signal = new WinJS._Signal();

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.isNotNull(data.errorNumber);
                    LiveUnit.Assert.isNotNull(data.number);
                    signal.complete();
                }

                WinJS.Application.addEventListener("error", function (e) {
                    count++;
                    error = e;

                    // don't return true so error gets passed along to _terminateApp
                }, true);

                enableWebunitErrorHandler(false);

                window.onerror = function (message, url, linenumber) {
                    count++;

                    onerrorMessage = message;
                    onerrorUrl = url;
                    onerrorLinenumber = linenumber;

                    // returning true here will prevent app termination, but still propagates to Application error
                    return true;
                };

                LiveUnit.Assert.areEqual(0, count);
                count++;

                WinJS.Application.start();

                // generate error that result in calls to window.onerror to validate
                // errors get passed through to the Application error event by
                // intentionally using undefined variable
                WinJS.Utilities._setImmediate(function () {
                    var x = thisVariableNotDefined + 1;
                });
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    signal.promise.then(function () {
                        window.onerror = oldOnError;
                        enableWebunitErrorHandler(true);
                        WinJS.Application.stop();
                        WinJS.Application._terminateApp = old;

                        // verify
                        LiveUnit.Assert.areEqual("error", error.type);
                        LiveUnit.Assert.areEqual(onerrorMessage, error.detail.errorMessage);
                        LiveUnit.Assert.areEqual(onerrorUrl, error.detail.errorUrl);
                        LiveUnit.Assert.areEqual(onerrorLinenumber, error.detail.errorLine);
                        LiveUnit.Assert.areEqual(undefined, error.detail.parent);

                        LiveUnit.Assert.areEqual(4, count);
                        complete();
                    });
                });
            }
        }

        // generate an error from a promise and verify details show up in Application error event
        testPromiseErrorEventDetails(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var errorFromPromise, errorFromDone;
            var prevWindowOnError = window.onerror;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.isNotNull(data.errorNumber);
                    LiveUnit.Assert.isNotNull(data.number);
                }

                WinJS.Application.addEventListener("error", function (e) {
                    if (count == 1) {
                        errorFromPromise = e;
                    } else {
                        errorFromDone = e;
                    }
                    count++;
                }, true);

                window.onerror = function () {
                    return true;
                }

                enableWebunitErrorHandler(false);

                LiveUnit.Assert.areEqual(0, count);
                count++;

                WinJS.Application.start();

                var p = new WinJS.Promise(function (c, e) {
                    c("my value");
                })
                    .then(function (v) {
                        throw "exception from promise";
                    })
                    .done();
            } finally {
                yieldForDoneToThrow().done(function () {
                    enableWebunitErrorHandler(true);
                    window.onerror = prevWindowOnError;
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    // #1 before start, #2 from listener (initial throw) -> #3 from terminateApp, #4 listener (done) -> #5 from terminateApp
                    LiveUnit.Assert.areEqual(5, count);

                    // verify error details from promise (initial throw)
                    LiveUnit.Assert.areEqual("error", errorFromPromise.type);
                    LiveUnit.Assert.areNotEqual(-1, errorFromPromise.detail.exception.indexOf("exception from promise"));
                    LiveUnit.Assert.areEqual(undefined, errorFromPromise.detail.handler);  // this error did not have a handler and was originated from the promise so no parent
                    LiveUnit.Assert.areEqual(undefined, errorFromPromise.detail.parent);

                    // this is the error that came from done()
                    LiveUnit.Assert.areNotEqual(-1, errorFromDone.detail.errorMessage.indexOf("exception from promise"));
                    LiveUnit.Assert.isTrue(errorFromDone.detail.errorUrl.indexOf("base.js") > 0);


                    complete();
                });
            }
        }

        testExceptionInsideProgressIsIgnored(complete) {
            WinJS.Application.stop();

            var count = 0;
            var loopCount = 5;
            var old = WinJS.Application._terminateApp;
            var error;

            WinJS.Application._terminateApp = function (data) {
                count++;
                LiveUnit.Assert.isNull(data.stack);
                LiveUnit.Assert.isNotNull(data.description);
                LiveUnit.Assert.isNotNull(data.errorNumber);
                LiveUnit.Assert.isNotNull(data.number);
            }

            function cleanup() {
                WinJS.Application._terminateApp = old;
                enableWebunitErrorHandler(true);
                LiveUnit.Assert.areEqual(loopCount, count);
                WinJS.Application.stop();
                complete();
            }

            enableWebunitErrorHandler(false);

            WinJS.Application.start();

            var x = new WinJS.Promise(function (c, e, p) {
                setTimeout(function () {
                    for (var count = 0; count < loopCount; count++) {
                        p(count);
                    };
                    c(1);
                },
                    5);
            });

            x
                .then(
                null,
                null,
                function () {
                    count++;
                    throw "exception from progress";
                }
                )
                .then(
                function () {
                    // exceptions from progress should be ignored, no count from terminateApp
                    LiveUnit.Assert.areEqual(loopCount, count);
                }
                )
                .done(cleanup, cleanup);
        }

        testExceptionFromCanceledPromiseIsIgnored(complete) {
            WinJS.Application.stop();

            var count = 0;
            var cancelCount = 0;
            var old = WinJS.Application._terminateApp;
            var promiseToCancel;
            var timeoutToken;
            var cancelThrowMessage;

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNotNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.isNotNull(data.errorNumber);
                    LiveUnit.Assert.isNotNull(data.number);
                }

                enableWebunitErrorHandler(false);

                WinJS.Application.start();

                // create promise with a cancel handler.
                // This promise waits 500ms before completing to give time to cancel
                promiseToCancel = new WinJS.Promise(
                    function (c) {
                        timeoutToken = setTimeout(function () { c(); }, 500);
                    },
                    function () {
                        clearTimeout(timeoutToken);
                        cancelCount++;
                    });

                // call the promise which throws when canceled
                promiseToCancel.
                    then(
                    function () {
                        count += 10;    // should not get called, expecting error path from canceled promise
                    },
                    function (e) {
                        cancelCount++;
                        cancelThrowMessage = "exception from promise error path: " + e.message;
                        throw cancelThrowMessage;
                    });

                // since the promise is async and waiting 500ms, we have time to cancel it
                promiseToCancel.cancel();
            } finally {
                WinJS.Application.stop();
                WinJS.Application._terminateApp = old;
                enableWebunitErrorHandler(true);

                LiveUnit.Assert.areEqual(0, count);         // count should not get incremented
                LiveUnit.Assert.areEqual(2, cancelCount);
                LiveUnit.Assert.isTrue(cancelThrowMessage.indexOf("Canceled") > 0);

                complete();
            }
        }


        // generate an error from inside window.onerror
        testExceptionInsideWindowOnError(complete) {
            WinJS.Application.stop();

            var count = 0;
            var old = WinJS.Application._terminateApp;
            var oldOnError = window.onerror;
            var error;

            var eh = function () {
                return true;
            }
            window.addEventListener("error", eh);

            try {
                WinJS.Application._terminateApp = function (data) {
                    count++;
                    LiveUnit.Assert.isNull(data.stack);
                    LiveUnit.Assert.isNotNull(data.description);
                    LiveUnit.Assert.areEqual(0, data.errorNumber);
                    LiveUnit.Assert.areEqual(0, data.number);
                }

                WinJS.Application.addEventListener("error", function (e) {
                    count++;
                    error = e;

                    // don't return true so error gets passed along to _terminateApp
                }, true);

                enableWebunitErrorHandler(false);

                window.onerror = function (message, url, linenumber) {
                    // this exception doesn't get passed onto Application error event
                    throw "exception thrown from window.onerror";
                };

                WinJS.Application.start();

                // generate error that result in calls to window.onerror by intentionally using undefined variable
                WinJS.Utilities._setImmediate(function () {
                    var x = thisVariableNotDefined + 1;
                });
            } finally {
                WinJS.Utilities._setImmediate(function () {
                    window.onerror = oldOnError;
                    window.removeEventListener("error", eh);
                    enableWebunitErrorHandler(true);
                    WinJS.Application.stop();
                    WinJS.Application._terminateApp = old;

                    // verify
                    LiveUnit.Assert.areEqual("error", error.type);
                    LiveUnit.Assert.isTrue(error.detail.errorMessage.indexOf('thisVariableNotDefined') > 0, "errorMessage=" + error.detail.errorMessage);
                    LiveUnit.Assert.isTrue(error.detail.errorUrl.indexOf("application.js") > 0, "url=" + error.detail.errorUrl);

                    LiveUnit.Assert.areEqual(2, count);

                    complete();
                });
            }
        }
    }
}

LiveUnit.registerTestClass("CorsicaTests.ApplicationTests");

if (isWinRTEnabled()) {
    LiveUnit.registerTestClass("CorsicaTests.ApplicationWinRTTests");
}