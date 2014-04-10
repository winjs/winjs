// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

(function(){
    "use strict";

    var cssparse = require("css-parse");
    var fs = require("fs");
    var Color = require("color");
    var chalk = require("chalk");

    var Stylesheet = function()
    {
        this.styles = {};

        this.addRule = function(selector, property, value, line)
        {
            if (property === "font-family")
                return;

            // Remove extraneous spaces around parenthesis in the selector
            selector = selector.replace(/\(\s*/g, "(");
            selector = selector.replace(/\s*\)/g, ")");

            // Normalize '0' and '0px'
            value = value.replace(/0px/g, "0");

            // Initialize styles for this selector
            if (!this.styles[selector])
                this.styles[selector] = {rules: []};

            // Find out if a rule with this property already exists, and check
            // order specificity
            var rules = this.styles[selector].rules;
            var order = 0;
            for (var i = 0; i < rules.length; ++i)
            {
                if (rules[i].property === property)
                {
                    // Increase the order of the rule for every previous instance
                    // of this rule
                    if (rules[i].line < line)
                        ++order;
                }
            }

            // Add the rule
            rules.push({property: property, value: value, line: line, order: order});
        };

        this.compareWith = function(stylesheet)
        {
            var diff = {};
            var selector;

            // Find selector differences
            for (selector in this.styles)
            {
                if (!stylesheet.styles[selector])
                    diff[selector] = "Selector not found in new stylesheet";
            }
            for (selector in stylesheet.styles)
            {
                if (!this.styles[selector])
                    diff[selector] = "Selector not found in old stylesheet";
            }

            // Search deeper in the style object
            for (selector in this.styles)
            {
                if (diff[selector])
                    continue;

                var i, j;
                var rulesA = this.styles[selector].rules;
                var rulesB = stylesheet.styles[selector].rules;
                var ruleA = null;
                var ruleB = null;
                diff[selector] = {};

                // Find missing rules
                for (i = 0; i < rulesA.length; ++i)
                {
                    ruleB = null;
                    for (j = 0; j < rulesB.length; ++j)
                    {
                        if (rulesA[i].property === rulesB[j].property && rulesA[i].order === rulesB[j].order)
                        {
                            ruleB = rulesB[j];
                            break;
                        }
                    }
                    if (!ruleB)
                        diff[selector][rulesA[i].property] = "Property not found in new stylesheet";
                }
                for (i = 0; i < rulesB.length; ++i)
                {
                    ruleA = null;
                    for (j = 0; j < rulesA.length; ++j)
                    {
                        if (rulesA[j].property === rulesB[i].property && rulesA[j].order === rulesB[i].order)
                        {
                            ruleA = rulesA[j];
                            break;
                        }
                    }
                    if (!ruleA)
                        diff[selector][rulesB[i].property] = "Property not found in old stylesheet";
                }

                // Compare rule values
                for (i = 0; i < rulesA.length; ++i)
                {
                    ruleA = rulesA[i];
                    ruleB = null;
                    for (j = 0; j < rulesB.length; ++j)
                    {
                        var rule = rulesB[j];
                        if (rulesA[i].property === rulesB[j].property && rulesA[i].order === rulesB[j].order)
                        {
                            ruleB = rulesB[j];
                            break;
                        }
                    }

                    // Skip if the property doesn't exist
                    if (diff[selector][ruleA.property])
                        continue;

                    // Compare the value
                    if (ruleA.value !== ruleB.value)
                    {
                        // Check to see if the value is a color, if so, we should
                        // do a smart color compare
                        var colorEqual = false;
                        if (ruleA.value.substr && ruleA.value.match(/(#([A-Fa-f0-9]){3,8})|^rgba?|argb/))
                        {
                            var colorA = new Color(ruleA.value);
                            var colorB = new Color(ruleB.value);
                            if (colorA.hexString() === colorB.hexString())
                                colorEqual = true;
                        }

                        if (!colorEqual)
                            diff[selector][ruleA.property] = ruleA.value + " !== " + ruleB.value;
                    }
                }
            }

            return diff;
        };
    };

    function buildStyleSheet(stylesheetOrig)
    {
        var stylesheet = new Stylesheet();
        for (var i = 0; i < stylesheetOrig.rules.length; ++i)
        {
            var rule = stylesheetOrig.rules[i];
            if (!rule.selectors)
                continue;

            // Get every selector in the rule
            for (var j = 0; j < rule.selectors.length; ++j)
            {
                var selector = rule.selectors[j];
                for (var n = 0; n < rule.declarations.length; ++n)
                {
                    var dec = rule.declarations[n];
                    if (dec.type === "declaration")
                        stylesheet.addRule(selector, dec.property, dec.value, dec.position.end.line);
                }
            }
        }

        return stylesheet;
    }

    module.exports = function(grunt) {
        grunt.registerTask("csstest", function () {
            var i;
            var args = [];
            for (i = 0; i < arguments.length; ++i)
                args.push(arguments[i]);

            var cssA = fs.readFileSync("csstest/css-model.css", {encoding: "utf-8"});
            var cssB = fs.readFileSync("csstest/css-test.css", {encoding: "utf-8"});

            var outputA = cssparse(cssA, {position: true});
            var outputB = cssparse(cssB, {position: true});

            var stylesA = buildStyleSheet(outputA.stylesheet);
            var stylesB = buildStyleSheet(outputB.stylesheet);

            var diff = stylesA.compareWith(stylesB);

            var errorCount = 0;
            for (i in diff)
            {
                if (diff[i].substr)
                {
                    grunt.log.error(chalk.green(i) + ": " + diff[i]);
                    ++errorCount;
                    continue;
                }

                for (var j in diff[i])
                {
                    grunt.log.error(chalk.green(i) + ": " + chalk.cyan(j) + ": " + diff[i][j]);
                    ++errorCount;
                }
            }

            if (errorCount > 0)
                grunt.warn(errorCount + " diffs found between styles.");
        });
    };

})();