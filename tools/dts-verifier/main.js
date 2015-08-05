// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

"use strict";

var fs = require('fs');
var fsExtra = require('fs.extra');
var path = require('path');
var tscore = require('./tscore');

function startsWith(s, prefix) {
    return s.substring(0, prefix.length) === prefix;
}

function isInterface(obj) {
    return obj.type === "object" && obj.meta.kind === "interface";
}

function keepNamespace(name, obj) {
    return !isInterface(obj) && startsWith(name, "WinJS")
}

function appendToModel(namespaceModel, currentNamespace, propertiesToAdd) {
    // Adds properties from the current namespace to our model.
    // @ param namespaceModel: The JavaScipt object from our Model, representing the current namespace.
    // @ param currentNamespace: The string value of the current namespace, e.g. "WinJS.Binding.List"
    // @ param propertiesToAdd: The properties on the current namespace according to tscore 's analysis of the WinJS.d.ts
    Object.keys(propertiesToAdd).forEach(function (propName) {
        if (propName[0] !== "_") {
            // Ensure our model has an entry for every public property name that we see.
            namespaceModel[propName] = namespaceModel.hasOwnProperty(propName) ? namespaceModel[propName] : {};
        }

        var type = propertiesToAdd[propName].type;

        // Recursively Append all public properties to the model.
        if (type && type.properties) {
            var nextNamespace = currentNamespace + "." + propName;
            var nextProperties = type.properties;
            appendToModel(namespaceModel[propName], nextNamespace, nextProperties);
        }

    });
}

function ensureNamespaceInModel(model, namespace) {
    // Lookup a namespace from our model. If the namespace or its ancestor namespaces don't yet exist in our model, 
    // add them as empty objects.
    var namespaceObject = model;
    var parts = namespace.split(".");
    parts.forEach(function _walkModelForNamepace(part) {
        // Build out missing parts of the namespace as we walk it.
        namespaceObject[part] = namespaceObject[part] || {};
        namespaceObject = namespaceObject[part];
    });
    return namespaceObject
}

function getWinJSModel(env) {
    // Create a model of the WinJS Namespaces from the tscore output variable "env".
    var model = {};
    for (var namespace in env) {
        // iterate through the env object looking for WinJS namespaces to add.
        var obj = env[namespace].object;

        // tscore prefixes some important WinJS namespaces with "module:"
        if (startsWith(namespace, "module:")) {
            namespace = namespace.split(":")[1];
        }

        if (keepNamespace(namespace, obj)) { // WinJS namespaces only
            var namespaceModel = ensureNamespaceInModel(model, namespace);
            appendToModel(namespaceModel, namespace, obj.properties);
        }
    }

    return model;
}

function processFile(filePath, text) {

    // invoke tscore
    var result = tscore([
        {
            file: ">lib.d.ts",
            text: fs.readFileSync(__dirname + '/lib/lib.d.ts', 'utf8')
        },
        { file: filePath, text: text }
    ]);;

    // invoke custom code to handle tscore output
    return getWinJSModel(result.env);
}

function indent(n) {
    var s = "";
    while (n-- > 0) {
        s += "    ";
    }
    return s;
}

function sortedPrint(obj, indentCount) {
    if (typeof obj === "boolean" || typeof obj === "number") {
        return "" + obj;
    } else if (typeof obj === "string") {
        return '"' + obj + '"';
    } else if (Array.isArray(obj)) {
        return sortedPrintArray(obj, indentCount);
    } else if (typeof obj === "object") {
        return sortedPrintObject(obj, indentCount);
    } else {
        throw "sortedPrint: unknown type: " + (typeof obj);
    }
}

function sortedPrintArray(array, indentCount) {
    indentCount = (indentCount || 0) + 1;
    var count = array.length;
    if (count > 0) {
        var out = "[";
        array.sort().forEach(function (item, i) {
            out += "\n" + indent(indentCount) + sortedPrint(item, indentCount) + (i + 1 < count ? "," : "");
        });
        out += "\n" + indent(indentCount - 1) + "]";
        return out;
    } else {
        return "[]";
    }
}

function sortedPrintObject(obj, indentCount) {
    indentCount = (indentCount || 0) + 1;
    var keys = Object.keys(obj);
    var keyCount = keys.length;
    if (keyCount > 0) {
        var out = "{";
        keys.sort().forEach(function (key, i) {
            out += "\n" + indent(indentCount) + key + ": " + sortedPrint(obj[key], indentCount) + (i + 1 < keyCount ? "," : "");
        });
        out += "\n" + indent(indentCount - 1) + "}";
        return out;
    } else {
        return "{}";
    }
}

function extractModelFromDts(dtsPath) {
    var filePath = path.resolve(dtsPath);
    var text = fs.readFileSync(filePath, 'utf8').toString();
    var output = processFile(filePath, text);
    return output;
}

function printUsage() {
    console.log("Please pass a valid path. Usage: node main.js /path/to/winjs.d.ts /path/to/winjs");
}

function main() {
    if (process.argv.length < 4) {
        printUsage();
        return;
    }

    var dtsPath = path.resolve(process.argv[2]);
    var winjsPath = path.resolve(process.argv[3]);

    var dtsModel = extractModelFromDts(dtsPath);
    fs.writeFileSync("./bin/dtsModel.json", JSON.stringify(dtsModel, null, 2));

    fs.writeFileSync("./bin/dtsModel.json", JSON.stringify(dtsModel, null, 2));
    fsExtra.copyRecursive(winjsPath, './bin/winjs/', function (err) {
        fsExtra.copy('index.html', './bin/index.html', function (err) {
            fsExtra.copy('dts-verifier.js', './bin/dts-verifier.js', function (err) {
                var nodeStatic = require('node-static'),
                    port = 8080,
                    http = require('http');

                // config
                var file = new nodeStatic.Server('./bin', {
                    cache: 3600,
                    gzip: true
                });

                // serve
                http.createServer(function (request, response) {
                    request.addListener('end', function () {
                        file.serve(request, response);
                    }).resume();
                }).listen(port);
                console.log("listening");
            });
        });
    });
}

if (require.main === module) {
    main();
}

module.exports = {
    extractModelFromDts: extractModelFromDts
};