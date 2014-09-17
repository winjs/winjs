// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="FlexboxMixins.less.css" />

module WinJSTests.Less {
    "use strict";

    // For use with standard attributes (doesn't support attribute names with vendor prefixes)
    function getDashedStandardAttribute(attribute) {
        return attribute.replace(/[A-Z]/g, function (x) { return "-" + x[0].toLowerCase(); });
    }

    // Returns a dashed CSS class name which is a combination of *attribute* (camel case)
    // and *values* (dashed case).
    // Example: toCssTestClass("flexFlow", "column", "wrap-reverse") => flex-flow-column-wrap-reverse
    // Designed to be used with the rules in FlexboxMixins.less.
    function toCssTestClass(attribute, ...values) {
        return getDashedStandardAttribute(attribute) + "-" + values.join("-");
    }

    // Synonyms map from standard CSS attribute/values to alternatives implemented by browsers.

    // CSS attribute synonyms
    // Camel case
    var attributeSynonyms = {
        "alignContent": ["msFlexLinePack", "webkitAlignContent"],
        "alignItems": ["msFlexAlign", "webkitAlignItems"],
        "alignSelf": ["msFlexItemAlign", "webkitAlignSelf"],
        "justifyContent": ["msFlexPack", "webkitJustifyContent"],
        "flexWrap": ["msFlexWrap", "webkitFlexWrap"],
        "flexDirection": ["msFlexDirection", "webkitFlexDirection"],
        "order": ["flex-order", "msFlexOrder", "webkitOrder"],
        "flexGrow": ["msFlexPositive", "webkitFlexGrow"],
        "flexShrink": ["msFlexNegative", "webkitFlexShrink"],
        "flexBasis": ["msFlexPreferredSize", "webkitFlexBasis"]
    };

    // CSS value synonyms
    // Dashed case
    var valueSynonyms = {
        "flex": ["-ms-flexbox", "-webkit-flex"],
        "inline-flex": ["-ms-inline-flexbox", "-webkit-inline-flex"],
        "flex-start": ["start"],
        "flex-end": ["end"],
        "space-between": ["justify"],
        "space-around": ["distribute"],
        "nowrap": ["none"]
    };

    function allAlternatives(synonymMap, standard) {
        var synonyms = synonymMap[standard];
        return synonyms ? [standard].concat(synonyms) : [standard];
    }

    function testAttribute(element, standardAttribute, standardValue) {
        var foundMatch = false;
        var attributes = allAlternatives(attributeSynonyms, standardAttribute);
        var values = allAlternatives(valueSynonyms, standardValue);

        for (var i = 0; i < attributes.length && !foundMatch; i++) {
            var attr = attributes[i];
            for (var j = 0; j < values.length && !foundMatch; j++) {
                var val = values[j];
                try {
                    if ("" + val === "" + getComputedStyle(element)[attr]) {
                        foundMatch = true;
                    }
                } catch (e) {
                    // Eat any exceptions that may arise from trying to read
                    // an unsupported style
                }
            }
        }

        LiveUnit.Assert.isTrue(foundMatch,
            "LESS flexbox mixins don't properly support '" + standardAttribute + ": "
            + standardValue + "' in this environment");
    }

    // Verifies the CSS style of an element with class name *className* matches
    // *attributesAndValues*. *attributesAndValues* is a map between CSS attributes and values.
    function testRule(className, attributesAndValues) {
        var root = document.getElementById("flexbox-mixin-tests");
        var element = document.createElement("div");
        element.className = className;
        root.appendChild(element);

        Object.keys(attributesAndValues).forEach(function (attribute) {
            testAttribute(element, attribute, attributesAndValues[attribute]);
        });

        root.removeChild(element);
    }

    // Returns a function which verifies that *attribute* works with each of *values*. Applies a CSS
    // class to an element which is a combination of the *attribute* and value and verifies that this
    // causes the element to have a particular value for its CSS *attribute*.
    //
    // Example:
    //
    // makeTestAttributeWithValues("align-items", ["stretch", "flex-start"])
    // Tests that an element:
    //   - with class .align-items-stretch has attribute "align-items" equal to "stretch"
    //   - with class .align-items-flex-start has attribute "align-items" equal to "flex-start"
    //
    function makeTestAttributeWithValues(attribute, values) {
        return function () {
            values.forEach(function (v) {
                var attributeAndValue = {};
                attributeAndValue[attribute] = v;
                testRule(toCssTestClass(attribute, v), attributeAndValue);
            });
        };
    }

    var flexWrapValues = ["nowrap", "wrap", "wrap-reverse"];
    var flexDirectionValues = ["row", "row-reverse", "column", "column-reverse"];

    export class FlexboxMixinTests {
        setUp() {
            var newNode = document.createElement("div");
            newNode.id = "flexbox-mixin-tests";
            document.body.appendChild(newNode);
        }

        tearDown() {
            var element = document.getElementById("flexbox-mixin-tests");
            document.body.removeChild(element);
        }

        testDisplay = function () {
            testRule("display-flex", { display: "flex" });
            testRule("display-inline-flex", { display: "inline-flex" });
        };

        testAlignContent = makeTestAttributeWithValues(
            "alignContent",
            ["stretch", "flex-start", "flex-end", "center", "space-between", "space-around"]
            );

        testAlignItems = makeTestAttributeWithValues(
            "alignItems",
            ["stretch", "flex-start", "flex-end", "center", "baseline"]
            );

        testAlignSelf = makeTestAttributeWithValues(
            "alignSelf",
            ["flex-start", "flex-end", "center", "baseline", "stretch"]
            );

        testJustifyContent = makeTestAttributeWithValues(
            "justifyContent",
            ["flex-start", "flex-end", "center", "space-between", "space-around"]
            );


        testFlexWrap = makeTestAttributeWithValues(
            "flexWrap",
            flexWrapValues
            );


        testFlexDirection = makeTestAttributeWithValues(
            "flexDirection",
            flexDirectionValues
            );

        testFlexFlow = function () {
            flexDirectionValues.forEach(function (direction) {
                var className = toCssTestClass("flexFlow", direction, "nowrap");
                testRule(className, {
                    flexDirection: direction,
                    flexWrap: "nowrap"
                });
            });

            flexWrapValues.forEach(function (wrap) {
                var className = toCssTestClass("flexFlow", "row", wrap);
                testRule(className, {
                    flexDirection: "row",
                    flexWrap: wrap
                });
            });
        };

        testOrder = function () {
            testRule("order-8", { order: "8" });
        };

        testFlex = function () {
            testRule("flex-grow-8", {
                flexGrow: "8",
                flexShrink: "1",
                flexBasis: "auto"
            });
            testRule("flex-shrink-4", {
                flexGrow: "0",
                flexShrink: "4",
                flexBasis: "auto"
            });
            testRule("flex-basis-2px", {
                flexGrow: "0",
                flexShrink: "1",
                flexBasis: "2px"
            });
            testRule("flex-2-3-4px", {
                flexGrow: "2",
                flexShrink: "3",
                flexBasis: "4px"
            });
            testRule("flex-none", {
                flexGrow: "0",
                flexShrink: "0",
                flexBasis: "auto"
            });
        };
    };
}

LiveUnit.registerTestClass("WinJSTests.Less.FlexboxMixinTests");