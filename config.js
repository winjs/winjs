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