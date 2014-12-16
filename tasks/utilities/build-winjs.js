// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
"use strict";
var requirejs = require('requirejs');
var fs = require('fs');

var options = JSON.parse(fs.readFileSync('config.js', 'utf8'));

requirejs.optimize(options, function (buildOutput) {
    console.log("Success");
    console.log(buildOutput);
}, function (err) {
    console.log("Error");
    console.log(err);
});