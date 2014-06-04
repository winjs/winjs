// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");

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
                }
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
                }
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
                }
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
                }
            }
        }
    };
})();