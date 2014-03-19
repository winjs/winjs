///<reference path="qunit-1.14.0.js" />
///<reference path="../../../tests/TestLib/qunit-1.14.0.js" />

(function () {
    function _() {
    }

    var TestTimeoutDuration = 10000;

    var qUnitGlobalErrorHandler = window.onerror;
    var toolsDiv = null;
    var loadedTests = null;
    var inputFilter = null;
    var testTimeoutHandle = 0;
    var filterTimeoutHandle = 0;

    var tests = [];
    var testMap = {};
    var testQueue = [];
    var verboseLog = "";
    var loadedTestsScrollPosition = 0;

    window.onload = function () {
        toolsDiv = document.querySelector("#toolsDiv");
        loadedTests = document.querySelector("#loadedTests");
        inputFilter = document.querySelector("#inputFilter");
        tests.forEach(function (test) {
            loadedTests.appendChild(test.element);
        });
    };
    window.runAllTests = function () {
        runTests(tests);
    };
    window.resetTests = function () {
        window.location = window.location;
    };
    window.filterTests = function () {
        clearTimeout(filterTimeoutHandle);
        setTimeout(function () {
            var filter = inputFilter.value;

            for (var i = loadedTests.children.length - 1; i >= 0; i--) {
                loadedTests.removeChild(loadedTests.children[i]);
            }

            for (var i = 0; i < tests.length; i++) {
                var test = tests[i];
                if (test.testName.toLowerCase().indexOf(filter) >= 0 || test.moduleName.toLowerCase().indexOf(filter) >= 0) {
                    loadedTests.appendChild(test.element);
                }
            }
        }, 500);
    };

    function runTests(tests) {
        tests.forEach(function (test) {
            testQueue.push(function () {
                test.isComplete = false;
                verboseLog = "";

                var module = test.module;
                QUnit.module(test.moduleName, {
                    setup: module.setUp ? module.setUp.bind(module) : _,
                    teardown: module.tearDown ? module.tearDown.bind(module) : _
                });

                var testFunc = module["test" + test.testName];
                if (testFunc.length) {
                    // Async WebUnit tests take a 'complete' parameter
                    QUnit.asyncTest(test.testName, function () {
                        hookupGlobalErrorHandlers(testFunc);
                        QUnit.assert.ok(true, "Test Started");
                        try {
                            testFunc.call(module, function () {
                                QUnit.start();
                            });
                        } catch (e) {
                            setTimeout(function () {
                                setTimeout(function () {
                                    QUnit.start();
                                });
                                throw e;
                            });
                        }
                    });
                } else {
                    QUnit.asyncTest(test.testName, function () {
                        hookupGlobalErrorHandlers(testFunc);
                        QUnit.assert.ok(true, "Test Started");
                        try {
                            testFunc.call(module);
                        }
                        catch (e) {
                            setTimeout(function () {
                                setTimeout(function () {
                                    QUnit.start();
                                });
                                throw e;
                            });
                        }
                    });
                }
            });
        });
        runNext();
    }

    function hookupGlobalErrorHandlers(testFunc) {
        var expectedException = testFunc["LiveUnit.ExpectedException"];
        if (expectedException) {
            if (expectedException.message) {
                expectedException = [expectedException];
            }

            window.onerror = function (e) {
                var handled = false;
                for (var i = 0; i < expectedException.length; i++) {
                    if (expectedException[i].message === e.message) {
                        handled = true;
                        break;
                    }
                }
                if (handled) {
                    QUnit.assert.ok(true, "Caught expected exception: " + e.message);
                    e.preventDefault();
                    e.stopPropagation();
                } else {
                    QUnit.assert.ok(false, "Unexpected exception: " + e.message);
                }
            };
        } else {
            window.onerror = qUnitGlobalErrorHandler;
        }
    }

    function cleanUp() {
        clearTimeout(testTimeoutHandle);

        WinJS.Utilities.disposeSubTree(document.body);
        document.body.innerHTML = "";

        testTimeoutHandle = setTimeout(function () {
            document.body.appendChild(toolsDiv);
            loadedTests.scrollTop = loadedTestsScrollPosition;
        }, 500);
    }

    function testStart(args) {
        clearTimeout(testTimeoutHandle);
        testTimeoutHandle = setTimeout(function () {
            testDone(args, true);
        }, TestTimeoutDuration);
    }
    QUnit.testStart(testStart);

    function testDone(args, timeout) {
        var test = testMap[args.module + "." + args.name];
        if (test.isComplete) {
            return;
        }
        cleanUp();
        test.element.style.backgroundColor = (args.failed || timeout) ? "red" : "green";
        test.isComplete = true;

        if (timeout) {
            console.log(args.module + ": " + args.name + " TIMEOUT");
        }
        else if (args.failed) {
            console.log(args.module + ": " + args.name + ", " + args.passed + "/" + args.total + ", " + args.runtime + "ms");
            console.log(verboseLog);
        } else {
            console.log(args.module + ": " + args.name + ", PASSED in " + args.runtime + "ms");
        }

        setImmediate(runNext);
    }
    QUnit.testDone(testDone);

    function runNext() {
        if (!testQueue.length) {
            return;
        }

        if (document.body.contains(toolsDiv)) {
            loadedTestsScrollPosition = loadedTests.scrollTop;
            document.body.removeChild(toolsDiv);
        }

        var test = testQueue[0];
        testQueue.splice(0, 1);

        test();
    }

    window.LiveUnit = {
        Assert: {
            areEqual: function (expected, actual, message) {
                if (expected !== actual) {
                    debugger;
                }
                QUnit.assert.equal(actual, expected, message);
            },

            areNotEqual: function (left, right, message) {
                if (left === right) {
                    debugger;
                }
                QUnit.assert.notEqual(right, left, message);
            },

            fail: function (message) {
                debugger;
                QUnit.assert.ok(false, message);
            },

            isFalse: function (falsy, message) {
                if (falsy) {
                    debugger;
                }
                QUnit.assert.ok(!falsy, message);
            },

            isTrue: function (truthy, message) {
                if (!truthy) {
                    debugger;
                }
                QUnit.assert.ok(truthy, message);
            },

            isNull: function (obj, message) {
                if (obj) {
                    debugger;
                }
                QUnit.assert.equal(obj, null, message);
            },

            isNotNull: function (obj, message) {
                if (!obj) {
                    debugger;
                }
                QUnit.assert.notEqual(obj, null, message);
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

            Object.keys(testModule).forEach(function (key) {
                if (key.indexOf("test") !== 0) {
                    return;
                }

                var testName = key.substr("test".length);
                var fullName = moduleName + "." + testName;
                var div = document.createElement("div");
                div.innerHTML = fullName;
                var test = {
                    moduleName: moduleName,
                    module: testModule,
                    testName: testName,
                    element: div,
                    isComplete: false,
                };
                tests.push(test);
                testMap[fullName] = test;

                div.onclick = function () {
                    runTests([test]);
                };
            });
        },
    };
})();