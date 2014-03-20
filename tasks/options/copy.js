var config = require("../../config.js");

if (config.inRazzle) {
    module.exports = {
        tests: {
            files: [
                {expand: true, cwd: "tests/", src: ["**"], dest: config.testsOutput}
            ]
        }
    }
}
else {
    module.exports = {};
}