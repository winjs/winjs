var config = require("../../config.js");

module.exports = {
    options: {
        force: true
    },
    all: [
        config.desktopOutput,
        config.phoneOutput,
    ],
    base: [
        config.desktopOutput + "js/base.js",
        config.desktopOutput + "js/" + config.localeFolder + "/base.strings.js",
        config.phoneOutput + "js/base.js",
        config.phoneOutput + "js/" + config.localeFolder + "/base.strings.js",
    ],
    ui: [
        config.desktopOutput + "js/ui.js",
        config.desktopOutput + "js/" + config.localeFolder + "/ui.strings.js",
        config.phoneOutput + "js/ui.js",
        config.phoneOutput + "js/" + config.localeFolder + "/ui.strings.js",
    ],
    qunit: [
        config.testsOutput + "TestLib/liveToQ/*.*"
    ]
}