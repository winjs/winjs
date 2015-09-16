// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../../config.js");
    var execSync = require('child_process').execSync;
    
    var currentGitCommitHash = execSync('git rev-parse HEAD').toString().trim();

    module.exports = {
        
        // Publish GitHub releases and bower packages (bower consumes GitHub tags/releases)
        
        // Requires this environment variable to be set: GITHUB_ACCESS_TOKEN
        // GITHUB_ACCESS_TOKEN can be generated from https://help.github.com/articles/creating-an-access-token-for-command-line-use/
        
        publishWinJsBower: {
            options: {
                repository: 'winjs/winjs-bower',
                auth: {
                    user: process.env.GITHUB_ACCESS_TOKEN
                },
                release: {
                    tag_name: 'v<%= pkg.version %>', // Must follow semver syntax in order for bower to pick it up
                    name: '<%= pkg.version %>',
                    body:
                        'Release of winjs <%= pkg.version %>.\n' +
                        '\n' +
                        'See the [changelog](https://github.com/winjs/winjs/wiki/Changelog) for details about what changed.'
                }
            }
        },
        
        publishLocalizationBower: {
            options: {
                repository: 'winjs/winjs-localization-bower',
                auth: {
                    user: process.env.GITHUB_ACCESS_TOKEN
                },
                release: {
                    tag_name: 'v<%= pkg.version %>', // Must follow semver syntax in order for bower to pick it up
                    name: '<%= pkg.version %>',
                    body:
                        'Release of winjs <%= pkg.version %>.\n' +
                        '\n' +
                        'See the [changelog](https://github.com/winjs/winjs/wiki/Changelog) for details about what changed.'
                }
            }
        },
        
        publish: {
            options: {
                repository: 'winjs/winjs',
                auth: {
                    user: process.env.GITHUB_ACCESS_TOKEN
                },
                release: {
                    tag_name: 'v<%= pkg.version %>',
                    target_commitish: currentGitCommitHash,
                    name: '<%= pkg.version %>',
                    body:
                        'Release of winjs <%= pkg.version %>.\n' +
                        '\n' +
                        'See the [changelog](https://github.com/winjs/winjs/wiki/Changelog) for details about what changed.'
                }
            },
            files: {
                src: [
                    config.winjsPublishRoot + 'winjs.zip',
                    config.localizationPublishRoot + 'winjs-localization.zip'
                ]
            }
        }
    };
})();