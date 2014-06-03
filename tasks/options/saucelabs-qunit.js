// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function() {
    "use strict";

    var config = require("../../config.js");
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
        version: "28"
    }, {
        browserName: "googlechrome",
        platform: "Win8.1",
        version: "34"
    }];

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

    function onTestComplete(details) {
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
            }
        }

        if (!reportingStatus) {
            reportingStatus = true;
            setInterval(function() {
                // Log status to avoid termination from Travis for long running tests
                console.log("Running saucelabs jobs...");
            }, 1000*60);
        }

        return true;
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
                urls: [
                    "http://127.0.0.1:9999/bin/tests/Animations/test.html?fastanimations=false&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/AppBarAndFlyouts/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/Base/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/Binding/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/BindingList/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/BindingTemplate/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/DateTime/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/FlipView/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/Hub/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/ItemContainer/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/Itemsmanager/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/NavBar/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/Navigation/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/PageControl/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/Promise/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/Repeater/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/Scheduler/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/SearchBox/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/SemanticZoom/test.html?fastanimations=true&autostart=true&testtimeout=3000",
                    "http://127.0.0.1:9999/bin/tests/TimePicker/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/Toggle/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/UI/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/ViewBox/test.html?fastanimations=true&autostart=true",
                    "http://127.0.0.1:9999/bin/tests/WWA-Application/test.html?fastanimations=true&autostart=true", 
                    "http://127.0.0.1:9999/bin/tests/Pivot/test.html?fastanimations=false&autostart=true&testtimeout=10000"
                ],
                build: process.env.TRAVIS_JOB_ID,
                testInterval: 1000,
                browsers: browsers,
                throttled:4,
                maxDuration: 180,
                testname: "winjs qunit tests",
                tags: ["winjs"],
                onTestComplete: onTestComplete
            }
        },
        ie11only: {
            options: {
                urls: [
                      "http://127.0.0.1:9999/bin/tests/ListView/test.html?fastanimations=true&autostart=true&testtimeout=10000",
                      "http://127.0.0.1:9999/bin/tests/ListViewIntegration/test.html?fastanimations=true&autostart=true&testtimeout=10000",
                      "http://127.0.0.1:9999/bin/tests/Tooltip/test.html?fastanimations=true&autostart=true&testtimeout=10000",
                      "http://127.0.0.1:9999/bin/tests/Rating/test.html?fastanimations=true&autostart=true&testtimeout=3000"
                ],
                build: process.env.TRAVIS_JOB_ID,
                testInterval: 1000,
                maxDuration: 500,
                throttled:10,
                browsers: [{
                    browserName: "internet explorer",
                    platform: "WIN8.1",
                    version: "11"
                }],
                testname: "winjs qunit tests - ie11only",
                tags: ["winjs"],
                onTestComplete: onTestComplete
            }
        }
    };
})(); 
