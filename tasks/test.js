// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";


    module.exports = function (grunt) {
        var config = require("../config.js");
        var pathUtils = require("path");

        grunt.registerTask("test", function () {
            if (config.inRazzle) {
                grunt.task.run(["default", "clean:qunit", "shell:runTests"]);
            } else {
                grunt.task.run(["default", "connect:localhost"]);
            }
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
                files.forEach(function(file) {

                    var filePath = path.join(source, file);
                    var destPath = path.join(dest, file);
                    
                    if(fs.lstatSync(filePath).isDirectory()) {

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
                    validatePath(path, line);
                    deps.push(path);
                    processedOne = true;
                }
                return deps;
            }

            var testMenuTemplate =
'<!-- Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information. -->    \r\n\
<!DOCTYPE html>                                                                                                             \r\n\
<html>                                                                                                                      \r\n\
<head>                                                                                                                      \r\n\
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />                                                                 \r\n\
    <meta name="viewport" content="width=device-width, initial-scale=1.0">                                                  \r\n\
    <title>WinJS Tests</title>                                                                                              \r\n\
    <style>                                                                                                                 \r\n\
        body {                                                                                                              \r\n\
            background-color: rgba(38, 0, 52, .9);                                                                          \r\n\
            color: white;                                                                                                   \r\n\
            font-family: "Segoe UI Light", "Helvetica";                                                                     \r\n\
        }                                                                                                                   \r\n\
        a, a:active, a:hover, a:visited, a:hover:active {                                                                   \r\n\
            color: white;                                                                                                   \r\n\
            text-decoration: none;                                                                                          \r\n\
        }                                                                                                                   \r\n\
        li {                                                                                                                \r\n\
            text-transform: capitalize;                                                                                     \r\n\
        }                                                                                                                   \r\n\
    </style>                                                                                                                \r\n\
</head>                                                                                                                     \r\n\
<body>                                                                                                                      \r\n\
  <img src="http://try.buildwinjs.com/images/winjs-logo.png" alt="WinJS Tests"/> <br/>                                      \r\n\
  <a href="http://try.buildwinjs.com/#status" target="_blank">View Tests Status page</a>                                    \r\n\
  <ul>                                                                                                                      \r\n\
@@TESTS                                                                                                                     \r\n\
  <ul>                                                                                                                      \r\n\
</body>                                                                                                                     \r\n\
</html>';

            var testPageTemplate =
'<!-- Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information. -->    \r\n\
<!-- saved from url=(0014)about:internet -->\r\n\
<!DOCTYPE html>                                                                                                             \r\n\
<html>                                                                                                                      \r\n\
<head>                                                                                                                      \r\n\
    <title>@@TITLE</title>                                                                                                  \r\n\
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />                                                                 \r\n\
    <meta name="viewport" content="width=device-width, initial-scale=1.0">                                                  \r\n\
    <!-- WinJS references -->                                                                                               \r\n\
    <link type="text/css" rel="stylesheet" href="../../$(TargetFramework)/css/ui-dark.css" />                               \r\n\
    <script src="../../$(TargetFramework)/js/base.js"></script>                                                             \r\n\
    <script src="../../$(TargetFramework)/js/ui.js"></script>                                                               \r\n\
    <script src="../../$(TargetFramework)/js/en-US/ui.strings.js"></script>                                                 \r\n\
                                                                                                                            \r\n\
    <!-- Test framework references -->                                                                                      \r\n\
    <link type="text/css" rel="stylesheet" href="../../../node_modules/qunitjs/qunit/qunit.css" />                          \r\n\
    <script src="../../../node_modules/qunitjs/qunit/qunit.js"></script>                                                    \r\n\
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
                            if(dep === "<<deploy>>") {
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
                    testReferences += '    <script src="' + url + '"></script>\r\n';
                }
                testReferences = testReferences.substr(0, testReferences.length - 2);
                html = html.replace("@@TESTREFERENCES", testReferences);

                var testFolder = "./bin/tests/" + dir;
                if (!fs.existsSync(testFolder)) {
                    fs.mkdirSync(testFolder);
                }
                fs.writeFileSync(testFolder + "/test.html", html);
                if(copyTestData) {
                    copyAllFiles("./tests/TestData", testFolder);
                }
                tests += '      <li><a href="' + dir + '/test.html?fastanimations=true" target="_blank">' + dir + " tests</a></li>\r\n";
            });
            tests = tests.substr(0, tests.length - 2);
            fs.writeFileSync("./bin/tests/tests.html", testMenuTemplate.replace("@@TESTS", tests));
        });
    };
})();