///<reference path="qunit-1.14.0.js" />

(function () {
    function _() {
    }

    var qUnitGlobalErrorHandler = window.onerror;

    var verboseLog = "";

    QUnit.config.autostart = false;
    QUnit.config.hidepassed = true;
    QUnit.config.testTimeout = 20000;
    QUnit.breakOnAssertFail = false;

    window.onload = function () {
        function addOptions() {
            var toolBar = document.querySelector("#qunit-testrunner-toolbar");
            if (!toolBar) {
                setTimeout(addOptions, 100);
                return;
            }
            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.onchange = function () {
                QUnit.breakOnAssertFail = cb.checked;
            };
            var span = document.createElement("span");
            span.innerHTML = "Break on Assert fail";
            toolBar.appendChild(cb);
            toolBar.appendChild(span);

            var btn = document.createElement("button");
            btn.innerHTML = "Start";
            btn.onclick = function () {
                QUnit.start();
            };
            toolBar.appendChild(btn);
        }
        addOptions();
    };

    function handleGlobalError(testFunc, error) {
        var expectedException = testFunc["LiveUnit.ExpectedException"];
        if (expectedException) {
            if (expectedException.message) {
                expectedException = [expectedException];
            }
            var handled = false;
            for (var i = 0; i < expectedException.length; i++) {
                if (expectedException[i].message === error) {
                    handled = true;
                    break;
                }
            }
            if (handled) {
                QUnit.assert.ok(true, "Caught expected exception: " + error);
            } else {
                QUnit.assert.ok(false, "Unexpected exception: " + error);
            }
        } else {
            QUnit.assert.ok(false, "Unexpected exception: " + error);
        }
    }

    function hookupGlobalErrorHandler(testFunc) {
        var expectedException = testFunc["LiveUnit.ExpectedException"];
        if (expectedException) {
            if (expectedException.message) {
                expectedException = [expectedException];
            }
            window.onerror = function (e) {
                handleGlobalError(testFunc, e);
            };
        } else {
            window.onerror = qUnitGlobalErrorHandler;
        }
    }

    function cleanUp() {
        WinJS.Utilities.disposeSubTree(document.body);
    }

    QUnit.testDone(function testDone(args, timeout) {
        cleanUp();

        if (timeout) {
            // If a test timed out, then it never called start, so we do that here now.
            console.log(args.module + ": " + args.name + " TIMEOUT");
            QUnit.start();
        }
        else if (args.failed) {
            console.log(args.module + ": " + args.name + ", " + args.passed + "/" + args.total + ", " + args.runtime + "ms");
            console.log(verboseLog);
        }
    });

    window.LiveUnit = {
        Assert: {
            areEqual: function (expected, actual, message) {
                if (expected !== actual && QUnit.breakOnAssertFail) {
                    debugger;
                }
                QUnit.assert.equal(actual, expected, message);
            },

            areNotEqual: function (left, right, message) {
                if (left === right && QUnit.breakOnAssertFail) {
                    debugger;
                }
                QUnit.assert.notEqual(right, left, message);
            },

            fail: function (message) {
                if(QUnit.breakOnAssertFail) {
                    debugger;
                }
                QUnit.assert.ok(false, message);
            },

            isFalse: function (falsy, message) {
                if (falsy && QUnit.breakOnAssertFail) {
                    debugger;
                }
                QUnit.assert.ok(!falsy, message);
            },

            isTrue: function (truthy, message) {
                if (!truthy && QUnit.breakOnAssertFail) {
                    debugger;
                }
                QUnit.assert.ok(truthy, message);
            },

            isNull: function (obj, message) {
                var pass = obj === null || obj === undefined;
                if (!pass && QUnit.breakOnAssertFail) {
                    debugger;
                }
                QUnit.assert.ok(pass, message);
            },

            isNotNull: function (obj, message) {
                var pass = obj !== null && obj !== undefined;
                if (!pass && QUnit.breakOnAssertFail) {
                    debugger;
                }
                // LiveUnit's null assert also accepts undefined
                QUnit.assert.ok(pass, message);
            },
        },

        GetWrappedCallback: function (func) {
            return func;
        },

        LoggingCore: {
            logComment: function (message) {
                verboseLog += "\n" + message;
            }
        },

        registerTestClass: function (moduleName) {
            var path = moduleName.split(".");
            var module = window;
            path.forEach(function (key) {
                module = module[key];
            });
            var testModule = new module();

            QUnit.module(moduleName, {
                setup: testModule.setUp ? testModule.setUp.bind(testModule) : _,
                teardown: testModule.tearDown ? testModule.tearDown.bind(testModule) : _
            });

            Object.keys(testModule).forEach(function (key) {
                if (key.indexOf("test") !== 0) {
                    return;
                }

                var testName = key.substr("test".length);
                var testFunc = testModule[key];
                if (testFunc.length) {
                    // Async WebUnit tests take a 'complete' parameter
                    QUnit.asyncTest(testName, function () {
                        verboseLog = "";
                        hookupGlobalErrorHandler(testFunc);
                        QUnit.assert.ok(true, "Test Started");
                        var error = false;
                        var start = performance.now();
                        try {
                            testFunc.call(testModule, function () {
                                if (!error) {
                                    QUnit.start();
                                }
                            });
                        } catch (e) {
                            handleGlobalError(testFunc, e.message);
                            QUnit.start();
                            error = true;
                        }
                    });
                } else {
                    QUnit.asyncTest(testName, function () {
                        verboseLog = "";
                        hookupGlobalErrorHandler(testFunc);
                        QUnit.assert.ok(true, "Test Started");
                        try {
                            testFunc.call(testModule);
                            QUnit.start();
                        }
                        catch (e) {
                            handleGlobalError(testFunc, e.message);
                            QUnit.start();
                        }
                    });
                }
            });
        },
    };
})();