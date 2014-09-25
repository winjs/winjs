// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Custom RequireJS plugin to handle style dependencies from Javascript modules
// Has special WinJS-specific behavior that wasn't achievable with libraries like require-less
define(['require'], function (req) {
    "use strict";

    var api = {};
    var lessImports = [];
    var moduleNames = {};
    var configData;

    // Called to load a resource. This is the only mandatory API method that
    // needs to be implemented for the plugin to be useful.
    api.load = function (name, parentRequire, onLoad, config) {
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
    api.normalize = function (name) {
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
    api.write = function (pluginName, filePath, write) {
        // Output a stub module definition
        var name = moduleNames[filePath];
        write.asModule(pluginName + '!' + name, 'define(function(){})');
    };

    function writeCssFile(theme, inverseTheme, outputFilePath) {

        var fs = require.nodeRequire('fs-extra');
        var less = require.nodeRequire('less');
        var path = require.nodeRequire('path');

        // Build a custom LESS file that imports every resource
        // with theme defines at the top
        var defines = [
            '@theme: ' + theme + ';',
            '@inverseTheme: ' + inverseTheme + ';'
        ].join('\n');
        var colors = [
            '.Colors(@theme) {}',
            '.ColorsHover(@theme) {}',
            '.Colors(@theme);',
            'html.win-hoverable {',
            '   .ColorsHover(@theme);',
            '}',
            '.win-ui-@{inverseTheme} {',
            '   .Colors(@inverseTheme);',
            '}',
            'html.win-hoverable {',
            '   .win-ui-@{inverseTheme} {',
            '      .ColorsHover(@inverseTheme);',
            '   }',
            '}',
            // Stub define the HC mixins in case they don't exist
            '.HighContrast() {}',
            '.HighContrastHover() {}',
            '.HighContrastThemed(@theme) {}',
            '.HighContrastThemedHover(@theme) {}',
            '@media (-ms-high-contrast) {',
            // Call the HC mixins similar to the Color mixins
            '   .HighContrast();',
            '   html.win-hoverable {',
            '      .HighContrastHover();',
            '   }',
            '   .HighContrastThemed(@theme);',
            '   html.win-hoverable {',
            '      .HighContrastThemedHover(@theme);',
            '   }',
            '   .win-ui-@{inverseTheme} {',
            '      .HighContrastThemed(@inverseTheme);',
            '   }',
            '   html.win-hoverable {',
            '      .win-ui-@{inverseTheme} {',
            '         .HighContrastThemedHover(@inverseTheme);',
            '      }',
            '   }',
            '}'
        ].join('\n');
        var copyright = '/* Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information. */';
        var lessFile = copyright + '\n' + defines + '\n' + lessImports.join('\n') + '\n' + colors;

        // Build the less file
        var lessConfig = configData.less || {};
        lessConfig.async = false;
        lessConfig.syncImport = true;
        var parser = new less.Parser(lessConfig);
        parser.parse(lessFile, function (error, tree) {
            if (error) {
                console.error(error + ' in ' + error.filename + '\n' + 'line number: ' + error.line);
                return;
            }

            // Write css to file
            var cssText = tree.toCSS(lessConfig);
            fs.writeFileSync(path.join(outputFilePath, 'ui-' + theme + '.css'), cssText, 'utf8');
        });
    }

    // Called after the modules for the layer have been written to the layer.
    api.onLayerEnd = function (write, data) {
        if (!configData) {
            return;
        }

        var fs = require.nodeRequire('fs-extra');
        var path = require.nodeRequire('path');

        // Go up one directory, out of the js module output path
        // and then add the css/ path
        var outputFilePath = path.resolve(data.path, '../../css');
        fs.ensureDirSync(outputFilePath);

        // Build a less file for each theme
        writeCssFile('dark', 'light', outputFilePath);
        writeCssFile('light', 'dark', outputFilePath);

    };

    return api;
});