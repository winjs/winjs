// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ts"/>

/// <reference path="../../typings/winjs/winjs.d.ts" />

module SplitViewTests {

    "use strict";

    var Key = WinJS.Utilities.Key;

    function assertHighContrastAdjust(element, expected) {
        if ("msHighContrastAdjust" in document.documentElement.style) {
            LiveUnit.Assert.areEqual(expected, element.style.msHighContrastAdjust);
        }
    }

    var _element;

    export class SplitViewCommandTests {

        setUp = function () {
            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "host";
            document.body.appendChild(newNode);
            _element = newNode;
        };

        tearDown = function () {
            LiveUnit.LoggingCore.logComment("In tearDown");
            if (_element) {
                WinJS.Utilities.disposeSubTree(_element);
                document.body.removeChild(_element);
                _element = null;
            }
        };

        testInstantiationMarkup = function (complete) {
            var host = document.getElementById("host");
            var html = "<div id='navcmd' data-win-control='WinJS.UI.SplitViewCommand' " +
                "data-win-options='{ icon: WinJS.UI.AppBarIcon.add}'" +
                "></div>";

            host.innerHTML = html;

            WinJS.UI.processAll().
                then(function () {
                    var navcmd = document.getElementById('navcmd').winControl;
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(navcmd.element, "win-splitviewcommand"),
                        "win-splitviewcommand class not present");
                    // Verify main button
                    var buttonEl = navcmd.element.querySelector(".win-splitviewcommand-button");
                    LiveUnit.Assert.isTrue(buttonEl, "win-splitviewcommand-button class not present");
                    // Verify icon
                    var iconEl = buttonEl.querySelector(".win-splitviewcommand-icon");
                    LiveUnit.Assert.isTrue(iconEl, "win-splitviewcommand-icon class not present");
                    // Verify label
                    var labelEl = buttonEl.querySelector(".win-splitviewcommand-label");
                    LiveUnit.Assert.isTrue(labelEl, "win-splitviewcommand-label class not present");
                    // Verify label and icon elements are not same
                    LiveUnit.Assert.isFalse(iconEl === labelEl);
                }).
                done(complete);
        };

        testLabel = function () {
            var splitViewCommand = new WinJS.UI.SplitViewCommand(document.getElementById("host"));
            LiveUnit.Assert.areEqual("", splitViewCommand.element.textContent.trim());

            splitViewCommand.label = "abc";
            LiveUnit.Assert.areEqual("abc", splitViewCommand.element.textContent.trim());

            splitViewCommand.label = "";
            LiveUnit.Assert.areEqual("", splitViewCommand.element.textContent.trim());
        };

        testTooltip = function () {
            var splitViewCommand;

            splitViewCommand = new WinJS.UI.SplitViewCommand(document.getElementById("host"), { label: 'abc', tooltip: '' });
            LiveUnit.Assert.areEqual("", splitViewCommand.element.title);

            var element2 = document.createElement("div");
            document.body.appendChild(element2);
            splitViewCommand = new WinJS.UI.SplitViewCommand(element2, { label: 'abc', tooltip: 'def' });
            LiveUnit.Assert.areEqual("def", splitViewCommand.element.title);
            element2.parentNode.removeChild(element2);

            var element3 = document.createElement("div");
            document.body.appendChild(element3);
            splitViewCommand = new WinJS.UI.SplitViewCommand(element3, { label: 'abc' });
            LiveUnit.Assert.areEqual("", splitViewCommand.element.title);
            element3.parentNode.removeChild(element3);

            var element4 = document.createElement("div");
            document.body.appendChild(element4);
            splitViewCommand = new WinJS.UI.SplitViewCommand(element4);
            LiveUnit.Assert.areEqual("", splitViewCommand.element.title);


            // Dynamic updates:
            splitViewCommand.tooltip = "abc";
            LiveUnit.Assert.areEqual("abc", splitViewCommand.element.title);

            splitViewCommand.tooltip = null;
            LiveUnit.Assert.areEqual("", splitViewCommand.element.title);
            element4.parentNode.removeChild(element4);
        };

        testIcon = function () {
            var splitViewCommand;
            splitViewCommand = new WinJS.UI.SplitViewCommand(document.getElementById("host"));
            LiveUnit.Assert.areEqual("", splitViewCommand._imageSpan.textContent);
            LiveUnit.Assert.areEqual(undefined, splitViewCommand.icon);

            var element1 = document.createElement("div");
            document.body.appendChild(element1);
            splitViewCommand = new WinJS.UI.SplitViewCommand(element1, { icon: WinJS.UI.AppBarIcon.home });
            LiveUnit.Assert.areEqual(WinJS.UI.AppBarIcon.home, splitViewCommand._imageSpan.textContent);
            LiveUnit.Assert.areEqual(WinJS.UI.AppBarIcon.home, splitViewCommand.icon);
            element1.parentNode.removeChild(element1);

            var element2 = document.createElement("div");
            document.body.appendChild(element2);
            splitViewCommand = new WinJS.UI.SplitViewCommand(element2, { icon: 'home' });
            LiveUnit.Assert.areEqual(WinJS.UI.AppBarIcon.home, splitViewCommand._imageSpan.textContent);
            LiveUnit.Assert.areEqual(WinJS.UI.AppBarIcon.home, splitViewCommand.icon);
            element2.parentNode.removeChild(element2);

            var element3 = document.createElement("div");
            document.body.appendChild(element3);
            splitViewCommand = new WinJS.UI.SplitViewCommand(element3, { icon: 'a' });
            LiveUnit.Assert.areEqual('a', splitViewCommand._imageSpan.textContent);
            LiveUnit.Assert.areEqual('a', splitViewCommand.icon);

            splitViewCommand.icon = "a";
            LiveUnit.Assert.areEqual('a', splitViewCommand._imageSpan.textContent);
            LiveUnit.Assert.areEqual('a', splitViewCommand.icon);

            splitViewCommand.icon = "";
            LiveUnit.Assert.areEqual('', splitViewCommand._imageSpan.textContent);
            LiveUnit.Assert.areEqual('', splitViewCommand.icon);

            splitViewCommand.icon = "b";
            LiveUnit.Assert.areEqual('b', splitViewCommand._imageSpan.textContent);
            LiveUnit.Assert.areEqual('b', splitViewCommand.icon);

            splitViewCommand.icon = null;
            LiveUnit.Assert.areEqual('', splitViewCommand._imageSpan.textContent);
            LiveUnit.Assert.areEqual(null, splitViewCommand.icon);
            element3.parentNode.removeChild(element3);

            var element4 = document.createElement("div");
            document.body.appendChild(element4);
            splitViewCommand = new WinJS.UI.SplitViewCommand(element4);
            LiveUnit.Assert.areEqual(undefined, splitViewCommand.icon);
            LiveUnit.Assert.areEqual("", splitViewCommand._imageSpan.style.backgroundImage);
            assertHighContrastAdjust(splitViewCommand._imageSpan, "");
            element4.parentNode.removeChild(element4);

            var element5 = document.createElement("div");
            document.body.appendChild(element5);
            splitViewCommand = new WinJS.UI.SplitViewCommand(element5, { icon: 'url("foo.png")' });
            LiveUnit.Assert.areEqual('url("foo.png")', splitViewCommand.icon);
            Helper.Assert.areUrlsEqual('url("foo.png")', splitViewCommand._imageSpan.style.backgroundImage);
            assertHighContrastAdjust(splitViewCommand._imageSpan, "none");

            // BUG null leaves the background styles.
            //splitViewCommand.icon = null;
            //LiveUnit.Assert.areEqual(null, splitViewCommand.icon);
            //LiveUnit.Assert.areEqual("", splitViewCommand._imageSpan.style.backgroundImage);
            //assertHighContrastAdjust(splitViewCommand._imageSpan, "");

            splitViewCommand.icon = 'url("foo.png")';
            LiveUnit.Assert.areEqual('url("foo.png")', splitViewCommand.icon);
            Helper.Assert.areUrlsEqual('url("foo.png")', splitViewCommand._imageSpan.style.backgroundImage);
            assertHighContrastAdjust(splitViewCommand._imageSpan, "none");
            element5.parentNode.removeChild(element5);
        };

        testDispose = function () {
            var splitViewCommand = <WinJS.UI.PrivateSplitViewCommand>new WinJS.UI.SplitViewCommand(document.getElementById("host"));
            LiveUnit.Assert.isFalse(splitViewCommand._disposed);
            splitViewCommand.dispose();
            LiveUnit.Assert.isTrue(splitViewCommand._disposed);
            splitViewCommand.dispose();
            LiveUnit.Assert.isTrue(splitViewCommand._disposed);
        };

        testInvoke = function () {

            var splitViewCommand = <WinJS.UI.PrivateSplitViewCommand>new WinJS.UI.SplitViewCommand(document.getElementById("host"), { label: 'test invoke' });

            var invokeCalled = 0;
            splitViewCommand.addEventListener((<typeof WinJS.UI.PrivateSplitViewCommand>WinJS.UI.SplitViewCommand)._EventName._invoked, function (ev) {
                invokeCalled++;
            });

            LiveUnit.Assert.areEqual(0, invokeCalled);

            splitViewCommand._buttonEl.click();
            LiveUnit.Assert.areEqual(1, invokeCalled);

            splitViewCommand._buttonEl.click();
            LiveUnit.Assert.areEqual(2, invokeCalled);

            Helper.keydown(splitViewCommand._buttonEl, Key.enter);
            LiveUnit.Assert.areEqual(3, invokeCalled);

            Helper.keydown(splitViewCommand._buttonEl, Key.space);
            LiveUnit.Assert.areEqual(4, invokeCalled);
        };

        testConstructTwice = function () {
            var splitViewCommandEl = document.getElementById("host");
            var splitViewCommand = new WinJS.UI.SplitViewCommand(splitViewCommandEl);

            try {
                splitViewCommand = new WinJS.UI.SplitViewCommand(splitViewCommandEl);
                LiveUnit.Assert.fail("Should throw");
            } catch (e) {
                LiveUnit.Assert.areEqual("Invalid argument: Controls may only be instantiated one time for each DOM element", e.message);
                LiveUnit.Assert.areEqual("WinJS.UI.SplitViewCommand.DuplicateConstruction", e.name);
            }
        };
    };
}
LiveUnit.registerTestClass("SplitViewTests.SplitViewCommandTests");
