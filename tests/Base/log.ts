// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
///<reference path="../../bin/typings/tsd.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {
    "use strict";

    var count = 0;
    var funcCount = 0;

    function fakeLib() {
        WinJS.log && WinJS.log("called " + (++count), count + " start lib i1", "info");
        WinJS.log && WinJS.log(function () {
            ++funcCount;
            return "called " + funcCount;
        }, "func");
        fakeLib2();
        WinJS.log && WinJS.log("called " + (++count), count + " end lib i1", "info");
    }
    function fakeLib2() {
        WinJS.log && WinJS.log("called " + (++count), count + " start lib2 i2", "warn");
        WinJS.log && WinJS.log("called " + (++count), count + " middle []/\\-{}()*+?.,^$|# lib2 i3", "error");
        WinJS.log && WinJS.log("called " + (++count), count + " end lib2 i2", "warn");
    }

    export class Log {

        testNoLog() {
            WinJS.Utilities.stopLog();
            count = 0;
            WinJS.log = undefined;
            fakeLib();
            LiveUnit.Assert.areEqual(0, count);
            WinJS.Utilities.stopLog();
        }

        testNoOp() {
            WinJS.Utilities.stopLog();
            count = 0;
            WinJS.log = function () { };
            fakeLib();
            LiveUnit.Assert.areEqual(5, count);
            WinJS.Utilities.stopLog();
        }

        testConsole() {
            WinJS.log = null;
            var logC = 0;
            var errorC = 0;
            var warnC = 0;
            var infoC = 0;
            var c = window.console;
            try {
                window.console = <any>{
                    log: function (m) { logC++; },
                    error: function (m) { errorC++; },
                    warn: function (m) { warnC++; },
                    info: function (m) { infoC++; },
                };
                WinJS.Utilities.startLog();
                fakeLib();
                LiveUnit.Assert.areEqual(1, logC, "log calls");
                LiveUnit.Assert.areEqual(1, errorC, "error calls");
                LiveUnit.Assert.areEqual(2, warnC, "warn calls");
                LiveUnit.Assert.areEqual(2, infoC, "info calls");
                WinJS.Utilities.stopLog();
            }
            finally {
                window.console = c;
            }
        }
        testConsoleInclude() {
            WinJS.Utilities.stopLog();
            var logC = 0;
            var errorC = 0;
            var warnC = 0;
            var infoC = 0;
            var c = window.console;
            try {
                window.console = <any>{
                    log: function (m) { logC++; },
                    error: function (m) { errorC++; },
                    warn: function (m) { warnC++; },
                    info: function (m) { infoC++; },
                };
                WinJS.Utilities.startLog("i1");
                fakeLib();
                LiveUnit.Assert.areEqual(0, logC, "log calls");
                LiveUnit.Assert.areEqual(0, errorC, "error calls");
                LiveUnit.Assert.areEqual(0, warnC, "warn calls");
                LiveUnit.Assert.areEqual(2, infoC, "info calls");
                WinJS.Utilities.stopLog();
            }
            finally {
                window.console = c;
            }
        }
        testDefault() {
            WinJS.Utilities.stopLog();
            funcCount = 0;
            count = 0;
            WinJS.Utilities.startLog();
            fakeLib();
            LiveUnit.Assert.areEqual(5, count);
            LiveUnit.Assert.areEqual(1, funcCount);
            WinJS.Utilities.stopLog();
        }
        testNot() {
            WinJS.Utilities.stopLog();
            var c = 0;
            function msg() {
                c++;
            }
            WinJS.Utilities.startLog({ excludeTags: "i1", action: msg });
            fakeLib();
            LiveUnit.Assert.areEqual(4, c);
            WinJS.Utilities.stopLog();
        }
        testIncludeEscape() {
            WinJS.Utilities.stopLog();
            var c = 0;
            function msg() {
                c++;
            }
            WinJS.Utilities.startLog({ tags: "[]/\\-{}()*+?.,^$|#", action: msg });
            fakeLib();
            LiveUnit.Assert.areEqual(1, c);
            WinJS.Utilities.stopLog();
        }
        testMessageFunction() {
            WinJS.Utilities.stopLog();
            funcCount = 0;
            WinJS.Utilities.startLog({ tags: "func" });
            fakeLib();
            LiveUnit.Assert.areEqual(1, funcCount);
            WinJS.Utilities.stopLog();
        }
        testInclude() {
            WinJS.Utilities.stopLog();
            var c = 0;
            function msg() {
                c++;
            }
            WinJS.Utilities.startLog({ tags: "i1", action: msg });
            fakeLib();
            LiveUnit.Assert.areEqual(2, c);
            WinJS.Utilities.stopLog();
        }
        testInclude2() {
            WinJS.Utilities.stopLog();
            var c = 0;
            function msg() {
                c++;
            }
            WinJS.Utilities.startLog({ tags: "i1 i2", action: msg });
            fakeLib();
            LiveUnit.Assert.areEqual(4, c);
            WinJS.Utilities.stopLog();
        }

        testIncludeType() {
            WinJS.Utilities.stopLog();
            var c = 0;
            function msg() {
                c++;
            }
            WinJS.Utilities.startLog({ type: "info", action: msg });
            fakeLib();
            LiveUnit.Assert.areEqual(2, c);
            WinJS.Utilities.stopLog();
        }

        testIncludeType2() {
            WinJS.Utilities.stopLog();
            var c = 0;
            function msg() {
                c++;
            }
            WinJS.Utilities.startLog({ type: "info warn", action: msg });
            fakeLib();
            LiveUnit.Assert.areEqual(4, c);
            WinJS.Utilities.stopLog();
        }

        testCustomType() {
            WinJS.Utilities.stopLog();
            var hit = 0;
            WinJS.log = function (message, tags, type) {
                LiveUnit.LoggingCore.logComment("message=" + message);
                if (type === "bob") {
                    hit++;
                }
            }

        WinJS.Utilities.startLog({ type: "bob is your uncle" });

            // what if I only want to specify the type, but don't care about the tags?
            WinJS.log("here's a message", "tag", "bob");
            fakeLib();
            LiveUnit.Assert.areEqual(1, hit);
            WinJS.Utilities.stopLog();
        }

        // test logging message only (no tags, no type)
        testMessageOnly() {
            WinJS.Utilities.stopLog();
            var msg = "foo";
            var hit = 0;
            WinJS.log = function (message, tags, type) {
                LiveUnit.LoggingCore.logComment("message=" + message);
                if (message === msg) {
                    hit++;
                    LiveUnit.Assert.isTrue(tags === undefined);
                    LiveUnit.Assert.isTrue(type === undefined);
                }
            }

        WinJS.Utilities.startLog();
            WinJS.log(msg);
            fakeLib();

            LiveUnit.Assert.areEqual(1, hit);
            WinJS.Utilities.stopLog();
        }

        // save the original log() and call it from override log()
        testWrapOriginalLogFunc() {
            WinJS.Utilities.stopLog();

            var logC = 0;
            var errorC = 0;
            var warnC = 0;
            var infoC = 0;
            var overrideHit = 0;
            var c = window.console;

            try {
                window.console = <any>{
                    log: function (m) { logC++; },
                    error: function (m) { errorC++; },
                    warn: function (m) { warnC++; },
                    info: function (m) { infoC++; },
                };

                WinJS.Utilities.startLog();

                // save original, default log() so we can call it too.  Note, this maps back 
                // to internal defAction() inside log.js
                var originalLogFunc = WinJS.log;

                // override log()
                WinJS.log = function (message, tag, type) {
                    LiveUnit.LoggingCore.logComment("message=" + message);

                    // here's where we call the default log [defAction()]
                    originalLogFunc(message, tag, type);
                    overrideHit++;
                }

            fakeLib();
                LiveUnit.Assert.areEqual(1, logC, "log calls");
                LiveUnit.Assert.areEqual(1, errorC, "error calls");
                LiveUnit.Assert.areEqual(2, warnC, "warn calls");
                LiveUnit.Assert.areEqual(2, infoC, "info calls");
                LiveUnit.Assert.areEqual(6, overrideHit);
                WinJS.Utilities.stopLog();
            }
            finally {
                window.console = c;
            }
        }

        // override the log() and verify all 3 params are passed through
        testLogOverride() {
            var myMessage = "ima msg";
            var myTag = "tag1 tag2";
            var myType = "info warn";

            WinJS.Utilities.stopLog();

            WinJS.log = function (message, tag, type) {
                LiveUnit.Assert.areEqual(myMessage, message);
                LiveUnit.Assert.areEqual(myTag, tag);
                LiveUnit.Assert.areEqual(myType, type);
            }

        WinJS.Utilities.startLog();
            WinJS.log && WinJS.log(myMessage, myTag, myType);

            WinJS.Utilities.stopLog();
        }
    };

}

LiveUnit.registerTestClass("CorsicaTests.Log");