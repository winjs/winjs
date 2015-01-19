(function () {
    var numParallel = 2;
    var numRetries = 2;

    module.exports = function (grunt) {

        grunt.registerTask("browserstack", function () {
            grunt.task.run(["connect:browserstack", "_browserstack", "post-tests-results"]);
        });

        grunt.registerTask("_browserstack", function () {
            var complete = this.async();

            var bst = require("browserstacktunnel-wrapper");
            var tunnel = new bst({
                key: "scb8Tm2t5saetT1KzPBd",
                hosts: [{
                    name: "localhost",
                    port: 9999,
                    sslFlag: 0
                }]
            });

            tunnel.start(function (error) {
                if (error) {
                    console.log(error);
                    complete();
                    return;
                }
                console.log("Tunnel established");

                var config = require("../config.js");
                var cp = require("child_process");

                config.tests_results = { results: [], environment: [], date: new Date() };
                var tests = generateTestSetups();
                config.tests_results.environment = tests.map(function (test, i) {
                    var info = {};
                    info["e" + (i + 1)] = test.cap.os + " " + test.cap.os_version + " / " + test.cap.browser + test.cap.browser_version;
                    return info;
                });
                var curTest = 0;
                var activeRuns = 0;

                for (var i = 0; i < Math.min(tests.length, numParallel) ; i++) {
                    nextTest();
                }

                function nextTest() {
                    if (curTest === tests.length) {
                        if (activeRuns === 0) {
                            complete();
                        }
                        return;
                    }

                    activeRuns++;
                    var test = tests[curTest++];
                    var platform = test.cap.device || test.cap.os + " " + test.cap.os_version + " / " + test.cap.browser + test.cap.browser_version;
                    var moduleName = getTestNameFromUrl(test.url);
                    var runComplete = false;
                    var retriesLeft = numRetries;

                    createChildAndRunTest()

                    function createChildAndRunTest() {
                        console.log("Starting test: " + moduleName + " on " + platform);

                        var child = cp.fork("tasks/browserstackChild.js", [], { silent: false });
                        child.on("message", function (msg) {
                            var type = msg.type;
                            switch (type) {
                                case "results":
                                    var results = msg.results;
                                    console.log();
                                    console.log("----------------");
                                    console.log("Test Report");
                                    console.log(" Platform: " + platform);
                                    if (results) {
                                        console.log(" Results - " + moduleName + ": " + results.passed + "/" + results.total + " (" + results.runtime + "ms)");
                                    } else {
                                        console.log(" No results returned from test run.");
                                    }
                                    console.log("----------------");
                                    runComplete = true;

                                    var log = {};
                                    log.name = moduleName;
                                    log["e1"] = {
                                        passed: results.passed,
                                        total: results.total,
                                        time: results.runtime / 1000 | 0,
                                        url: test.url
                                    };
                                    config.tests_results.results.push(log);
                                    break;

                                case "quit":
                                    child.kill();
                                    break;
                            }
                        });
                        child.on("exit", function () {
                            if (!runComplete) {
                                console.log();
                                console.log("Child process for " + moduleName + "on" + platform + " terminated abnormally.");
                                if (retriesLeft <= 0) {
                                    var log = {};
                                    log.name = moduleName;
                                    log[platform] = { url: test.url, result: "Error" };
                                    console.log("Giving up, waiting 100s for session to time out...");
                                    setTimeout(function () {
                                        activeRuns--;
                                        nextTest();
                                    }, 100 * 1000);
                                    config.tests_results.results.push(log);
                                } else {
                                    console.log("Retrying after 100s...");
                                    setTimeout(function () {
                                        retriesLeft--;
                                        createChildAndRunTest();
                                    }, 100 * 1000);
                                }
                            } else {
                                activeRuns--;
                                nextTest();
                            }
                        });
                        child.send(test);
                    }
                }
            });
        });
    };

    function getTestNameFromUrl(url) {
        return url.substring(url.indexOf("/bin/tests") + 11, url.lastIndexOf("/"));
    }

    function generateTestSetups() {
        var capList = [{
            'browser': 'IE',
            'browser_version': '11.0',
            'os': 'Windows',
            'os_version': '8.1',
        }, {
            'browser': 'IE',
            'browser_version': '10.0',
            'os': 'Windows',
            'os_version': '8',
        }, {
            'browser': 'Safari',
            'browser_version': '8.0',
            'os': 'OS X',
            'os_version': 'Yosemite',
        }, {
            'browser': 'Firefox',
            'browser_version': '33.0',
            'os': 'Windows',
            'os_version': '8.1',
        }, {
            'browser': 'Chrome',
            'browser_version': '38.0',
            'os': 'Windows',
            'os_version': '8.1',
        }, {
            'browserName': 'android',
            'platform': 'ANDROID',
            'device': 'Samsung Galaxy S5'
        }, {
            'browserName': 'iPhone',
            'platform': 'MAC',
            'device': 'iPhone 5S',

        }];

        capList.forEach(function (cap) {
            cap["browserstack.user"] = "winjsproject";
            cap["browserstack.key"] = "scb8Tm2t5saetT1KzPBd";
            cap["browserstack.local"] = true;
        });

        var uris = [
                     "http://127.0.0.1:9999/bin/tests/ListView/test.html?fastanimations=true&autostart=true&testtimeout=10000",
         "http://127.0.0.1:9999/bin/tests/ListViewComponents/test.html?fastanimations=true&autostart=true&testtimeout=10000",
         "http://127.0.0.1:9999/bin/tests/ListViewIntegration/test.html?fastanimations=true&autostart=true&testtimeout=10000"
        ];

        var tests = [];
        capList.forEach(function (cap) {
            uris.forEach(function (url) {
                tests.push({ cap: cap, url: url });
            });
        });
        return tests;
    }
})();