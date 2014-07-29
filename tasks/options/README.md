# Grunt Build Options

Each file in this directory represents options to a particular build task.


## check-file-names

This task helps us validate our file casing is consistent to avoid having build errors on case sensitive file systems.

## clean

This task cleans up our build output.

## concat

This task is used to build the strings resource file ui.strings.js.

## connect

This task enables our unit tests to run locally so that you can try them out in different browsers.

## copy

This task moves files from the source tree into the build output folder.

## jshint

This task checks our output files for correctness using JSHint. It only runs on "release" builds currently.

## less

This task builds CSS files from our LESS source files.

## replace

This task replaces certain tokens in our output files (like build number) with their final values.

## requirejs

This task compiles our static files using the r.js optimizer. 

## saucelabs-qunit

This task is used to run our tests on different browsers during a TravisCI run.

## shell

This task enables a legacy test runner.

## uglify

This task minifies our build output.