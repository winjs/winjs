module.exports = function(grunt) {
    grunt.registerTask("test", function () {
        var args = [];
        for (var i = 0; i < arguments.length; ++i)
            args.push(arguments[i]);

        grunt.task.run(["default", "clean:qunit", "shell:runTests:" + args.join(":")]);
    });
};