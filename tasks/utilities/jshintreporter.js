// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    var chalk = require("chalk");
    var table = require("text-table");
    var config = require("../../config.js");
    var grunt = config.grunt;

    module.exports = {
        reporter: function (results) {
            var len = results.length;
            var str = "";
            var tableHeader = "";
            var tableRows = [];

            function appendTableHeader() {
                str += "\n\n " + chalk.bold(tableHeader) + ":\n";
            }

            function appendTableRows() {
                str += table(tableRows);
            }

            results.forEach(function (line) {
                if (tableHeader !== line.file) {
                    
                    // Finish prev table.
                    if (tableRows !== []) {
                        appendTableRows();
                        tableRows = [];
                    }

                    // Begin new table.
                    tableHeader = line.file;
                    appendTableHeader();
                }

                var err = line.error;

                var tableRow = [
                    "",
                    chalk.gray("line " + err.line),
                    chalk.gray("col " + err.character),
                    chalk.magenta("(" + err.code + ")"),
                    err.reason,
                ];
                tableRows.push(tableRow);
            });
            appendTableRows();

            if (str) {
                console.log(str + "\n\n " + chalk.red(chalk.bold(len + " lint error" +
                  ((len === 1) ? "" : "s") + "\n")));
            }

            if (len > 0) {
                grunt.fail.warn(len + " lint error" + ((len === 1) ? "" : "s"));
            }
        }

    };
})();