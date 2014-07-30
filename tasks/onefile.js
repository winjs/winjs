// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    module.exports = function (grunt) {

        grunt.registerTask("onefile", "build a single module into a full WinJS build", function (path) {
            var requirejs = grunt.config.get("requirejs");
            var merge = { requirejs: {} };
            var config = requirejs.defaults(path);
            merge.requirejs[path] = config;
            grunt.config.merge(merge);
            grunt.task.run(["requirejs:" + path]);
        });

    };
})();
