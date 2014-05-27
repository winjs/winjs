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
        var parts = id.split('/');
        var parent = "";
        if(parts.length > 1) {
            parent = parts.slice(0, -1).join('/');
        }
        return dependencies.map(function(dep) {
            // no support for .. yet
            var start = dep.substr(0, 2);
            if(start === "./" ) {
                return parent + dep.substr(1);
            }
            return dep;
        });
    }

    function resolve(dependencies) {
        return dependencies.map(function(depName) {
            var dep = defined[depName];
            if(!dep) {
                throw new Error("Undefined dependency: " + depName);
            }
            return load(dep.dependencies, dep.factory);
        });
    }

    function load(dependencies, factory) {
        var deps = resolve(dependencies);
        if(factory && factory.apply) {
            return factory.apply(null, deps);
        }
    }
    require = function(dependencies, factory) {
        if(!Array.isArray(dependencies)) {
            dependencies = [dependencies];
        }
        load(dependencies, factory);
    }


})();