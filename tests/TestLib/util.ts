// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
//
// UTIL.JS
// Put non-feature specific functions used in > 1 test file in here to share with other tests
// and simplify maintenance across tests by avoiding copy/paste.
//
"use strict";

function unhandledTestError(msg) {
    try {
        LiveUnit.Assert.fail("unhandled test exception: " + msg);
    } catch (ex) {
        // don't rethrow assertion failure exception
    }
}

function isWinRTEnabled() {
    // detect if WinRT is available (running under WWAHOST) to enable/disable appropriate tests
    return (window && ((<any>window).Windows !== undefined));
}

function namedObjectContainsString(obj, string) {
    // loop through items inside obj and return index of match,
    // returns -1 if no match.
    var index = 0;
    string = string.toLowerCase();
    string = string.replace("../", "");

    for (var i in obj) {
        if (i.toLowerCase().indexOf(string) >= 0) {
            return index;
        }
        index++;
    }

    return -1;
}

function enableWebunitErrorHandler(enable) {
    // QUnit doesn't use this feature
    if (!(<any>LiveUnit).exceptionHandler) {
        return;
    }
    // if you disable the webunit error handler, it will affect all tests in the run.
    // **MAKE SURE** you put it back per test case using finally{} blocks and or proper promise error paths as necessary.

    try {
        if (enable) {
            // restore the webunit global error handler
            window.addEventListener("error", (<any>LiveUnit).exceptionHandler, false);
        } else {
            // remove the webunit global handler which will call complete() if you encounter an error during fragment loading
            window.removeEventListener("error", (<any>LiveUnit).exceptionHandler, false);
        }
    } catch (ex) {
        // restore the webunit global error handler in case it was removed.  If already added, re-adding doesn't generate error.
        window.addEventListener("error", (<any>LiveUnit).exceptionHandler, false);
        LiveUnit.Assert.fail("unhandled exception from enableWebuniteErrorHandler(), webunit global error handler restored.  Exception=" + ex);
    }
};

// A utility function that returns a function that returns a timeout promise of the given value
function weShouldWait(delay) {
    return function (value) {
        return WinJS.Promise.timeout(delay).
            then(function () {
                return value;
            });
    };
}

// A general purpose asynchronous looping function
function asyncWhile(conditionFunction, workFunction) {

    function loop() {
        return WinJS.Promise.as(conditionFunction()).
            then(function (shouldContinue) {
                if (shouldContinue) {
                    return WinJS.Promise.as(workFunction()).then(loop);
                } else {
                    return WinJS.Promise.wrap();
                }
            });
    }

    return loop();
}


module Helper {

    // CSS property translation
    // Uses feature detection to map "standard" CSS property names and values to their
    // prefixed counterparts.
    // Best used through Helper.translateCSSProperty and Helper.translateCSSValue
    // Please add to this list as neccessary and use it where possible in test code
    export var cssTranslations = {
        "touch-action": function() {
            var obj = {property: {}, value: {}};
            if ("touchAction" in document.documentElement.style) {
                obj = null;
            } else if ("msTouchAction" in document.documentElement.style) {
                obj.property["touch-action"] = "-ms-touch-action";
            }
            return obj;
        },
        "display": function() {
            var obj = {property: {}, value: {}};
            if ("flex" in document.documentElement.style) {
                obj = null;
            } else if ("msFlex" in document.documentElement.style) {
                obj.value["inline-flex"] = "-ms-inline-flexbox";
                obj.value["flex"] = "-ms-flexbox";
            } else if ("webkitFlex" in document.documentElement.style) {
                obj.value["inline-flex"] = "-webkit-inline-flex";
                obj.value["flex"] = "-webkit-flex";
            }
            return obj;
        },
        "flex": function() {
            var obj = {property: {}, value: {}};
            if ("flex" in document.documentElement.style) {
                obj = null;
            } else if ("msFlex" in document.documentElement.style) {
                obj.property["flex"] = "-ms-flex";
            } else if ("webkitFlex" in document.documentElement.style) {
                obj.property["flex"] = "-webkit-flex";
            }
            return obj;
        },
        "flex-grow": function() {
            var obj = {property: {}, value: {}};
            if ("flexGrow" in document.documentElement.style) {
                obj = null;
            } else if ("msFlexGrow" in document.documentElement.style) {
                obj.property["flex-grow"] = "-ms-flex-grow";
            } else if ("msFlexPositive" in document.documentElement.style) {
                obj.property["flex-grow"] = "-ms-flex-positive";
            } else if ("webkitFlexGrow" in document.documentElement.style) {
                obj.property["flex-grow"] = "-webkit-flex-grow";
            }
            return obj;
        },
        "flex-shrink": function() {
            var obj = {property: {}, value: {}};
            if ("flexShrink" in document.documentElement.style) {
                obj = null;
            } else if ("msFlexShrink" in document.documentElement.style) {
                obj.property["flex-shrink"] = "-ms-flex-shrink";
            } else if ("msFlexNegative" in document.documentElement.style) {
                obj.property["flex-shrink"] = "-ms-flex-negative";
            } else if ("webkitFlexShrink" in document.documentElement.style) {
                obj.property["flex-shrink"] = "-webkit-flex-shrink";
            }
            return obj;
        },
        "flex-basis": function() {
            var obj = {property: {}, value: {}};
            if ("flexBasis" in document.documentElement.style) {
                obj = null;
            } else if ("msFlexBasis" in document.documentElement.style) {
                obj.property["flex-basis"] = "-ms-flex-basis";
            } else if ("msFlexPreferredSize" in document.documentElement.style) {
                obj.property["flex-basis"] = "-ms-flex-preferred-size";
            } else if ("webkitFlexBasis" in document.documentElement.style) {
                obj.property["flex-basis"] = "-webkit-flex-basis";
            }
            return obj;
        }
    };

    // Translate a standard CSS property name to the prefixed version, if one is necessary
    // Uses feature detection
    export function translateCSSProperty(propertyName) {
        var translation = Helper.cssTranslations[propertyName]();
        if (!translation || !translation.property[propertyName]) {
            return propertyName;
        }
        return translation.property[propertyName];
    };

    // Translate a standard CSS property value to the prefixed version, if one is necessary
    // Uses feature detection
    export function translateCSSValue(propertyName, value) {
        var translation = Helper.cssTranslations[propertyName]();
        if (!translation || !translation.value[value]) {
            return value;
        }
        return translation.value[value];
    };

    // Some browsers (firefox) don't store the css property values in the root property name
    // For example flex: 1 1 auto; will not set the "flex" style attribute but instead the 3
    // sub attributes: flex-grow, flex-shrink, and flex-basis. This helper takes a property name
    // and re-builds the expected value out of the sub style components, which works in all supported
    // browsers.
    // Please add to the list of supported properties in this method as necessary.
    export function getCSSPropertyValue(styleObject, propertyName) {
        if (propertyName === "flex") {
            var shrink = styleObject.getPropertyValue(Helper.translateCSSProperty("flex-grow"));
            var grow = styleObject.getPropertyValue(Helper.translateCSSProperty("flex-shrink"));
            var basis = styleObject.getPropertyValue(Helper.translateCSSProperty("flex-basis"));
            return grow + " " + shrink + " " + basis;
        }
        return styleObject.getPropertyValue(Helper.translateCSSProperty(propertyName));
    };

    export function endsWith(s, suffix) {
        var expectedStart = s.length - suffix.length;
        return expectedStart >= 0 && s.lastIndexOf(suffix) === expectedStart;
    };

    // Rounds *n* such that it has at most *decimalPoints* digits after the decimal point.
    export function round(n, decimalPoints) {
        return Math.round(n * Math.pow(10, decimalPoints)) / Math.pow(10, decimalPoints);
    };

    // Returns a random integer less than the given number
    export function getRandomNumberUpto(num) {
        return Math.floor(Math.random() * num);
    };

    // Returns a random item from the given array or binding list
    export function getRandomItem(array) {
        var randomIndex = Helper.getRandomNumberUpto(array.length);
        if (array instanceof Array) {
            return array[randomIndex];
        } else {
            return array.getAt(randomIndex);
        }
    };

    export function enableStyleSheets(suffix) {
        for (var i = 0; i < document.styleSheets.length; i++) {
            var sheet = document.styleSheets[i];
            if (sheet.href && Helper.endsWith(sheet.href, suffix)) {
                sheet.disabled = false;
            }
        }
    };

    export function disableStyleSheets(suffix) {
        for (var i = 0; i < document.styleSheets.length; i++) {
            var sheet = document.styleSheets[i];
            if (sheet.href && Helper.endsWith(sheet.href, suffix)) {
                sheet.disabled = true;
            }
        }
    };

    // Parses an rgb/rgba string as returned by getComputedStyle. For example:
    // Input: "rgb(10, 24, 215)"
    // Output: [10, 24, 215, 1.0]
    // Input: "rgba(10, 24, 215, 0.25)"
    // Output: [10, 24, 215, 0.25]
    // Special cases the color "transparent" which IE returns when no color is specified:
    // Input: "transparent"
    // Output: [0, 0, 0, 0.0]
    export function parseColor(colorString) {
        if (colorString === "transparent") {
            return [0, 0, 0, 0.0];
        } else if (colorString.indexOf("rgb") !== 0) {
            throw "Expected a CSS rgb string but found: " + colorString;
        }
        var start = colorString.indexOf("(") + 1;
        var end = colorString.indexOf(")");
        var nums = colorString.substring(start, end).split(",");
        return [
            parseInt(nums[0].trim(), 10),
            parseInt(nums[1].trim(), 10),
            parseInt(nums[2].trim(), 10),
            nums.length < 4 ? 1.0 : parseFloat(nums[3].trim())
        ];
    };

    function normalizedCssValue(attributeName, value) {
        var div = document.createElement("div");
        document.body.appendChild(div);

        div.style[attributeName] = value;
        var normalizedValue = getComputedStyle(div)[attributeName];

        document.body.removeChild(div);
        return normalizedValue;
    }

    function makeNormalizedCssValueAssertion(assertionFunction, attributeName) {
        return function (expected, actual, message?) {
            assertionFunction(
                normalizedCssValue(attributeName, expected),
                normalizedCssValue(attributeName, actual),
                message
            );
        };
    }

    export module Assert {
        export function areArraysEqual(expectedArray, actualArray, message) {
            if (!Array.isArray(expectedArray)|| !(Array.isArray(actualArray))) {
                LiveUnit.Assert.fail(message);
            }

            if (expectedArray === actualArray) {
                return;
            }

            LiveUnit.Assert.areEqual(expectedArray.length, actualArray.length, message);

            for (var i = 0; i < expectedArray.length; i++) {
                LiveUnit.Assert.areEqual(expectedArray[i], actualArray[i], message);
            }
        }

        export function areSetsEqual(expectedArray, actualArray, message) {
            var expected = expectedArray.slice().sort();
            var actual = actualArray.slice().sort();
            Helper.Assert.areArraysEqual(expected, actual, message);
        }

        // Verifies CSS colors. *expectedColorString* and *actualColorString* are color strings of the form
        // returned by getComputedStyle. Specifically, they can look like this:
        // - "rgb(10, 24, 215)"
        // - "rgba(10, 24, 215, 0.25)"
        export function areColorsEqual(expectedColorString, actualColorString, message?) {
            var expectedColor = Helper.parseColor(expectedColorString);
            var actualColor = Helper.parseColor(actualColorString);
            // Verify red, green, blue
            Helper.Assert.areArraysEqual(expectedColor.slice(0, 3), actualColor.slice(0, 3), message);
            // Verify alpha with a tolerance of 0.05
            LiveUnit.Assert.isTrue(Math.abs(expectedColor[3] - actualColor[3]) <= .05, message);
        }

        // Verifies CSS urls. *expectedUrl* and *actualUrl* are expected to be valid CSS rules. For example,
        // url("foo.png").
        export var areUrlsEqual = makeNormalizedCssValueAssertion(LiveUnit.Assert.areEqual.bind(LiveUnit.Assert), "backgroundImage");

        export var areFontFamiliesEqual = makeNormalizedCssValueAssertion(LiveUnit.Assert.areEqual.bind(LiveUnit.Assert), "fontFamily");
        export var areFontFamiliesNotEqual = makeNormalizedCssValueAssertion(LiveUnit.Assert.areNotEqual.bind(LiveUnit.Assert), "fontFamily");
        
        export function areFloatsEqual(expectedValue, actualValue, message = "", tolerance = 0.1) {
            var diff = Math.abs(expectedValue - actualValue);
            LiveUnit.Assert.isTrue(diff < tolerance, message + " (expected = " + expectedValue +
                ", actual = " + actualValue + ", tolerance = " + tolerance + ")");
        }
    }

    export module Browser {
        // Taken from ListView's CSS grid feature detection
        export var supportsCSSGrid = !!("-ms-grid-row" in document.documentElement.style);

        // Temporary for disabling tests outside of IE11
        export var isIE11 = "PointerEvent" in window;
        export var isIE10 = navigator.appVersion.indexOf("MSIE 10") !== -1;
    };

    // Returns the group key for an item as defined by createData() below
    export function groupKey(item) {
        var groupIndex = Math.floor(item.data ? (item.data.index / 10) : (item.index / 10));
        return groupIndex.toString();
    };

    // Returns the group data for an item as defined by createData() below
    export function groupData(item) {
        var groupIndex = Math.floor(item.data ? (item.data.index / 10) : (item.index / 10));
        var groupData = {
            title: "group" + groupIndex,
            index: groupIndex,
            itemWidth: "150px",
            itemHeight: "150px"
        };
        return groupData;
    };

    // Creates an array with data item objects
    export function createData(size) {
        var data = [];
        for (var i = 0; i < size; i++) {
            data.push({ title: "title" + i, index: i, itemWidth: "100px", itemHeight: "100px" });
        }
        return data;
    };

    // Creates a binding list out of the provided array (data) or
    // creates a new data array of specified size
    export function createBindingList(size, data?) {
        return (data ? new WinJS.Binding.List(data) : new WinJS.Binding.List(Helper.createData(size)));
    };

    // Creates a VDS out of the provided array (data) or
    // creates a new data array of specified size
    export function createTestDataSource(size, data?, isSynchronous = true) {
        // Populate a data array
        if (!data) {
            data = Helper.createData(size);
        }

        // Create the datasource
        var controller = {
            directivesForMethod: function (method) {
                return {
                    callMethodSynchronously: isSynchronous,
                    delay: isSynchronous ? undefined : 0,
                    sendChangeNotifications: true,
                    countBeforeDelta: 0,
                    countAfterDelta: 0,
                    countBeforeOverride: -1,
                    countAfterOverride: -1
                };
            }
        };

        // Data adapter abilities
        var abilities = {
            itemsFromIndex: true,
            itemsFromKey: true,
            remove: true,
            getCount: true,
            setNotificationHandler: true
        };

        return TestComponents.createTestDataSource(data, controller, abilities);
    };

    // Synchronous JS template for the data item created by createData() above
    export function syncJSTemplate(itemPromise) {
        return itemPromise.then(function (item) {
            var element = document.createElement("div");
            element.id = item.data.title;
            WinJS.Utilities.addClass(element, "syncJSTemplate");
            element.style.width = item.data.itemWidth;
            element.style.height = item.data.itemHeight;
            element.innerHTML = "<div>" + item.data.title + "</div>";
            return element;
        });
    };

    export function getOffsetRight(element) {
        return element.offsetParent.offsetWidth - element.offsetLeft - element.offsetWidth;
    };

    // Returns a promise which completes upon receiving a scroll event
    // from *element*.
    export function waitForScroll(element) {
        return new WinJS.Promise(function (c) {
            element.addEventListener("scroll", function onScroll() {
                element.removeEventListener("scroll", onScroll);
                c();
            });
        });
    };

    // Returns a promise which completes when *element* receives focus. When *includeDescendants* is true,
    // the promise completes when *element* or any of its descendants receives focus. *moveFocus* is a
    // callback which is expected to trigger the focus change that the caller is interested in.
    export function _waitForFocus(element, moveFocus, options) {
        options = options || {};
        var includeDescendants = options.includeDescendants;

        var p = new WinJS.Promise(function (complete) {
            element.addEventListener("focus", function focusHandler() {
                if (includeDescendants || document.activeElement === element) {
                    element.removeEventListener("focus", focusHandler, false);
                    complete();
                }
            }, true);
        });
        moveFocus();
        return p;
    };

    export function focus(element) {
        return Helper._waitForFocus(element, function () { element.focus(); }, {
            includeDescendants: false
        });
    };

    export function waitForFocus(element, moveFocus) {
        return Helper._waitForFocus(element, moveFocus, {
            includeDescendants: false
        });
    };

    export function waitForFocusWithin(element, moveFocus) {
        return Helper._waitForFocus(element, moveFocus, {
            includeDescendants: true
        });
    };

    // A wrapper around the browser's MouseEvent.initMouseEvent that turns the large argument list
    // into an options object to make function calls easier to understand.
    export function initMouseEvent(eventObject, type, options) {
        options = options || {};
        var canBubble = !!options.canBubble;
        var cancelable = !!options.cancelable;
        var view = options.view || window;
        var detail = options.detail || {};
        var clientX = options.clientX || 0;
        var clientY = options.clientY || 0;
        var screenX = typeof options.screenX === "number" ? options.screenX : window.screenLeft + clientX;
        var screenY = typeof options.screenY === "number" ? options.screenY : window.screenTop + clientY;
        var ctrlKey = !!options.ctrlKey;
        var altKey = !!options.altKey;
        var shiftKey = !!options.shiftKey;
        var metaKey = !!options.metaKey;
        var button = options.button || 0;
        var relatedTarget = options.relatedTarget || null;

        eventObject.initMouseEvent(type, canBubble, cancelable, view,
            detail, screenX, screenY, clientX, clientY,
            ctrlKey, altKey, shiftKey, metaKey,
            button, relatedTarget);
    };

    export function require(modulePath) {
        var module = null;
        WinJS.Utilities._require(modulePath, function (mod) {
            // WinJS.Utilities._require is guaranteed to be synchronous
            module = mod;
        });
        return module;
    };

    // Useful for disabling tests which were generated programmatically. Disables testName which
    // is part of the testObj tests. It's safest to call this function at the bottom of the
    // appropriate test file to ensure that the test has already been defined.
    //
    // Example usage: disableTest(WinJSTests.ConfigurationTests, "testDatasourceChange_incrementalGridLayout");
    export function disableTest(testObj, testName) {

        if (!testObj) {
            return;
        }

        var disabledName = "x" + testName;

        if (testObj.hasOwnProperty(testName)) {
            testObj[disabledName] = testObj[testName];
            delete testObj[testName];
        } else {
            disableTest(Object.getPrototypeOf(testObj), testName);
        }
    };

    // Useful for when you have a large number of configurations but don't want to
    // exhaustively test all unique combinations. This function takes an object that describes
    // all input parameters and their valid values, e.g.
    // { rtl: [true, false], layout:['list', 'grid'] }
    // and returns an array of objects that describe test cases for each unique
    // pair combination of inputs, e.g.
    // [ {rtl: true, layout: 'list'}, {rtl: true, layout: 'grid'}, ...]
    // The second argument provides an array of solutions that *must* be included in the output
    // more info: http://msdn.microsoft.com/en-us/library/cc150619.aspx
    export function pairwise(inputs, include?) {
        var results = [];
        var inputKeys = Object.keys(inputs);

        var combinations = [];

        // generate value combinations of all input values for each pair
        function generateUncovered(param1, param2) {
            var param1Inputs = inputs[param1];
            var param2Inputs = inputs[param2];
            var result = [];

            param1Inputs.forEach(function (value1) {
                param2Inputs.forEach(function (value2) {
                    result.push({
                        value1: value1,
                        value2: value2
                    });
                });
            });

            return result;
        }

        // when adding solutions to the results, simply remove them
        // from pending combinations after all slots are covered
        function addSolution(solution) {
            combinations = combinations.filter(function (combination) {
                combination.uncovered = combination.uncovered.filter(function (uncovered) {
                    if (solution[combination.param1] === uncovered.value1 && solution[combination.param2] === uncovered.value2) {
                        // remove combinations now covered
                        return false;
                    }
                    return true;
                });

                return combination.uncovered.length > 0;
            });

            results.push(solution);
        }

        for (var i = 0; i < inputKeys.length - 1; i++) {
            for (var j = i + 1; j < inputKeys.length; j++) {
                var param1 = inputKeys[i];
                var param2 = inputKeys[j];
                combinations.push({
                    param1: param1,
                    param2: param2,
                    uncovered: generateUncovered(param1, param2)
                });
            }
        }

        // mark any solutions passed in as covered
        if (Array.isArray(include)) {
            include.forEach(function (solution) {
                addSolution(solution);
            });
        }

        while (combinations.length) {
            // take first combination from pair with most uncovered slots
            var mostUncoveredPair = combinations.reduce(function (previous, current) {
                if (previous === null) {
                    return current;
                }

                if (previous.uncovered.length >= current.uncovered.length) {
                    return previous;
                } else {
                    return current;
                }
            });

            var solution = {};
            var combination = mostUncoveredPair.uncovered[0];
            solution[mostUncoveredPair.param1] = combination.value1;
            solution[mostUncoveredPair.param2] = combination.value2;

            // while not all parameters are in the solution yet
            var solutionKeys = Object.keys(solution);
            while (solutionKeys.length < inputKeys.length) {
                var candidates = [];

                // any uncovered parameter is a candidate
                inputKeys.forEach(function (param) {
                    if (solutionKeys.indexOf(param) === -1) {
                        inputs[param].forEach(function (value) {
                            candidates.push({
                                param: param,
                                value: value,
                                score: 0
                            });
                        });
                    }
                });

                var bestCandidate = candidates[0];

                var increment = function (param, value) {
                    candidates.some(function (candidate) {
                        if (candidate.param === param && candidate.value === value) {
                            candidate.score++;
                            if (candidate.score > bestCandidate.score) {
                                bestCandidate = candidate;
                            }
                            return true;
                        }
                    });
                };

                // find pairs that contain a parameter not in the solution
                combinations.forEach(function (combination) {
                    var hasParam1 = solutionKeys.indexOf(combination.param1) !== -1;
                    var hasParam2 = solutionKeys.indexOf(combination.param2) !== -1;

                    if (!hasParam1 || !hasParam2) {
                        // filter uncovered combinations consistent with existing inputs from these pairs
                        combination.uncovered.forEach(function (uncovered) {
                            if (hasParam1 && uncovered.value1 === solution[combination.param1]) {
                                increment(combination.param2, uncovered.value2);
                            } else if (hasParam2 && uncovered.value2 === solution[combination.param2]) {
                                increment(combination.param1, uncovered.value1);
                            } else {
                                increment(combination.param1, uncovered.value1);
                                increment(combination.param2, uncovered.value2);
                            }
                        });
                    }
                });

                // pick a value that satisfies the most of these combinations
                solution[bestCandidate.param] = bestCandidate.value;
                solutionKeys = Object.keys(solution);
            }

            // remove what is covered by the new solution
            addSolution(solution);
        }

        return results;
    }

    // a helper that allows JSON.stringify to handle recursive links in object graphs
    export function stringify(obj) {
        var str;
        try {
            var seenObjects = [];
            str = JSON.stringify(obj, function (key, value) {
                if (value === window) {
                    return "[window]";
                } else if (value instanceof HTMLElement) {
                    return "[HTMLElement]";
                } else if (typeof value === "function") {
                    return "[function]";
                } else if (typeof value === "object") {
                    if (value === null) {
                        return value;
                    } else if (seenObjects.indexOf(value) === -1) {
                        seenObjects.push(value);
                        return value;
                    } else {
                        return "[circular]";
                    }
                } else {
                    return value;
                }

            });
        } catch (err) {
            str = JSON.stringify("[object]");
        }
        return str;
    }

}
