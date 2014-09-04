// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
///<reference path="../../bin/typings/tsd.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {
    "use strict";

    export class ApplicationStateTests {


        testCircularReferenceInSessionState() {
            //Bug - WinBlue:135007 circular reference check
            var app = WinJS.Application;
            var a: any = {};
            a.x = a;

            app.sessionState = a;
            app.checkpoint();

        }

        testCheckpoint(complete) {
            var app = WinJS.Application;

            app.stop();
            app.queueEvent({ type: "loaded" });
            app.queueEvent({ type: "activated" });

            var readyHandler = function (e) {
                app.removeEventListener("ready", readyHandler);
                app.sessionState = { f: 10 };
                app.checkpoint();
            };
            app.addEventListener("ready", readyHandler);

            var checkpointHandler = function() {
                app.removeEventListener("checkpoint", checkpointHandler);
                app.queueEvent({ type: "checkpoint:done" });
            };
            app.addEventListener("checkpoint", checkpointHandler);

            var checkpointDoneHandler = function() {
                app.removeEventListener("checkpoint:done", checkpointDoneHandler);
                app.local.readText("_sessionState.json", "error!").
                    then(function (str) {
                        LiveUnit.Assert.areEqual(JSON.stringify(app.sessionState), str);
                        app.stop();
                    }).
                    then(complete, complete);
            };
            app.addEventListener("checkpoint:done", checkpointDoneHandler);

            app.start();
        }

        testLoadState(complete) {
            var app = WinJS.Application;

            app.stop();
            app.queueEvent({ type: "loaded" });
            app.local.writeText("_sessionState.json", JSON.stringify({ f: 10 })).
                then(function () {
                    return WinJS.Application._loadState({ previousExecutionState: 3 });
                }).then(function () {
                    app.queueEvent({ type: "activated", detail: { previousExecutionState: 3 } });
                });

            var activatedHandler = function(e) {
                app.removeEventListener("activated", activatedHandler);
                LiveUnit.Assert.areEqual(10, app.sessionState.f);
                complete();
            };
            app.addEventListener("activated", activatedHandler);
            app.start();
        }

        testLoadStateError(complete) {
            var app = WinJS.Application;
            var errors = 0;

            app.stop();

            var errorHandler = function (e) {
                app.removeEventListener("error", errorHandler);
                errors++;
                return true;
            };
            app.addEventListener("error", errorHandler);

            var activatedHandler = function (e) {
                app.removeEventListener("activated", activatedHandler);
                LiveUnit.Assert.areEqual("object", typeof app.sessionState);
                LiveUnit.Assert.areEqual(0, Object.keys(app.sessionState).length);
                LiveUnit.Assert.areEqual(0, errors);
                complete();
            };
            app.addEventListener("activated", activatedHandler);

            app.queueEvent({ type: "loaded" });
            app.local.writeText("_sessionState.json", "").
                then(function () {
                    return WinJS.Application._loadState({ previousExecutionState: 3 });
                }).then(function () {
                    app.queueEvent({ type: "activated", detail: { previousExecutionState: 3 } });
                });

            app.start();
        }

        testBaseTempStateWrite(complete) {
            var app = WinJS.Application;

            WinJS.Promise.timeout(2).
                then(function () {
                    return app.temp.exists("lastState.json");
                }).then(function (exists) {
                    if (exists) {
                        return app.temp.remove("lastState.json");
                    }
                    LiveUnit.Assert.isFalse(exists, "should start empty");
                }).then(function () {
                    return app.temp.readText("lastState.json", "default string");
                }).then(function (str) {
                    LiveUnit.Assert.areEqual("default string", str, "should return default string");
                    return app.temp.exists("lastState.json");
                }).then(function (exists) {
                    LiveUnit.Assert.isFalse(exists, "still shouldn't exist");
                    return app.temp.writeText("lastState.json", "some new string");
                }).then(function () {
                    return app.temp.exists("lastState.json");
                }).then(function (exists) {
                    LiveUnit.Assert.isTrue(exists, "file should now exist");
                    return app.temp.readText("lastState.json", "wasn't found!");
                }).then(function (str) {
                    LiveUnit.Assert.areEqual("some new string", str, "new content shold be read");
                    return app.temp.remove("lastState.json");
                }).then(null, function (err) {
                    LiveUnit.Assert.fail(err);
                }).then(complete, complete);
        }

        testBaseRoamingStateWrite(complete) {
            var app = WinJS.Application;

            WinJS.Promise.wrap().
                then(function () {
                    return app.roaming.exists("lastState.json");
                }).then(function (exists) {
                    if (exists) {
                        return app.roaming.remove("lastState.json");
                    }
                    LiveUnit.Assert.isFalse(exists, "should start empty");
                }).then(function () {
                    return app.roaming.readText("lastState.json", "default string");
                }).then(function (str) {
                    LiveUnit.Assert.areEqual("default string", str, "should return default string");
                    return app.roaming.exists("lastState.json");
                }).then(function (exists) {
                    LiveUnit.Assert.isFalse(exists, "still shouldn't exist");
                    return app.roaming.writeText("lastState.json", "some new string");
                }).then(function () {
                    return app.roaming.exists("lastState.json");
                }).then(function (exists) {
                    LiveUnit.Assert.isTrue(exists, "file should now exist");
                    return app.roaming.readText("lastState.json", "wasn't found!");
                }).then(function (str) {
                    LiveUnit.Assert.areEqual("some new string", str, "new content shold be read");
                    return app.roaming.remove("lastState.json");
                }).then(null, function (err) {
                    LiveUnit.Assert.fail(err);
                }).then(complete, complete);
        }

        testBaseSessionStateWrite(complete) {
            var app = WinJS.Application;

            WinJS.Promise.wrap().
                then(function () {
                    return app.local.exists("lastState.json");
                }).then(function (exists) {
                    if (exists) {
                        return app.local.remove("lastState.json");
                    }
                    LiveUnit.Assert.isFalse(exists, "should start empty");
                }).then(function () {
                    return app.local.readText("lastState.json", "default string");
                }).then(function (str) {
                    LiveUnit.Assert.areEqual("default string", str, "should return default string");
                    return app.local.exists("lastState.json");
                }).then(function (exists) {
                    LiveUnit.Assert.isFalse(exists, "still shouldn't exist");
                    return app.local.writeText("lastState.json", "some new string");
                }).then(function () {
                    return app.local.exists("lastState.json");
                }).then(function (exists) {
                    LiveUnit.Assert.isTrue(exists, "file should now exist");
                    return app.local.readText("lastState.json", "wasn't found!");
                }).then(function (str) {
                    LiveUnit.Assert.areEqual("some new string", str, "new content shold be read");
                    return app.local.remove("lastState.json");
                }).then(null, function (err) {
                    LiveUnit.Assert.fail(err);
                }).then(complete, complete);
        }
    }

    export class ApplicationStateTests_ForceNoTryGetItemAsync extends ApplicationStateTests {

        previous = [];
        stores = ["local", "roaming", "temp"];

        // Make templates run in compiled mode
        //
        setUp() {
            this.previous = this.stores.map(function (name) {
                var tryGetItemAsync = WinJS.Application[name]._tryGetItemAsync;
                delete WinJS.Application[name]._tryGetItemAsync;
                return tryGetItemAsync;
            });
        }
        tearDown() {
            this.stores.forEach((name, index) => {
                WinJS.Application[name]._tryGetItemAsync = this.previous[index];
            });
        }
    };

}

LiveUnit.registerTestClass("CorsicaTests.ApplicationStateTests");
LiveUnit.registerTestClass("CorsicaTests.ApplicationStateTests_ForceNoTryGetItemAsync");
