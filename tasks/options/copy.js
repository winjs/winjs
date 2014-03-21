var config = require("../../config.js");

module.exports = {
    tests: {
        files: [
            {expand: true, cwd: "tests/", src: ["**"], dest: config.testsOutput}
        ]
    }
};