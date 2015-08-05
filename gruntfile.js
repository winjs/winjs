// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    module.exports = function (grunt) {
        var config = require("./config.js");
        config.grunt = grunt;

        // Strip source files of their BOMs. BOMs will be added at the end of the build
        // by the "add-bom" task.
        grunt.file.preserveBOM = false;

        // Parse custom args
        var args = require("minimist")(process.argv);
        if (args.quiet) {
            grunt.log.write = function () {return grunt.log;};
            grunt.log.writeln = function () {return grunt.log;};
        }

        // Helper function to load the config file
        function loadConfig(path) {
            var glob = require("glob");
            var object = {};
            var key;

            glob.sync("*.js", { cwd: path }).forEach(function (option) {
                key = option.replace(/\.js$/, "");
                object[key] = require(path + option);
            });

            return object;
        }

        // Load task options
        var gruntConfig = loadConfig("./tasks/options/");

        // Package data
        gruntConfig.pkg = grunt.file.readJSON("package.json");

        // Project config
        grunt.initConfig(gruntConfig);

        // Load all grunt-tasks in package.json
        require("load-grunt-tasks")(grunt);

        // Register external tasks
        grunt.loadTasks("tasks/");

        grunt.registerTask("configureStore", function () {
            config.isStorePackage = true;
        });

        // Tasks that drop things in bin/ (should have "_postProcess" as the last task)
        grunt.registerTask("storePackage", ["configureStore", "default"]);
        grunt.registerTask("quick", ["clean", "ts:src", "less", "concat", "onefile:base", "requirejs:ui", "requirejs:intrinsics", "copy:fonts", "_postProcess"]);
        grunt.registerTask("default", ["_preBuild", "onefile:base", "requirejs:ui", "requirejs:intrinsics", "_copyFinal", "replace", "_postProcess"]);

        grunt.registerTask("release", ["lint", "default", "uglify", "cssmin", "_postProcess"]);
        grunt.registerTask("minify", ["uglify", "_postProcess"]);

        // Private tasks (not designed to be used from the command line)
        grunt.registerTask("_preBuild", ["clean", "check-file-names", "ts", "build-qunit", "less", "concat"]);
        grunt.registerTask("_copyFinal", ["copy:tests", "copy:testDeps", "copy:fonts", "copy:intellisense", "copy:strings"]);
        grunt.registerTask("_copyToTsBuild", ["copy:srcjs"]);
        grunt.registerTask("_postProcess", ["line-endings", "add-bom"]);

        // Other tasks
        grunt.registerTask("lint", ["jshint", "jscs"]);
        grunt.registerTask("saucelabs", ["connect:saucelabs", "saucelabs-qunit", "post-tests-results"]);

        grunt.registerTask("verify-dts", function () {
            grunt.task.run('connect:localhost');
            //var dtsVerifier = require('./tools/dts-verifier/main');
            //var modelText = dtsVerifier.extractModelFromDts('typings/winjs/winjs.d.ts');

            //var http = require("http");
            //var ws = require("websocket");
            //var os = require("os");
            //var parseArgs = require("minimist");

            //var cpus = os.cpus();
            //var args = parseArgs(process.argv);

            //function log(client, message) {
            //    if (args.verbose) {
            //        console.log(formatString("[{0}] {1}: {2}", client.role || "UNKNOWN CLIENT", client.id || "", message));
            //    }
            //}

            //var clientRoles = {
            //    reporter: "REPORTER",
            //    subscriber: "SUBSCRIBER"
            //};


            //var subscribers = {};
            //var server = http.createServer();
            //server.listen(9998);

            //var wsServer = new ws.server({ httpServer: server });
            //wsServer.on("request", function (request) {
            //    function cleanUp(client) {
            //        client.removeListener("close", cleanUpBind);
            //        client.removeListener("end", cleanUpBind);
            //        client.removeListener("error", cleanUpBind);
            //        client.close();

            //        if (client.role === clientRoles.reporter) {
            //            var sub = client.subscriber;
            //            if (sub.connected) {
            //                sub.sendUTF(JSON.stringify({ id: client.id, type: "reporterDisconnected" }));
            //            }
            //        } else if (client.role === clientRoles.subscriber) {
            //            client.reporters.forEach(function (r) {
            //                r.close();
            //            });
            //        }
            //        log(client, "disconnected");
            //    }

            //    var client = request.accept();

            //    //client.on("message", function (m) {
            //    //    /* Message protocol:
            //    //        id - id of the client to be referred to externally,
            //    //        type - indicates what to do with this message,
            //    //        args - arguments depending on the type of message
            //    //    */

            //    //    var message = JSON.parse(m.utf8Data);
            //    //    var id = message.id;
            //    //    if (client.id) {
            //    //        if (client.id !== id) {
            //    //            log(client, "inconsistent client id: " + id);
            //    //            cleanUp(client);
            //    //            return;
            //    //        }
            //    //    } else {
            //    //        client.id = id;
            //    //    }
            //    //    switch (message.type) {
            //    //        case "registerSubscriber":
            //    //            client.role = clientRoles.subscriber;

            //    //            var key = message.args.subscriptionKey;
            //    //            if (key) {
            //    //                client.reporters = [];
            //    //                subscribers[key] = client;
            //    //                client.subscriptionKey = key;
            //    //                log(client, "registered with key: " + key);
            //    //                client.sendUTF(JSON.stringify({ type: "osinfo", args: { cpu: { length: cpus.length, speed: cpus[0].speed }, platform: os.platform(), arch: os.arch() } }));
            //    //            } else {
            //    //                log(client, "tried to register without a key");
            //    //                cleanUp(client);
            //    //            }
            //    //            break;

            //    //        case "registerReporter":
            //    //            client.role = clientRoles.reporter;

            //    //            var key = message.args.subscriptionKey;
            //    //            var sub = subscribers[key];
            //    //            if (sub) {
            //    //                client.subscriber = sub;
            //    //                sub.reporters.push(client);
            //    //                log(client, "registered with key: " + key);
            //    //            } else {
            //    //                log(client, "tried to register with an invalid key");
            //    //                cleanUp(client);
            //    //            }
            //    //            break;

            //    //        case "report":
            //    //            var sub = client.subscriber;
            //    //            if (sub) {
            //    //                sub.sendUTF(JSON.stringify({ id: client.id, type: "report", args: { data: message.args.data } }));
            //    //                log(client, "reported: " + JSON.stringify(message.args.data));
            //    //            } else {
            //    //                log(client, "tried to report without a subscriber");
            //    //                cleanUp(client);
            //    //            }
            //    //            break;

            //    //        default:
            //    //            log(client, "unknown message, see raw data:");
            //    //            log(client, m.utf8Data);
            //    //            break;
            //    //    }
            //    //});
            //    var cleanUpBind = cleanUp.bind(this, client);
            //    client.on("close", cleanUpBind);
            //    client.on("end", cleanUpBind);
            //    client.on("error", cleanUpBind);
            //});
            //grunt.runTask('connect:localhost');
        });
    };
})();
