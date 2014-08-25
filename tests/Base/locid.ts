// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
///<reference path="../../bin/typings/tsd.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module WinJSTests {

    "use strict";

    export class LocIdTests {
        
        testNewCodeLocIds(signalTestCaseCompleted) {

            LiveUnit.LoggingCore.logComment("Making sure that all the js code has proper locid attributes");

            function propertyDescriptorOf(item, key) {
                while (item) {
                    var propDesc = Object.getOwnPropertyDescriptor(item, key);
                    if (propDesc) {
                        return propDesc;
                    }
                    item = Object.getPrototypeOf(item);
                }
            }

            function walk(items, item, path) {
                if (!item) {
                    return;
                }
                switch (typeof item) {
                    case "object":
                        walk(items, Object.getPrototypeOf(item), path);
                        break;

                    case "function":
                        var parts = path.split('.');
                        if (parts.length > 0) {
                            var key = parts[parts.length - 1];
                            if (key[0].match(/[A-Z]/)) {
                                walk(items, item.prototype, path + ".prototype");
                            }
                        }
                        break;

                    default:
                        return;
                }
                Object.keys(item).forEach(function (key) {
                    var name = path + "." + key;
                    var desc = propertyDescriptorOf(item, key);
                    if (desc.value) {
                        if (typeof desc.value === "function") {
                            items[name] = { fn: desc.value };
                        }
                        walk(items, desc.value, name);
                    } else if (desc.get || desc.set) {
                        items[name] = { get: desc.get, set: desc.set };
                    }
                });
            }

            function gatherItems(namespace) {
                var target = window;
                namespace.split('.').forEach(function (part) {
                    target = target[part];
                });
                var items = {};
                walk(items, target, namespace);
                return items;
            }

            function verifyValidLocIds() {
                LiveUnit.LoggingCore.logComment("verifyValidLocIds");
                var items = gatherItems("WinJS");
                Object.keys(items).forEach(function (key) {
                    var item = items[key],
                        text;
                    if (item.fn) {
                        text = item.fn.toString();
                    } else if (item.get) {
                        text = item.get.toString();
                    } else if (item.set) {
                        text = item.set.toString();
                    }

                    if (text) {
                        var lines = text.split('\n');
                        var i, len;
                        for (i = 0, len = lines.length; i < len; i++) {
                            var line = lines[i];
                            var match = line.match(/\/\/\/(.*locid=\"([0-9]+)\".*)/)
                        if (match) {
                                // If this test fails, it means that a code comment did not assign a unique locid.
                                LiveUnit.Assert.fail("A valid locid was not specified in " + key + " line: " + line);
                            }
                        }
                    }
                });
            }
            verifyValidLocIds();
            signalTestCaseCompleted();
        }
}

}

LiveUnit.registerTestClass("WinJSTests.LocIdTests");
