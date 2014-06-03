// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    var path = require('path');
    var config = require("../../config.js");
    var grunt = config.grunt;

    var rootPath = path.resolve();
    var realFileNames = [];

    grunt.file.recurse('src', function(abspath) {
        realFileNames.push(path.join(rootPath, abspath));
    });

    // ensure that the files discovered by requireJS have appropriate
    // casing so that non-Windows builds will work.
    function done(done, output) {

        var lines = output.split('\n');
        lines.splice(0, 3);
        lines.pop();

        lines = lines.map(function(line) {
            return path.normalize(line);
        });

        lines.forEach(function(line) {
            if(realFileNames.indexOf(line) === -1) {
                grunt.fail.warn("Source file in build is not in filesystem:" + line + ". Check casing of filename.");
            }
        });

        done();
    }

    module.exports = {
        base: {
            options: { 
                baseUrl: './src/js/',
                optimize: 'none', // uglify2
                useStrict: true,
                name: 'amd',
                include: ['base'],
                out: config.desktopOutput + "js/base.js",
                wrap: {
                    startFile: 'src/js/build/startBase.js',
                    endFile: 'src/js/build/endBase.js'
                },
                done: done
            }
        },
        basePhone: {
            options: { 
                baseUrl: './src/js/',
                optimize: 'none', // uglify2
                useStrict: true,
                name: 'amd',
                include: ['base', 'WinJS/Core/_BaseUtilsPhone'],
                out: config.phoneOutput + "js/base.js",
                wrap: {
                    startFile: 'src/js/build/startBase.js',
                    endFile: 'src/js/build/endBase.js'
                },
                done: done
            }
        },
        ui: {
            options: { 
                baseUrl: './src/js/',
                optimize: 'none', // uglify2
                useStrict: true,
                name: 'ui',
                exclude: [],
                out: config.desktopOutput + "js/ui.js",
                wrap: {
                    startFile: 'src/js/build/startUI.js',
                    endFile: 'src/js/build/endUI.js'
                },
                done: done
            }
        },
        uiPhone: {
            options: { 
                baseUrl: './src/js/',
                optimize: 'none', // uglify2
                useStrict: true,
                name: 'ui-phone',
                exclude: [],
                out: config.phoneOutput + "js/ui.js",
                wrap: {
                    startFile: 'src/js/build/startUI.js',
                    endFile: 'src/js/build/endUI-phone.js'
                },
                done: done
            }
        }
    };
})();