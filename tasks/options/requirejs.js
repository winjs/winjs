// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    var path = require('path');
    var madge = require('madge');
    var config = require("../../config.js");
    var grunt = config.grunt;

    var desktopBase = config.desktopOutput + "js/base.js";
    var phoneBase = config.phoneOutput + "js/base.js";
    var desktopUI = config.desktopOutput + "js/ui.js";
    var phoneUI = config.phoneOutput + "js/ui.js";
    var desktopSingleFile = config.desktopOutput + "js/WinJS.js";

    var bundles = {};

    function generatePublicModules() {
        var moduleConfig = [];
        var dependencies = madge('./src/js/', {format: 'amd'}).tree;
        
        Object.keys(dependencies).forEach(function(module) {
            // filter for only public modules
            if (startsWith(module, "WinJS/") && module.indexOf('_') === -1) {

                var privateModules = [];
                var processed = dependencies[module].slice(0);

                var excludes = dependencies[module].slice(0).filter(function(dep) {
                    if (startsWith(dep, module)) {
                        privateModules.push(dep);
                        return false;
                    }
                    return true;
                });

                var processQueue = processed.slice(0);

                while (processQueue.length) {
                    var next = processQueue.pop();
                    dependencies[next].forEach(function(dep) {
                        if (processed.indexOf(dep) === -1) {
                            processQueue.push(dep);
                        }
                        if (startsWith(dep, module)) {
                            if (privateModules.indexOf(dep) === -1) {
                                privateModules.push(dep);
                            }
                        } else if (excludes.indexOf(dep) === -1) {
                            excludes.push(dep);
                        }
                    });
                }

                if(privateModules.length) {
                    bundles[module] = privateModules;
                }

                var includes = [];

                moduleConfig.push({
                    name: module,
                    exclude: ['require-style'],
                    excludeShallow: excludes,
                    include: includes
                });

            }
        });

        return moduleConfig;
    }

    function moduleDone(done, output) {
        var fs = require("fs-extra");

        // require-style seems to build in WinJS rather then in the root
        fs.copySync(path.join(config.modulesOutput, "WinJS/css"), path.join(config.modulesOutput, "css"));
        // rename the main file
        fs.copySync(path.join(config.modulesOutput, "WinJS.js"), path.join(config.modulesOutput, "WinJS-custom.js"));
        // replace require-style with a stub
        fs.writeFileSync(path.join(config.modulesOutput, "require-style.js"), config.copyright + "define({ load: function (name, req, onload, config) { onload(); }});");

        // require.js copies some undesirable source files over
        var toRemove = [
            "less",
            "build/Copyright.js",
            "build/endBase.js",
            "build/endUI.js",
            "build/endUI-phone.js",
            "build/endWinJS.js",
            "build/startBase.js",
            "build/startUI.js",
            "WinJS.js",
            "WinJS/css",
            "WinJS/Core",
            "WinJS/Controls/AppBar"
        ];
        toRemove.forEach(function(item) {
            fs.removeSync(path.join(config.modulesOutput, item));
        });

        
        var pkgRoot = "node_modules/winjs-modules/";
        var requireConfig = {
            baseUrl: ".",
            name: "amd",
            optimize: "none",
            useStrict: true,
            include: "WinJS-custom",
            out: "bin/WinJS.js",
            wrap: {
                startFile: pkgRoot + "build/startWinJS.js",
                endFile: pkgRoot + "build/endWinJS-custom.js"
            },
            paths: {
                "amd": pkgRoot + "amd",
                "require-style": pkgRoot + "require-style",
                "WinJS": pkgRoot + "WinJS",
                "less-phone" : "empty:",
                "less-desktop": "empty:"
            },
            bundles: bundles
        };
        var output = "(" + JSON.stringify(requireConfig, null, 4) + ")";
        fs.writeFileSync(path.join(config.modulesOutput, "example.build.js"), output);

        done();
    }

    var desktopBaseFiles = [];
    var phoneBaseFiles = [];

    var rootPath = path.resolve();
    var realFileNames = [];

    grunt.file.recurse('src', function(abspath) {
        realFileNames.push(path.join(rootPath, abspath));
    });

    grunt.file.recurse('tasks/utilities', function(abspath) {
        realFileNames.push(path.join(rootPath, abspath));
    });

    function checkDuplicates(bundle1, bundle2, bundle2Name) {
        bundle1.forEach(function(file) {
            if(bundle2.indexOf(file) !== -1) {
                grunt.fail.warn("File duplicated in build output:\n " + file + ". Duplicate location:\n " + bundle2Name);
            }
        });
    }

    function startsWith(str, target) {
        return str.indexOf(target) === 0;
    }

    function endsWith(str, target) {
        return str.indexOf(target, str.length - target.length) !== -1;
    }

    // ensure that the files discovered by requireJS have appropriate
    // casing so that non-Windows builds will work.
    function done(done, output) {

        var lines = output.split('\n');
        var bundle = lines[1];
        lines.splice(0, 3);
        lines.pop();

        // Remove empty: pattern resources added by Less build.
        lines = lines.filter(function(line) {
            return line.indexOf("empty:") === -1;
        });

        if(endsWith(bundle, desktopBase)) {
            desktopBaseFiles = lines;
        } else if(endsWith(bundle, phoneBase)) {
            phoneBaseFiles = lines;
        } else if(endsWith(bundle, desktopUI)) {
            checkDuplicates(desktopBaseFiles, lines, bundle);
        } else if(endsWith(bundle, phoneUI)) {
            checkDuplicates(phoneBaseFiles, lines, bundle);
        }

        lines = lines.map(function(line) {
            return path.normalize(line.replace("require-style!", ""));
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
                out: desktopBase,
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
                out: phoneBase,
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
                paths: {
                    "less": "../less",
                    "less/phone": "empty:",
                    "require-style": "../../tasks/utilities/require-style"
                },
                platform: "desktop",
                optimize: 'none', // uglify2
                useStrict: true,
                name: 'ui',
                exclude: ['base'],
                stubModules: ['require-style'],
                out: desktopUI,
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
                paths: {
                    "less": "../less",
                    "less/desktop": "empty:",
                    "require-style": "../../tasks/utilities/require-style"
                },
                platform: "phone",
                optimize: 'none', // uglify2
                useStrict: true,
                name: 'ui-phone',
                exclude: ['base'],
                stubModules: ['require-style'],
                out: phoneUI,
                wrap: {
                    startFile: 'src/js/build/startUI.js',
                    endFile: 'src/js/build/endUI-phone.js'
                },
                done: done
            }
        },
        singleFile: {
            options: {
                baseUrl: './src/js/',
                paths: {
                    "less": "../less",
                    "less/phone": "empty:",
                    "require-style": "../../tasks/utilities/require-style"
                },
                platform: "desktop",
                optimize: 'none', // uglify2
                useStrict: true,
                name: 'amd',
                include: ['WinJS'],
                stubModules: ['require-style'],
                out: desktopSingleFile,
                wrap: {
                    startFile: 'src/js/build/startWinJS.js',
                    endFile: 'src/js/build/endWinJS.js'
                },
                done: done
            }
        },
        publicModules: {
            options: {
                baseUrl: './src/js/',
                paths: {
                    "less": "../less",
                    "less/phone": "empty:",
                    "require-style": "../../tasks/utilities/require-style"
                },
                platform: "desktop",
                optimize: 'none', // uglify2
                useStrict: true,
                skipDirOptimize: true,
                removeCombined: true,
                fileExclusionRegExp: /^(en-US|library|base.js|ui.js|ui-phone.js|\w+\.(md|htm|txt))$/i,
                dir: config.modulesOutput,
                modules: publicModules,
                done: moduleDone
            }
        }
    };

    var publicModules = null;

    Object.defineProperty(module.exports.publicModules.options, "modules", {
        get: function() {
            if(!publicModules) {
                publicModules = generatePublicModules();
            }
            return publicModules;
        },
        enumerable: true,
        configurable: true
    });
})();