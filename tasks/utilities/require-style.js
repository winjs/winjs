// Custom RequireJS plugin to handle style dependencies from Javascript modules
// Has special WinJS-specific behavior that wasn't achievable with libraries like require-less
// Requires the 'platform' key to exist in the RequireJS config, with a value of 'desktop' or 'phone'
define(['require'], function(req) {
    "use strict";

    var api = {};
    var lessImports = [];
    var moduleNames = {};
    var configData;

    // Called to load a resource. This is the only mandatory API method that
    // needs to be implemented for the plugin to be useful.
    api.load = function(name, parentRequire, onLoad, config) {
        // Do nothing outside of optimized build
        if (!config.isBuild) {
            onLoad();
            return;
        }

        // Get absolute path to file and skip it if
        // 'empty:'
        var filePath = parentRequire.toUrl(name);
        if (filePath.indexOf('empty:') === 0) {
            onLoad();
            return;
        }

        // Store the file as an import
        configData = config;
        lessImports.push('@import "' + filePath + '";');
        onLoad();
    };

    // Used to get the full path to a resource by name
    api.normalize = function(name, normalize) {
        var relativePath = name;
        if (!relativePath.match(/\.less$/)) {
            relativePath += ".less";
        }
        var filePath = req.toUrl(relativePath);
        if (!moduleNames[filePath]) {
            moduleNames[filePath] = name;
        }
        return filePath;
    };

    // Used by the optimizer to indicate when the plugin should write out
    // a representation of the the resource in the optimized file.
    api.write = function(pluginName, filePath, write) {
        // Output a stub module definition
        var name = moduleNames[filePath];
        write.asModule(pluginName + '!' + name, 'define(function(){})');
    };

    // Called after the modules for the layer have been written to the layer.
    api.onLayerEnd = function(write, data) {
        if (!configData) {
            return;
        }

        var less = require.nodeRequire('less');
        var fs = require.nodeRequire('fs');
        var mkpath = require.nodeRequire('mkpath');

        // Go up one directory, out of the js module output path
        // and then add the css/ path
        var outputFilePath = data.path.substr(0, data.path.lastIndexOf('/'));
        outputFilePath = outputFilePath.substr(0, outputFilePath.lastIndexOf('/'));
        outputFilePath += '/css/';
        mkpath.sync(outputFilePath);

        // Build a less file for each theme
        var themes = ['dark', 'light'];
        for (var i = 0; i < themes.length; ++i) {
            // Build a custom LESS file that imports every resource
            // with platform and theme defines at the top
            var defines = [
                '@platform: ' + configData.platform + ';',
                '@theme: ' + themes[i] + ';',
                '@inverseTheme: ' + themes[(i + 1) % 2] + ';'
            ].join('\n');
            var colors = [
                '.Colors(@theme);',
                '.win-ui-@{inverseTheme} {',
                '   .Colors(@inverseTheme);',
                '}'
            ].join('\n');
            var copyright = '/* Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information. */';
            var lessFile = copyright + '\n' + defines + '\n' + lessImports.join('\n') + '\n' + colors;

            // Build the less file
            var lessConfig = configData.less || {};
            lessConfig.async = false;
            lessConfig.syncImport = true;
            var parser = new less.Parser(lessConfig);
            parser.parse(lessFile, function(error, tree) {
                if (error) {
                    console.error(error + ' in ' + error.filename + '\n' + 'line number: ' + error.line);
                    return;
                }

                // Write css to file
                var cssText = tree.toCSS(lessConfig);
                fs.writeFileSync(outputFilePath + 'ui-' + themes[i] + '.css', cssText, 'utf8');
            });
        }
    };

    return api;
});