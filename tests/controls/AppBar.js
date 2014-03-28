/*
Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved.

Licensed under the Apache License, Version 2.0.

See License.txt in the project root for license information.
*/

// <!-- saved from url=(0014)about:internet -->
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/commonutils.js"/>
/// <reference path="../TestLib/util.js" />
/// <reference path="OverlayHelpers.js" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.AppBarTests = function () {
    "use strict";

    var Key = WinJS.Utilities.Key;

    function disposeAndRemove(element) {
        if (element) {
            if (element.dispose) {
                element.dispose();
            } else {
                WinJS.Utilities.disposeSubTree(element);
            }
            element.parentElement && element.parentElement.removeChild(element);
        }
    }
    
    this.setUp = function () {
        LiveUnit.LoggingCore.logComment("In setup");
        var AppBarElement = document.createElement('div');
        AppBarElement.id = "appBarDiv";
        document.body.appendChild(AppBarElement);        
        this._element = AppBarElement;
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");
        disposeAndRemove(document.getElementById("appBarDiv"));
        this._element = null;
        
        disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingAppBarClass));
        disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingFlyoutClass));
    };
    
    var that = this;
    // Test AppBar Instantiation
    this.testAppBarInstantiation = function () {
        var AppBar = new WinJS.UI.AppBar(that._element, { commands: { type: 'separator', id: 'sep' } });
        LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
        LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");

        function verifyFunction(functionName) {
            LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
            if (AppBar[functionName] === undefined) {
                LiveUnit.Assert.fail(functionName + " missing from AppBar");
            }

            LiveUnit.Assert.isNotNull(AppBar[functionName]);
            LiveUnit.Assert.isTrue(typeof (AppBar[functionName]) === "function", functionName + " exists on AppBar, but it isn't a function");
        }

        verifyFunction("show");
        verifyFunction("hide");
        verifyFunction("addEventListener");
        verifyFunction("removeEventListener");        
    }
    this.testAppBarInstantiation["Description"] = "Test AppBar instantiation + function presence";

    // Test AppBar Instantiation with null element
    this.testAppBarNullInstantiation = function () {
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar with null element");
        var AppBar = new WinJS.UI.AppBar(null, { commands: { type: 'separator', id: 'sep' } });
        LiveUnit.Assert.isNotNull(AppBar, "AppBar instantiation was null when sent a null AppBar element.");
    }
    this.testAppBarNullInstantiation["Description"] = "Test AppBar Instantiation with null AppBar element";

    // Test AppBar Instantiation with no options
    this.testAppBarEmptyInstantiation = function () {
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar with empty constructor");
        var AppBar = new WinJS.UI.AppBar();
        LiveUnit.Assert.isNotNull(AppBar.element, "AppBar.element is null");
        LiveUnit.Assert.isNotNull(AppBar, "AppBar instantiation was null when sent a Empty AppBar element.");
    }
    this.testAppBarEmptyInstantiation["Description"] = "Test AppBar Instantiation with Empty AppBar element";

    // Test multiple instantiation of the same AppBar DOM element
    this.testAppBarMultipleInstantiation = function () {
        var AppBar = new WinJS.UI.AppBar(that._element, { commands: { type: 'separator', id: 'sep' } });
        LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
        LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
        var error;
        try {
            new WinJS.UI.AppBar(that._element, { commands: { type: 'separator', id: 'sep' } });
        } catch (e) {
            error = e;
        } finally {           
            throw error;
        }
    }
    this.testAppBarMultipleInstantiation["Description"] = "Test AppBar Duplicate Instantiation with same DOM element";
    this.testAppBarMultipleInstantiation["LiveUnit.ExpectedException"] = { message: WinJS.Resources._getWinJSString("ui/duplicateConstruction").value }; // This is the exception that is expected

    // Test AppBar parameters
    this.testAppBarParams = function () {
        function testGoodInitOption(paramName, value) {
            LiveUnit.LoggingCore.logComment("Testing creating a AppBar using good parameter " + paramName + "=" + value);
            var div = document.createElement("div");
            var options = { commands: { type: 'separator', id: 'sep' } };
            options[paramName] = value;
            document.body.appendChild(div);
            var AppBar = new WinJS.UI.AppBar(div, options);            
            LiveUnit.Assert.isNotNull(AppBar);
            document.body.removeChild(div);
        }

        function testBadInitOption(paramName, value, expectedName, expectedMessage) {
            LiveUnit.LoggingCore.logComment("Testing creating a AppBar using bad parameter " + paramName + "=" + value);
            var div = document.createElement("div");
            document.body.appendChild(div);
            var options = { commands: { type: 'separator', id: 'sep' } };
            options[paramName] = value;
            try {
                new WinJS.UI.AppBar(div, options);                
                LiveUnit.Assert.fail("Expected creating AppBar with " + paramName + "=" + value + " to throw an exception");
            } catch (e) {
                var exception = e;
                LiveUnit.LoggingCore.logComment(exception.message);
                LiveUnit.Assert.isTrue(exception !== null);
                LiveUnit.Assert.isTrue(exception.name === expectedName);
                LiveUnit.Assert.isTrue(exception.message === expectedMessage);
            } finally {
                document.body.removeChild(div);
            }
        }


        LiveUnit.LoggingCore.logComment("Testing placement");
        testGoodInitOption("placement", "top");
        testGoodInitOption("placement", "bottom");
        testGoodInitOption("placement", "fixed");
        testGoodInitOption("placement", -1);
        testGoodInitOption("placement", 12);
        testGoodInitOption("placement", {});
        testGoodInitOption("placement", true);
        testGoodInitOption("placement", false);

        LiveUnit.LoggingCore.logComment("Testing layout");
        testGoodInitOption("layout", "custom");
        testGoodInitOption("layout", "commands");
        var badLayout = WinJS.Resources._getWinJSString("ui/badLayout").value;
        testBadInitOption("layout", "fixed", "WinJS.UI.AppBar.BadLayout", badLayout);
        testBadInitOption("layout", -1, "WinJS.UI.AppBar.BadLayout", badLayout);
        testBadInitOption("layout", 12, "WinJS.UI.AppBar.BadLayout", badLayout);
        testBadInitOption("layout", {}, "WinJS.UI.AppBar.BadLayout", badLayout);

        LiveUnit.LoggingCore.logComment("Testing sticky");
        testGoodInitOption("sticky", true);
        testGoodInitOption("sticky", false);
        testGoodInitOption("sticky", -1);
        testGoodInitOption("sticky", "what");
        testGoodInitOption("sticky", {});

        LiveUnit.LoggingCore.logComment("Testing disabled");
        testGoodInitOption("disabled", true);
        testGoodInitOption("disabled", false);
        testGoodInitOption("disabled", -1);
        testGoodInitOption("disabled", "what");
        testGoodInitOption("disabled", {});

        LiveUnit.LoggingCore.logComment("Testing element");
        //testBadInitOption("element", {}, WinJS.UI.AppBar.badElement);
    }
    this.testAppBarParams["Description"] = "Test initializing a AppBar with good and bad initialization options";

    this.testDefaultAppBarParameters = function () {        
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar element");
        var AppBar = new WinJS.UI.AppBar(that._element, { commands: { type: 'separator', id: 'sep' } });
        LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
        LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");

        LiveUnit.Assert.areEqual(that._element, AppBar.element, "Verifying that element is what we set it with");
        LiveUnit.Assert.areEqual("bottom", AppBar.placement, "Verifying that position is 'bottom'");
        LiveUnit.Assert.isFalse(AppBar.sticky, "Verifying that sticky is false");
        LiveUnit.Assert.isFalse(AppBar.disabled, "Verifying that disabled is false");
        LiveUnit.Assert.isTrue(AppBar.hidden, "Verifying that hidden is true");        
    }
    this.testDefaultAppBarParameters["Description"] = "Test default AppBar parameters";

    // Simple Function Tests
    this.testSimpleAppBarTestsFunctions = function () {        
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar element");
        var AppBar = new WinJS.UI.AppBar(that._element, { commands: { type: 'separator', id: 'sep' } });
        LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
        LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");

        LiveUnit.LoggingCore.logComment("hide");
        AppBar.hide();

        LiveUnit.LoggingCore.logComment("addEventListener");
        AppBar.addEventListener();

        LiveUnit.LoggingCore.logComment("removeEventListener");
        AppBar.removeEventListener();

        LiveUnit.LoggingCore.logComment("set commands");
        AppBar.commands = [{ id: 'cmdA', label: 'One', icon: 'back', section: 'global', tooltip: 'Test glyph by name' },
                            { id: 'cmdB', label: 'Two', icon: '&#xE106;', type: 'toggle', section: 'selection', tooltip: 'Test Glyph by codepoint' },
                            { id: 'cmdB', label: '?????', icon: '&#xE107;', type: 'toggle', section: 'selection', tooltip: '?????? ????? ?????? ????? ??????' },
                            { type: 'separator', id: 'sep' },
                            { id: 'cmdC', label: 'More', icon: 'url(images/accept_sprite_40.png)', type: 'flyout', flyout: 'myMenu' }];

        LiveUnit.LoggingCore.logComment("getCommandById");
        AppBar.getCommandById("cmdA");

        LiveUnit.LoggingCore.logComment("hideCommands");
        AppBar.hideCommands("cmdA");

        LiveUnit.LoggingCore.logComment("showOnlyCommands");
        AppBar.showOnlyCommands("cmdB");

        LiveUnit.LoggingCore.logComment("showCommands");
        AppBar.showCommands("cmdC");

        LiveUnit.LoggingCore.logComment("show");
        AppBar.show();
        AppBar.hide();        
    }
    this.testSimpleAppBarTestsFunctions["Description"] = "Test default overlay parameters";

    this.testAppBarDispose = function () {
        var abc1 = new WinJS.UI.AppBarCommand(document.createElement("button"), { label: "abc1" });
        var abc2 = new WinJS.UI.AppBarCommand(document.createElement("button"), { label: "abc2" });

        var ab = new WinJS.UI.AppBar(null, { commands: [abc1, abc2] });
        ab._updateFirstAndFinalDiv();
        LiveUnit.Assert.isTrue(ab.dispose);
        LiveUnit.Assert.isFalse(ab._disposed);

        ab.dispose();
        LiveUnit.Assert.isTrue(ab._disposed);
        LiveUnit.Assert.isTrue(abc1._disposed);
        LiveUnit.Assert.isTrue(abc2._disposed);
        ab.dispose();
    }
    this.testAppBarDispose["Description"] = "Unit test for dispose requirements.";

    this.testAppBarThrowsWhenPlacementIsSetAndAppBarVisible = function () {        
        var AppBar = new WinJS.UI.AppBar(that._element);
        LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
        LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
        AppBar.show();
        AppBar.placement = true;       
    }
    // This is the exception that is expected
    this.testAppBarThrowsWhenPlacementIsSetAndAppBarVisible["LiveUnit.ExpectedException"] = {
        message: WinJS.Resources._getWinJSString("ui/cannotChangePlacementWhenVisible").value
    };

    this.testSynchronousShowHide = function (complete) {
        var htmlString =
            "<div data-win-control='WinJS.UI.AppBar'>" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"global\"}'></button>" +
                "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", hidden: true, section:\"global\"}' />" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"global\"}'></button>" +
            "</div>";

        that._element.innerHTML = htmlString;
        WinJS.UI.processAll().
        then(function () {
            var appbar = document.querySelector(".win-appbar").winControl;
            appbar.show();
            appbar.hide();
            appbar.show();

            return CommonUtilities.waitForEvent(appbar, "aftershow");
        }).
        done(complete);
    };

    this.testKeyboarding = function (complete) {
        var htmlString = "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"global\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"global\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button2\", label:\"Button 2\", type:\"button\", section:\"selection\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button3\", label:\"Button 3\", type:\"button\", section:\"global\"}'></button>" +
            "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", section:\"global\"}' />" +
            "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", section:\"selection\"}' />" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button4\", label:\"Button 4\", type:\"button\", section:\"selection\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button5\", label:\"Button 5\", type:\"button\", section:\"global\", hidden: true}'></button>" +
            "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", hidden: true, section:\"global\"}' />";
        that._element.innerHTML = htmlString;
        /* Tabstops in visual order (separators and hidden buttons are not tabstops)
            Selection:
                0) Button 2
                1) Button 4               
            Global:
                2) Button 0
                3) Button 1
                4) Button 3
        */
        var AppBar = new WinJS.UI.AppBar(that._element);
        LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
        LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
        AppBar.show();
        that._element.addEventListener('aftershow', function () {

            var commandsInVisualOrder = [];
            commandsInVisualOrder.push(AppBar.getCommandById("Button2").element);
            commandsInVisualOrder.push(AppBar.getCommandById("Button4").element);
            commandsInVisualOrder.push(AppBar.getCommandById("Button0").element); // Button 0 is the first command element in DOM order.
            commandsInVisualOrder.push(AppBar.getCommandById("Button1").element);
            commandsInVisualOrder.push(AppBar.getCommandById("Button3").element);

            // Verify initial focus is first element in DOM order.
            var expectedIndex = 2;
            //commandsInVisualOrder[expectedIndex].focus();
            LiveUnit.LoggingCore.logComment("Verify that after showing an appbar, the first command in DOM order has focus");
            LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex], document.activeElement, "The focused element should be the first AppBarCommand in DOM order");

            // Verify 'End' & Left arrow keys
            LiveUnit.LoggingCore.logComment("Verify that 'End' key moves focus to last visible command");
            CommonUtilities.keydown(commandsInVisualOrder[expectedIndex], Key.end);
            expectedIndex = commandsInVisualOrder.length - 1;
            LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex], document.activeElement);
            do {
                CommonUtilities.keydown(commandsInVisualOrder[expectedIndex], Key.leftArrow);
                expectedIndex--;
                LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex], document.activeElement);
            } while (expectedIndex > 0);

            LiveUnit.LoggingCore.logComment("Verify that pressing Left arrow key on first visible command wraps focus back to the last visible command.");
            CommonUtilities.keydown(commandsInVisualOrder[expectedIndex], Key.leftArrow);
            expectedIndex = commandsInVisualOrder.length - 1;
            LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex], document.activeElement);

            // Verify 'Home' & Right arrow keys
            LiveUnit.LoggingCore.logComment("Verify that 'Home' key moves focus to first visible command");
            CommonUtilities.keydown(commandsInVisualOrder[expectedIndex], Key.home);
            expectedIndex = 0;
            LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex], document.activeElement);

            do {
                CommonUtilities.keydown(commandsInVisualOrder[expectedIndex], Key.rightArrow);
                expectedIndex++;
                LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex], document.activeElement);
            } while (expectedIndex < commandsInVisualOrder.length - 1);

            LiveUnit.LoggingCore.logComment("Verify that pressing Right arrow key on last visible command, wraps focus back to first visible command.");
            CommonUtilities.keydown(commandsInVisualOrder[expectedIndex], Key.rightArrow);
            expectedIndex = 0;
            LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex], document.activeElement);

            complete();
        });
    };

    this.testFocusMovesBeforeAnimationEnds = function (complete) {
        var htmlString = "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"global\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"global\"}'></button>";
            
        that._element.innerHTML = htmlString;
        var AppBar = new WinJS.UI.AppBar(that._element);
        LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
        LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
        AppBar.show();

        var cmds = that._element.querySelectorAll(".win-command");
        var firstCmd = cmds[0],
            secondCmd = cmds[1];
        
        LiveUnit.Assert.areEqual(firstCmd, document.activeElement, "The focus should be on the first AppBarCommand");
        // Don't wait for the aftershow event to fire to perform the action
        CommonUtilities.keydown(that._element, Key.rightArrow);
        LiveUnit.Assert.areEqual(secondCmd, document.activeElement, "The focus should be on the Second AppBarCommand");
        complete();        
    };


    this.testKeyboardingInEmptyAppBar = function (complete) {
        var AppBar = new WinJS.UI.AppBar(that._element);
        LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
        LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
        AppBar.show();

        that._element.addEventListener('aftershow', function () {

            var commandsInVisualOrder = [];

            // Verify initial focus
            var focusedIndex = -1;
            LiveUnit.LoggingCore.logComment("Verify that empty appbar recieves focus on itself when opened.");
            LiveUnit.Assert.areEqual(that._element, document.activeElement, "The focused element should be the AppBar itself");

            LiveUnit.LoggingCore.logComment("Verify that 'End', 'Right', 'Left', & 'Home' keys do not crash when the AppBar is empty.");
            CommonUtilities.keydown(that._element, Key.end);
            CommonUtilities.keydown(that._element, Key.home);
            CommonUtilities.keydown(that._element, Key.leftArrow);
            CommonUtilities.keydown(that._element, Key.rightArrow);

            LiveUnit.LoggingCore.logComment("Verify focus is still on the AppBarElement.");
            LiveUnit.Assert.areEqual(that._element, document.activeElement, "The focused element should be the AppBar itself");
            complete();
        });
    };    

    this.testKeyboardingWithContentCommands = function (complete) {
        /* 
        Tests: 
        win-interactive: left/right/home/end are ignored when focus is on an element with the win-interactive class.
        tabindex of -1 on container and default values for command.firstElementFocus & command.LastElementFocus causes the content command to be skipped by arrows and home/end keys.
        tabindex of -1 on a container but setting the first/last ElementFocus properties allow you to navigate to them instead of the container them.
        Whenever firstElementFocus or lastElementFocus is set the container element automatically gets its tabindex set to -1
        When one focus property on a content command is set, but the other is not set, they both return the value of the one that was set.
        Home key to content command places you on firstElementFocus.
        End key to content command places you on lastElementFocus.
        */
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar element");          
        var htmlString = "" +

         "<div style=\"font-size: 14px;\" data-win-control=\"WinJS.UI.AppBarCommand\" data-win-options=\"{id:'progress', section:'global',type:'content'}\">Download progress...<progress></progress></div>" +

         // This has tabindex -1, and both firstElementFocus and lastElementFocus are left to be default so arrow navigation will skip over it.)
        "<div id='textBox' tabindex=\"-1\" data-win-control=\"WinJS.UI.AppBarCommand\" data-win-options=\"{id:'textBox', section:'selection',type:'content'}\">" +
        "<input class=\"win-interactive\" placeholder=\"Commands and textboxes co-exist!\" type=\"text\"/></div>" +

        // firstElementFocus is set to #orange and lastElementFocus is set to #yellow
        "<div id='buttons' data-win-control='WinJS.UI.AppBarCommand' data-win-options=\"{id:'buttons', section:'selection', type:'content', firstElementFocus:select('#orange'), lastElementFocus:select('#yellow')}\">" +
        "<div><button id='orange' style='color: orange;'>Orange</button><button id='blue' style='color: blue;'>Blue</button><button id='green' style='color: green;'>Green</button><button id='yellow' style='color: yellow;'>Yellow</button></div></div>" +

        // Include this command to verify that it is skipped by keyboard navigation since its hidden property is set to true.
        "<div id='ratingContainer' data-win-control=\"WinJS.UI.AppBarCommand\" data-win-options=\"{id:'ratingContainer', hidden: true, section:'selection',type:'content', firstElementFocus:select('#topBar #ratingControl')}\">" +
        "<div id=\"ratingControl\" data-win-control=\"WinJS.UI.Rating\" data-win-options=\"{maxRating:10, averageRating:7.6}\"></div></div>" +

        // The range input element has the win-interactive class, so we expect that home/end/left/right will be ignored by AppBar focus manager.
        "<div id='rangeContainer' tabindex='-1' data-win-control='WinJS.UI.AppBarCommand' data-win-options=\"{id:'rangeContainer', section:'global',type:'content', firstElementFocus:select('input[type=range]'), lastElementFocus:select('input[type=range]')}\">" +
        "<span>Your dog's age in human years:</span><br /><input id='range' class='win-interactive' type='range' min='0' max='10'/></div>" +

        // firstElementFocus is default and lastElementFocus is set to #adele. 
        "<div data-win-control='WinJS.UI.AppBarCommand' data-win-options=\"{id:'x8', section:'global',type:'content', lastElementFocus:select('#adele')}\"><img id='adele' tabindex='0' src='images/adele.png' />" +
        "<div> <span id=\"nowplaying\">Now Playing</span><span id=\"songtitle\">Rumour Has It</span><span id=\"albumtitle\">21 (Deluxe Edition) By Adele</span></div></div>";

        that._element.innerHTML = htmlString;
        /* Left Right Home End key focusable commands in visual order
            Selection:
                0) "buttons" Content Command: "orange"<->"yellow" (firstElementFocus is set to #orange and lastElementFocus is set to #yellow)
                 
            Global:
                1) "progress" Content Command: "progress"
                2) "rangeContainer" Content Command: "rangeContainer" (firstElementFocus and lastElementFocus are set to the <input type="range"/> element.
                3) "x8" Content Command: "adele" (firstElementFocus is default and lastElementFocus is set to #adele.)               
        */
        var AppBar = new WinJS.UI.AppBar(that._element);
        LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
        LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
        AppBar.show();
        that._element.addEventListener('aftershow', function () {
            var commandsInVisualOrder = [];
            commandsInVisualOrder.push(AppBar.getCommandById("buttons"));
            commandsInVisualOrder.push(AppBar.getCommandById("progress")); // progress is the first command element in DOM order. 
            commandsInVisualOrder.push(AppBar.getCommandById("rangeContainer")); // Contains #range element which has the .win-interactive class.
            commandsInVisualOrder.push(AppBar.getCommandById("x8"));

            // Verify initial focus is first element in DOM order
            var expectedIndex = 1;
            LiveUnit.LoggingCore.logComment("Verify that after showing an appbar, the first command in DOM order has focus");
            LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].firstElementFocus.id, document.activeElement.id, "The focused element should be the first AppBarCommand in DOM order");

            // Verify 'End' & Left arrow keys
            LiveUnit.LoggingCore.logComment("Verify that 'End' key moves focus to last visible command");
            CommonUtilities.keydown(commandsInVisualOrder[expectedIndex].firstElementFocus, Key.end);
            expectedIndex = commandsInVisualOrder.length - 1;
            LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].lastElementFocus.id, document.activeElement.id);
            LiveUnit.LoggingCore.logComment("Verify that 'Left' arrow key moves focus to correct command");
            do {
                if (WinJS.Utilities.hasClass(document.activeElement, "win-interactive")) {
                    LiveUnit.LoggingCore.logComment("Verify that 'Left' arrow key doesn't move focus to the previous element when the active element has the win-interactive class");
                    CommonUtilities.keydown(commandsInVisualOrder[expectedIndex].lastElementFocus, Key.leftArrow);
                    LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].lastElementFocus.id, document.activeElement.id);
                    // Manually move focus to continue the loop.
                    expectedIndex--;
                    commandsInVisualOrder[expectedIndex].lastElementFocus.focus();
                } else {
                    CommonUtilities.keydown(commandsInVisualOrder[expectedIndex].lastElementFocus, Key.leftArrow);
                    expectedIndex--;
                    LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].lastElementFocus.id, document.activeElement.id);
                }
            } while (expectedIndex > 0);

            LiveUnit.LoggingCore.logComment("Verify that pressing Left arrow key on first visible command wraps focus back to the last visible command.");
            CommonUtilities.keydown(commandsInVisualOrder[expectedIndex].lastElementFocus, Key.leftArrow);
            expectedIndex = commandsInVisualOrder.length - 1;
            LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].lastElementFocus.id, document.activeElement.id);

            // Verify 'Home' & Right arrow keys
            LiveUnit.LoggingCore.logComment("Verify that 'Home' key moves focus to first visible command");
            CommonUtilities.keydown(commandsInVisualOrder[expectedIndex].lastElementFocus, Key.home);
            expectedIndex = 0;
            LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].firstElementFocus.id, document.activeElement.id);
            LiveUnit.LoggingCore.logComment("Verify that 'Right' arrow key moves focus to correct command");
            do {
                if (WinJS.Utilities.hasClass(document.activeElement, "win-interactive")) {
                    LiveUnit.LoggingCore.logComment("Verify that 'Right' arrow key doesn't move focus to the next element when the active element has the win-interactive class");
                    CommonUtilities.keydown(commandsInVisualOrder[expectedIndex].firstElementFocus, Key.rightArrow);
                    LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].firstElementFocus.id, document.activeElement.id);
                    // Manually move focus to continue the loop.
                    expectedIndex++;
                    commandsInVisualOrder[expectedIndex].firstElementFocus.focus();
                } else {
                    CommonUtilities.keydown(commandsInVisualOrder[expectedIndex].firstElementFocus, Key.rightArrow);
                    expectedIndex++;
                    LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].firstElementFocus.id, document.activeElement.id);
                }
            } while (expectedIndex < commandsInVisualOrder.length - 1);

            LiveUnit.LoggingCore.logComment("Verify that pressing Right arrow key on last visible command, wraps focus back to first visible command.");
            CommonUtilities.keydown(commandsInVisualOrder[expectedIndex].element, Key.rightArrow);
            expectedIndex = 0;
            LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].firstElementFocus.id, document.activeElement.id);

            complete();
        });
    };   

    this.testMultiplePressesOFHomeAndEndKeys = function (complete) {
        /* 
        Regression Test for WinBlue 238117: Pressing "home" or "end" key twice shouldn't move the focus to a different element
        */
        var htmlString = "" +

        "<div style=\"font-size: 14px;\" data-win-control=\"WinJS.UI.AppBarCommand\" data-win-options=\"{id:'progressCmd', section:'global',type:'content', firstElementFocus:select('#progress')}\">Download progress...<progress id=\"progress\" tabindex=\"0\"></progress></div>" +

        "<div data-win-control='WinJS.UI.AppBarCommand' data-win-options=\"{id:'x8', section:'global',type:'content', lastElementFocus:select('#adele')}\"><img id='adele' tabindex='0' src='images/adele.png' />" +
        "<div> <span id=\"nowplaying\">Now Playing</span><span id=\"songtitle\">Rumour Has It</span><span id=\"albumtitle\">21 (Deluxe Edition) By Adele</span></div></div>";

        that._element.innerHTML = htmlString;
        /* Left Right Home End key focusable commands in visual order
            Selection:
                N/A
                 
            Global:
                1) "progressCmd" Content Command: "progress" (firstElementFocus is set to "#progress" and lastElementFocus is default)
                2) "x8" Content Command: "adele" (firstElementFocus is default and lastElementFocus is set to #adele)
        */
        var AppBar = new WinJS.UI.AppBar(that._element);
        LiveUnit.LoggingCore.logComment("AppBar has been instantiated.");
        LiveUnit.Assert.isNotNull(AppBar, "AppBar element should not be null when instantiated.");
        AppBar.show();
        that._element.addEventListener('aftershow', function () {
            var commandsInVisualOrder = [];
            commandsInVisualOrder.push(AppBar.getCommandById("progressCmd"));
            commandsInVisualOrder.push(AppBar.getCommandById("x8"));

            // Verify initial focus is first element in DOM order
            var activeElement = document.activeElement;
            var expectedIndex = 0;
            LiveUnit.LoggingCore.logComment("Verify that after showing an appbar, the first command in DOM order has focus");
            LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].firstElementFocus.id, activeElement.id, "The focused element should be the first AppBarCommand in DOM order");

            // Verify multiple 'End' key downs
            LiveUnit.LoggingCore.logComment("Verify that 'End' key moves focus to last visible command");
            CommonUtilities.keydown(commandsInVisualOrder[expectedIndex].firstElementFocus, Key.end);
            expectedIndex = commandsInVisualOrder.length - 1;
            LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].lastElementFocus.id, document.activeElement.id);

            LiveUnit.LoggingCore.logComment("Verify that pressing 'End' key again doesn't moves focus");
            activeElement = document.activeElement;
            CommonUtilities.keydown(commandsInVisualOrder[expectedIndex].firstElementFocus, Key.end);
            LiveUnit.Assert.areEqual(activeElement.id, document.activeElement.id);

            // Verify multiple 'Home' key downs
            LiveUnit.LoggingCore.logComment("Verify that 'Home' key moves focus to first visible command");
            CommonUtilities.keydown(commandsInVisualOrder[expectedIndex].firstElementFocus, Key.home);
            expectedIndex = 0;
            LiveUnit.Assert.areEqual(commandsInVisualOrder[expectedIndex].lastElementFocus.id, document.activeElement.id);

            LiveUnit.LoggingCore.logComment("Verify that pressing 'Home' key again doesn't moves focus");
            activeElement = document.activeElement;
            CommonUtilities.keydown(commandsInVisualOrder[expectedIndex].firstElementFocus, Key.home);
            LiveUnit.Assert.areEqual(activeElement.id, document.activeElement.id);

            complete();
        });
    };

    this.testDisposeRemovesAppBarClickEatingDiv = function (complete) {
        WinJS.UI._Overlay._clickEatingAppBarDiv = null;
        WinJS.UI._Overlay._clickEatingFlyoutDiv = null;

        var appBar = new WinJS.UI.AppBar(document.getElementById("appBarDiv"));
        document.body.appendChild(appBar.element);
        appBar.show();

        // ClickEater add/remove are high priority scheduler jobs, so we schedule an idle priority asserts
        appBar.addEventListener("aftershow", function() {
            var clickEater = document.querySelector("." + WinJS.UI._Overlay._clickEatingAppBarClass);
            LiveUnit.Assert.isTrue(clickEater);
            LiveUnit.Assert.areNotEqual("none", clickEater.style.display);

            appBar.dispose();

            WinJS.Utilities.Scheduler.schedule(function () {
                LiveUnit.Assert.areEqual("none", clickEater.style.display);
                complete();
            }, WinJS.Utilities.Scheduler.Priority.idle);
        });
    };
    
    this.testDismissesWhenLosingFocus = function (complete) {
        var root = document.getElementById("appBarDiv");
        root.innerHTML =
            "<button id='outsideAppBar'>outsideAppBar</button>" +
            "<div id='appBar'>" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"global\"}'></button>" +
                "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", hidden: true, section:\"global\"}' />" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"global\"}'></button>" +
            "</div>";
        var outsideAppBar = root.querySelector("#outsideAppBar");
        var appBar = new WinJS.UI.AppBar(root.querySelector("#appBar"));
        
        OverlayHelpers.Assert.dismissesWhenLosingFocus({
            overlay:appBar,
            focusTo: outsideAppBar
        }).then(complete);
    };
    
    this.testRemainsVisibleWhenMovingFocusInternally = function (complete) {
        var root = document.getElementById("appBarDiv");
        root.innerHTML =
            "<div id='appBar'>" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"global\"}'></button>" +
                "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", hidden: true, section:\"global\"}' />" +
                "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"global\"}'></button>" +
            "</div>";
        var appBar = new WinJS.UI.AppBar(root.querySelector("#appBar"));
        OverlayHelpers.Assert.remainsVisibleWhenMovingFocusInternally({
            overlay: appBar,
            focusFrom: appBar.getCommandById("Button0").element,
            focusTo: appBar.getCommandById("Button1").element
        }).then(complete);
    };
    
    // Creates a Menu within an AppBar, opens them both, and then gives focus to the Menu.
    // Returns a promise which completes when the AppBar and Menu controls are in this state.
    function createMenuInAppBar() {
        return new WinJS.Promise(function (complete) {
            var root = document.getElementById("appBarDiv");
            root.innerHTML =
                "<button id='outsideAppBar'>outsideAppBar</button>" +
                "<div id='appBar' data-win-control='WinJS.UI.AppBar'>" +
                    "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button0\", label:\"Button 0\", type:\"button\", section:\"global\"}'></button>" +
                    "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", hidden: true, section:\"global\"}' />" +
                    "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"Button1\", label:\"Button 1\", type:\"button\", section:\"global\"}'></button>" +
                    "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{id:\"MenuButton\",label:\"More\",type:\"flyout\",flyout:\"myMenu\"}'></button>" +
                "</div>" +
                "<div id='myMenu' tabindex='-1' data-win-control='WinJS.UI.Menu' " +
                    "data-win-options='{commands:[" +
                        "{id:\"MenuA\",label:\"Three\"}," +
                        "{id:\"MenuB\",label:\"Four\",type:\"toggle\"}" +
                    "]}'" +
                "</div>";
            
            WinJS.UI.processAll(root).then(function () {
                var appBar = root.querySelector("#appBar").winControl;
                var button0 = appBar.getCommandById("Button0").element;
                var button1 = appBar.getCommandById("Button1").element;
                var menuButton = appBar.getCommandById("MenuButton").element;
                var menu = root.querySelector("#myMenu").winControl;
                var menuItemB = menu.element.querySelector("#MenuB");
                
                OverlayHelpers.show(appBar).then(function () {
                    LiveUnit.Assert.isTrue(appBar.element.contains(document.activeElement), "Focus should initially be within the AppBar");
                    LiveUnit.Assert.isFalse(appBar.hidden, "AppBar should initially be visible");
                    
                    return Helper.waitForFocus(menu.element, function () { menuButton.click() })
                }).then(function() {                        
                    LiveUnit.Assert.isTrue(menu.element.contains(document.activeElement), "After opening the menu, focus should be within it");
                    LiveUnit.Assert.isFalse(menu.hidden, "Menu should be visible");
                    LiveUnit.Assert.isFalse(appBar.hidden, "AppBar should have remained visible when opening a menu within it");
                    
                    return Helper.focus(menuItemB);
                }).then(function() {
                    LiveUnit.Assert.areEqual(menuItemB, document.activeElement, "MenuB should have focus");
                    LiveUnit.Assert.isFalse(menu.hidden, "Menu should have remained visible");
                    LiveUnit.Assert.isFalse(appBar.hidden, "AppBar should have remained visible when moving focus within the menu");
                    
                    complete();
                });
            });
        });
    }
    
    this.testMoveFocusFromMenuToAppBar = function (complete) {
        createMenuInAppBar().then(function () {
            var root = document.querySelector("#appBarDiv");
            var appBar = root.querySelector("#appBar").winControl;
            var menu = root.querySelector("#myMenu").winControl;
            var button1 = appBar.getCommandById("Button1").element;
            
            Helper.focus(button1).then(function () {
                LiveUnit.Assert.areEqual(button1, document.activeElement, "button1 should have focus");
                LiveUnit.Assert.isTrue(menu.hidden, "Menu should have dismissed when losing focus");
                LiveUnit.Assert.isFalse(appBar.hidden, "AppBar should have remained visible when moving focus from the menu to the AppBar");
                
                complete();
            });
        });
    };
    
    this.testFocusLeavesMenuAndAppBar = function (complete) {
        createMenuInAppBar().then(function () {
            var root = document.querySelector("#appBarDiv");
            var outsideAppBar = root.querySelector("#outsideAppBar");
            var appBar = root.querySelector("#appBar").winControl;
            var menu = root.querySelector("#myMenu").winControl;
            
            Helper.focus(outsideAppBar).then(function () {
                LiveUnit.Assert.areEqual(outsideAppBar, document.activeElement, "Focus should have moved outside of the AppBar");
                LiveUnit.Assert.isTrue(menu.hidden, "Menu should have dismissed when losing focus");
                LiveUnit.Assert.isTrue(appBar.hidden, "AppBar should have dismissed when losing focus");
                
                complete();
            });
        });
    };
}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.AppBarTests");
