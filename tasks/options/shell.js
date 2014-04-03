// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

(function() {
    "use strict";
    var config = require("../../config.js");
    var parseArgs = require("minimist");

    module.exports = {
        runTests: {
            command: function () {
                // Default args
                var files = ["*.js"];
                var host = "wwa";
                var debug = false;

                // Get arguments
                var args = parseArgs(process.argv);
                args.files = args.files || args.file;
                args.host = args.host || args.h;
                args.debug = args.debug || args.d;
                if (args.files)
                    files = args.files.split(",");
                if (args.host)
                    host = args.host.toLowerCase();
                if (args.debug)
                    debug = args.debug;

                // Build up command string
                var command = "%_NTTREE%/Corsica/other.2.1.debug/Tools/WebUnit/WebUnit.exe";
                for (var i = 0, l = files.length; i < l; ++i)
                    command +=  " /s:%_NTTREE%/Corsica/other." + config.version + ".debug/Tests/UnitTests/" + files[i];
                if (debug)
                    command += " /debug";
                if (host === "vs")
                    command += " /vs";
                else
                    command += " /host:" + host;
                command += " @res.txt";
                return command;
            },
            options: {
                stdout: true,
                stderr: true
            }
        }
    };
})();