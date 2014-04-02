// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

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
config.targetFramework = "Microsoft.WinJS.2.1";
config.desktopOutput = config.outputFolder + "Microsoft." + config.targetName + "/";
config.phoneOutput = config.outputFolder + "Microsoft.Phone." + config.targetName + "/";
config.tsOutput = config.outputFolder + 'ts-build/';

config.baseJSFiles = [
    "src/js/build/Copyright.js",
    "src/js/build/writeProfilerMark.js",
    "src/js/build/startbase.js",
    "src/js/base/references.js",
    config.tsOutput + "base/base.js",
    config.tsOutput + "base/baseutils.js",
    config.tsOutput + "base/log.js",
    config.tsOutput + "base/events.js",
    config.tsOutput + "base/resources.js",
    config.tsOutput + "base/promise.js",
    config.tsOutput + "base/scheduler.js",
    config.tsOutput + "base/errors.js",
    config.tsOutput + "base/xhr.js",
    config.tsOutput + "base/safehtml.js",
    config.tsOutput + "base/getwinjsstring.js",
    config.tsOutput + "base/dispose.js",

    config.tsOutput + "ui/control.js",
    config.tsOutput + "ui/declarativecontrols.js",
    config.tsOutput + "ui/elementlistutilities.js",
    config.tsOutput + "ui/elementutilities.js",
    config.tsOutput + "ui/fragmentcontrol.js",
    config.tsOutput + "ui/fragmentloader.js",
    config.tsOutput + "ui/optionslexer.js",
    config.tsOutput + "ui/optionsparser.js",
    config.tsOutput + "ui/tabmanager.js",
    config.tsOutput + "ui/transitionanimation.js",
    config.tsOutput + "ui/utilities.js",

    config.tsOutput + "wwa-app/application.js",
    config.tsOutput + "wwa-app/navigation2.js",
    config.tsOutput + "wwa-app/state.js",

    config.tsOutput + "binding/bindingparser.js",
    config.tsOutput + "binding/data.js",
    config.tsOutput + "binding/datatemplate.js",
    config.tsOutput + "binding/declarative.js",
    config.tsOutput + "binding/domweakreftable.js",
    config.tsOutput + "binding/list.js",
    config.tsOutput + "binding/datatemplatecompiler.js",

    config.tsOutput + "res/Res.js",

    "src/js/build/endbase.js"
];

config.baseJSFilesPhone = [
    "src/js/build/Copyright.js",
    "src/js/build/writeProfilerMark.js",
    "src/js/build/startBase.js",
    "src/js/base/references.js",
    config.tsOutput + "base/base.js",
    config.tsOutput + "base/baseUtils.js",
    config.tsOutput + "base/baseUtils-phone.js",
    config.tsOutput + "base/log.js",
    config.tsOutput + "base/events.js",
    config.tsOutput + "base/resources.js",
    config.tsOutput + "base/promise.js",
    config.tsOutput + "base/scheduler.js",
    config.tsOutput + "base/errors.js",
    config.tsOutput + "base/xhr.js",
    config.tsOutput + "base/safeHTML.js",
    config.tsOutput + "base/getwinjsstring.js",
    config.tsOutput + "base/dispose.js",

    config.tsOutput + "ui/control.js",
    config.tsOutput + "ui/declarativeControls.js",
    config.tsOutput + "ui/elementListUtilities.js",
    config.tsOutput + "ui/elementUtilities.js",
    config.tsOutput + "ui/fragmentControl.js",
    config.tsOutput + "ui/fragmentLoader.js",
    config.tsOutput + "ui/optionsLexer.js",
    config.tsOutput + "ui/optionsParser.js",
    config.tsOutput + "ui/tabManager.js",
    config.tsOutput + "ui/transitionAnimation.js",
    config.tsOutput + "ui/utilities.js",

    config.tsOutput + "wwa-app/application.js",
    config.tsOutput + "wwa-app/navigation2.js",
    config.tsOutput + "wwa-app/state.js",

    config.tsOutput + "binding/bindingParser.js",
    config.tsOutput + "binding/data.js",
    config.tsOutput + "binding/dataTemplate.js",
    config.tsOutput + "binding/declarative.js",
    config.tsOutput + "binding/DOMWeakRefTable.js",
    config.tsOutput + "binding/list.js",
    config.tsOutput + "binding/dataTemplateCompiler.js",

    config.tsOutput + "res/Res.js",

    "src/js/build/endbase.js"
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

config.uiJSFilesPhone = [
    "src/js/startUI.js",
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
    "src/js/endUI.js",
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