// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/*
    Plugin Information: https://www.npmjs.org/package/grunt-contrib-jshint
    JSHint Options Information: http://www.jshint.com/docs/options/
    For more explanation of the lint errors JSHint can throw at you please visit http://www.jslinterrors.com.
*/
(function () {
    "use strict";
    var config = require("../../config.js");

    var cloneOptions = function (opt) {
        var temp = {};
        for (var key in opt) {
            temp[key] = opt[key];
        }
        return temp;
    }

    // Options:
    var sharedOptions = {

        /*
          ENFORCING Options: When set to true, (or in some cases an integer value) these options will make JSHint produce more warnings about your code.
          http://www.jshint.com/docs/options/#enforcing-options
        */
        bitwise: false, // Prohibits the use of bitwise operators. Bitwise operators are very rare in JavaScript programs and quite often & is simply a mistyped &&.
        camelcase: false, // Allows you to force all variable names to use either camelCase style or UPPER_CASE with underscores.
        curly: false, // Requires you to always put curly braces around blocks in loops and conditionals. 
        eqeqeq: false, // Prohibits the use of == and != in favor of === and !==
        es3: false, // Tells JSHint that your code needs to adhere to ECMAScript 3 specification and may not include ES5 features
        forin: false, // Requires all for in loops to filter object's items.
        freeze: false, // Prohibits overwriting prototypes of native objects such as Array, Date and so on.
        immed: false, // Prohibits the use of immediate function invocations without wrapping them in parentheses.
        indent: false, // Enforces specific tab width for your code. 
        latedef: false, // Prohibits the use of a variable before it was defined
        newcap: false, // Requires you to capitalize names of constructor functions
        noarg: false, // Prohibits the use of arguments.caller and arguments.callee. 
        noempty: false, // Warns when you have an empty block in your code.
        nonbsp: false, // Warns about "non-breaking whitespace" characters.
        nonew: false, // Prohibits the use of constructor functions for side-effects.
        plusplus: false, // Prohibits the use of unary increment and decrement operators.
        quotmark: false, // Enforces the consistency of quotation marks used throughout your code. 
        undef: false, // Prohibits the use of explicitly undeclared variables.
        unused: false, // Warns when you define and never use your variables.
        strict: false, // Requires all functions to run in ECMAScript 5's strict mode.
        trailing: false, // Makes it an error to leave a trailing whitespace in your code.
        maxparams: false, // Lets you set the max number of formal parameters allowed per function.
        maxdepth: false, // Lets you control how nested do you want your blocks to be.
        maxstatements: false, // Lets you set the max number of statements allowed per function.
        maxcomplexity: false, // Lets you control cyclomatic complexity throughout your code. 
        maxlen: false, // lets you set the maximum length of a line.

        /* 
          RELAXING Options: When set to true, these options will make JSHint produce less warnings about your code
          http://www.jshint.com/docs/options/#relaxing-options
        */
        asi: true, // Suppresses warnings about missing semicolons.
        boss: true, // Suppresses warnings about the use of assignments in cases where comparisons are expected. More often than not, code like if (a = 10) {} is a typo.
        debug: true, // Suppresses warnings about the debugger statements in your code.
        eqnull: true, // Suppresses warnings about == null comparisons. 
        esnext: true, // Tells JSHint that your code uses ECMAScript 6 specific syntax.
        evil: true, // Suppresses warnings about the use of eval.
        expr: true, // Suppresses warnings about the use of expressions where normally you would expect to see assignments or function calls.
        funcscope: true, // Suppresses warnings about declaring variables inside of control structures while accessing them later from the outside.
        gcl: true, // Makes JSHint compatible with Google Closure Compiler.
        globalstrict: true, // Suppresses warnings about the use of global strict mode.
        iterator: true, // Suppresses warnings about the __iterator__ property.
        lastsemic: true, // Suppresses warnings about missing semicolons, but only when the semicolon is omitted for the last statement in a one-line block.
        laxbreak: true, // Suppresses most of the warnings about possibly unsafe line breakings in your code. 
        laxcomma: true, // Suppresses warnings about comma-first coding style.
        loopfunc: true, // Suppresses warnings about functions inside of loops.
        maxerr: 10000, // Allows you to set the maximum amount of warnings JSHint will produce before giving up on a given file. Default is 50.
        moz: true, // Options tells JSHint that your code uses Mozilla JavaScript extensions. 
        multistr: true, // Suppresses warnings about multi-line strings. Multi-line strings can be dangerous if you accidentally put a whitespace in between the escape character (\) and a new line.
        notypeof: true, // Suppresses warnings about invalid typeof operator values. 
        proto: true, // Suppresses warnings about the __proto__ property.
        scripturl: true, // Suppresses warnings about the use of script-targeted URL's such as javascript:....
        smarttabs: true, // Suppresses warnings about mixed tabs and spaces when the latter are used for alignmnent only.
        shadow: true, // Suppresses warnings about variable shadowing i.e. declaring a variable that had been already declared somewhere in the outer scope.
        sub: true, // Suppresses warnings about using [] notation when it can be expressed in dot notation: person['name'] vs. person.name.
        supernew: true, // Suppresses warnings about "weird" constructions like new function () { ... } and new Object;. 
        validthis: true, // Suppresses warnings about possible strict violations when the code is running in strict mode and you use this in a non-constructor function.
        noyield: true, // Suppresses warnings about generator functions with no yield statement in them.

        /*
            Suppress specific JSHint warnings with no corresponding Options flag.
        */
        '-W053': true, // Ignore (W053)  Do not use String as a constructor.
        '-W018': true, // Ignore (W018)  Confusing use of '!'.       
        '-W002': true, // Ignore (W002)  Value of 'e' may be overwritten in IE 8 and earlier.
        "-W120": true, // Ignore (W120)  You might be leaking a variable (a) here.

        /*
            Exrta Options specifically for configuration of Grunt JSHint plugin. 
            https://www.npmjs.org/package/grunt-contrib-jshint
        */
        reporter: "tasks/utilities/jshintreporter.js", // Path to the custom reporter we use, default is the built-in Grunt reporter. 
        globals: { // Tells JSHint about global variables that are defined elsewhere. If value is false (default), JSHint will consider that variable as read-only.
            WinJS: true,
            Windows: false,
        },
        jshintrc: undefined, // If set to true, no config will be sent to jshint and jshint will search for .jshintrc files relative to the files being linted.
        extensions: undefined, // A list of non-dot-js extensions to check.
        ignores: config.lint.ignoreFiles,// Array of files and dirs to ignore. This will override your .jshintignore file if set and does not merge.
        force: true, // Set force to true to report JSHint errors but not fail the task.   
        reporterOutput: undefined, // If reporterOutput is specified then all output will be written to the given filepath instead of printed to stdout.        
    };

    var buildOptions = cloneOptions(sharedOptions);
    buildOptions.node = true; // Defines globals exposed inside of Node runtime enviornment.    

    var sourceOptions = cloneOptions(sharedOptions);
    sourceOptions.browser = true; // Defines globals exposed by modern browsers, with the exclusion of developer globals like alert and console.        

    module.exports = {
        buildFiles: {
            src: config.lint.buildFiles,
            options: buildOptions,
        },
        srcFiles: {
            src: config.lint.srcFiles,
            options: sourceOptions,
        },
    };
})();


