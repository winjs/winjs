///<reference path="qunit-1.14.0.js" />

(function () {
    var qUnitGlobalErrorHandler = window.onerror;

    var testTimeout = QUnit.urlParams.testtimeout ? QUnit.urlParams.testtimeout : 15000;
    var startTime = -1;
    var hasRun = false;
    var testFailed = false;
    var testError = null;
    var verboseLog = "";
    var log = [];

    var socketId = document.title;
    var socketSignal = null;

    QUnit.config.autostart = false;
    QUnit.config.testTimeout = testTimeout;
    QUnit.config.hidepassed = true;
    QUnit.breakOnAssertFail = false;

    var qunitDiv;
    var qunitTestFixtureDiv;
    window.addEventListener("load", function () {
        qunitDiv = document.querySelector("#qunit");
        qunitTestFixtureDiv = document.querySelector("#qunit-fixture");

        function addOptions() {
            function createOption(id, label, initiallyChecked) {
                var cb = document.createElement("input");
                cb.type = "checkbox";
                cb.id = id;
                cb.checked = initiallyChecked;
                var span = document.createElement("span");
                span.innerHTML = label;
                toolBar.appendChild(cb);
                toolBar.appendChild(span);
            }

            var toolBar = document.querySelector("#qunit-testrunner-toolbar");
            if (!toolBar) {
                setTimeout(addOptions);
                return;
            }

            createOption("breakOnAssertFail", "Break on Assert fail", QUnit.urlParams.breakonassertfail === "true" || QUnit.urlParams.breakonassertfail === true);
            createOption("disableTestTimeout", "Disable test timeout", QUnit.urlParams.disabletesttimeout === "true" || QUnit.urlParams.disabletesttimeout === true);
            createOption("fastAnimations", "Fast Animations", QUnit.urlParams.fastanimations === "true" || QUnit.urlParams.fastanimations === true);
            createOption("loopTests", "Loop Tests", QUnit.urlParams.loop === "true" || QUnit.urlParams.loop === true);

            var btn = document.createElement("button");
            btn.id = "startButton";
            btn.style.borderColor = btn.style.color = "#5E740B";
            btn.style.marginLeft = "4px";
            btn.innerHTML = "Start";
            btn.onclick = function () {
                // Changing the fast animations setting requires a re-load.
                if (!hasRun && (WinJS.Utilities._fastAnimations === document.querySelector("#fastAnimations").checked)) {
                    start();
                } else {
                    var qs = "?breakonassertfail=" + document.querySelector("#breakOnAssertFail").checked;
                    qs += "&disabletesttimeout=" + document.querySelector("#disableTestTimeout").checked;
                    qs += "&fastanimations=" + document.querySelector("#fastAnimations").checked;
                    qs += "&loop=" + document.querySelector("#loopTests").checked;
                    qs += "&autostart=true";
                    if (QUnit.urlParams.module) {
                        qs += "&module=" + QUnit.urlParams.module;
                    }
                    if (QUnit.urlParams.testNumber) {
                        qs += "&testNumber=" + QUnit.urlParams.testNumber;
                    }
                    window.location = window.location.protocol + "//" + window.location.host + window.location.pathname + qs;
                }
            };
            toolBar.appendChild(btn);

            if (QUnit.urlParams.autostart === "true" || QUnit.urlParams.autostart === true) {
                start();
            }
        }
        addOptions();

        if (QUnit.urlParams.subscriptionKey) {
            var socket = null;
            var socketReady = false;
            var listeners = [];
            socketSignal = function (callback) {
                if (socketReady) {
                    callback(socket);
                } else {
                    listeners.push(callback);
                }
            };

            var attempts = 0;
            setTimeout(function connect() {
                try {
                    socket = new WebSocket("ws://localhost:9998");
                    socket.onopen = function () {
                        socket.send(JSON.stringify({ id: socketId, type: "registerReporter", args: { subscriptionKey: QUnit.urlParams.subscriptionKey } }));
                        listeners.forEach(function (listener) {
                            listener(socket);
                        });
                        socketReady = true;
                    };
                    socket.onclose = function (m) {
                        setTimeout(window.close, 500);
                    }
                    attempts++;
                } catch (e) {
                    // new WebSocket() can throw a security exception when there are too many connections
                    // going out at once; since the dashboard launches 4+ test pages at once, we may see
                    // some of these.
                    if (attempts < 5) {
                        setTimeout(connect, 500);
                    }
                }
            }, 500);
        }
    });

    if (QUnit.urlParams.fastanimations === "true" || QUnit.urlParams.fastanimations === true) {
        WinJS.Utilities._fastAnimations = true;
    }

    function start() {
        hasRun = true;
        QUnit.breakOnAssertFail = document.querySelector("#breakOnAssertFail").checked;
        QUnit.config.testTimeout = document.querySelector("#disableTestTimeout").checked ? undefined : testTimeout;
        QUnit.config.started = +new Date(); // This is a temporary fix and can be removed when and if jquery/qunit#555 is accepted.
        QUnit.start();
    }

    function completeTest() {
        // Since we want one assert per test, if this test times out, then we do not
        // call asserts because the timeout itself is a failed assert.
        if (Date.now() - startTime < testTimeout || typeof QUnit.config.testTimeout === 'undefined') {
            QUnit.assert.ok(!testFailed, testError && testError.message);
        } else {
            verboseLog = "Test timeout - " + verboseLog;
        }
        QUnit.start();
    }

    function handleGlobalError(testFunc, error) {
        var expectedException = testFunc["LiveUnit.ExpectedException"];
        if (expectedException) {
            if (expectedException.message) {
                expectedException = [expectedException];
            }
            var handled = false;
            for (var i = 0; i < expectedException.length; i++) {
                var message = expectedException[i].message
                // Chrome prefixes with "Uncaught Error". Firefox prefixes with "Error"
                if (message === error || ("Uncaught Error: " + message) === error || ("Error: " + message) === error) {
                    handled = true;
                    break;
                }
            }
            if (!handled) {
                LiveUnit.Assert.fail("Unexpected exception: " + error);
            }
        } else {
            LiveUnit.Assert.fail("Unexpected exception: " + error);
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
        testFailed = false;
        testError = null;
        verboseLog = "";

        qunitDiv.style.zIndex = 0;
    }

    function AllObjectKeys(obj) {
        var keys = Object.keys(obj);
        var proto = Object.getPrototypeOf(obj);
        if(proto) {
            var protoKeys = AllObjectKeys(proto);
            return keys.concat(protoKeys);
        }

        return keys;
    }

    QUnit.testStart(function testStart(testDetails) {
        qunitDiv.style.zIndex = -1;
    });

    QUnit.log(function (details) {
        if (!details.result) {
            testError = testError || {};
            testError.source = details.source;
        }
    });

    QUnit.testDone(function testDone(test) {
        if (test.failed) {
            console.log(test.module + ": " + test.name + " failed, " + test.runtime + "ms");
            console.log(verboseLog);
            log.push({
                name: test.name,
                result: !!test.failed,
                expected: testError.expected,
                actual: testError.actual,
                // Omit all but the first few callstacks to keep our results data small.
                // If it's larger than 64 KB, Saucelabs will ignore it.
                source: (log.length < 3 && testError.source) ? testError.source.substr(0, 500) : null
            });            
            socketSignal && socketSignal(function (socket) {
                socket.send(JSON.stringify({
                    id: socketId,
                    type: "report",
                    args: {
                        data: {
                            type: "singleFailure",
                            name: test.name,
                            number: QUnit.config.current.testNumber
                        }
                    }
                }));
            });
        }
        cleanUp();
    });

    QUnit.moduleDone(function (module) {
        if (document.body.children.length > 2) {
            for (var i = document.body.children.length - 1; i >= 0; i--) {
                var child = document.body.children[i];
                if (child === qunitDiv || child === qunitTestFixtureDiv) {
                    continue;
                }

                console.log("Test: " + module.name + " - Incomplete cleanup!");
                WinJS.Utilities.disposeSubTree(child);
                document.body.removeChild(child);
            }
        }
    });

    QUnit.done(function (results) {
        if (document.querySelector("#loopTests").checked) {
            if (!log.length) {
                document.querySelector("#startButton").click();
            }
        } else {
            results.tests = log;
            results.url = document.location.href;
            window.global_test_results = results;

            socketSignal && socketSignal(function (socket) {
                socket.send(JSON.stringify({
                    id: socketId,
                    type: "report",
                    args: {
                        data: {
                            type: "finished",
                            runtime: results.runtime,
                            failures: log.length
                        }
                    }
                }));
                socket.close();
            });
        }
    });

    function formatString(string) {
        var args = arguments;
        if (args.length > 1) {
            string = string.replace(/({{)|(}})|{(\d+)}|({)|(})/g,
                function (unused, left, right, index, illegalLeft, illegalRight) {
                    if (illegalLeft || illegalRight) {
                        throw new Error(formatString("Malformed string input: {0}", illegalLeft || illegalRight));
                    }
                    return (left && "{") || (right && "}") || args[(index | 0) + 1];
                });
        }
        return string;
    }

    window.LiveUnit = {
        Assert: {
            areEqual: function (expected, actual, message) {
                if (expected !== actual) {
                    if (QUnit.breakOnAssertFail) {
                        debugger;
                    }
                    testError = testError || {
                        message: formatString("areEqual - {0} (expected: {1}, actual: {2})", message || "", expected, actual),
                        expected: expected,
                        actual: actual
                    };
                    testFailed = true;
                }
            },

            areNotEqual: function (left, right, message) {
                if (left === right) {
                    if (QUnit.breakOnAssertFail) {
                        debugger;
                    }
                    testError = testError || {
                        message: formatString("areNotEqual - {0} (both equal: {1})", message || "", left),
                        expected: left,
                        actual: right
                    };
                    testFailed = true;
                }
            },

            fail: function (message) {
                if (QUnit.breakOnAssertFail) {
                    debugger;
                }
                testError = testError || {
                    message: formatString("fail - {0}", message || ""),
                    expected: "pass",
                    actual: "fail"
                };
                testFailed = true;
            },

            isFalse: function (falsy, message) {
                if (falsy) {
                    if (QUnit.breakOnAssertFail) {
                        debugger;
                    }
                    testError = testError || {
                        message: formatString("isFalse - {0} (expected: falsy, actual: {1})", message || "", falsy),
                        expected: "falsy",
                        actual: falsy
                    };
                    testFailed = true;
                }
            },

            isTrue: function (truthy, message) {
                if (!truthy) {
                    if (QUnit.breakOnAssertFail) {
                        debugger;
                    }
                    testError = testError || {
                        message: formatString("isTrue - {0} (expected: truthy, actual: {1})", message || "", truthy),
                        expected: "truthy",
                        actual: truthy
                    };
                    testFailed = true;
                }
            },

            isNull: function (obj, message) {
                // LiveUnit's null assert also accepts undefined
                var pass = obj === null || obj === undefined;
                if (!pass) {
                    if (QUnit.breakOnAssertFail) {
                        debugger;
                    }
                    testError = testError || {
                        message: formatString("isNull - {0} (expected: null or undefined, actual: {1})", message || "", obj),
                        expected: "null",
                        actual: obj
                    };
                    testFailed = true;
                }
            },

            isNotNull: function (obj, message) {
                // LiveUnit's null assert also accepts undefined
                var pass = obj !== null && obj !== undefined;
                if (!pass) {
                    if (QUnit.breakOnAssertFail) {
                        debugger;
                    }
                    testError = testError || {
                        message: formatString("isNotNull - {0} (expected: not null and not undefined, actual: {1})", message || "", obj),
                        expected: "not null",
                        actual: obj
                    };
                    testFailed = true;
                }
            },

            stringContains: function (str, substr, message) {
                var pass = str.indexOf(substr) !== -1;
                if (!pass) {
                    if (QUnit.breakOnAssertFail) {
                        debugger;
                    }
                    testError = testError || {
                        message: formatString("stringContains - {0} (substring '{1}' not present in '{2}')", message || "", substr, str),
                        expected: substr,
                        actual: str
                    };
                    testFailed = true;
                }
            },

            stringDoesNotContain: function (str, substr, message) {
                var pass = str.indexOf(substr) === -1;
                if (!pass) {
                    if (QUnit.breakOnAssertFail) {
                        debugger;
                    }
                    testError = testError || {
                        message: formatString("stringDoesNotContain - {0} (substring '{1}' was present in '{2}')", message || "", substr, str),
                        expected: substr,
                        actual: str
                    };
                    testFailed = true;
                }
            }
        },

        GetWrappedCallback: function (func) {
            return func;
        },

        LoggingCore: {
            logComment: function (message) {
                verboseLog += "\n" + message;
            },

            getVerboseLog: function () {
                return verboseLog;
            },
        },

        registerTestClass: function (moduleName) {
            function runSetupTeardownFunc(func) {
                if (func.length) {
                    QUnit.stop();
                    func(function () {
                        QUnit.start();
                    });
                } else {
                    func();
                }
            }

            var path = moduleName.split(".");
            var module = window;
            path.forEach(function (key) {
                module = module[key];
            });
            var testModule = new module();

            QUnit.module(moduleName, {
                setup: function () {
                    if (!testModule.setUp) {
                        return;
                    }
                    runSetupTeardownFunc(testModule.setUp.bind(testModule));
                },
                teardown: function () {
                    if (!testModule.tearDown) {
                        return;
                    }
                    runSetupTeardownFunc(testModule.tearDown.bind(testModule));
                }
            });
            
            AllObjectKeys(testModule).forEach(function (key) {
                if (key.indexOf("test") !== 0) {
                    return;
                }

                var testName = key.substr("test".length);
                var testFunc = testModule[key];
                if (testFunc.length) {
                    // Async WebUnit tests take a 'complete' parameter
                    QUnit.asyncTest(testName, function () {
                        startTime = Date.now();
                        hookupGlobalErrorHandler(testFunc);
                        var error = false;
                        try {
                            testFunc.call(testModule, function () {
                                if (!error) {
                                    completeTest();
                                }
                            });
                        } catch (e) {
                            handleGlobalError(testFunc, e.message);
                            completeTest();
                            error = true;
                        }
                    });
                } else {
                    QUnit.asyncTest(testName, function () {
                        startTime = Date.now();
                        hookupGlobalErrorHandler(testFunc);
                        try {
                            testFunc.call(testModule);
                            completeTest();
                        }
                        catch (e) {
                            handleGlobalError(testFunc, e.message);
                            completeTest();
                        }
                    });
                }
            });
        },
    };
})();
