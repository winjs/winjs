(function () {
    var numParallel = 2;

    module.exports = function (grunt) {
        grunt.registerTask("browserstack", function () {
            grunt.task.run(["connect:browserstack", "_browserstack"]);
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

                var tests = generateTestSetups();
                var curTest = 0;
                var activeRuns = 0;

                for (var i = 0; i < Math.min(tests.length, numParallel) ; i++) {
                    setTimeout(nextTest, i * 1000);
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
                    console.log();
                    console.log("Starting test: " + getTestNameFromUrl(test.url));
                    console.log(" on " + test.cap.os + test.cap.os_version + " / " + test.cap.browser + test.cap.browser_version);

                    var wd = require("browserstack-webdriver");
                    var driver = new wd.Builder().usingServer('http://hub.browserstack.com/wd/hub').withCapabilities(test.cap).build();
                    driver.manage().timeouts().setScriptTimeout(30 * 60 * 1000);
                    driver.get(test.url);
                    driver.executeAsyncScript(function () {
                        var callback = arguments[arguments.length - 1];
                        QUnit.done(function () {
                            callback(window.global_test_results);
                        });
                    }).then(function (results) {
                        console.log();
                        console.log("----------------");
                        console.log("Test Report");
                        console.log(" Config: " + test.cap.os + test.cap.os_version + " / " + test.cap.browser + test.cap.browser_version);
                        if (results) {
                            console.log(" Results - " + getTestNameFromUrl(test.url) + ": " + results.passed + "/" + results.total + " (" + results.runtime + "ms)");
                        } else {
                            console.log(" No results returned from test run.");
                        }
                        console.log("----------------");

                        driver.quit();
                        activeRuns--;
                        nextTest();
                    });
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
        }];
        capList.forEach(function (cap) {
            cap["browserstack.user"] = "winjsproject";
            cap["browserstack.key"] = "scb8Tm2t5saetT1KzPBd";
            cap["browserstack.local"] = true;
        });

        var uris = [
            "http://127.0.0.1:9999/bin/tests/Animations/test.html?fastanimations=false&autostart=true",
            "http://127.0.0.1:9999/bin/tests/Base/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/AppBarAndFlyouts/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/Binding/test.html?fastanimations=true&autostart=true",
            "http://127.0.0.1:9999/bin/tests/BindingList/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/BindingTemplate/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/ContentDialog/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/DateTime/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/FlipView/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/Hub/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/ItemContainer/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/Itemsmanager/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/Less/test.html?autostart=true",
            //"http://127.0.0.1:9999/bin/tests/NavBar/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/Navigation/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/PageControl/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/Promise/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/Repeater/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/Scheduler/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/AutoSuggestBox/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/SearchBox/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/SemanticZoom/test.html?fastanimations=true&autostart=true&testtimeout=10000",
            //"http://127.0.0.1:9999/bin/tests/SplitView/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/TimePicker/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/Toggle/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/ToolBar/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/Tooltip/test.html?fastanimations=true&autostart=true&testtimeout=10000",
            //"http://127.0.0.1:9999/bin/tests/UI/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/ViewBox/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/WWA-Application/test.html?fastanimations=true&autostart=true",
            //"http://127.0.0.1:9999/bin/tests/Pivot/test.html?fastanimations=false&autostart=true&testtimeout=10000",
            //"http://127.0.0.1:9999/bin/tests/Rating/test.html?fastanimations=true&autostart=true&testtimeout=3000"
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