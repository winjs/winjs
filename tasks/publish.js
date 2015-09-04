// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = require("../config.js");
    var fs = require("fs");

    module.exports = function (grunt) {
        
        var pkg = grunt.file.readJSON("package.json");
        var localizationPkg = grunt.file.readJSON("src/strings/package.json");
        
        // Sets up all of the state necessary to do a publish but doesn't actually publish
        // to any of the package managers.
        grunt.registerTask('_preparePublish', [
            // winjs
            'gitreset:publishWinJsBower', 'gitclean:publishWinJsBower', 'gitpull:publishWinJsBower', // Make the local bower repo match the one on GitHub
            'clean:publishWinJs', 'copy:publishWinJs', 'compress:publishWinJs', 'gitadd:publishWinJsBower', 'nugetpack:publishWinJs',
            'check-bom:publishWinJs', // BOM verification should be the last task in the group
            
            // winjs-localization
            'gitreset:publishLocalizationBower', 'gitclean:publishLocalizationBower', 'gitpull:publishLocalizationBower', // Make the local bower repo match the one on GitHub
            'clean:publishLocalization', 'copy:publishLocalization', 'compress:publishLocalization', 'gitadd:publishLocalizationBower', 'nugetpack:publishLocalization',
            'check-bom:publishLocalization' // BOM verification should be the last task in the group
        ]);
        
        // Populates the 'dist' folder and then uses it to:
        //  - Create a GitHub release
        //  - Publish to npm
        //  - Publish to bower
        //  - Publish to NuGet
        //
        // The bower repos should be checked out from GitHub into the 'repos' folder. Specifically:
        //   - winjs/winjs-bower to repos/winjs-bower
        //   - winjs/winjs-localization-bower to repos/winjs-localization-bower
        // Some content from the 'dist' folder gets copied into the 'repos' folder for
        // publication to bower.
        //
        // When debugging publish, it's helpful to run just the '_preparePublish'
        // task which puts all of the publication data into the 'dist' folder but
        // doesn't actually send the data to the package managers.
        grunt.registerTask('publish', function (mode) {
            if (pkg.version !== localizationPkg.version) {
                grunt.fail.fatal('Versions in package.json and src/strings/package.json are out of sync');
            }
            
            if (!fs.existsSync(config.winjsBowerRepo)) {
                grunt.fail.fatal('winjs/winjs-bower must be checked out from GitHub into "' + config.winjsBowerRepo + '"');
            }
            
            if (!fs.existsSync(config.localizationBowerRepo)) {
                grunt.fail.fatal('winjs/winjs-localization-bower must be checked out from GitHub into "' + config.localizationBowerRepo + '"');
            }
            
            if (!process.env.GITHUB_ACCESS_TOKEN) {
                grunt.fail.fatal('The GITHUB_ACCESS_TOKEN environment variable must be set in order to create GitHub releases');
            }
            
            if (!mode) {
                grunt.log.writeln('');
                grunt.log.writeln('Will publish version ' + pkg.version + ' of winjs and winjs-localization to npm, NuGet, etc. Double check that:');
                grunt.log.writeln('  * You have run "grunt release"');
                grunt.log.writeln('  * You are on the branch you\'d like to publish');
                grunt.log.writeln('  * The branch has been pushed to GitHub');
                grunt.log.writeln('  * You don\'t have any local edits');
                grunt.log.writeln('');
                grunt.log.writeln('If everything is in order, run "grunt publish:force" to proceed');
            } else if (mode === 'force') {
                grunt.task.run([
                    '_preparePublish',
                    
                    // winjs
                    'nugetpush:publishWinJs', // NuGet
                    'npm-release:publishWinJs', // npm
                    'gitcommit:publishWinJsBower', 'gitpush:publishWinJsBower', 'github-release:publishWinJsBower', // bower
                    
                    // winjs-localization
                    'nugetpush:publishLocalization', // NuGet
                    'npm-release:publishLocalization', // npm
                    'gitcommit:publishLocalizationBower', 'gitpush:publishLocalizationBower', 'github-release:publishLocalizationBower', // bower
                    
                    // both
                    'github-release:publish', // GitHub release
                    '_finishedPublish',
                ]);
            }
        });
        
        grunt.registerTask('_finishedPublish', function (mode) {
            grunt.log.writeln('');
            grunt.log.writeln('Publish complete. Hand tweak the GitHub release description if necessary (https://github.com/winjs/winjs/releases)');
            grunt.log.writeln('');
        });

    };
    
})();
