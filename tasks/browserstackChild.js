process.on("message", function (test) {
    var testTimeout = 5 * 60 * 1000;

    var wd = require("browserstack-webdriver");
    var driver = new wd.Builder().usingServer('http://hub.browserstack.com/wd/hub').withCapabilities(test.cap).build();

    driver.get(test.url).then(function () {
        if (!test.cap.device) {
            driver.manage().timeouts().setScriptTimeout(testTimeout).then(function () {
                // Execute result fetch script
                driver.executeAsyncScript(function () {
                    var callback = arguments[arguments.length - 1];
                    if (window.global_test_results) {
                        // All tests finished before we could hook up event, post results back
                        callback(window.global_test_results);
                    } else {
                        // Tests are running, hook listener up to QUnit.done
                        QUnit.done(function () {
                            callback(window.global_test_results);
                        });
                    }
                }).then(function (results) {
                    // Tests finished or timed out, post results if tests finished
                    if (results) {
                        process.send({ type: "results", results: results });
                    }
                    driver.quit().then(function () {
                        process.send({ type: "quit" });
                    });
                });
            });
        } else {
            // Mobile device VMs don't support async scripts so we have to poll, we also increase
            // the test timeout as the mobile device VMs are less performant than desktop VMs
            var ttl = testTimeout * 2;
            var pollingInterval = 10000;
            var pollingFunc = function () {
                ttl -= pollingInterval;
                if (ttl < 0) {
                    // Test timed out, quit
                    driver.quit().then(function () {
                        process.send({ type: "quit" });
                    });
                    return;
                }

                // Execute polling script
                driver.executeScript("return !window.QUnit || window.global_test_results;").then(function (results) {
                    if (results) {
                        if (results === true) {
                            // window.QUnit doesn't exist, quit
                            driver.quit().then(function () {
                                process.send({ type: "quit" });
                            });
                        } else {
                            // Got results, post it and quit
                            process.send({ type: "results", results: results });
                            driver.quit().then(function () {
                                process.send({ type: "quit" });
                            });
                        }
                    } else {
                        // Test still running, keep polling
                        setTimeout(pollingFunc, pollingInterval);
                    }
                });
            };
            setTimeout(pollingFunc, pollingInterval);
        }
    });
});