// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/*jshint ignore:start */
var require;
var define;
/*jshint ignore:end */

(function () {
    "use strict";

    var defined = {};
    define = function (id, dependencies, factory) {
        if (!Array.isArray(dependencies)) {
            factory = dependencies;
            dependencies = [];
        }

        var mod = {
            dependencies: normalize(id, dependencies),
            factory: factory
        };

        if (dependencies.indexOf('exports') !== -1) {
            mod.exports = {};
        }

        defined[id] = mod;
    };

    // WinJS/Core depends on ./Core/_Base
    // should return WinJS/Core/_Base
    function normalize(id, dependencies) {
        id = id || "";
        var parent = id.split('/');
        parent.pop();
        return dependencies.map(function (dep) {
            if (dep[0] === '.') {
                var parts = dep.split('/');
                var current = parent.slice(0);
                parts.forEach(function (part) {
                    if (part === '..') {
                        current.pop();
                    } else if (part !== '.') {
                        current.push(part);
                    }
                });
                return current.join('/');
            } else {
                return dep;
            }
        });
    }

    function resolve(dependencies, parent, exports) {
        return dependencies.map(function (depName) {
            if (depName === 'exports') {
                return exports;
            }

            if (depName === 'require') {
                return function (dependencies, factory) {
                    require(normalize(parent, dependencies), factory);
                };
            }

            var dep = defined[depName];
            if (!dep) {
                throw new Error("Undefined dependency: " + depName);
            }

            if (!dep.resolved) {
                dep.resolved = load(dep.dependencies, dep.factory, depName, dep.exports);
                if (typeof dep.resolved === "undefined") {
                    dep.resolved = dep.exports;
                }
            }

            return dep.resolved;
        });
    }

    function load(dependencies, factory, parent, exports) {
        var deps = resolve(dependencies, parent, exports);
        if (factory && factory.apply) {
            return factory.apply(null, deps);
        } else {
            return factory;
        }
    }
    require = function (dependencies, factory) { //jshint ignore:line
        if (!Array.isArray(dependencies)) {
            dependencies = [dependencies];
        }
        load(dependencies, factory);
    };


})();