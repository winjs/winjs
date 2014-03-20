module.exports = function (grunt) {
    var version = "2.1";
    var buildDate = new Date();
    var month = buildDate.getMonth() + 1;
    var buildDateString = buildDate.getFullYear() + "." + month + "." + buildDate.getDate();
    var localeFolder = "en-US";
    var outputFolder = "bin/";

    var testsOutput = "";

    if (process.env._NTTREE) {
        outputFolder = process.env._NTTREE + "/Corsica/";
        testsOutput = outputFolder + "other." + version + ".debug/tests/unittests/";
    } else {
        testsOutput = outputFolder + "tests/";
    }

    var targetName = "WinJS." + version;
    var targetFramework = "Microsoft.WinJS.2.1";
    var desktopOutput = outputFolder + "Microsoft." + targetName + "/";
    var phoneOutput = outputFolder + "Microsoft.Phone." + targetName + "/";

    var baseJSFiles = [
        "src/js/build/Copyright.js",
        "src/js/build/writeProfilerMark.js",
        "src/js/build/startbase.js",
        "src/js/base/references.js",
        "src/js/base/base.js",
        "src/js/base/baseutils.js",
        "src/js/base/log.js",
        "src/js/base/events.js",
        "src/js/base/resources.js",
        "src/js/base/promise.js",
        "src/js/base/scheduler.js",
        "src/js/base/errors.js",
        "src/js/base/xhr.js",
        "src/js/base/safehtml.js",
        "src/js/base/getwinjsstring.js",
        "src/js/base/dispose.js",

        "src/js/ui/control.js",
        "src/js/ui/declarativecontrols.js",
        "src/js/ui/elementlistutilities.js",
        "src/js/ui/elementutilities.js",
        "src/js/ui/fragmentcontrol.js",
        "src/js/ui/fragmentloader.js",
        "src/js/ui/optionslexer.js",
        "src/js/ui/optionsparser.js",
        "src/js/ui/tabmanager.js",
        "src/js/ui/transitionanimation.js",
        "src/js/ui/utilities.js",

        "src/js/wwa-app/application.js",
        "src/js/wwa-app/navigation2.js",
        "src/js/wwa-app/state.js",

        "src/js/binding/bindingparser.js",
        "src/js/binding/data.js",
        "src/js/binding/datatemplate.js",
        "src/js/binding/declarative.js",
        "src/js/binding/domweakreftable.js",
        "src/js/binding/list.js",
        "src/js/binding/datatemplatecompiler.js",

        "src/js/res/res.js",

        "src/js/build/endbase.js"
    ];

    var baseJSFilesPhone = [
        "src/js/build/Copyright.js",
        "src/js/build/writeProfilerMark.js",
        "src/js/build/startBase.js",
        "src/js/base/references.js",
        "src/js/base/base.js",
        "src/js/base/baseUtils.js",
        "src/js/base/baseUtils-phone.js",
        "src/js/base/log.js",
        "src/js/base/events.js",
        "src/js/base/resources.js",
        "src/js/base/promise.js",
        "src/js/base/scheduler.js",
        "src/js/base/errors.js",
        "src/js/base/xhr.js",
        "src/js/base/safeHTML.js",
        "src/js/base/getwinjsstring.js",
        "src/js/base/dispose.js",

        "src/js/ui/control.js",
        "src/js/ui/declarativeControls.js",
        "src/js/ui/elementListUtilities.js",
        "src/js/ui/elementUtilities.js",
        "src/js/ui/fragmentControl.js",
        "src/js/ui/fragmentLoader.js",
        "src/js/ui/optionsLexer.js",
        "src/js/ui/optionsParser.js",
        "src/js/ui/tabManager.js",
        "src/js/ui/transitionAnimation.js",
        "src/js/ui/utilities.js",

        "src/js/wwa-app/application.js",
        "src/js/wwa-app/navigation2.js",
        "src/js/wwa-app/state.js",

        "src/js/binding/bindingParser.js",
        "src/js/binding/data.js",
        "src/js/binding/dataTemplate.js",
        "src/js/binding/declarative.js",
        "src/js/binding/DOMWeakRefTable.js",
        "src/js/binding/list.js",
        "src/js/binding/dataTemplateCompiler.js",

        "src/js/res/res.js",

        "src/js/build/endbase.js"
    ];

    var baseStringsFiles = [
        "src/js/build/Copyright.js",
        "src/js/library/stringsHeader.js",
        "src/js/library/stringsBlockHeader.js",
        "src/js/" + localeFolder + "/base.prefix.js",
        "src/js/" + localeFolder + "/base.resjson",
        "src/js/library/stringsBlockFooter.js",
        "src/js/library/stringsFooter.js"
    ];

    var uiJSFiles = [
        "src/js/build/Copyright.js",
        "src/js/build/startUI.js",
        "src/js/animations/animations.js",
        "src/js/uicollections/Assert.js",
        "src/js/uicollections/ItemsManager/BindingListDataSource.js",
        "src/js/uicollections/ItemsManager/ListDataSource.js",
        "src/js/uicollections/ItemsManager/GroupDataSource.js",
        "src/js/uicollections/ItemsManager/GroupedItemDataSource.js",
        "src/js/uicollections/ItemsManager/StorageDataSource.js",
        "src/js/uicollections/ItemsManager/ItemsManager.js",
        "src/js/uicollections/ItemsManager/ParallelWorkQueue.js",
        "src/js/uicollections/ItemsManager/VersionManager.js",
        "src/js/uicollections/Flipper/Flipper.js",
        "src/js/uicollections/Flipper/FlipperPageManager.js",
        "src/js/uicollections/ListView/BrowseMode.js",
        "src/js/uicollections/ListView/Constants.js",
        "src/js/uicollections/ListView/ErrorMessages.js",
        "src/js/uicollections/ListView/GroupFocusCache.js",
        "src/js/uicollections/ListView/GroupsContainer.js",
        "src/js/uicollections/ListView/ItemEventsHandler.js",
        "src/js/uicollections/ListView/ItemsContainer.js",
        "src/js/uicollections/ListView/Layouts2.js",
        "src/js/uicollections/ListView/ListViewImpl.js",
        "src/js/uicollections/Repeater/Repeater.js",
        "src/js/uicollections/ListView/SelectionManager.js",
        "src/js/uicollections/ListView/VirtualizeContentsView.js",
        "src/js/controls/DatePicker/datePicker.js",
        "src/js/controls/TimePicker/timePicker.js",
        "src/js/controls/Select/select.js",
        "src/js/controls/BackButton/backButton.js",
        "src/js/controls/Rating/rating.js",
        "src/js/controls/Toggle/Toggle.js",
        "src/js/controls/SemanticZoom/SemanticZoom.js",
        "src/js/controls/Hub/hub.js",
        "src/js/controls/Hub/hubSection.js",
        "src/js/controls/AppBar/Overlay.js",
        "src/js/controls/AppBar/AppBarIcon.js",
        "src/js/controls/AppBar/AppBarCommand.js",
        "src/js/controls/AppBar/AppBar.js",
        "src/js/controls/AppBar/Flyout.js",
        "src/js/controls/AppBar/Menu.js",
        "src/js/controls/AppBar/MenuCommand.js",
        "src/js/controls/SearchBox/searchBox.js",
        "src/js/controls/AppBar/SettingsFlyout.js",
        "src/js/controls/ItemContainer/itemContainer.js",
        "src/js/controls/NavBar/keyboardBehavior.js",
        "src/js/controls/NavBar/navBar.js",
        "src/js/controls/NavBar/navBarContainer.js",
        "src/js/controls/NavBar/navBarCommand.js",
        "src/js/controls/Tooltip/tooltip.js",
        "src/js/controls/ViewBox/ViewBox.js",
        "src/js/build/endUI.js"
    ];

    var uiJSFilesPhone = [
        "src/js/build/Copyright.js",
        "src/js/build/startUI.js",
        "src/js/uicollections/references.js",
        "src/js/animations/animations.js",
        "src/js/uicollections/Assert.js",
        "src/js/uicollections/ItemsManager/BindingListDataSource.js",
        "src/js/uicollections/ItemsManager/ListDataSource.js",
        "src/js/uicollections/ItemsManager/GroupDataSource.js",
        "src/js/uicollections/ItemsManager/GroupedItemDataSource.js",
        "src/js/uicollections/ItemsManager/StorageDataSource.js",
        "src/js/uicollections/ItemsManager/ItemsManager.js",
        "src/js/uicollections/ItemsManager/ParallelWorkQueue.js",
        "src/js/uicollections/ItemsManager/VersionManager.js",
        "src/js/uicollections/Flipper/Flipper.js",
        "src/js/uicollections/Flipper/FlipperPageManager.js",
        "src/js/uicollections/ListView/BrowseMode.js",
        "src/js/uicollections/ListView/Constants.js",
        "src/js/uicollections/ListView/ErrorMessages.js",
        "src/js/uicollections/ListView/GroupFocusCache.js",
        "src/js/uicollections/ListView/GroupsContainer.js",
        "src/js/uicollections/ListView/ItemEventsHandler.js",
        "src/js/uicollections/ListView/ItemsContainer.js",
        "src/js/uicollections/ListView/Layouts2.js",
        "src/js/uicollections/ListView/ListViewImpl.js",
        "src/js/uicollections/Repeater/Repeater.js",
        "src/js/uicollections/ListView/SelectionManager.js",
        "src/js/uicollections/ListView/VirtualizeContentsView.js",
        "src/js/controls/AppBar/AppBarIcon.js",
        "src/js/controls/AppBar/AppBarCommand-phone.js",
        "src/js/controls/AppBar/AppBar-phone.js",
        "src/js/controls/Pivot/Pivot.js",
        "src/js/controls/Pivot/PivotItem.js",
        "src/js/controls/Toggle/Toggle.js",
        "src/js/controls/ItemContainer/itemContainer.js",
        "src/js/controls/SemanticZoom/SemanticZoom.js",
        "src/js/controls/ViewBox/ViewBox.js",
        "src/js/build/endUI.js"
    ];

    var uiStringsFiles = [
        "src/js/build/Copyright.js",
        "src/js/library/stringsHeader.js",
        "src/js/library/stringsBlockHeader.js",
        "src/js/" + localeFolder + "/ui.prefix.js",
        "src/js/" + localeFolder + "/ui.resjson",
        "src/js/library/stringsBlockFooter.js",
        "src/js/library/stringsFooter.js"
    ];

    var gruntConfig = {};

    // Package data
    gruntConfig.pkg = grunt.file.readJSON("package.json");

    // Clean task
    gruntConfig.clean = {
        options: {
            force: true
        },
        all: [
            desktopOutput,
            phoneOutput,
        ],
        base: [
            desktopOutput + "js/base.js",
            desktopOutput + "js/" + localeFolder + "/base.strings.js",
            phoneOutput + "js/base.js",
            phoneOutput + "js/" + localeFolder + "/base.strings.js",
        ],
        ui: [
            desktopOutput + "js/ui.js",
            desktopOutput + "js/" + localeFolder + "/ui.strings.js",
            phoneOutput + "js/ui.js",
            phoneOutput + "js/" + localeFolder + "/ui.strings.js",
        ],
    };

    // Less build task
    gruntConfig.less = {
        desktopDark: {
            src: ["src/less/desktop-dark.less"],
            dest: desktopOutput + "css/ui-dark.css"
        },
        desktopLight: {
            src: ["src/less/desktop-light.less"],
            dest: desktopOutput + "css/ui-light.css"
        },
        phoneDark: {
            src: ["src/less/phone-dark.less"],
            dest: phoneOutput + "css/ui-dark.css"
        },
        phoneLight: {
            src: ["src/less/phone-light.less"],
            dest: phoneOutput + "css/ui-light.css"
        },
    };

    // Javascript concat task
    gruntConfig.concat = {
        baseDesktop: {
            src: baseJSFiles,
            dest: desktopOutput + "js/base.js"
        },
        basePhone: {
            src: baseJSFilesPhone,
            dest: phoneOutput + "js/base.js"
        },
        baseStringsDesktop: {
            src: baseStringsFiles,
            dest: desktopOutput + "js/" + localeFolder + "/base.strings.js"
        },
        baseStringsPhone: {
            src: baseStringsFiles,
            dest: phoneOutput + "js/" + localeFolder + "/base.strings.js"
        },
        uiDesktop: {
            src: uiJSFiles,
            dest: desktopOutput + "js/ui.js"
        },
        uiPhone: {
            src: uiJSFilesPhone,
            dest: phoneOutput + "js/ui.js"
        },
        uiStringsDesktop: {
            src: uiStringsFiles,
            dest: desktopOutput + "js/" + localeFolder + "/ui.strings.js"
        },
        uiStringsPhone: {
            src: uiStringsFiles,
            dest: phoneOutput + "js/" + localeFolder + "/ui.strings.js"
        }
    };

    // Post process task
    gruntConfig.replace = {
        base: {
            options: {
                patterns: [
                    {
                        match: /\$\(TARGET_DESTINATION\)/g,
                        replacement: targetName
                    },
                    {
                        match: /\$\(TargetFramework\)/g,
                        replacement: targetFramework
                    },
                    {
                        match: /\$\(build.version\)/g,
                        replacement: "<%= pkg.version %>"
                    },
                    {
                        match: /\$\(build.date\)/g,
                        replacement: buildDateString
                    },
                    {
                        match: /\$\(build.branch\)/g,
                        replacement: "<%= pkg.name %>"
                    }
                ]
            },
            files: [
              { expand: true, flatten: true, src: [desktopOutput + "js/*.js"], dest: desktopOutput + "js/" },
              { expand: true, flatten: true, src: [desktopOutput + "js/" + localeFolder + "/*.js"], dest: desktopOutput + "js/" + localeFolder + "/" },
              { expand: true, flatten: true, src: [phoneOutput + "js/*.js"], dest: phoneOutput + "js/" },
              { expand: true, flatten: true, src: [phoneOutput + "js/" + localeFolder + "/*.js"], dest: phoneOutput + "js/" + localeFolder + "/" }
            ]
        }
    };

    if (process.env._NTTREE) {
        // Test copy task, only if building internally
        gruntConfig.copy = {
            tests: {
                files: [
                    { expand: true, cwd: "tests/", src: ["**"], dest: testsOutput }
                ]
            }
        };

        gruntConfig.shell = {
            runTests: {
                command: function (test, host) {
                    return "%_NTTREE%/Corsica/other.2.1.debug/Tools/WebUnit/WebUnit.exe /s:%_NTTREE%/Corsica/other." + version + ".debug/Tests/UnitTests/" + test + (host ? " /host:" + host : "") + " @res.txt"
                },
                options: {
                    stdout: true,
                    stderr: true
                }
            }
        };

        // Also add tests to the replace task
        var testReplace = { expand: true, cwd: testsOutput, src: ["**/*.js"], dest: testsOutput };
        gruntConfig.replace.base.files.push(testReplace);
        grunt.log.write("replace has " + gruntConfig.replace.base.files.length + " items");
    }

    // Project config
    grunt.initConfig(gruntConfig);

    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-less");
    grunt.loadNpmTasks("grunt-replace");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-shell");

    var defaultTask = ["clean", "less", "concat", "copy", "replace"];
    if (process.env._NTTREE) {
        grunt.registerTask("test", function (test, host) {
            var testArgs = test || "*.js";

            if (host) {
                host = host.toLowerCase();
                if (host === "vs") {
                    testArgs += " /vs";
                    host = "";
                }
            } else {
                host = "wwa";
            }

            grunt.task.run(["default", "shell:runTests:" + testArgs + ":" + host]);
        });
    }

    grunt.registerTask("default", defaultTask);
    grunt.registerTask("css", ["less"]);
    grunt.registerTask("base", ["clean:base", "concat:baseDesktop", "concat:basePhone", "concat:baseStringsDesktop", "concat:baseStringsPhone", "replace"]);
    grunt.registerTask("ui", ["clean:ui", "concat:uiDesktop", "concat:uiPhone", "concat:uiStringsDesktop", "concat:uiStringsPhone", "replace", "less"]);
}