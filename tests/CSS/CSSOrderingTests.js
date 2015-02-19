// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
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
    function testPermutationsOnHTML(htmlText) {
        // Load the stylesheet text via xml request
        var permutations = [];
        for (var i = 0; i < 10; ++i) {
            var request = new XMLHttpRequest();
            request.onload = function () {
                permutations.push(this.responseText);
            };
            // Send a synchronous xml request
            request.open('get', '../../csstests/' + i + '/css/ui-dark.css', false);
            request.send();
        }

        // Test all permutations
        var allResults = [];
        for (var i = 1; i < permutations.length; ++i) {
            var results = CSSDiff.diff(htmlText, permutations[0], permutations[i]);
            allResults = allResults.concat(results);
            console.log('tested permutation ', i);
        }

        return allResults;
    }

    // Helper to assert results from previous function
    function validateResults(results) {
        // If there are 0 differences between the CSS files, CSSDiff.diff will return
        // an empty array. Unfortunately qunit can't handle no assertions being made during a test,
        // so we have to assert *something* in that case to prevent an error.
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

    function testHTMLText(htmlText, testDoneCallback) {
        var container = document.querySelector('#css-ordering-tests');
        container.innerHTML = htmlText;
        WinJS.Navigation.history.backStack = [{}];
        WinJS.UI.processAll(container).then(function () {
            var results = testPermutationsOnHTML(container.innerHTML);
            validateResults(results);
            testDoneCallback();
        });
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

        testHTMLText(htmlText, testDoneCallback);
    };

    this.testToggle = function (testDoneCallback) {
        var htmlText = [
            '<div data-win-control="WinJS.UI.ToggleSwitch" data-win-options="{checked: true}"></div>',
            '<div data-win-control="WinJS.UI.ToggleSwitch" data-win-options="{checked: false}"></div>',
            '<div data-win-control="WinJS.UI.ToggleSwitch" data-win-options="{disabled: true, checked: false}"></div>',
            '<div data-win-control="WinJS.UI.ToggleSwitch" data-win-options="{disabled: true, checked: true}"></div>'
        ].join('\n');

        testHTMLText(htmlText, testDoneCallback);
    };

    this.testRatings = function (testDoneCallback) {
        var htmlText = [
            '<div data-win-control="WinJS.UI.Rating"></div>',
        ].join('\n');

        testHTMLText(htmlText, testDoneCallback);
    };

    this.testListView = function () {
        var items = [1, 2, 3, 4, 5];
        var bindingList = new WinJS.Binding.List(items);
        var container = document.querySelector('#css-ordering-tests');
        var listview = new WinJS.UI.ListView(null, {itemDataSource: bindingList.dataSource});
        container.appendChild(listview.element);
        var results = testPermutationsOnHTML(container.innerHTML);
        validateResults(results);
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

        testHTMLText(htmlText, testDoneCallback);
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

        testHTMLText(htmlText, testDoneCallback);
    };

    this.testBackButton = function (testDoneCallback) {
        var htmlText = [
            '<button data-win-control="WinJS.UI.BackButton"></button>'
        ].join('\n');

        testHTMLText(htmlText, testDoneCallback);
    };

    this.testSearchBox = function (testDoneCallback) {
        var htmlText = [
            '<div data-win-control="WinJS.UI.SearchBox"></div>'
        ].join('\n');

        testHTMLText(htmlText, testDoneCallback);
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

        testHTMLText(htmlText, testDoneCallback);
    };
}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass('WinJSTests.CSSOrderingTests');
