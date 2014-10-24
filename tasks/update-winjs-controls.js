// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    'use strict';

    module.exports = function (grunt) {
        grunt.registerTask('update-winjs-controls', 'Update winjs-controls with current master build', function (path) {
            // Don't do anything if pull request or not on master
            if (process.env.TRAVIS_PULL_REQUEST !== 'false' || process.env.TRAVIS_BRANCH !== 'master') {
                return;
            }

            var done = this.async();

            var exec = require('child_process').exec;
            var fs = require('fs-extra');
            var config = require('../config.js');

            // Git information
            var gitInfo = {
                user: 'winjs-controls-bot',
                email: 'winjscontrolsbot@mail.com',
                token: process.env.CONTROLS_GIT_TOKEN
            };

            var commands = [
                'git config user.name ' + gitInfo.user,
                'git config user.email ' + gitInfo.email,
                'git add .',
                'git commit -m "Automated update to latest master"',
                'git push https://' + gitInfo.token + '@github.com/phosphoer/winjs-controls.git gh-pages'
            ];

            function doAllCommands(index, doneCallback) {
                if (index >= commands.length) {
                    doneCallback();
                    return;
                }

                exec(commands[index], function(error, stdout, stderr) {
                    doAllCommands(index + 1, doneCallback);
                });
            }

            // Pull down winjs-controls, add the new built files, and commit/push them
            exec('git clone https://github.com/phosphoer/winjs-controls.git', function () {
                process.chdir('winjs-controls');
                fs.removeSync('winjs/unreleased');
                fs.copySync('../' + config.desktopOutput, 'winjs/unreleased');

                doAllCommands(0, function() {
                    process.chdir('../');
                    done();
                });
            });
        });
    };
})();
