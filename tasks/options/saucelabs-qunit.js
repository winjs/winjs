// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function() {
    "use strict";

    var config = require("../../config.js");
    var testUrls = require("./test-urls.json");
    var reportingStatus = false;
    var browsers = [{
        browserName: "internet explorer",
        platform: "WIN8.1",
        version: "11"
    },{
        browserName: "internet explorer",
        platform: "WIN8",
        version: "10"
    }, {
        browserName: "safari",
        platform: "OS X 10.9",
        version: "7"
    }, {
        browserName: "firefox",
        platform: "Win8.1",
        version: "30"
    }, {
        browserName: "googlechrome",
        platform: "Win8.1",
        version: "36"
    }, {
        browserName: "iPhone",
        platform: "OS X 10.9",
        version: "7.1"
    }, {
        browserName: "Android",
        platform: "Linux",
        version: "4.4"
    }];
    var browsersExcludingIe11 = browsers.filter(function (b) {
        return !(b.browserName.toLowerCase() === "internet explorer" && b.version === "11");
    });

    function getBrowserIndex(browser) {
        var index = 0;
        for (var i = 1, len = browsers.length; i <= len; i++) {
            var info = browsers[i-1];

            if (info.browserName === browser[1] &&
                info.platform === browser[0] &&
                info.version === browser[2]) {
                index = i;
                break;
            }
        }
        return index;
    }

    function onTestComplete(details, callback) {
        try {
            if (!details) {
                throw "details argument is null ";
            }

            if (!details.result || !details.result.url) {
                throw "empty url in details argument " + JSON.stringify(details);
            }

            var component = details.result.url.split('/')[5];
            var browserIndex = getBrowserIndex(details.platform);
            console.log("======================================================\n" +
                        "Passed: " + details.result.passed + "\n" +
                        "Failed: " + details.result.failed + "\n" +
                        "Total: " + details.result.total + "\n" +
                        "Component: " +  component + "\n" +
                        "Time: " + details.result.runtime + "ms"
                        );
            
            var componentResults = getComponentResults(component);
            if (componentResults) {
                componentResults["e" + browserIndex] = {
                    "url": details.url,
                    "passed": details.result.passed,
                    "total": details.result.total,
                    "time": Math.ceil(parseFloat(details.result.runtime) / 1000)
                };
            }

            if (!reportingStatus) {
                reportingStatus = true;
                setInterval(function() {
                    // Log status to avoid termination from Travis for long running tests
                    console.log("Running saucelabs jobs...");
                }, 1000*60);
            }
        } catch(e) {
            console.log("onTestComplete error: " + e);
        } finally {
            // Always indicate that the test passed so that we can finish the grunt task successfully.
            // The config.tests_results object will store the correct information for each the test run.
            callback(null, true);
        }
    }

    function getComponentResults(component) {
        var info;
        for (var i = 0, len = config.tests_results.results.length; i < len; i++) {
            var componentInfo = config.tests_results.results[i];
            if (componentInfo.name === component) {
                info = componentInfo;
                break;
            }
        }

        if (!info) {
            info = {
                name: component
            };
            config.tests_results.results.push(info);
        }
        return info;
    }
    var i = 1;
    browsers.forEach(function(browser) {
        var name = browser.platform + " / " + browser.browserName + " " + browser.version;
        var environment = ("e" + i++);
        var info = {};
        info[environment] = name;
        config.tests_results.environment.push(info);
    });

    module.exports = {
        all: {
            options: {
                urls: testUrls.all,
                build: process.env.TRAVIS_JOB_ID,
                testInterval: 1000,
                throttled: 20,
                browsers: browsers,
                "max-duration": 180,
                testname: "winjs qunit tests",
                tags: ["winjs"],
                onTestComplete: onTestComplete
            }
        },
        ie11only: {
            options: {
                urls: testUrls.ie11only,
                build: process.env.TRAVIS_JOB_ID,
                testInterval: 1000,
                "max-duration": 500,
                throttled: 20,
                browsers: [{
                    browserName: "internet explorer",
                    platform: "WIN8.1",
                    version: "11"
                }],
                testname: "winjs qunit tests - ie11only",
                tags: ["winjs"],
                onTestComplete: onTestComplete
            }
        },
        notie11: {
            options: {
                urls: testUrls.notie11,
                build: process.env.TRAVIS_JOB_ID,
                testInterval: 1000,
                "max-duration": 500,
                throttled: 20,
                browsers: browsersExcludingIe11,
                testname: "winjs qunit tests - not ie11",
                tags: ["winjs"],
                onTestComplete: onTestComplete
            }
        }
    };
})();
