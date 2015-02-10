(function () {
    "use strict";

    var numParallel = 2;
    var numRetries = 2;

    module.exports = function (grunt) {

        grunt.registerTask("browserstack", function () {
            grunt.task.run(["release", "connect:browserstack", "_browserstack", "post-tests-results"]);
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

                    createChildAndRunTest();

                    function createChildAndRunTest() {
                        console.log("Starting test: " + moduleName + " on " + platform);

                        var child = cp.fork("tasks/browserstackChild.js", [], { silent: true });
                        var sessionId = "";
                        child.on("message", function (msg) {
                            sessionId = msg.sessionId || "";
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

                                    recordTestResult(test, {
                                        passed: results.passed,
                                        total: results.total,
                                        time: results.runtime / 1000 | 0,
                                        url: createSessionUrl(sessionId)
                                    });
                                    break;

                                case "quit":
                                    child.kill();
                                    break;
                            }
                        });
                        child.on("exit", function () {
                            if (!runComplete) {
                                console.log();
                                console.log("Child process for " + moduleName + " on " + platform + " terminated abnormally.");
                                if (retriesLeft <= 0) {
                                    recordTestResult(test, {
                                        url: createSessionUrl(sessionId),
                                        result: "Error"
                                    });
                                    console.log("Giving up, waiting 100s for session to time out...");
                                    setTimeout(function () {
                                        activeRuns--;
                                        nextTest();
                                    }, 100 * 1000);
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

                function recordTestResult(test, results) {
                    var environment = config.tests_results.environment.filter(function (x) {
                        return !!x[test.platformId];
                    })[0];
                    if (!environment) {
                        var e = {};
                        e[test.platformId] = test.cap.device || (test.cap.os + " " + test.cap.os_version + " / " + test.cap.browser + test.cap.browser_version);
                        config.tests_results.environment.push(e);
                    }

                    var moduleName = getTestNameFromUrl(test.url);
                    var log = config.tests_results.results.filter(function (x) {
                        return x && x.name === moduleName;
                    })[0];
                    if (!log) {
                        log = { name: moduleName };
                        config.tests_results.results.push(log);
                    }
                    log[test.platformId] = results;
                }
            });
        });
    };

    function createSessionUrl(sessionId) {
        return sessionId ? ("https://www.browserstack.com/automate/builds/206308468b900496399cb8134c346ff07c4c8f7c/sessions/" + sessionId) : "";
    }

    function getTestNameFromUrl(url) {
        return url.substring(url.indexOf("/bin/tests") + 11, url.lastIndexOf("/"));
    }

    function generateTestSetups() {
        var capList = [
            {
                'browser': 'IE',
                'browser_version': '11.0',
                'os': 'Windows',
                'os_version': '8.1',
            },
            {
                'browser': 'IE',
                'browser_version': '10.0',
                'os': 'Windows',
                'os_version': '8',
            },
            {
                'browser': 'Safari',
                'browser_version': '8.0',
                'os': 'OS X',
                'os_version': 'Yosemite',
            },
            {
                'browser': 'Firefox',
                'browser_version': '33.0',
                'os': 'Windows',
                'os_version': '8.1',
            },
            {
                'browser': 'Chrome',
                'browser_version': '38.0',
                'os': 'Windows',
                'os_version': '8.1',
            },
            {
                'browserName': 'android',
                'platform': 'ANDROID',
                'device': 'Samsung Galaxy S5'
            },
            {
                'browserName': 'iPhone',
                'platform': 'MAC',
                'device': 'iPhone 5S',
            }
        ];

        capList.forEach(function (cap) {
            cap["browserstack.user"] = "winjsproject";
            cap["browserstack.key"] = "scb8Tm2t5saetT1KzPBd";
            cap["browserstack.local"] = true;
        });

        var uris = [
            "http://127.0.0.1:9999/bin/tests/Animations/test.html?fastanimations=false&autostart=true",
            "http://127.0.0.1:9999/bin/tests/AppBarAndFlyouts/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/Base/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/Binding/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/BindingList/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/BindingTemplate/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/ContentDialog/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/DateTime/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/FlipView/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/Hub/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/ItemContainer/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/Itemsmanager/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/Less/test.html?autostart=true",
            "http://127.0.0.1:9999/bin/tests/NavBar/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/Navigation/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/PageControl/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/Promise/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/Repeater/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/Scheduler/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/AutoSuggestBox/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/SearchBox/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/SemanticZoom/test.html?fastanimations=true&autostart=true&testtimeout=10000",
            "http://127.0.0.1:9999/bin/tests/SplitView/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/TimePicker/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/Toggle/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/ToolBar/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/Tooltip/test.html?fastanimations=true&autostart=true&testtimeout=10000",
            "http://127.0.0.1:9999/bin/tests/UI/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/ViewBox/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/WWA-Application/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/Pivot/test.html?fastanimations=false&autostart=true&testtimeout=10000",
            "http://127.0.0.1:9999/bin/tests/Rating/test.html?fastanimations=true&autostart=true&testtimeout=3000",
            "http://127.0.0.1:9999/bin/tests/ListView/test.html?fastanimations=true&autostart=true&testtimeout=10000",
            "http://127.0.0.1:9999/bin/tests/ListViewComponents/test.html?fastanimations=true&autostart=true&testtimeout=10000",
            "http://127.0.0.1:9999/bin/tests/ListViewIntegration/test.html?fastanimations=true&autostart=true&testtimeout=10000"
        ];

        var tests = [];
        capList.forEach(function (cap, i) {
            var platformId = "e" + (i + 1);
            uris.forEach(function (url) {
                tests.push({ cap: cap, url: url, platformId: platformId });
            });
        });
        return tests;
    }
})();