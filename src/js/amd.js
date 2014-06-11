// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/*jshint -W079*/
var require;
/*jshint +W079*/
var define;

(function() {
    "use strict";

    var defined = {};
    /*jshint -W020*/
    define = function(id, dependencies, factory) {
        if(!Array.isArray(dependencies)) {
            factory = dependencies;
            dependencies = [];
        }

        defined[id] = {
            dependencies: normalize(id, dependencies),
            factory: factory
        };
    }
    /*jshint +W020*/

    // WinJS/Core depends on ./Core/_Base
    // should return WinJS/Core/_Base
    function normalize(id, dependencies) {
        var parent = id.split('/');
        parent.pop();
        return dependencies.map(function(dep) {
            if(dep[0] === '.') {
                var parts = dep.split('/');
                var current = parent.slice(0);
                parts.forEach(function(part) {
                    if(part === '..') {
                        current.pop();
                    } else if(part !== '.') {
                        current.push(part);
                    }
                });
                return current.join('/');
            } else {
                return dep;
            }
        });
    }

    function resolve(dependencies) {
        return dependencies.map(function(depName) {
            var dep = defined[depName];
            if(!dep) {
                throw new Error("Undefined dependency: " + depName);
            }

            if(!dep.resolved) {
                dep.resolved = load(dep.dependencies, dep.factory);
            }
            
            return dep.resolved;
        });
    }

    function load(dependencies, factory) {
        var deps = resolve(dependencies);
        if(factory && factory.apply) {
            return factory.apply(null, deps);
        } else {
            return factory;
        }
    }
    require = function(dependencies, factory) {
        if(!Array.isArray(dependencies)) {
            dependencies = [dependencies];
        }
        load(dependencies, factory);
    }


})();