// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function () {
    'use strict';

    var winjsModules = [
        'WinJS/Core',
        'WinJS/Promise',
        'WinJS/_Signal',
        'WinJS/Scheduler',
        'WinJS/Utilities',
        'WinJS/Fragments',
        'WinJS/Application',
        'WinJS/Navigation',
        'WinJS/Animations',
        'WinJS/Binding',
        'WinJS/BindingTemplate',
        'WinJS/BindingList',
        'WinJS/Res',
        'WinJS/Pages',
        'WinJS/ControlProcessor',
        'WinJS/Controls/HtmlControl',
        'WinJS/VirtualizedDataSource',
        'WinJS/Controls/IntrinsicControls',
        'WinJS/Controls/ListView',
        'WinJS/Controls/FlipView',
        'WinJS/Controls/ItemContainer',
        'WinJS/Controls/Repeater',
        'WinJS/Controls/DatePicker',
        'WinJS/Controls/TimePicker',
        'WinJS/Controls/BackButton',
        'WinJS/Controls/Rating',
        'WinJS/Controls/ToggleSwitch',
        'WinJS/Controls/SemanticZoom',
        'WinJS/Controls/Pivot',
        'WinJS/Controls/Hub',
        'WinJS/Controls/Flyout',
        'WinJS/Controls/AppBar',
        'WinJS/Controls/Menu',
        'WinJS/Controls/SearchBox',
        'WinJS/Controls/SettingsFlyout',
        'WinJS/Controls/NavBar',
        'WinJS/Controls/Tooltip',
        'WinJS/Controls/ViewBox',
        'WinJS/Controls/ContentDialog',
        'WinJS/Controls/ToolBar',
        'WinJS/Controls/SplitView'
    ];

    module.exports = function (grunt) {
        var config = require('../config.js');
        var rand = require('seed-random')('winjs');

        grunt.registerTask('csstest', 'Build order permutations of css modules', function () {
            var requirejs = grunt.config.get('requirejs');

            var tasks = [];
            for (var i = 0; i < 10; ++i) {
                var taskName = 'css_test_' + i;
                var merge = { requirejs: {} };
                var buildConfig = requirejs.defaults(taskName);
                var options = buildConfig.options;
                options.name = null;
                options.platform = 'desktop';
                options.out = config.outputFolder + 'csstests/' + i + '/js/WinJS.js';
                options.include = i === 0 ? winjsModules : shuffleArray(winjsModules);
                merge.requirejs[taskName] = buildConfig;
                grunt.config.merge(merge);
                tasks.push('requirejs:' + taskName);
            }

            grunt.task.run(tasks);
        });

        function shuffleArray(arr) {
            var values = arr.slice();
            var length = values.length;
            while (length > 0) {
                var index = Math.floor(rand() * length);

                --length;

                var temp = values[length];
                values[length] = values[index];
                values[index] = temp;
            }

            return values;
        }
    };
})();
