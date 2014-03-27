/*
    Plugin: https://www.npmjs.org/package/grunt-contrib-jshint
    JSHint Options: http://www.jshint.com/docs/options/
    For more explanations of the lint errors JSHint will throw at you please visit http://www.jslinterrors.com.
*/
"use strict"

var config = require("../../config.js");

(function () {

    // Options:
    var OPTIONS = {
        browser: true, // Defines globals exposed by modern browsers.
        asi: true, // Suppress warnings about missing semicolons.
        //lastsemic: true,
        sub: true, // Suppress warnings about using [] notation when it can be expressed in dot notation.
        expr: true // Suppress warnings about the use of expressions where expected to see assignments or function calls.

    }

    // Ignores: 
    var IGNORES = [];

    module.exports = {
        baseDesktop: {
            //src: "src/js/base/base.js",
            src: config.baseJSFiles,
            options: OPTIONS,
        },
        //basePhone: {
        //    src: config.baseJSFilesPhone,
        //    options: OPTIONS,
        //},
        //baseStringsDesktop: {
        //    src: config.baseStringsFiles,
        //    options: OPTIONS,
        //},
        //baseStringsPhone: {
        //    src: config.baseStringsFiles,
        //    options: OPTIONS,
        //},
        //uiDesktop: {
        //    src: config.uiJSFiles,
        //    options: OPTIONS,
        //},
        //uiPhone: {
        //    src: config.uiJSFilesPhone,
        //    options: OPTIONS,
        //},
        //uiStringsDesktop: {
        //    src: config.uiStringsFiles,
        //    options: OPTIONS,
        //},
        //uiStringsPhone: {
        //    src: config.uiStringsFiles,
        //    options: OPTIONS,
        //}
        // Do we want to Lint tests as well now?
    }

})();


