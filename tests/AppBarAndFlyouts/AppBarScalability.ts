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
        fullSizeSeparatorWidth = 60,
        originalHelper,
        originalAfterPositionChangeCallBack,
        hiddenAppBarClass = "win-hidden";

    var testHelperPromise;
    var testHelperPromiseComplete;

    function testHelper() {
        // Return the width that would be available to the AppBar when full size. Full size AppBar always has 0 left padding. 
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

    function setWidth(element, width) {
        element.style.width = width + "px";
    }

    function verifyCommandSizes(appBarElem, appBarVisibleCommandCount, appBarVisibleSeparatorCount, widthOfAllContentCommands) {
        LiveUnit.LoggingCore.logComment("Verifying Command Sizes");
        // We have a hard coded expectaion about button and separator command sizes. Verify them now.
        verifyButtonCommandSizes(appBarElem);
        verifySeparatorCommandSizes(appBarElem);
    }

    function verifyButtonCommandSizes(appBarElem) {
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

        for (var i = 0; i < buttonsLength; i++) {
            if (!buttons[i].winControl.hidden) {
                LiveUnit.Assert.areEqual(buttons[i].offsetWidth, fullSizeCommandWidth, "Command Buttons are too small");
                labelElement = buttons[i].querySelector(".win-label");
                LiveUnit.Assert.areNotEqual(labelElement.style.display, "none", "Command Button labels should be visible when commands are full size.");
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

    function verifySeparatorCommandSizes(appBarElem) {
        var separators = appBarElem.querySelectorAll("hr.win-command"),
            separatorsLength = separators.length,
            style,
            measurement;

        for (var i = 0; i < separatorsLength; i++) {
            if (!separators[i].winControl.hidden) {
                style = getComputedStyle(separators[i]); // For separators we have to measure their width + margins.
                measurement = parseInt(style.marginLeft, 10) + parseInt(style.marginRight, 10) + parseInt(style.width, 10);
                LiveUnit.Assert.areEqual(measurement, fullSizeSeparatorWidth, "Command Separators are too small");
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
            var appBarStyle = getComputedStyle(topAppBarElem);
            LiveUnit.Assert.areEqual(0, parseInt(appBarStyle.paddingLeft, 10), "Incorrect left padding for full-size AppBar with InvokeButton");
            LiveUnit.Assert.areEqual(rightPaddingReservedForInvokeButton, parseInt(appBarStyle.paddingRight, 10), "Incorrect right padding for full-size AppBar with InvokeButton");

            LiveUnit.LoggingCore.logComment("Verify padding for full-size AppBar with no InvokeButton");
            topAppBar.closedDisplayMode = "none";
            appBarStyle = getComputedStyle(topAppBarElem);
            LiveUnit.Assert.areEqual(0, parseInt(appBarStyle.paddingLeft, 10), "Incorrect left padding for full-size AppBar with no InvokeButton");
            LiveUnit.Assert.areEqual(0, parseInt(appBarStyle.paddingRight, 10), "Incorrect right padding for full-size AppBar with no InvokeButton");

            complete();
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
