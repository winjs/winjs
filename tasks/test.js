// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";
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

    module.exports = function (grunt) {
        var pathUtils = require("path");

        grunt.registerTask("test", function () {
            grunt.task.run(["default", "test-results-server", "connect:localhost"]);
        });

        grunt.registerTask("rat", function () {
            grunt.task.run(["release", "test-results-server", "connect:localhostAuto"]);
        });

        // Generate QUnit test pages
        grunt.registerTask("build-qunit", function () {
            var fs = require("fs");
            var path = require("path");

            function copyAllFiles(source, dest) {
                if (!fs.existsSync(dest)) {
                    fs.mkdirSync(dest);
                }
                var files = fs.readdirSync(source);
                files.forEach(function (file) {

                    var filePath = path.join(source, file);
                    var destPath = path.join(dest, file);

                    if (fs.lstatSync(filePath).isDirectory()) {

                        copyAllFiles(filePath, destPath);
                    } else {
                        fs.writeFileSync(destPath, fs.readFileSync(filePath));
                    }
                });

            }

            function endsWith(s, suffix) {
                return s.substring(s.length - suffix.length) === suffix;
            }

            // Fails the build if the path doesn't exist or its casing is incorrect.
            function validatePath(path, line) {

                if (endsWith(path, ".less.css")) {
                    // Unit test's LESS files have the extension ".less" in the src directory
                    // and ".less.css" in the bin directory. Path validation is against the
                    // src directory so do the validation against the extension ".less" instead
                    // of ".less.css".
                    path = path.substring(0, path.length - ".css".length);
                }

                if (endsWith(path, ".ts")) {
                    return;
                }

                // realpathSync will abort the build if the file can't be resolved.
                var fullPath = fs.realpathSync(path);

                // This part checks if the filepath is correctly cased by walking the path starting
                // from the repository root and comparing each step with the directory listing.
                var csPath = pathUtils.join(process.cwd(), "tests");
                var steps = pathUtils.relative(csPath, fullPath).split(pathUtils.sep);
                while (steps.length) {
                    var step = steps[0];
                    var files = fs.readdirSync(csPath);
                    if (files.indexOf(step) < 0) {
                        grunt.fail.warn("Incorrect casing for:\n" + line + "in file:\n" + fullPath + "\nstep: " + step);
                    }
                    csPath = pathUtils.join(csPath, step);
                    steps = steps.slice(1);
                }
            }

            function extractDependencies(path) {
                // This function extracts the <reference path="..." /> tags in test files and returns their real paths.
                var fileContents = fs.readFileSync(path, "utf-8");


                var dir = path.substring(0, path.lastIndexOf("/"));
                var deps = [];

                if (fileContents.indexOf("<deploy") !== -1) {
                    deps.push("<<deploy>>");
                }

                var lines = fileContents.split("\n");
                var processedOne = false;
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.indexOf("<reference") < 0 || line.indexOf("ms-appx") >= 0) {
                        if (processedOne) {
                            // If we already processed a reference tag before and this line is not a reference tag,
                            // then we must be past the reference portion of the test file and can break here.
                            break;
                        } else {
                            // If we haven't processed any reference tags, then we could be looking at a blank line,
                            // or copyright line, or some other file header line; skip and continue with the next line.
                            continue;
                        }
                    }

                    // Extract the relative path from the reference tag.
                    var startIndex = line.indexOf('path="') + 6;
                    var endIndex = line.indexOf('"', startIndex);
                    var path = dir + "/" + line.substring(startIndex, endIndex);

                    if (endsWith(path, ".d.ts")) {
                        continue;
                    }

                    validatePath(path, line);
                    deps.push(path);
                    processedOne = true;
                }
                return deps;
            }

            var testMenuTemplate =
'<!-- Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information. -->    \r\n\
<!DOCTYPE html>                                                                                                             \r\n\
<html>                                                                                                                      \r\n\
<head>                                                                                                                      \r\n\
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />                                                                 \r\n\
    <meta name="viewport" content="width=device-width, initial-scale=1.0">                                                  \r\n\
    <title>WinJS Tests</title>                                                                                              \r\n\
    <link type="text/css" rel="stylesheet" href="TestLib/liveToQ/testsDashboard.css" />                                     \r\n\
    <script src="TestLib/liveToQ/testsDashboard.js"></script>                                                               \r\n\
</head>                                                                                                                     \r\n\
<body>                                                                                                                      \r\n\
  <img src="http://winjs.azurewebsites.net/images/winjs-logo.png" alt="WinJS Tests"/> <br/>                                 \r\n\
  <button onclick="window.open(\'http://winjs.azurewebsites.net/#status\')" >View Tests Status page</button>                \r\n\
  <button id="btnRunAll">Run all tests</button>                                                                             \r\n\
  <ul>                                                                                                                      \r\n\
@@TESTS                                                                                                                     \r\n\
  </ul>                                                                                                                     \r\n\
</body>                                                                                                                     \r\n\
</html>';

            var testPageTemplate =
'<!-- Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information. -->    \r\n\
<!-- saved from url=(0014)about:internet -->\r\n\
<!DOCTYPE html>                                                                                                             \r\n\
<html>                                                                                                                      \r\n\
<head>                                                                                                                      \r\n\
    <title>@@TITLE</title>                                                                                                  \r\n\
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />                                                                 \r\n\
    <meta name="viewport" content="width=device-width, initial-scale=1.0">                                                  \r\n\
    <!-- WinJS references -->                                                                                               \r\n\
    <link type="text/css" rel="stylesheet" href="../../$(TargetFramework)/css/ui-dark.css" />                               \r\n\
@@ADDITIONAL_STYLES                                                                                                         \r\n\
    <script src="../../$(TargetFramework)/js/base.js"></script>                                                             \r\n\
    <script src="../../$(TargetFramework)/js/ui.js"></script>                                                               \r\n\
    <script src="../../$(TargetFramework)/js/tv.js"></script>                                                               \r\n\
    <script src="../../$(TargetFramework)/js/en-US/ui.strings.js"></script>                                                 \r\n\
                                                                                                                            \r\n\
    <!-- Test framework references -->                                                                                      \r\n\
    <link type="text/css" rel="stylesheet" href="../../../node_modules/qunitjs/qunit/qunit.css" />                          \r\n\
    <script src="../../../node_modules/qunitjs/qunit/qunit.js"></script>                                                    \r\n\
    <script src="../../../node_modules/bowser/src/bowser.js"></script>                                                      \r\n\
    <script src="../TestLib/liveToQ/liveToQ.js"></script>                                                                   \r\n\
                                                                                                                            \r\n\
    <script>                                                                                                                \r\n\
    if (window.MSApp) {                                                                                                     \r\n\
        window.addEventListener("error", function () { return true; });                                                     \r\n\
        window.removeEventListener("load", QUnit.load);                                                                     \r\n\
        window.addEventListener("load", function () { MSApp.execUnsafeLocalFunction(function () { QUnit.load(); }); });     \r\n\
        WinJS.Resources.getString = WinJS.Resources._getStringJS;                                                           \r\n\
    }                                                                                                                       \r\n\
    </script>                                                                                                               \r\n\
    <!-- Test references -->                                                                                                \r\n\
@@TESTREFERENCES                                                                                                            \r\n\
</head>                                                                                                                     \r\n\
<body>                                                                                                                      \r\n\
    <div id="qunit" style="position: absolute; width: 100%; height: 100%; left: 0px; top: 0px; overflow-y: scroll; -moz-user-select: text; -webkit-user-select: text; -khtml-user-select: text; -ms-user-select: text;"></div>  \r\n\
    <div id="qunit-fixture"></div>                                                                                          \r\n\
</body>                                                                                                                     \r\n\
</html>';

            if (!fs.existsSync("./bin")) {
                fs.mkdirSync("./bin");
            }
            if (!fs.existsSync("./bin/tests")) {
                fs.mkdirSync("./bin/tests");
            }

            var dirs = fs.readdirSync("./tests");
            var tests = "";
            dirs.forEach(function (dir) {
                if (!fs.lstatSync("./tests/" + dir).isDirectory() || dir === "TestData" || dir === "TestLib") {
                    return;
                }

                var html = testPageTemplate;
                html = html.replace("@@TITLE", dir);
                html = html.replace("@@ADDITIONAL_STYLES", dir === "TV" ? "    <link type='text/css' rel='stylesheet' href='../../$(TargetFramework)/css/ui-dark-tv.css' />" : "");

                var testReferences = "";

                var copyTestData = false;
                var srcs = [];
                var csss = [];
                var files = fs.readdirSync("./tests/" + dir);
                for (var i = files.length - 1; i >= 0; i--) {
                    // Some folders have .html test assets, we can ignore those
                    var file = files[i];
                    if (file.indexOf(".css") >= 0) {
                        csss.push("./tests/" + dir + "/" + file);
                    } else if (file.indexOf(".js") >= 0) {
                        srcs.push("./tests/" + dir + "/" + file);
                    } else if (file.indexOf(".ts") >= 0) {
                        srcs.push("./tests/" + dir + "/" + file);
                    }
                }
                var done = false;
                while (!done) {
                    done = true;
                    var srcsCopy = srcs.slice(0);
                    for (var i = 0; i < srcs.length; i++) {
                        var deps = extractDependencies(srcs[i]);
                        var length = srcsCopy.length;
                        deps.forEach(function (dep) {
                            if (dep === srcs[i]) {
                                // Some files reference themselves, this check breaks the infinite loop
                                return;
                            }
                            // some tests require TestData be copied over
                            if (dep === "<<deploy>>") {
                                copyTestData = true;
                                return;
                            }
                            if (dep.indexOf(".css") >= 0) {
                                if (csss.indexOf(dep) < 0) {
                                    csss.push(dep);
                                }
                            } else {
                                var index = srcsCopy.indexOf(dep);
                                if (index >= 0) {
                                    // If this dependency already exists, we need to reorder it to the bottom
                                    // of the array so it gets loaded first. This usually happens when a dependency
                                    // is in the same folder as the test folder but appears alphabetically before it.
                                    srcsCopy.splice(index, 1);
                                    length--;
                                } else {
                                    done = false;
                                }
                                // Since the <script> tags get emitted in reverse order, we need to splice in the
                                // dependencies in reverse-order as well.
                                srcsCopy.splice(length, 0, dep);
                            }
                        });
                    }
                    srcs = srcsCopy;
                }

                for (var i = 0; i < csss.length; i++) {
                    var url = csss[i].replace("./tests/" + dir + "/", "");
                    testReferences += '    <link type="text/css" rel="stylesheet" href="' + url + '" />';
                }
                for (var i = srcs.length - 1; i >= 0; i--) {
                    var url = srcs[i].replace("./tests/" + dir + "/", "");
                    url = url.replace(/\.ts$/, ".js");
                    testReferences += '    <script src="' + url + '"></script>\r\n';
                }
                testReferences = testReferences.substr(0, testReferences.length - 2);
                html = html.replace("@@TESTREFERENCES", testReferences);

                var testFolder = "./bin/tests/" + dir;
                if (!fs.existsSync(testFolder)) {
                    fs.mkdirSync(testFolder);
                }
                fs.writeFileSync(testFolder + "/test.html", html);
                if (copyTestData) {
                    copyAllFiles("./tests/TestData", testFolder);
                }

                // Fast Animations overrides
                var useFastAnimations = dir !== "Animations";

                tests += '      <li id="id_' + dir + '"><div class="testLinkDiv"><a class="testLink" href="' + dir + '/test.html?fastanimations=' + useFastAnimations + '" target="_blank">' + dir + ' tests</a><span class="status"></span></div></li>\r\n';
            });
            tests = tests.substr(0, tests.length - 2);
            fs.writeFileSync("./bin/tests/tests.html", testMenuTemplate.replace("@@TESTS", tests));
        });

        grunt.registerTask("test-results-server", function () {
            var http = require("http");
            var ws = require("websocket");
            var os = require("os");
            var parseArgs = require("minimist");

            var cpus = os.cpus();
            var args = parseArgs(process.argv);

            function log(client, message) {
                if (args.verbose) {
                    console.log(formatString("[{0}] {1}: {2}", client.role || "UNKNOWN CLIENT", client.id || "", message));
                }
            }

            var clientRoles = {
                reporter: "REPORTER",
                subscriber: "SUBSCRIBER"
            };


            var subscribers = {};
            var server = http.createServer();
            server.listen(9998);

            var wsServer = new ws.server({ httpServer: server });
            wsServer.on("request", function (request) {
                function cleanUp(client) {
                    client.removeListener("close", cleanUpBind);
                    client.removeListener("end", cleanUpBind);
                    client.removeListener("error", cleanUpBind);
                    client.close();

                    if (client.role === clientRoles.reporter) {
                        var sub = client.subscriber;
                        if (sub.connected) {
                            sub.sendUTF(JSON.stringify({ id: client.id, type: "reporterDisconnected" }));
                        }
                    } else if (client.role === clientRoles.subscriber) {
                        client.reporters.forEach(function (r) {
                            r.close();
                        });
                    }
                    log(client, "disconnected");
                }

                var client = request.accept();

                client.on("message", function (m) {
                    /* Message protocol:
                        id - id of the client to be referred to externally,
                        type - indicates what to do with this message,
                        args - arguments depending on the type of message
                    */

                    var message = JSON.parse(m.utf8Data);
                    var id = message.id;
                    if (client.id) {
                        if (client.id !== id) {
                            log(client, "inconsistent client id: " + id);
                            cleanUp(client);
                            return;
                        }
                    } else {
                        client.id = id;
                    }
                    switch (message.type) {
                        case "registerSubscriber":
                            client.role = clientRoles.subscriber;

                            var key = message.args.subscriptionKey;
                            if (key) {
                                client.reporters = [];
                                subscribers[key] = client;
                                client.subscriptionKey = key;
                                log(client, "registered with key: " + key);
                                client.sendUTF(JSON.stringify({ type: "osinfo", args: { cpu: { length: cpus.length, speed: cpus[0].speed }, platform: os.platform(), arch: os.arch() } }));
                            } else {
                                log(client, "tried to register without a key");
                                cleanUp(client);
                            }
                            break;

                        case "registerReporter":
                            client.role = clientRoles.reporter;

                            var key = message.args.subscriptionKey;
                            var sub = subscribers[key];
                            if (sub) {
                                client.subscriber = sub;
                                sub.reporters.push(client);
                                log(client, "registered with key: " + key);
                            } else {
                                log(client, "tried to register with an invalid key");
                                cleanUp(client);
                            }
                            break;

                        case "report":
                            var sub = client.subscriber;
                            if (sub) {
                                sub.sendUTF(JSON.stringify({ id: client.id, type: "report", args: { data: message.args.data } }));
                                log(client, "reported: " + JSON.stringify(message.args.data));
                            } else {
                                log(client, "tried to report without a subscriber");
                                cleanUp(client);
                            }
                            break;

                        default:
                            log(client, "unknown message, see raw data:");
                            log(client, m.utf8Data);
                            break;
                    }
                });
                var cleanUpBind = cleanUp.bind(this, client);
                client.on("close", cleanUpBind);
                client.on("end", cleanUpBind);
                client.on("error", cleanUpBind);
            });
        });
    };
})();