/*
Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved.

Licensed under the Apache License, Version 2.0.

See License.txt in the project root for license information.
*/

module.exports = function(grunt) {
    grunt.registerTask("test", function () {
        var args = [];
        for (var i = 0; i < arguments.length; ++i)
            args.push(arguments[i]);

        grunt.task.run(["default", "shell:runTests:" + args.join(":")]);
    });
};