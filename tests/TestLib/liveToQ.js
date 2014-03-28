/*
Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved.

Licensed under the Apache License, Version 2.0.

See License.txt in the project root for license information.
*/

///<reference path="qunit-1.14.0.js" />
///<reference path="../../../tests/TestLib/qunit-1.14.0.js" />

(function () {
    function _() {
    }

    var tests = [];
    var testMap = {};

    var testQueue = [];

    window.onload = function () {
        var container = document.querySelector("#loadedTests");
        tests.forEach(function (test) {
            container.appendChild(test.element);
        });
    };
    window.runAllTests = function () {
        runTests(tests);
    };
    window.resetTests = function () {
        var container = document.querySelector("#loadedTests");
        for (var i = 0, l = container.children.length; i < l; i++) {
            container.children[i].style.backgroundColor = "";
        }
    };

    function runTests(tests) {
        tests.forEach(function (test) {
            testQueue.push(function () {
                var module = test.module;
                QUnit.module(test.moduleName, {
                    setup: module.setUp || _,
                    teardown: module.tearDown || _
                });

                var testFunc = module["test" + test.testName];
                if (testFunc.length) {
                    // Async WebUnit tests take a 'complete' parameter
                    QUnit.asyncTest(test.testName, function () {
                        QUnit.config.current.ignoreGlobalErrors = true;
                        QUnit.assert.ok(true, "Test Started");
                        testFunc.call(module, function () {
                            QUnit.start();
                        });
                    });
                } else {
                    QUnit.test(test.testName, function () {
                        QUnit.config.current.ignoreGlobalErrors = true;
                        QUnit.assert.ok(true, "Test Started");
                        testFunc.call(module);
                    });
                }
            });
        });
        runNext();
    }

    function runNext() {
        if (!testQueue.length) {
            return;
        }
        var test = testQueue[0];
        testQueue.splice(0, 1);

        test();
    }

    QUnit.testStart(function (args) {
        //console.log("Test Started - " + args.module + ": " + args.name);
    });

    QUnit.testDone(function (args) {
        setImmediate(runNext);

        var test = testMap[args.module + "." + args.name];
        test.element.style.backgroundColor = args.failed ? "red" : "green";

        //console.log("Test Finished - " + args.module + ": " + args.name + ", " + args.passed + "/" + args.total + ", " + args.runtime + "ms");
        if (args.failed) {
            console.log(args.module + ": " + args.name + ", " + args.passed + "/" + args.total + ", " + args.runtime + "ms");
        } else {
            console.log(args.module + ": " + args.name + ", PASSED in " + args.runtime + "ms");
        }
    });

    QUnit.moduleDone(function (args) {

    });
    QUnit.moduleStart(function (args) {
    });

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
            }
        },

        GetWrappedCallback: function (func) {
            return func;
        },

        LoggingCore: {
            logComment: function (message) {
                //console.log("  LoggingCore: " + message);
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
                    element: div
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