// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var exec = require('child_process').exec;

    module.exports = function (grunt) {    

        grunt.registerTask('npm-release', 'Publishes a package to npm', function (mode) {
            var done = this.async();
            var src = grunt.option('src');
            
            var cmd = 'npm publish ' + src;
            
            exec(cmd, function (err, stdout) {
                if (err) {
                    grunt.fatal('npm publish failed using command: ' + cmd);
                }
                done();
            });
        });
    };

})();
