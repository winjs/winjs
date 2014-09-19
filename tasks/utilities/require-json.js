// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// RequireJS plugin to handle embedding JSON files (such as for string resources)
define(['require'], function (req) {
    "use strict";

    var api = {};
    var content = {};

    // Called to load a resource. This is the only mandatory API method that
    // needs to be implemented for the plugin to be useful.
    api.load = function (name, parentRequire, onLoad, config) {
        // Do nothing outside of optimized build
        if (!config.isBuild) {
            onLoad();
            return;
        }

        var fs = require.nodeRequire('fs');
        var filePath = parentRequire.toUrl(name);
        content[name] = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, '');
        onLoad();
    };

    // Used by the optimizer to indicate when the plugin should write out
    // a representation of the the resource in the optimized file.
    api.write = function (pluginName, moduleName, write) {
        write.asModule(pluginName + '!' + moduleName, 'define(' + content[moduleName] + ')');
    };

    return api;
});