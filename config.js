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

config.baseJSFiles = [
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

config.baseJSFilesPhone = [
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