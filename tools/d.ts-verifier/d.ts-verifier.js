/// <reference path="./require.d.ts" />
/// <reference path="./winjs.d.ts" />

(function () {

    "use strict";

    function getPublicKeys(obj) {
        // Return an Array containing all of the public keys that exist on param obj. 
        // Public keys are considered to be the set of (usually) enumerable keys that do 
        // not begin with an underscore character.

        var publicKeys;
        if (obj === Array.prototype) {
            // Normally we would just want to use Object.keys(obj) to get the public API of each Namespace on the WinJS Object, however if the obj parameter is the 
            // Array prototype, we have to use Object.getOwnPropertyNames(obj) to get the publicKeys instead. Unlike Object.keys(), Object.getOwnPropertyNames, does not filter 
            // out non-enumerable properties, and for most objects, its a safe bet that only the enumerable properties are the ones that should be published as part
            // of the public API. However, in the case of Array, all of its public methods like pop, concat, join, shift etc.. ARE non-enumerable, so in the case of the 
            // WinJS.Utilities.QueryCollection class, which derives from Array, we have all of its API explicitly typed out in our WinJS.d.ts file, but if we don't special 
            // case Array.prototype here, then this tool wouldn't find most of that API space, and would report that the WinJS.d.ts file had extra API's for QueryCollection that
            // didn't exist on the WinJS.Utilities.QueryCollection object.
            publicKeys = Object.getOwnPropertyNames(obj)

            // Because we were forced to use Object.getOwnPropertyNames, we also have to weed out any non standardized or experimental Array API't that might be living in the non
            // enumberable space. To date we are aware of these experimental array API's that aren't yet included in the Lib.d.ts definition of the "interface Array<T>"
            var experimentalFeatures = ["keys", "entries"];
            publicKeys = publicKeys.filter(function (key) {
                return experimentalFeatures.indexOf(key) < 0;
            });

        } else { 
            publicKeys = Object.keys(obj);
        }

        return publicKeys.filter(ignoreBadProperties);
    }

    function ignoreBadProperties(key) {
        // Don't return any key that is considered private or is named "constructor".

        // If a key begins with an underscore it is considered private.
        // If a key is named "constructor" it is a JS construct that is automatically added to every
        // JavaScript function's prototype object and is a reference to function that created it. 
        // Unfortunately this property is enumerable so we have to filter it out explicitly, rather 
        // than rely on Object.keys(), lest many "constructor" false positives are reported as part 
        // of the WinJS UI Controls namespaces.
        return key[0] !== "_" && key !== "constructor";
    }

    function isPrivate(key) {
        // Keys that begin with an underscore are considered private.
        return key[0] === "_";
    }

    function crawlPublicAPI(obj, namespace) {
        // @ param obj: the object we want to scrape the public API from
        // @ param namespace: The full namespace for obj on the WinJS object, useful for debugging.
        var publicAPI = {};

        if (obj && !Array.isArray(obj)) {

            if (typeof obj === "object" || typeof obj === "function") {
                // Record Static members
                var publicKeys = getPublicKeys(obj);

                publicKeys.forEach(function (key) {
                    publicAPI[key] = crawlPublicAPI(obj[key], namespace + "." + key);
                });
            }

            if (typeof obj === "function") {
                // Record instance members from our prototype object.
                var proto = obj.prototype;

                while (proto && proto !== Object.prototype) {
                    var publicKeys = getPublicKeys(proto);

                    publicKeys.forEach(function (key) {
                        publicAPI[key] = publicAPI[key] || crawlPublicAPI(obj[key], namespace + "." + key);
                    });

                    // Continue walking the prototype chain and record any inherited 
                    // instance members that we haven't captured yet.
                    proto = Object.getPrototypeOf(proto);
                }
            }
        }

        return publicAPI;
    }

    function isTitleCase(str){
        return str[0] === str[0].toUpperCase();
    }

    function formatError(namespace) {
        // prepend "WARNING: " if the last two parts of the namespace are not title case.
        // else prepend "ERROR ";
        var warning = "WARNING: ";
        var error = "ERROR: ";
        var prefix = error;

        var parts = namespace.split(".");
        if (parts.length >= 2) {
            var lastPart = parts[parts.length - 1];
            var secondToLastPart = parts[parts.length - 2];
            if (!isTitleCase(lastPart) && !isTitleCase(secondToLastPart)) { 
                prefix = warning
            }
        } 

        return prefix + namespace;
    }

    function isSubSet(WinJS1, WinJS2) {
        // Are the keys in WinJS1 a subset of keys in WinJS2?

        var missingNamespaces = [];
        function _isSubSetHelper(obj1, obj2, namespace) {

            // Recursively determine if obj2 contains all the keys from obj1.
            var keys1 = Object.keys(obj1);
            var keys2 = Object.keys(obj2);

            keys1.forEach(function (key1) {
                var currentNamespace = namespace + "." + key1;
                if (keys2.indexOf(key1) >= 0) {
                    _isSubSetHelper(obj1[key1], obj2[key1], currentNamespace);
                } else {
                    missingNamespaces.push(formatError(currentNamespace));
                }
            });
        }

        _isSubSetHelper(WinJS1, WinJS2, "WinJS");
        return missingNamespaces;
    }

    function printResults(results) {
        var count = results.length;
        if (count > 0) {
            var out = "";
            results.sort().forEach(function (item) {
                out += item + ",\n";
            });
            return out;
        } else {
            return "[]";
        }
    }

    function main() {
        // Ensure the relevant JavaScript files have loaded
        window.WinJS || console.error("Missing WinJS");
        window.tscheck && window.tscheck.TS || console.error("Missing data");

        window.tscheck.JS = crawlPublicAPI(WinJS, "WinJS");

        console.log("Namespaces included in WinJS that are missing from WinJS.d.ts: \n" +
            printResults(isSubSet(tscheck.JS, tscheck.TS)));

        console.log("Namespaces included in WinJS.d.ts that are missing from WinJS: \n" +
            printResults(isSubSet(tscheck.TS, tscheck.JS)));
    }

    // Entry point
    main();
})();
