var config = require("../../config.js");

module.exports = {
    runTests: {
        command: function () {
            var args = [];
            for (var i = 0; i < arguments.length; ++i)
                args.push(arguments[i]);

            // Default args
            if (args.length === 0 || args[0] === "")
                args[0] = "*.js";
            var host = "wwa";

            // Determine if last argument is a host parameter (not a glob pattern)
            // Host parameter is only valid with 1 or more parameters
            if (args.length > 1) {
                var last = args[args.length - 1].toLowerCase();
                if (last.indexOf("*") < 0 && last.indexOf(".") < 0) {
                    host = last;
                    args.pop();
                }
            }

            // Build up command string
            var command = "%_NTTREE%/Corsica/other.2.1.debug/Tools/WebUnit/WebUnit.exe";
            for (var i = 0; i < args.length; ++i)
                command +=  " /s:%_NTTREE%/Corsica/other." + config.version + ".debug/Tests/UnitTests/" + args[i];
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
    },
    openQUnitTestPage: {
        command: "start bin/tests/tests.html"
    }
}