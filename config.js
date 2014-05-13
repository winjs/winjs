// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    "use strict";

    var config = {};
    module.exports = config;

    config.version = "2.1";
    config.buildDate = new Date();
    config.month = config.buildDate.getMonth() + 1;
    config.buildDateString = config.buildDate.getFullYear() + "." + config.month + "." + config.buildDate.getDate();
    config.localeFolder = "en-US";
    config.outputFolder = "bin/";

    config.testsOutput = "";

    if (process.env._NTTREE) {
        config.inRazzle = true;
        config.outputFolder = process.env._NTTREE + "/Corsica/";
        config.testsOutput = config.outputFolder + "other." + config.version + ".debug/tests/unittests/";
    } else {
        config.testsOutput = config.outputFolder + "tests/";
        config.inRazzle = false;
    }

    config.targetName = "WinJS." + config.version;
    config.desktopFramework = "Microsoft." + config.targetName;
    config.phoneFramework = "Microsoft.Phone." + config.targetName;
    config.desktopOutput = config.outputFolder + config.desktopFramework + "/";
    config.phoneOutput = config.outputFolder + config.phoneFramework + "/";

    config.baseJSFiles = [
        "src/js/build/Copyright.js",
        "src/js/WinJS/Core/_WriteProfilerMark.js",
        "src/js/build/startBase.js",
        "src/js/base/references.js",
        "src/js/WinJS/Core/_Base.js",
        "src/js/WinJS/Core/_BaseUtils.js",
        "src/js/WinJS/Core/_Log.js",
        "src/js/WinJS/Core/_Events.js",
        "src/js/WinJS/Core/_Resources.js",
        "src/js/WinJS/Promise.js",
        "src/js/WinJS/Scheduler.js",
        "src/js/WinJS/Core/_Errors.js",
        "src/js/WinJS/Utilities/_Xhr.js",
        "src/js/WinJS/Utilities/_SafeHtml.js",
        "src/js/WinJS/Core/_GetWinJSString.js",
        "src/js/WinJS/Utilities/_Dispose.js",

        "src/js/WinJS/Utilities/_Control.js",
        "src/js/WinJS/ControlProcessor.js",
        "src/js/WinJS/Utilities/_ElementListUtilities.js",
        "src/js/WinJS/Utilities/_ElementUtilities.js",
        "src/js/WinJS/Controls/HtmlControl.js",
        "src/js/WinJS/Fragments.js",
        "src/js/WinJS/ControlProcessor/_OptionsLexer.js",
        "src/js/WinJS/ControlProcessor/_OptionsParser.js",
        "src/js/WinJS/Utilities/_TabContainer.js",
        "src/js/WinJS/Animations/_TransitionAnimation.js",
        "src/js/WinJS/Utilities/_UI.js",

        "src/js/WinJS/Application.js",
        "src/js/WinJS/Navigation.js",
        "src/js/WinJS/Application/_State.js",

        "src/js/WinJS/Binding/_BindingParser.js",
        "src/js/WinJS/Binding/_Data.js",
        "src/js/WinJS/BindingTemplate.js",
        "src/js/WinJS/Binding/_Declarative.js",
        "src/js/WinJS/Binding/_DomWeakRefTable.js",
        "src/js/WinJS/BindingList.js",
        "src/js/WinJS/BindingTemplate/_DataTemplateCompiler.js",

        "src/js/WinJS/Res.js",

        "src/js/build/endBase.js"
    ];

    config.baseJSFilesPhone = [
        "src/js/build/Copyright.js",
        "src/js/WinJS/Core/_WriteProfilerMark.js",
        "src/js/build/startBase.js",
        "src/js/base/references.js",
        "src/js/WinJS/Core/_Base.js",
        "src/js/WinJS/Core/_BaseUtils.js",
        "src/js/WinJS/Core/_BaseUtilsPhone.js",
        "src/js/WinJS/Core/_Log.js",
        "src/js/WinJS/Core/_Events.js",
        "src/js/WinJS/Core/_Resources.js",
        "src/js/WinJS/Promise.js",
        "src/js/WinJS/Scheduler.js",
        "src/js/WinJS/Core/_Errors.js",
        "src/js/WinJS/Utilities/_Xhr.js",
        "src/js/WinJS/Utilities/_SafeHtml.js",
        "src/js/WinJS/Core/_GetWinJSString.js",
        "src/js/WinJS/Utilities/_Dispose.js",

        "src/js/WinJS/Utilities/_Control.js",
        "src/js/WinJS/ControlProcessor.js",
        "src/js/WinJS/Utilities/_ElementListUtilities.js",
        "src/js/WinJS/Utilities/_ElementUtilities.js",
        "src/js/WinJS/Controls/HtmlControl.js",
        "src/js/WinJS/Fragments.js",
        "src/js/WinJS/ControlProcessor/_OptionsLexer.js",
        "src/js/WinJS/ControlProcessor/_OptionsParser.js",
        "src/js/WinJS/Utilities/_TabContainer.js",
        "src/js/WinJS/Animations/_TransitionAnimation.js",
        "src/js/WinJS/Utilities/_UI.js",

        "src/js/WinJS/Application.js",
        "src/js/WinJS/Navigation.js",
        "src/js/WinJS/Application/_State.js",

        "src/js/WinJS/Binding/_BindingParser.js",
        "src/js/WinJS/Binding/_Data.js",
        "src/js/WinJS/BindingTemplate.js",
        "src/js/WinJS/Binding/_Declarative.js",
        "src/js/WinJS/Binding/_DomWeakRefTable.js",
        "src/js/WinJS/BindingList.js",
        "src/js/WinJS/BindingTemplate/_DataTemplateCompiler.js",

        "src/js/WinJS/Res.js",

        "src/js/build/endBase.js"
    ];

    config.baseStringsFiles = [
        "src/js/build/Copyright.js",
        "src/js/library/stringsHeader.js",
        "src/js/library/stringsBlockHeader.js",
        "src/js/" + config.localeFolder + "/base.prefix.js",
        "src/js/" + config.localeFolder + "/base.resjson",
        "src/js/library/stringsBlockFooter.js",
        "src/js/library/stringsFooter.js"
    ];

    config.uiJSFiles = [
        "src/js/build/Copyright.js",
        "src/js/build/startUI.js",
        "src/js/WinJS/Animations.js",
        "src/js/uicollections/Assert.js",
        "src/js/WinJS/BindingList/_BindingListDataSource.js",
        "src/js/WinJS/VirtualizedDataSource.js",
        "src/js/WinJS/VirtualizedDataSource/_GroupDataSource.js",
        "src/js/WinJS/VirtualizedDataSource/_GroupedItemDataSource.js",
        "src/js/WinJS/Controls/ListView/_StorageDataSource.js",
        "src/js/WinJS/Controls/ListView/_ItemsManager.js",
        "src/js/WinJS/Controls/ListView/_ParallelWorkQueue.js",
        "src/js/WinJS/Controls/ListView/_VersionManager.js",
        "src/js/WinJS/Controls/FlipView.js",
        "src/js/WinJS/Controls/FlipView/_PageManager.js",
        "src/js/WinJS/Controls/ListView/_BrowseMode.js",
        "src/js/WinJS/Controls/ListView/_Constants.js",
        "src/js/WinJS/Controls/ListView/_ErrorMessages.js",
        "src/js/WinJS/Controls/ListView/_GroupFocusCache.js",
        "src/js/WinJS/Controls/ListView/_GroupsContainer.js",
        "src/js/WinJS/Controls/ItemContainer/_ItemEventsHandler.js",
        "src/js/WinJS/Controls/ListView/_ItemsContainer.js",
        "src/js/WinJS/Controls/ListView/_Layouts.js",
        "src/js/WinJS/Controls/ListView.js",
        "src/js/WinJS/Controls/Repeater.js",
        "src/js/WinJS/Controls/ListView/_SelectionManager.js",
        "src/js/WinJS/Controls/ListView/_VirtualizeContentsView.js",
        "src/js/WinJS/Controls/DatePicker.js",
        "src/js/WinJS/Controls/TimePicker.js",
        "src/js/WinJS/Utilities/_Select.js",
        "src/js/WinJS/Controls/BackButton.js",
        "src/js/WinJS/Controls/Rating.js",
        "src/js/WinJS/Controls/ToggleSwitch.js",
        "src/js/WinJS/Controls/SemanticZoom.js",
        "src/js/WinJS/Controls/Hub.js",
        "src/js/WinJS/Controls/Hub/_Section.js",
        "src/js/WinJS/Controls/Flyout/_Overlay.js",
        "src/js/WinJS/Controls/AppBar/_Icon.js",
        "src/js/WinJS/Controls/AppBar/_Command.js",
        "src/js/WinJS/Controls/AppBar.js",
        "src/js/WinJS/Controls/Flyout.js",
        "src/js/WinJS/Controls/Menu.js",
        "src/js/WinJS/Controls/Menu/_Command.js",
        "src/js/WinJS/Controls/SearchBox.js",
        "src/js/WinJS/Controls/Flyout/_SettingsFlyout.js",
        "src/js/WinJS/Controls/ItemContainer.js",
        "src/js/WinJS/Utilities/_KeyboardBehavior.js",
        "src/js/WinJS/Controls/NavBar.js",
        "src/js/WinJS/Controls/NavBar/_Container.js",
        "src/js/WinJS/Controls/NavBar/_Command.js",
        "src/js/WinJS/Controls/Tooltip.js",
        "src/js/WinJS/Controls/ViewBox.js",
        "src/js/build/endUI.js"
    ];

    config.uiJSFilesPhone = [
        "src/js/build/startUI.js",
        "src/js/uicollections/references.js",
        "src/js/WinJS/Animations.js",
        "src/js/uicollections/Assert.js",
        "src/js/WinJS/BindingList/_BindingListDataSource.js",
        "src/js/WinJS/VirtualizedDataSource.js",
        "src/js/WinJS/VirtualizedDataSource/_GroupDataSource.js",
        "src/js/WinJS/VirtualizedDataSource/_GroupedItemDataSource.js",
        "src/js/WinJS/Controls/ListView/_StorageDataSource.js",
        "src/js/WinJS/Controls/ListView/_ItemsManager.js",
        "src/js/WinJS/Controls/ListView/_ParallelWorkQueue.js",
        "src/js/WinJS/Controls/ListView/_VersionManager.js",
        "src/js/WinJS/Controls/FlipView.js",
        "src/js/WinJS/Controls/FlipView/_PageManager.js",
        "src/js/WinJS/Controls/ListView/_BrowseMode.js",
        "src/js/WinJS/Controls/ListView/_Constants.js",
        "src/js/WinJS/Controls/ListView/_ErrorMessages.js",
        "src/js/WinJS/Controls/ListView/_GroupFocusCache.js",
        "src/js/WinJS/Controls/ListView/_GroupsContainer.js",
        "src/js/WinJS/Controls/ItemContainer/_ItemEventsHandler.js",
        "src/js/WinJS/Controls/ListView/_ItemsContainer.js",
        "src/js/WinJS/Controls/ListView/_Layouts.js",
        "src/js/WinJS/Controls/ListView.js",
        "src/js/WinJS/Controls/Repeater.js",
        "src/js/WinJS/Controls/ListView/_SelectionManager.js",
        "src/js/WinJS/Controls/ListView/_VirtualizeContentsView.js",
        "src/js/WinJS/Controls/AppBar/_Icon.js",
        "src/js/WinJS/Controls/AppBar/_CommandPhone.js",
        "src/js/WinJS/Controls/AppBar/_AppBarPhone.js",
        "src/js/WinJS/Controls/Pivot.js",
        "src/js/WinJS/Controls/Pivot/_Item.js",
        "src/js/WinJS/Controls/ToggleSwitch.js",
        "src/js/WinJS/Controls/ItemContainer.js",
        "src/js/WinJS/Controls/SemanticZoom.js",
        "src/js/WinJS/Controls/ViewBox.js",
        "src/js/build/endUI.js",
    ];

    config.uiStringsFiles = [
        "src/js/build/Copyright.js",
        "src/js/library/stringsHeader.js",
        "src/js/library/stringsBlockHeader.js",
        "src/js/" + config.localeFolder + "/ui.prefix.js",
        "src/js/" + config.localeFolder + "/ui.resjson",
        "src/js/library/stringsBlockFooter.js",
        "src/js/library/stringsFooter.js"
    ];

    config.lint = {
        srcFiles: ["src/**/*.js"],
        buildFiles: ["gruntfile.js", "config.js", "tasks/**/*.js"],
        ignoreFiles: [
            "src/js/en-US/base.prefix.js",
            "src/js/en-US/ui.prefix.js",
            "src/js/library/stringsBlockFooter.js",
            "src/js/library/stringsBlockHeader.js",
            "src/js/library/stringsFooter.js",
            "src/js/library/stringsHeader.js",
        ],
    };

    // Object that aggregates the saucelabs test results that we report through our automation
    config.tests_results = {    
        "date": new Date(),
        "environment": [],
        "results":  []
    };


})();