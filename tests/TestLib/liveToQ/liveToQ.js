///<reference path="qunit-1.14.0.js" />

(function () {
    var qUnitGlobalErrorHandler = window.onerror;

    var testFailed = false;
    var testError = "";
    var verboseLog = "";
    var log = [];

    QUnit.config.autostart = false;
    QUnit.config.testTimeout = 30000;
    QUnit.config.hidepassed = true;
    QUnit.breakOnAssertFail = false;

    var qunitDiv;
    var qunitTestFixtureDiv;
    window.addEventListener("load", function () {
        qunitDiv = document.querySelector("#qunit");
        qunitTestFixtureDiv = document.querySelector("#qunit-fixture");

        function addOptions() {
            var toolBar = document.querySelector("#qunit-testrunner-toolbar");
            if (!toolBar) {
                setTimeout(addOptions);
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
            btn.style.borderColor = btn.style.color = "#5E740B";
            btn.style.marginLeft = "4px";
            btn.innerHTML = "Start";
            btn.onclick = function () {
                QUnit.start();
            };
            toolBar.appendChild(btn);

            if (QUnit.urlParams.autostart === "true" || QUnit.urlParams.autostart === true) {
                QUnit.start();
            }
        }
        addOptions();
    });

    if (QUnit.urlParams.unittesting === "true" || QUnit.urlParams.unittesting === true) {
        WinJS.Utilities._unitTesting = true;
    }

    function completeTest() {
        QUnit.assert.ok(!testFailed, testError);
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

    function cleanUp(testName) {
        testFailed = false;
        testError = "";
        verboseLog = "";

        qunitDiv.style.zIndex = 0;
    }

    QUnit.testStart(function testStart(testDetails) {
        qunitDiv.style.zIndex = -1;
        QUnit.log = function (details) {
            if (!details.result) {
                details.name = testDetails.name;
                log.push(details);
            }
        }
    });

    QUnit.testDone(function testDone(args) {
        if (args.failed) {
            console.log(args.module + ": " + args.name + ", " + args.passed + "/" + args.total + ", " + args.runtime + "ms");
            console.log(verboseLog);
        }
        cleanUp(args.name);
    });

    QUnit.moduleDone(function (args) {
        if (document.body.children.length > 2) {
            for (var i = document.body.children.length - 1; i >= 0; i--) {
                var child = document.body.children[i];
                if (child === qunitDiv || child === qunitTestFixtureDiv) {
                    continue;
                }

                console.log("Test: " + args.name + " - Incomplete cleanup!");
                WinJS.Utilities.disposeSubTree(child);
                document.body.removeChild(child);
            }
        }
    });

    QUnit.done(function (test_results) {
        var tests = log.map(function (details) {
            return {
                name: details.name,
                result: details.result,
                expected: details.expected,
                actual: details.actual,
                source: details.source
            }
        });
        test_results.tests = tests;

        window.global_test_results = test_results;
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
                    testError = testError || formatString("areEqual - {0} (expected: {1}, actual: {2})", message || "", expected, actual);
                    testFailed = true;
                }
            },

            areNotEqual: function (left, right, message) {
                if (left === right) {
                    if (QUnit.breakOnAssertFail) {
                        debugger;
                    }
                    testError = testError || formatString("areNotEqual - {0} (both equal: {1})", message || "", left);
                    testFailed = true;
                }
            },

            fail: function (message) {
                if (QUnit.breakOnAssertFail) {
                    debugger;
                }
                testError = testError || formatString("fail - {0}", message || "");
                testFailed = true;
            },

            isFalse: function (falsy, message) {
                if (falsy) {
                    if (QUnit.breakOnAssertFail) {
                        debugger;
                    }
                    testError = testError || formatString("isFalse - {0} (expected: falsy, actual: {1})", message || "", falsy);
                    testFailed = true;
                }
            },

            isTrue: function (truthy, message) {
                if (!truthy) {
                    if (QUnit.breakOnAssertFail) {
                        debugger;
                    }
                    testError = testError || formatString("isTrue - {0} (expected: truthy, actual: {1})", message || "", truthy);
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
                    testError = testError || formatString("isNull - {0} (expected: null or undefined, actual: {1})", message || "", obj);
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
                    testError = testError || formatString("isNotNull - {0} (expected: not null and not undefined, actual: {1})", message || "", obj);
                    testFailed = true;
                }
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

            Object.keys(testModule).forEach(function (key) {
                if (key.indexOf("test") !== 0) {
                    return;
                }

                var testName = key.substr("test".length);
                var testFunc = testModule[key];
                if (testFunc.length) {
                    // Async WebUnit tests take a 'complete' parameter
                    QUnit.asyncTest(testName, function () {
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
