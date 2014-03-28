var config = require("../../config.js");

module.exports = {
    desktopDark: {
        src: ["src/less/desktop-dark.less"],
        dest: config.desktopOutput + "css/ui-dark.css"
    },
    desktopLight: {
        src: ["src/less/desktop-light.less"],
        dest: config.desktopOutput + "css/ui-light.css"
    },
    phoneDark: {
        src: ["src/less/phone-dark.less"],
        dest: config.phoneOutput + "css/ui-dark.css"
    },
    phoneLight: {
        src: ["src/less/phone-light.less"],
        dest: config.phoneOutput + "css/ui-light.css"
    }
}