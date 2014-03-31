// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
var cssparse = require("css-parse");
var fs = require("fs");

function compressStyles(stylesheet)
{
    var styles = {};
    for (var i = 0; i < stylesheet.rules.length; ++i)
    {
        var rule = stylesheet.rules[i];
        if (!rule.selectors)
            continue;
        for (var j = 0; j < rule.selectors.length; ++j)
        {
            var selector = rule.selectors[j];
            if (!styles[selector])
                styles[selector] = [];
            for (var n = 0; n < rule.declarations.length; ++n)
            {
                styles[selector].push(rule.declarations[n]);
            }
        }
    }

    return styles;
}

function compareStyles(stylesA, stylesB)
{
    var diff = {};
    for (var selector in stylesA)
    {
        var rulesA = stylesA[selector];
        var rulesB = stylesB[selector];

        if (!rulesB)
        {
            diff[selector] = "Selector not found";
            continue;
        }
        diff[selector] = {};

        for (var i = 0; i < rulesA.length; ++i)
        {
            var ruleA = rulesA[i];
            var ruleB = null;
            for (var j = 0; j < rulesB.length; ++j)
            {
                var rule = rulesB[j];
                if (ruleA.property === rule.property)
                {
                    ruleB = rulesB[j];
                    break;
                }
            }

            if (!ruleB)
            {
                diff[selector][ruleA.property] = "Property not found";
                continue;
            }

            if (ruleA.value !== ruleB.value)
            {
                diff[selector][ruleA.property] = ruleA.value + " !== " + ruleB.value;
            }
        }
    }

    return diff;
}

module.exports = function(grunt) {
    grunt.registerTask("csstest", function () {
        var args = [];
        for (var i = 0; i < arguments.length; ++i)
            args.push(arguments[i]);

        var cssA = fs.readFileSync("ui-dark-model.css", {encoding: "utf-8"});
        var cssB = fs.readFileSync("ui-dark-current.css", {encoding: "utf-8"});

        var outputA = cssparse(cssA);
        var outputB = cssparse(cssB);

        var stylesA = compressStyles(outputA.stylesheet);
        var stylesB = compressStyles(outputB.stylesheet);

        var diff = compareStyles(stylesA, stylesB);

        var errorCount = 0;
        for (var i in diff)
        {
            if (i.indexOf("input[") < 0)
                continue;

            if (diff[i].substr)
            {
                grunt.log.error(i + ": " + diff[i]);
                ++errorCount;
                continue;
            }

            for (var j in diff[i])
            {
                if (j === "font-family")
                    continue;
                grunt.log.error(i + ": " + j + ": " + diff[i][j]);
                ++errorCount;
            }
        }

        if (errorCount > 0)
            grunt.warn(errorCount + " diffs found between styles.");
    });
};