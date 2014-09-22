// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

module CorsicaTests {

    // If the AppBar has the invokeButton (ie closedDisplayMode !== 'none', then the AppBar also has reserved some right padding 
    // to keep other contents in the flow of the AppBar DOM from overlaying it. 
    var rightPaddingReservedForInvokeButton = 60;

    // This is the element that will contain the AppBars for all of these tests. 
    // Normally AppBars should be a direct descendant of the body element, but to be able to test our window resize handlers, 
    // we fake it by putting the AppBar in an element we can resize ourselves.
    var host;

    var fullSizeCommandWidth = 100,
        reducedSizeCommandWidth = 60,
        fullSizeSeparatorWidth = 60,
        reducedSizeSeparatorWidth = 20,
        originalHelper,
        originalAfterPositionChangeCallBack,
        reducedAppBarClass = "win-reduced",
        hiddenAppBarClass = "win-hidden";

    var testHelperPromise;
    var testHelperPromiseComplete;

    function testHelper() {
        // Return the width that would be available to the AppBar when full size (not reduced). Full size AppBar always has 0 left padding. 
        // If it doesn't have invokeButton because of closedDisplayMode 'none', Full-sized AppBar has 0 right padding, otherwise it will have some right padding.

        if (testHelperPromise) {
            // We expect scaling is completed synchronously from the time this function is called.
            // Signal that scaling is complete after timeout of 0.
            WinJS.Promise.timeout(0).then(testHelperPromiseComplete);
        }

        var prevDisplay = this.appBarEl.style.display;
        this.appBarEl.style.display = "";
        var invokeButtonPadding = this.appBarEl.winControl.closedDisplayMode === "none" ? 0 : rightPaddingReservedForInvokeButton;
        var returnValue = this.appBarEl.offsetWidth - invokeButtonPadding;
        this.appBarEl.style.display = prevDisplay;
        return returnValue;
    }

    function createAppBarCommands(cmdButtonCount, separatorCount) {
        var cmds = [],
            cmd,
            string;

        cmdButtonCount = cmdButtonCount === +cmdButtonCount ? cmdButtonCount : 1;
        separatorCount = separatorCount === +separatorCount ? separatorCount : 0;
        for (var i = 0; i < cmdButtonCount; i++) {
            string = "Button " + i;
            cmd = new WinJS.UI.AppBarCommand(null, { id: string, icon: "add", label: string, type: "button" });
            // Assign a quasi-random section
            cmd.section = (cmdButtonCount + separatorCount) * i % 2 === 0 ? "global" : "selection";
            cmds.push(cmd);
        }
        for (var j = 0; j < separatorCount; j++) {
            string = "Separator " + j;
            cmd = new WinJS.UI.AppBarCommand(null, { id: string, type: "separator" });
            // Assign a quasi-random section
            cmd.section = (cmdButtonCount + separatorCount) * j % 2 === 0 ? "global" : "selection";
            cmds.push(cmd);
        }
        return cmds;
    }

    function isReducedSizeExpected(appBarElem, cmdCount, sepCount, widthOfAllContentCommands) {
        // Check if full size commands would fit in the full size AppBar. Otherwise we expect the AppBar to have scaled down. 

        var ctrlWidth = parseInt(getComputedStyle(host).width, 10); // In case AppBar is completely hidden we measure the width of its parent.
        var hasInvokeButton = appBarElem.winControl.closedDisplayMode !== "none";
        var spaceForCommandsInFullSizeAppBar = ctrlWidth - (hasInvokeButton ? rightPaddingReservedForInvokeButton : 0);

        LiveUnit.LoggingCore.logComment("Space Available for commands: " + spaceForCommandsInFullSizeAppBar);
        LiveUnit.LoggingCore.logComment("AppBar command button count: " + cmdCount);
        LiveUnit.LoggingCore.logComment("AppBar command separator count: " + sepCount);
        var totalFullSizeCmdWidth = (cmdCount * fullSizeCommandWidth) + (sepCount * fullSizeSeparatorWidth + widthOfAllContentCommands);
        return totalFullSizeCmdWidth > spaceForCommandsInFullSizeAppBar ? true : false;
    }

    function setWidth(element, width) {
        element.style.width = width + "px";
    }

    function verifyCommandSizes(appBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, widthOfAllContentCommands) {
        var expectingReducedSize = isReducedSizeExpected(appBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, widthOfAllContentCommands);

        verifyReducedClass(expectingReducedSize, appBarElem);

        LiveUnit.LoggingCore.logComment("Verifying Command Sizes");
        // We have a hard coded expectaion about button and separator command sizes. Verify them now.
        verifyButtonCommandSizes(expectingReducedSize, appBarElem);
        verifySeparatorCommandSizes(expectingReducedSize, appBarElem);
    }

    function verifyReducedClass(expectingReducedSize, appBarElem) {
        LiveUnit.LoggingCore.logComment("Expecting Reduced-sized commands? " + expectingReducedSize);
        LiveUnit.Assert.areEqual(WinJS.Utilities.hasClass(appBarElem, reducedAppBarClass), expectingReducedSize),
        "AppBar hasClass \"" + reducedAppBarClass + "\":" + expectingReducedSize + ", but we were expecting " + !expectingReducedSize;
    }

    function verifyButtonCommandSizes(expectingReducedSize, appBarElem) {
        var buttons = appBarElem.querySelectorAll("button.win-command"),
            buttonsLength = buttons.length,
            labelElement,
            displayNone,
            wasHidden;

        // Make sure we can measure.
        if (appBarElem.style.display === "none") {
            displayNone = true;
            appBarElem.style.display = "";
        }
        if (WinJS.Utilities.hasClass(appBarElem, hiddenAppBarClass)) {
            wasHidden = true;
            WinJS.Utilities.removeClass(appBarElem, hiddenAppBarClass);
        }
        if (expectingReducedSize) { // Reduced-size commands.
            for (var i = 0; i < buttonsLength; i++) {
                if (!buttons[i].winControl.hidden) {
                    LiveUnit.Assert.areEqual(buttons[i].offsetWidth, reducedSizeCommandWidth, "Command Buttons are too big");
                    labelElement = buttons[i].querySelector(".win-label");
                    LiveUnit.Assert.areEqual(getComputedStyle(labelElement).display, "none", "Command Button labels should be hidden");
                }
            }
        } else { // Full-size commands.
            for (var i = 0; i < buttonsLength; i++) {
                if (!buttons[i].winControl.hidden) {
                    LiveUnit.Assert.areEqual(buttons[i].offsetWidth, fullSizeCommandWidth, "Command Buttons are too small");
                    labelElement = buttons[i].querySelector(".win-label");
                    LiveUnit.Assert.areNotEqual(labelElement.style.display, "none", "Command Button labels should be visible when commands are full size.");
                }
            }
        }
        if (displayNone) {
            // Restore display.
            appBarElem.style.display = "none";
        }
        if (wasHidden) {
            WinJS.Utilities.addClass(appBarElem, "win-hidden")
        }
    }

    function verifySeparatorCommandSizes(expectingReducedSize, appBarElem) {
        var separators = appBarElem.querySelectorAll("hr.win-command"),
            separatorsLength = separators.length,
            style,
            measurement;
        if (expectingReducedSize) { // Reduced-size commands.
            for (var i = 0; i < separatorsLength; i++) {
                if (!separators[i].winControl.hidden) {
                    style = getComputedStyle(separators[i]); // For separators we have to measure their width + margins.
                    measurement = parseInt(style.marginLeft, 10) + parseInt(style.marginRight, 10) + parseInt(style.width, 10);
                    LiveUnit.Assert.areEqual(measurement, reducedSizeSeparatorWidth, "Command Separators are too big");
                }
            }
        } else { // Full-size commands.
            for (var i = 0; i < separatorsLength; i++) {
                if (!separators[i].winControl.hidden) {
                    style = getComputedStyle(separators[i]); // For separators we have to measure their width + margins.
                    measurement = parseInt(style.marginLeft, 10) + parseInt(style.marginRight, 10) + parseInt(style.width, 10);
                    LiveUnit.Assert.areEqual(measurement, fullSizeSeparatorWidth, "Command Separators are too small");
                }
            }
        }

    }

    function waitForCommandAnimations(appBar, animateCommands) {
        return new WinJS.Promise(function (complete) {
            appBar._endAnimateCommandsCallBack = complete;
            animateCommands();
        });
    }

    export class AppBarScalabilityTests {
        "use strict";



        setUp() {
            LiveUnit.LoggingCore.logComment("In setUp");
            host = document.createElement("div");
            host.id = "host";
            host.style.width = "650px";
            host.style.height = "400px";
            host.style.margin = "40px";
            host.style.position = "relative";
            host.style.border = "2px solid silver";
            host.innerHTML = "<div id='topappbar' style='background-color:green;position:absolute;'></div>" +
            "<div id='bottomappbar' style='background-color:blue;position:absolute;'></div>";
            document.body.appendChild(host);

            // Overwrite _scaleHelper so that we can mock test the scaling commands on window resize.
            originalHelper = WinJS.UI._AppBarCommandsLayout.prototype._scaleHelper;
            WinJS.UI._AppBarCommandsLayout.prototype._scaleHelper = testHelper;
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            if (document.body.contains(host)) {
                WinJS.Utilities.disposeSubTree(host);
                document.body.removeChild(host);
                host = null;
            }

            testHelperPromise && testHelperPromise.cancel();
            testHelperPromiseComplete = null;

            // Restore original implementations.
            WinJS.UI._AppBarCommandsLayout.prototype._scaleHelper = originalHelper;
        }



        testAppBarPadding = function (complete) {
            // Scalability requires that that padding of the AppBar doesn't deviate from our hard coded values.

            var topAppBarElem = document.getElementById("topappbar");

            var topAppBar = new WinJS.UI.AppBar(topAppBarElem, { sticky: true, placement: 'top' });
            LiveUnit.LoggingCore.logComment("Top AppBar Initialized with commands");

            topAppBar.show();

            LiveUnit.LoggingCore.logComment("Verify padding for full-size AppBar with InvokeButton");
            topAppBar.closedDisplayMode = 'minimal';
            WinJS.Utilities.removeClass(topAppBarElem, reducedAppBarClass);
            var appBarStyle = getComputedStyle(topAppBarElem);
            LiveUnit.Assert.areEqual(0, parseInt(appBarStyle.paddingLeft, 10), "Incorrect left padding for full-size AppBar with InvokeButton");
            LiveUnit.Assert.areEqual(rightPaddingReservedForInvokeButton, parseInt(appBarStyle.paddingRight, 10), "Incorrect right padding for full-size AppBar with InvokeButton");

            LiveUnit.LoggingCore.logComment("Verify padding for full-size AppBar with no InvokeButton");
            topAppBar.closedDisplayMode = "none";
            WinJS.Utilities.removeClass(topAppBarElem, reducedAppBarClass);
            appBarStyle = getComputedStyle(topAppBarElem);
            LiveUnit.Assert.areEqual(0, parseInt(appBarStyle.paddingLeft, 10), "Incorrect left padding for full-size AppBar with no InvokeButton");
            LiveUnit.Assert.areEqual(0, parseInt(appBarStyle.paddingRight, 10), "Incorrect right padding for full-size AppBar with no InvokeButton");

            LiveUnit.LoggingCore.logComment("Verify padding for win-reduced AppBar with InvokeButton");
            topAppBar.closedDisplayMode = 'minimal';
            WinJS.Utilities.addClass(topAppBarElem, reducedAppBarClass);
            appBarStyle = getComputedStyle(topAppBarElem);
            LiveUnit.Assert.areEqual(10, parseInt(appBarStyle.paddingLeft, 10), "Incorrect left padding for win-reduced AppBar with InvokeButton");
            LiveUnit.Assert.areEqual(rightPaddingReservedForInvokeButton, parseInt(appBarStyle.paddingRight, 10), "Incorrect right padding for win-reduced AppBar with InvokeButton");

            LiveUnit.LoggingCore.logComment("Verify padding for win-reduced AppBar with no InvokeButton");
            topAppBar.closedDisplayMode = "none";
            WinJS.Utilities.addClass(topAppBarElem, reducedAppBarClass);
            appBarStyle = getComputedStyle(topAppBarElem);
            LiveUnit.Assert.areEqual(10, parseInt(appBarStyle.paddingLeft, 10), "Incorrect left padding for win-reduced AppBar with no InvokeButton");
            LiveUnit.Assert.areEqual(10, parseInt(appBarStyle.paddingRight, 10), "Incorrect right padding for win-reduced AppBar with no InvokeButton");

            complete();
        };

        testCommandSizeAtAppBarInitAndResize = function (complete) {
            var noInvokeButton_topAppBar,
                invokeButton_bottomAppBar;

            var topAppBarElem = document.getElementById("topappbar"),
                bottomAppBarElem = document.getElementById("bottomappbar"),
                appBarVisibleCommandCount = 6,
                appBarVisibleSeparatorCount = 1;

            // Create AppBarCommands via JavaScript for the topAppBar and then pass them to the constructor of the TopAppBar.
            var commands = createAppBarCommands(appBarVisibleCommandCount, appBarVisibleSeparatorCount);
            // Add 2 hidden commands to verify that these are not included when we calculate how wide the commands are.
            commands = commands.concat([
                new WinJS.UI.AppBarCommand(null, { label: "hiddenButton", hidden: true }),
                new WinJS.UI.AppBarCommand(null, { hidden: true, type: "separator" })
            ]);
            // Add a content command
            var contentDiv = document.createElement("DIV");
            contentDiv.innerHTML = "<div style=\"height:50px; width:50px; background-color:yellow;\"></div>";
            contentDiv.style.padding = "0px";
            contentDiv.style.margin = "0px";
            contentDiv.style.border = "none";
            commands = commands.concat([
                new WinJS.UI.AppBarCommand(contentDiv, { id: "contentDiv", type: 'content' }),
            ]);

            LiveUnit.LoggingCore.logComment("Top AppBarCommands created");


            // Create AppBarCommands as innerHTML of the BottomAppBarElement and then call the AppBar constructor. Include 2 extra hidden buttons and one visible content command.
            bottomAppBarElem.innerHTML = "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{label:\"Button 0\", type:\"button\", section:\"global\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{label:\"Button 1\", type:\"button\", section:\"global\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{label:\"Button 2\", type:\"button\", section:\"selection\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{label:\"Button 3\", type:\"button\", section:\"global\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{label:\"Button 4\", type:\"button\", section:\"selection\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{label:\"Button 5\", type:\"button\", section:\"selection\"}'></button>" +
            "<button data-win-control='WinJS.UI.AppBarCommand' data-win-options='{label:\"Button 6\", type:\"button\", section:\"global\", hidden: true}'></button>" +
            "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", hidden: true, section:\"global\"}' />" +
            "<hr data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"separator\", section:\"selection\"}' />" +
            "<div style=\"border:none; padding:0px; margin:0px;\" data-win-control='WinJS.UI.AppBarCommand' data-win-options='{type:\"content\", section:\"selection\"}'> <div style=\"height:50px;width:50px; background-color:yellow;\"></div> </div>";

            // The total widths of full size commands in each AppBar should be 710px. 
            var expectedWidthOfFullSizeCommands = 710;
            // The AppBar's will each start at 650px wide and are constrained by the width of their parent element. 
            // They will need to scale their content down to fit everything on a sigle row. 
            // They should do so by scheduling a job to apply the win-reduced class on themselves after construction. 
            noInvokeButton_topAppBar = new WinJS.UI.AppBar(topAppBarElem, { sticky: true, placement: 'top', commands: commands, closedDisplayMode: 'none' });
            LiveUnit.LoggingCore.logComment("noInvokeButton_topAppBar has initialized with more commands than it can fit");

            var msg = "noInvokeButton_topAppBar with too many commands should not apply reduced class synchronously from construction.";
            LiveUnit.LoggingCore.logComment("Test: " + msg);
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(topAppBarElem, reducedAppBarClass), msg);

            testHelperPromise = new WinJS.Promise(function (complete) {
                testHelperPromiseComplete = complete;
            }).then(function () {

                    msg = "noInvokeButton_topAppBar with too many comands should have applied reduced class asynchronously after construction.";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(topAppBarElem, reducedAppBarClass), msg);

                    invokeButton_bottomAppBar = new WinJS.UI.AppBar(bottomAppBarElem, { sticky: true, closedDisplayMode: 'minimal' });
                    LiveUnit.LoggingCore.logComment("invokeButton_bottomAppBar has initialized with more commands than it can fit");

                    var msg = "invokeButton_bottomAppBar with too many commands should not apply reduced class synchronously from construction.";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(bottomAppBarElem, reducedAppBarClass), msg);

                    testHelperPromise = new WinJS.Promise(function (complete) {
                        testHelperPromiseComplete = complete;
                    });
                    return testHelperPromise;
                }).then(function () {
                    msg = "invokeButton_bottomAppBar with too many commands should have applied reduced class asynchronously after construction.";
                    LiveUnit.LoggingCore.logComment("Test: " + msg);
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(topAppBarElem, reducedAppBarClass), msg);

                    // Show both AppBars so we can test resizing scenarios will cause the AppBar to scale, closed AppBars won't scale on resize.
                    noInvokeButton_topAppBar.show();
                    invokeButton_bottomAppBar.show();

                    // Verify that all commands in both AppBars conform to our hardCoded size expectations. 
                    // Also verify that the total width of fullsize commands in each AppBar is 710. The rest of this test depends on it.
                    verifyCommandSizes(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, WinJS.Utilities.getTotalWidth(contentDiv));
                    verifyCommandSizes(bottomAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, WinJS.Utilities.getTotalWidth(<HTMLElement>bottomAppBarElem.querySelector("div.win-command")));

                    msg = "TEST ERROR: Width of full size commands in top and bottom AppBars don't both match the preconditional value: " + expectedWidthOfFullSizeCommands;
                    LiveUnit.Assert.isTrue(expectedWidthOfFullSizeCommands === noInvokeButton_topAppBar._layout._getWidthOfFullSizeCommands() && expectedWidthOfFullSizeCommands === invokeButton_bottomAppBar._layout._getWidthOfFullSizeCommands(), msg);
                    var minimumSizeForFullSizeAppBarWithNoInvokeButton = expectedWidthOfFullSizeCommands;
                    var minimumSizeForFullSizeAppBarWithInvokeButton = expectedWidthOfFullSizeCommands + rightPaddingReservedForInvokeButton;

                    // Begin Increasing the container width to increase the AppBar width's in turn. Eventually scaling to full size commands.
                    LiveUnit.LoggingCore.logComment("Testing that AppBar resize scales command appropriately.");

                    // Set width of container to be just under the minimum required for AppBar's with no invokeButton to scale to full size and verify that neither AppBar scales.
                    setWidth(host, minimumSizeForFullSizeAppBarWithNoInvokeButton - 1);

                    // Workaround since we can't trigger a window resize from javascript directly.
                    // Let the AppBar layout know that a resize occurred directly.
                    noInvokeButton_topAppBar._layout.resize();
                    invokeButton_bottomAppBar._layout.resize();

                    msg = "Neither AppBar should be wide enough to hold commands at full-size."
            LiveUnit.Assert.isTrue(isReducedSizeExpected(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, WinJS.Utilities.getTotalWidth(contentDiv)), msg);
                    LiveUnit.Assert.isTrue(isReducedSizeExpected(bottomAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, WinJS.Utilities.getTotalWidth(contentDiv)), msg);

                    // Set width of container to be EXACTLY the minimum required for AppBar's with no invokeButton to scale to full size and verify that only that AppBar scales up.
                    setWidth(host, minimumSizeForFullSizeAppBarWithNoInvokeButton);
                    noInvokeButton_topAppBar._layout.resize();
                    invokeButton_bottomAppBar._layout.resize();

                    msg = "AppBars without InvokeButton should now be wide enough to hold commands at full size. AppBars with InvokeButton should still have reduced commands."
            LiveUnit.Assert.isFalse(isReducedSizeExpected(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, WinJS.Utilities.getTotalWidth(contentDiv)), msg);
                    LiveUnit.Assert.isTrue(isReducedSizeExpected(bottomAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, WinJS.Utilities.getTotalWidth(contentDiv)), msg);

                    // Set width of container to be just under the minimum required for AppBar's WITH invokeButton to scale to full size. Verify no change since last resize.
                    setWidth(host, minimumSizeForFullSizeAppBarWithInvokeButton - 1);
                    noInvokeButton_topAppBar._layout.resize();
                    invokeButton_bottomAppBar._layout.resize();

                    LiveUnit.Assert.isFalse(isReducedSizeExpected(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, WinJS.Utilities.getTotalWidth(contentDiv)), msg);
                    LiveUnit.Assert.isTrue(isReducedSizeExpected(bottomAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, WinJS.Utilities.getTotalWidth(contentDiv)), msg);

                    // Set width of container to be EXACTLY the minimum required for AppBar's WITH invokeButton to scale to full size. Verify Both AppBars are now fullsize.           
                    setWidth(host, minimumSizeForFullSizeAppBarWithInvokeButton);
                    noInvokeButton_topAppBar._layout.resize();
                    invokeButton_bottomAppBar._layout.resize();

                    msg = "AppBars with InvokeButton should now be EXACTLY wide enough to hold commands at full size. All AppBars should be full size."
            LiveUnit.Assert.isFalse(isReducedSizeExpected(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, WinJS.Utilities.getTotalWidth(contentDiv)), msg);
                    LiveUnit.Assert.isFalse(isReducedSizeExpected(bottomAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, WinJS.Utilities.getTotalWidth(contentDiv)), msg);

                    complete();

                });
        };

        testHideShowAndShowOnlyCommandsWhileClosed = function (complete) {
            // This test verifies that any changes to commands while the AppBar is closed get 
            // reflected by AppBar Scalability just before the next time the AppBar is opened.

            function getRandomCommands(cmdArr) {
                var arr = [],
                    visibleCmdCount = 0,
                    visibleSepCount = 0,
                    visibleContentWidth = 0,
                    cmdArrLen = cmdArr.length,
                    cmd,
                    arrLen = 0;

                while (arrLen === 0) {
                    arrLen = Math.floor(Math.random() * cmdArrLen);
                }
                for (var i = 0; i < arrLen; i++) {
                    cmd = cmdArr[i];
                    if (cmd.type === "separator") {
                        visibleSepCount++;
                    } else if (cmd.type !== "content") {
                        visibleCmdCount++;
                    } else {
                        visibleContentWidth += WinJS.Utilities.getTotalWidth(cmd);
                    }
                    arr.push(cmdArr[i]);
                }
                return {
                    arr: arr,
                    visibleCmdCount: visibleCmdCount,
                    visibleSepCount: visibleSepCount,
                    visibleContentWidth: visibleContentWidth,
                };
            }

            function testHideCommandsAfterHide() {
                topAppBar.removeEventListener("afterhide", testHideCommandsAfterHide, false);
                nextTestIndex++;
                var cmd;
                LiveUnit.LoggingCore.logComment("AppBar.hideCommands to make room for other commands to grow to full size.");
                for (var i = 0; i < commands.length; i++) {
                    cmd = commands[i];
                    if (!cmd.hidden) {
                        if (cmd.type === "separator") {
                            appBarVisibleSeparatorCount--;
                        } else if (cmd.type !== "content") {
                            appBarVisibleCommandCount--;
                        } else {
                            appBarVisibleContentWidth -= contentDivWidth;
                        }
                        topAppBar.hideCommands([cmd]);
                        var expectingReducedClass = isReducedSizeExpected(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, appBarVisibleContentWidth);
                        verifyReducedClass(expectingReducedClass, topAppBarElem);

                    }
                };
                topAppBar.show();
            }

            function testShowCommandsAfterHide() {
                topAppBar.removeEventListener("afterhide", testShowCommandsAfterHide, false);
                nextTestIndex++;
                var cmd;
                LiveUnit.LoggingCore.logComment("AppBar.showCommands to force commands to shrink down");
                for (var i = 0; i < commands.length; i++) {
                    cmd = commands[i];
                    topAppBar.showCommands([cmd]);
                    if (cmd.type === "separator") {
                        appBarVisibleSeparatorCount++;
                    } else if (cmd.type !== "content") {
                        appBarVisibleCommandCount++;
                    } else {
                        appBarVisibleContentWidth += contentDivWidth;
                    }
                    var expectingReducedClass = isReducedSizeExpected(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, appBarVisibleContentWidth);
                    verifyReducedClass(expectingReducedClass, topAppBarElem);
                }
                topAppBar.show();
            }

            function testShowOnlyCommandsAfterHide() {
                topAppBar.removeEventListener("afterhide", testShowOnlyCommandsAfterHide, false);
                nextTestIndex++;
                var cmd;
                LiveUnit.LoggingCore.logComment("AppBar.showOnlyCommands to make it full size");
                var iterations = 25;
                var randomCommands;
                for (var i = 0; i < iterations; i++) {
                    randomCommands = getRandomCommands(commands);
                    topAppBar.showOnlyCommands(randomCommands.arr);

                    appBarVisibleCommandCount = randomCommands.visibleCmdCount;
                    appBarVisibleSeparatorCount = randomCommands.visibleSepCount;
                    appBarVisibleContentWidth = randomCommands.visibleContentWidth;

                    var expectingReducedClass = isReducedSizeExpected(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, appBarVisibleContentWidth);
                    verifyReducedClass(expectingReducedClass, topAppBarElem);
                }
                topAppBar.show();
            }

            function testComplete() {
                topAppBar.removeEventListener("beforeshow", verifyCommandSizesAtShowTime, false);
                topAppBar.removeEventListener("afterhide", testComplete, false);
                complete();
            }

            function verifyCommandSizesAtShowTime() {
                verifyCommandSizes(topAppBar.element, appBarVisibleCommandCount, appBarVisibleSeparatorCount, appBarVisibleContentWidth);
                // Verify that AppBar scalability tracks calls to the showCommands, hideCommands, 
                // and showOnlyCommands api's while closed, and sizes the buttons correctly.
                topAppBar.addEventListener("afterhide", testOrder[nextTestIndex], false);
                topAppBar.hide();
            }

            // our 'beforeshow' event listener will use these to set the correct 'afterhide' listener.
            var nextTestIndex = 0;
            var testOrder = [
                testHideCommandsAfterHide,
                testShowCommandsAfterHide,
                testShowOnlyCommandsAfterHide,
                testComplete,
            ];

            var topAppBarElem = document.getElementById("topappbar"),
                appBarVisibleCommandCount = 6,
                appBarVisibleSeparatorCount = 1,
                appBarVisibleContentWidth = 0;

            // Create AppBarCommands via JavaScript for the topAppBar and then pass them to the constructor of the TopAppBar.
            var commands = createAppBarCommands(appBarVisibleCommandCount, appBarVisibleSeparatorCount);
            // Add 2 hidden commands to verify that these are not included when we calculate how wide the commands are.
            commands = commands.concat([
                new WinJS.UI.AppBarCommand(null, { label: "hiddenButton", hidden: true }),
                new WinJS.UI.AppBarCommand(null, { hidden: true, type: "separator" })
            ]);
            // Add a content command
            var contentDiv = document.createElement("DIV");
            contentDiv.innerHTML = "<div style=\"height:50px; width:50px; background-color:yellow;\"></div>";
            contentDiv.style.padding = "0px";
            contentDiv.style.margin = "0px";
            contentDiv.style.border = "none";
            commands = commands.concat([
                new WinJS.UI.AppBarCommand(contentDiv, { id: "contentDiv", type: 'content' }),
            ]);

            // Element needs to be in the DOM before we can measure.
            document.body.appendChild(contentDiv);
            var contentDivWidth = WinJS.Utilities.getTotalWidth(contentDiv);
            appBarVisibleContentWidth += contentDivWidth;

            LiveUnit.LoggingCore.logComment("Top AppBarCommands created");
            var topAppBar = new WinJS.UI.AppBar(topAppBarElem, { sticky: true, placement: 'top', commands: commands, closedDisplayMode: 'none' });
            LiveUnit.LoggingCore.logComment("Top AppBar Initialized with commands");


            // Set up event listener to check for correct command sizes when the AppBar is opening.
            topAppBar.addEventListener("beforeshow", verifyCommandSizesAtShowTime, false);

            // Need to force the AppBar to measure the contentCommand we added. The AppBar does this lazily upon construction or whenever it is opened. 
            // Open the AppBar to run our 'beforeshow' handler and verify that the commands set in the constructor are scaled correctly.
            topAppBar.show();


        };

        testAppBarCommandsHiddenProperty = function (complete) {

            function testSettingHiddenTrue() {
                topAppBar.removeEventListener("afterhide", testSettingHiddenTrue, false);
                nextTestIndex++;
                var cmd;
                LiveUnit.LoggingCore.logComment("AppBarCommand.hidden to make room for other commands to grow to full size.");
                // Hide appbarcommands
                for (var i = 0; i < commands.length; i++) {
                    cmd = commands[i];
                    if (!cmd.hidden) {
                        if (cmd.type === "separator") {
                            appBarVisibleSeparatorCount--;
                        } else if (cmd.type !== "content") {
                            appBarVisibleCommandCount--;
                        } else {
                            appBarVisibleContentWidth -= contentDivWidth;
                        }
                        cmd.hidden = true;
                        var expectingReducedClass = isReducedSizeExpected(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, appBarVisibleContentWidth);
                        verifyReducedClass(expectingReducedClass, topAppBarElem);
                    }
                }
                topAppBar.show();
            }

            function testSettingHiddenFalse() {
                topAppBar.removeEventListener("afterhide", testSettingHiddenFalse, false);
                nextTestIndex++;
                var cmd;
                // Show appbarcommands
                for (var i = 0; i < commands.length; i++) {
                    cmd = commands[i];
                    if (cmd.type === "separator") {
                        appBarVisibleSeparatorCount++;
                    } else if (cmd.type !== "content") {
                        appBarVisibleCommandCount++;
                    } else {
                        appBarVisibleContentWidth += contentDivWidth;
                    }
                    cmd.hidden = false;
                    var expectingReducedClass = isReducedSizeExpected(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, appBarVisibleContentWidth);
                    verifyReducedClass(expectingReducedClass, topAppBarElem);
                }
                topAppBar.show();
            }

            function testComplete() {
                topAppBar.removeEventListener("beforeshow", verifyCommandSizesAtShowTime, false);
                topAppBar.removeEventListener("afterhide", testComplete, false);
                complete();
            }

            var verifyCommandSizesAtShowTime = function verifyCommandSizesAtShowTime() {
                verifyCommandSizes(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, appBarVisibleContentWidth);

                topAppBar.addEventListener("afterhide", testOrder[nextTestIndex], false);
                topAppBar.hide();
            }

        // our 'beforeshow' event listener will use these to set the correct 'afterhide' listener.
        var nextTestIndex = 0;
            var testOrder = [
                testSettingHiddenTrue,
                testSettingHiddenFalse,
                testComplete,
            ];

            var topAppBarElem = document.getElementById("topappbar"),
                appBarVisibleCommandCount = 6,
                appBarVisibleSeparatorCount = 1,
                appBarVisibleContentWidth = 0;

            // Create AppBarCommands via JavaScript for the topAppBar and then pass them to the constructor of the TopAppBar.
            var commands = createAppBarCommands(appBarVisibleCommandCount, appBarVisibleSeparatorCount);
            // Add 2 hidden buttons to verify that these are not included when we calculate how wide the commands are.
            commands = commands.concat([
                new WinJS.UI.AppBarCommand(null, { id: "hiddenButton", label: "hiddenButton", hidden: true }),
                new WinJS.UI.AppBarCommand(null, { id: "hiddenSeparator", hidden: true, type: "separator" })
            ]);
            // Add a content command
            var contentDiv = document.createElement("DIV");
            contentDiv.innerHTML = "<div style=\"height:50px; width:50px; background-color:yellow;\"></div>";
            contentDiv.style.padding = "0px";
            contentDiv.style.margin = "0px";
            contentDiv.style.border = "none";
            commands = commands.concat([
                new WinJS.UI.AppBarCommand(contentDiv, { id: "contentDiv", type: 'content' }),
            ]);

            // Element needs to be in the DOM before we can measure.
            document.body.appendChild(contentDiv);
            var contentDivWidth = WinJS.Utilities.getTotalWidth(contentDiv);
            appBarVisibleContentWidth += contentDivWidth;

            LiveUnit.LoggingCore.logComment("Top AppBarCommands created");
            var topAppBar = new WinJS.UI.AppBar(topAppBarElem, { sticky: true, placement: 'top', commands: commands, closedDisplayMode: 'none' });
            LiveUnit.LoggingCore.logComment("Top AppBar Initialized with commands");

            // Set up event listener to check for correct command sizes when the AppBar is opening.
            topAppBar.addEventListener("beforeshow", verifyCommandSizesAtShowTime, false);

            // Need to force the AppBar to measure the contentCommand we added. The AppBar does this lazily upon construction or whenever it is opened. 
            // Open the AppBar to run our 'beforeshow' handler and verify that the commands set in the constructor are scaled correctly.
            topAppBar.show();
        };



        testAppBarScalabilityWhileAppBarIsShowing = function (complete) {
            var topAppBarElem = document.getElementById("topappbar"),
                appBarVisibleCommandCount = 6,
                appBarVisibleSeparatorCount = 1,
                appBarVisibleContentWidth = 0;

            // Create AppBarCommands via JavaScript for the topAppBar and then pass them to the constructor of the TopAppBar.
            var commands = createAppBarCommands(appBarVisibleCommandCount, appBarVisibleSeparatorCount);
            // Add 2 hidden commands to verify that these are not included when we calculate how wide the commands are.
            commands = commands.concat([
                new WinJS.UI.AppBarCommand(null, { id: "hiddenButton", label: "hiddenButton", hidden: true }),
                new WinJS.UI.AppBarCommand(null, { id: "hiddenSeparator", hidden: true, type: "separator" })
            ]);
            // Add a content command
            var contentDiv = document.createElement("DIV");
            contentDiv.innerHTML = "<div style=\"height:50px; width:50px; background-color:yellow;\"></div>";
            contentDiv.style.padding = "0px";
            contentDiv.style.margin = "0px";
            contentDiv.style.border = "none";
            commands = commands.concat([
                new WinJS.UI.AppBarCommand(contentDiv, { id: "contentDiv", type: 'content' }),
            ]);

            // Element needs to be in the DOM before we can measure.
            document.body.appendChild(contentDiv);
            var contentDivWidth = WinJS.Utilities.getTotalWidth(contentDiv);
            appBarVisibleContentWidth += contentDivWidth;

            LiveUnit.LoggingCore.logComment("Top AppBarCommands created");
            var topAppBar = <WinJS.UI.PrivateAppBar> new WinJS.UI.AppBar(topAppBarElem, { sticky: true, placement: 'top', commands: commands, closedDisplayMode: 'none' });
            LiveUnit.LoggingCore.logComment("Top AppBar Initialized with commands");
            topAppBar.show();

            LiveUnit.LoggingCore.logComment("Hiding Button1 to make room for the other commands to grow full size.");

            var promise = waitForCommandAnimations(topAppBar, function () { topAppBar.hideCommands([commands[1]]); });
            LiveUnit.LoggingCore.logComment("Verify that AppBar.hideCommands() on visible AppBar doesn't happen syncronously, but rather waits for command hiding animations to complete.");
            verifyCommandSizes(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, appBarVisibleContentWidth);
            promise.then(function () {
                appBarVisibleCommandCount--;
                verifyCommandSizes(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, appBarVisibleContentWidth);

                LiveUnit.LoggingCore.logComment("Showing Button1 to force commands to scale down.");
                promise = waitForCommandAnimations(topAppBar, function () { topAppBar.showCommands([commands[1]]); });
                LiveUnit.LoggingCore.logComment("Verify that AppBar.showCommands() on visible AppBar doesnt happen syncronously.");
                verifyCommandSizes(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, appBarVisibleContentWidth);
                return promise;
            }).then(function () {
                    appBarVisibleCommandCount++;
                    verifyCommandSizes(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, appBarVisibleContentWidth);

                    // Simultaneously hide Button0 while showing every other command button and command separator, resulting 
                    // in an overall Net gain in AppBar visible content width. verify that the commands scale correctly.        
                    LiveUnit.LoggingCore.logComment("Verify that when a call to AppBar.showOnlyCommands() on a visible AppBar results in a net decrease of content width, the command size changes do not happen synchronously");
                    return waitForCommandAnimations(topAppBar, function () { topAppBar.showOnlyCommands([commands[3], commands[4], commands[5], commands[6], commands[7], commands[8], commands[9]]); });
                }).then(function () {
                    appBarVisibleCommandCount = 4;
                    appBarVisibleSeparatorCount = 2;
                    verifyCommandSizes(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, appBarVisibleContentWidth);
                    LiveUnit.LoggingCore.logComment("Verify that visible AppBar waited until after the animations finished before scaling its content");
                    LiveUnit.Assert.areEqual(topAppBar._layout._scaleAfterAnimations, true, "AppBar should scale commands after hiding animations");

                    LiveUnit.LoggingCore.logComment("Verify that when a call to AppBar.showOnlyCommands() on a visible AppBar results in a net increase of content width, the command size changes do happen synchronously");
                    return waitForCommandAnimations(topAppBar, function () { topAppBar.showOnlyCommands([commands[0], commands[1], commands[2], commands[3], commands[4], commands[5], commands[9]]); });
                }).then(function () {
                    appBarVisibleCommandCount = 6;
                    appBarVisibleSeparatorCount = 0;
                    verifyCommandSizes(topAppBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, appBarVisibleContentWidth);

                    // Verify that the private scaleAfterAnimations flag did not get set to true.
                    LiveUnit.LoggingCore.logComment("Verify that visible AppBar did not wait until after the animations to scale its content");
                    LiveUnit.Assert.areEqual(topAppBar._layout._scaleAfterAnimations, false, "AppBar should scale commands before staring animations");
                    complete();
                });
        };
    }
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.AppBarScalabilityTests");
