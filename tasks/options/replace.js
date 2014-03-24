var config = require("../../config.js");

module.exports = {
    base: {
        options: {
            patterns: [
                {
                    match: /\$\(TARGET_DESTINATION\)/g,
                    replacement: config.targetName
                },
                {
                    match: /\$\(TargetFramework\)/g,
                    replacement: config.targetFramework
                },
                {
                    match: /\$\(build.version\)/g,
                    replacement: "<%= pkg.version %>"
                },
                {
                    match: /\$\(build.date\)/g,
                    replacement: config.buildDateString
                },
                {
                    match: /\$\(build.branch\)/g,
                    replacement: "<%= pkg.name %>"
                }
            ]
        },
        files: [
          {expand: true, flatten: true, src: [config.desktopOutput + "js/*.js"], dest: config.desktopOutput + "js/"},
          {expand: true, flatten: true, src: [config.desktopOutput + "js/" + config.localeFolder + "/*.js"], dest: config.desktopOutput + "js/" + config.localeFolder + "/"},
          {expand: true, flatten: true, src: [config.phoneOutput + "js/*.js"], dest: config.phoneOutput + "js/"},
          {expand: true, flatten: true, src: [config.phoneOutput + "js/" + config.localeFolder + "/*.js"], dest: config.phoneOutput + "js/" + config.localeFolder + "/"},
          {expand: true, flatten: true, src: [config.desktopOutput + "css/*.css"], dest: config.desktopOutput + "css/"},
          {expand: true, flatten: true, src: [config.phoneOutput + "css/*.css"], dest: config.phoneOutput + "css/"},
          { expand: true, flatten: false, src: [config.testsOutput + "**/*.html"], dest: "" },
        ]
    },
    tests: {
        options: {
            patterns: [
                {
                    match: "TESTPAGE_HEAD",
                    replacement: "<%= grunt.file.read('tests/TestLib/liveToQ/testPageHead.html') %>"
                },
                {
                    match: "TESTPAGE_BODY",
                    replacement: "<%= grunt.file.read('tests/TestLib/liveToQ/testPageBody.html') %>"
                }
            ],
        },
        files: [
            { expand: true, flatten: false, src: [config.testsOutput + "**/*.js"], dest: "" },
            { expand: true, flatten: false, src: [config.testsOutput + "**/*.html"], dest: "" },
        ]
    },
}

if (config.inRazzle) {
    module.exports.base.files.push({expand: true, cwd: config.testsOutput, src: ["**/*.js"], dest: config.testsOutput});
    module.exports.tests.options.patterns.push({
        match: /\$\(TESTDATA\)\//g,
        replacement: ""
    });
} else {
    module.exports.tests.options.patterns.push({
        match: /\$\(TESTDATA\)\//g,
        replacement: "../TestData/"
    });
}