var config = require("../../config.js");

module.exports = {
    baseDesktop: {
        src: baseJSFiles,
        dest: config.desktopOutput + "js/base.js"
    },
    basePhone: {
        src: baseJSFilesPhone,
        dest: config.phoneOutput + "js/base.js"
    },
    baseStringsDesktop: {
        src: baseStringsFiles,
        dest: config.desktopOutput + "js/" + config.localeFolder + "/base.strings.js"
    },
    baseStringsPhone: {
        src: baseStringsFiles,
        dest: config.phoneOutput + "js/" + config.localeFolder + "/base.strings.js"
    },
    uiDesktop: {
        src: uiJSFiles,
        dest: config.desktopOutput + "js/ui.js"
    },
    uiPhone: {
        src: uiJSFilesPhone,
        dest: config.phoneOutput + "js/ui.js"
    },
    uiStringsDesktop: {
        src: uiStringsFiles,
        dest: config.desktopOutput + "js/" + config.localeFolder + "/ui.strings.js"
    },
    uiStringsPhone: {
        src: uiStringsFiles,
        dest: config.phoneOutput + "js/" + config.localeFolder + "/ui.strings.js"
    }
}