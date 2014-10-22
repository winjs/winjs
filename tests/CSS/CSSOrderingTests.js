// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts" />
/// <reference path="../TestLib/css-diff.js" />

var WinJSTests = WinJSTests || {};

WinJSTests.CSSOrderingTests = function () {
    'use strict';

    var ignoredProperties = [
        'perspectiveOrigin',
        'transformOrigin',
        'webkitLogicalWidth',
        'webkitLogicalHeight',
        'webkitPerspectiveOrigin',
        'webkitTransformOrigin'
    ];

    // Helper to do CSS testing on any given HTML string
    function testPermutationsOnHTML(htmlText, doneCallback) {
        // Function to test a stylesheet
        var testStylesheet = function testStylesheet(goodCSS, testCSS, callback) {
            CSSDiff.diff(htmlText, goodCSS, testCSS, callback);
        };

        // Test permutations of a CSS file
        var testAllPermutations = function testAllPermutations(goodCSS, permutations) {
            var allResults = [];

            function testAllRecursive(goodCSS, permutationIndex) {
                if (permutationIndex >= permutations.length) {
                    doneCallback(allResults);
                    return;
                }

                testStylesheet(goodCSS, permutations[permutationIndex], function (results) {
                    console.log('tested permutation ', permutationIndex);
                    allResults = allResults.concat(results);
                    testAllRecursive(goodCSS, permutationIndex + 1);
                });
            }

            testAllRecursive(goodCSS, 0);
        };

        // Load the stylesheet text via xml request
        var permutations = [];
        for (var i = 0; i < 10; ++i) {
            var request = new XMLHttpRequest();
            request.onload = function () {
                permutations.push(this.responseText);
            };
            request.open('get', '../../csstests/' + i + '/css/ui-dark.css', false);
            request.send();
        }

        testAllPermutations(permutations[0], permutations.slice(1));
    }

    // Helper to assert results from previous function
    function validateResults(results) {
        if (results.length === 0) {
            LiveUnit.Assert.areEqual(1, 1, 'Dummy assertion');
        }

        for (var i = 0; i < results.length; ++i) {
            var result = results[i];
            if (ignoredProperties.indexOf(result.property) >= 0) {
                continue;
            }
            var message = '\n' + result.element.tagName.toLowerCase();
            if (result.element.className) {
                message += '\n.' + result.element.className.split(' ').join('\n.');
            }
            if (result.pseudo !== 'none') {
                message += ':' + result.pseudo;
            }

            message += '\n' + result.property + ' is order dependent!\n';
            LiveUnit.Assert.areEqual(result.expected, result.actual, message);
        }
    }

    this.setUp = function () {
        var container = document.createElement('div');
        container.id = 'css-ordering-tests';
        document.body.appendChild(container);
    };

    this.tearDown = function () {
        var container = document.querySelector('#css-ordering-tests');
        document.body.removeChild(container);
    };

    this.testIntrinsics = function (testDoneCallback) {
        var htmlText = [
            '<button>test</button>',
            '<input type="text" />',
            '<input type="submit" />',
            '<input type="range" />',
            '<input type="checkbox" />',
            '<input type="radio" />',
            '<progress></progress>',
            '<progress value="0.5"></progress>',
            '<a href="#"></a>',
            '<select><option>test</option></select>'
        ].join('\n');

        testPermutationsOnHTML(htmlText, function (results) {
            validateResults(results);
            testDoneCallback();
        });
    };

    this.testToggle = function (testDoneCallback) {
        var container = document.querySelector('#css-ordering-tests');
        var toggle = new WinJS.UI.ToggleSwitch();
        container.appendChild(toggle.element);
        toggle = new WinJS.UI.ToggleSwitch(null, {disabled: true, checked: true});
        container.appendChild(toggle.element);
        testPermutationsOnHTML(container.innerHTML, function (results) {
            validateResults(results);
            testDoneCallback();
        });
    };

    this.testRatings = function (testDoneCallback) {
        var container = document.querySelector('#css-ordering-tests');
        var ratings = new WinJS.UI.Rating();
        container.appendChild(ratings.element);
        testPermutationsOnHTML(container.innerHTML, function (results) {
            validateResults(results);
            testDoneCallback();
        });
    };

    this.testListView = function (testDoneCallback) {
        var items = [1, 2, 3, 4, 5];
        var bindingList = new WinJS.Binding.List(items);
        var container = document.querySelector('#css-ordering-tests');
        var listview = new WinJS.UI.ListView(null, {itemDataSource: bindingList.dataSource});
        container.appendChild(listview.element);
        testPermutationsOnHTML(container.innerHTML, function (results) {
            validateResults(results);
            testDoneCallback();
        });
    };

    this.testHub = function (testDoneCallback) {
        var htmlText = [
            '<div data-win-control="WinJS.UI.Hub">',
            '   <div data-win-control="WinJS.UI.HubSection">',
            '       <div>Hello World</div>',
            '       <div>Hello World</div>',
            '   </div>',
            '   <div data-win-control="WinJS.UI.HubSection">',
            '       <div>Hello World</div>',
            '       <div>Hello World</div>',
            '   </div>',
            '</div>'
        ].join('\n');
        var container = document.querySelector('#css-ordering-tests');
        container.innerHTML = htmlText;
        WinJS.UI.processAll(container).then(function () {
            testPermutationsOnHTML(container.innerHTML, function (results) {
                validateResults(results);
                testDoneCallback();
            });
        });
    };

    this.testPivot = function (testDoneCallback) {
        var htmlText = [
            '<div data-win-control="WinJS.UI.Pivot">',
            '   <div data-win-control="WinJS.UI.PivotItem" data-win-options="{\'header\': \'header\'}">',
            '       <div>Hello World</div>',
            '       <div>Hello World</div>',
            '   </div>',
            '   <div data-win-control="WinJS.UI.PivotItem" data-win-options="{\'header\': \'header\'}">',
            '       <div>Hello World</div>',
            '       <div>Hello World</div>',
            '   </div>',
            '</div>'
        ].join('\n');
        var container = document.querySelector('#css-ordering-tests');
        container.innerHTML = htmlText;
        WinJS.UI.processAll(container).then(function () {
            testPermutationsOnHTML(container.innerHTML, function (results) {
                validateResults(results);
                testDoneCallback();
            });
        });
    };

    this.testBackButton = function (testDoneCallback) {
        var htmlText = [
            '<button data-win-control="WinJS.UI.BackButton"></button>'
        ].join('\n');
        var container = document.querySelector('#css-ordering-tests');
        container.innerHTML = htmlText;
        WinJS.Navigation.history.backStack = [{}];
        WinJS.UI.processAll(container).then(function () {
            testPermutationsOnHTML(container.innerHTML, function (results) {
                validateResults(results);
                testDoneCallback();
            });
        });
    };

    this.testSearchBox = function (testDoneCallback) {
        var htmlText = [
            '<div data-win-control="WinJS.UI.SearchBox"></div>'
        ].join('\n');
        var container = document.querySelector('#css-ordering-tests');
        container.innerHTML = htmlText;
        WinJS.UI.processAll(container).then(function () {
            testPermutationsOnHTML(container.innerHTML, function (results) {
                validateResults(results);
                testDoneCallback();
            });
        });
    };

    this.testAppBar = function (testDoneCallback) {
        var htmlText = [
            '<div id="createAppBar" data-win-control="WinJS.UI.AppBar" data-win-options="{sticky: true}">',
            '    <button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{label:\'Add\',icon:\'add\',section:\'global\'}"></button>',
            '    <button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{label:\'Remove\',icon:\'remove\',section:\'global\'}"></button>',
            '    <hr data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type:\'separator\',section:\'global\'}" />',
            '    <button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{label:\'Delete\',icon:\'delete\',section:\'global\'}"></button>',
            '</div>'
        ].join('\n');
        var container = document.querySelector('#css-ordering-tests');
        container.innerHTML = htmlText;
        WinJS.UI.processAll(container).then(function () {
            testPermutationsOnHTML(container.innerHTML, function (results) {
                validateResults(results);
                testDoneCallback();
            });
        });
    };
}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass('WinJSTests.CSSOrderingTests');
