// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <!-- saved from url=(0014)about:internet -->
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.AppBarCommandTests = function () {
    "use strict";
    // Test AppBarCommand Instantiation
    this.testAppBarCommandInstantiation = function () {
        // Get the AppBarCommand element from the DOM
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand element");
        var AppBarCommandElement = document.createElement('hr');
        document.body.appendChild(AppBarCommandElement);
        var AppBarCommand = new WinJS.UI.AppBarCommand(AppBarCommandElement, { type: 'separator' });
        LiveUnit.LoggingCore.logComment("AppBarCommand has been instantiated.");
        LiveUnit.Assert.isNotNull(AppBarCommand, "AppBarCommand element should not be null when instantiated.");

        // We have no functions

        document.body.removeChild(AppBarCommandElement);
    }





    // Test AppBarCommand Instantiation with null element
    this.testAppBarCommandNullInstantiation = function () {
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand with null element");
        var AppBarCommand = new WinJS.UI.AppBarCommand(null, { type: 'separator' });
        LiveUnit.Assert.isNotNull(AppBarCommand, "AppBarCommand instantiation was null when sent a null AppBarCommand element.");
    }





    // Test AppBarCommand Instantiation with no options
    this.testAppBarCommandEmptyInstantiation = function () {
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand with empty constructor");
        var AppBarCommand = new WinJS.UI.AppBarCommand();
        LiveUnit.Assert.isNotNull(AppBarCommand, "AppBarCommand instantiation was null when sent a Empty AppBarCommand element.");
    }





    // Test multiple instantiation of the same AppBarCommand DOM element
    this.testAppBarCommandMultipleInstantiation = function () {
        // Get the AppBarCommand element from the DOM
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand element");
        var AppBarCommandElement = document.createElement('hr');
        document.body.appendChild(AppBarCommandElement);
        var AppBarCommand = new WinJS.UI.AppBarCommand(AppBarCommandElement, { type: 'separator' });
        LiveUnit.LoggingCore.logComment("AppBarCommand has been instantiated.");
        LiveUnit.Assert.isNotNull(AppBarCommand, "AppBarCommand element should not be null when instantiated.");
        var error;
        try {
            new WinJS.UI.AppBarCommand(AppBarCommandElement, { type: 'separator' });
        } catch (e) {
            error = e;
        } finally {
            document.body.removeChild(AppBarCommandElement);
            throw error;
        }
    }

    this.testAppBarCommandMultipleInstantiation["LiveUnit.ExpectedException"] = { message: "Invalid argument: Controls may only be instantiated one time for each DOM element" }; // This is the exception that is expected





    // Test AppBarCommand parameters
    this.testAppBarCommandParams = function () {
        function testGoodInitOption(paramName, value) {
            LiveUnit.LoggingCore.logComment("Testing creating a AppBarCommand using good parameter " + paramName + "=" + value);
            var options = { type: 'button', label: 'test', icon: 'test.png' };
            options[paramName] = value;
            var AppBarCommand = new WinJS.UI.AppBarCommand(null, options);
            LiveUnit.Assert.isNotNull(AppBarCommand);
        }

        function testBadInitOption(paramName, value, expectedName, expectedMessage) {
            LiveUnit.LoggingCore.logComment("Testing creating a AppBarCommand using bad parameter " + paramName + "=" + value);
            var options = { type: 'button', label: 'test', icon: 'test.png' };
            options[paramName] = value;
            try {
                new WinJS.UI.AppBarCommand(null, options);
                LiveUnit.Assert.fail("Expected creating AppBarCommand with " + paramName + "=" + value + " to throw an exception");
            } catch (exception) {
                LiveUnit.LoggingCore.logComment(exception.message);
                LiveUnit.Assert.isTrue(exception !== null);
                LiveUnit.Assert.isTrue(exception.name === expectedName);
                LiveUnit.Assert.isTrue(exception.message === expectedMessage);
            }
        }

        LiveUnit.LoggingCore.logComment("Testing id");
        testGoodInitOption("id", "ralph");
        testGoodInitOption("id", "fred");
        testGoodInitOption("id", -1);
        testGoodInitOption("id", 12);
        testGoodInitOption("id", {});

        LiveUnit.LoggingCore.logComment("Testing type");
        testGoodInitOption("type", "button");
        testGoodInitOption("type", "flyout");
        testGoodInitOption("type", "toggle");
        testGoodInitOption("type", "separator");

        LiveUnit.LoggingCore.logComment("Testing label");
        testGoodInitOption("label", "test");
        testGoodInitOption("label", "a");
        testGoodInitOption("label", -1);
        testGoodInitOption("label", 12);
        testGoodInitOption("label", {});

        LiveUnit.LoggingCore.logComment("Testing icon");
        testGoodInitOption("icon", "test");
        testGoodInitOption("icon", "b");
        testGoodInitOption("icon", "&#xE106;");
        testGoodInitOption("icon", -1);
        testGoodInitOption("icon", 12);
        testGoodInitOption("icon", {});

        var priorityExceptionName = "WinJS.UI.AppBarCommand.BadPriority";
        var priorityExceptionMessage = "Invalid argument: the priority of an AppBarCommand must be a non-negative integer";
        LiveUnit.LoggingCore.logComment("Testing priority");
        testBadInitOption("priority", "test", priorityExceptionName, priorityExceptionMessage);
        testBadInitOption("priority", "", priorityExceptionName, priorityExceptionMessage);
        testBadInitOption("priority", -1, priorityExceptionName, priorityExceptionMessage);
        testBadInitOption("priority", {}, priorityExceptionName, priorityExceptionMessage);
        testGoodInitOption("priority", undefined);
        testGoodInitOption("priority", 0);
        testGoodInitOption("priority", 12);

        LiveUnit.LoggingCore.logComment("Testing tooltip");
        testGoodInitOption("tooltip", "test");
        testGoodInitOption("tooltip", "");
        testGoodInitOption("tooltip", -1);
        testGoodInitOption("tooltip", 12);
        testGoodInitOption("tooltip", {});

        LiveUnit.LoggingCore.logComment("Testing flyout");
        testGoodInitOption("flyout", "test");
        testGoodInitOption("flyout", "");
        testGoodInitOption("flyout", "&#xE106;");
        testGoodInitOption("flyout", { id: "test" });
        testGoodInitOption("flyout", { uniqueId: "test" });
        testGoodInitOption("flyout", { element: { id: "test" } });
        testGoodInitOption("flyout", { element: { uniqueId: "test" } });

        LiveUnit.LoggingCore.logComment("Testing section");
        testGoodInitOption("section", "global");
        testGoodInitOption("section", "selection");
        testGoodInitOption("section", -1);
        testGoodInitOption("section", 12);
        testGoodInitOption("section", {});

        LiveUnit.LoggingCore.logComment("Testing disabled");
        testGoodInitOption("disabled", true);
        testGoodInitOption("disabled", false);
        testGoodInitOption("disabled", -1);
        testGoodInitOption("disabled", "what");
        testGoodInitOption("disabled", {});

        LiveUnit.LoggingCore.logComment("Testing selected");
        testGoodInitOption("selected", true);
        testGoodInitOption("selected", false);
        testGoodInitOption("selected", -1);
        testGoodInitOption("selected", "what");
        testGoodInitOption("selected", {});

        // TODO: Still need to test click

        LiveUnit.LoggingCore.logComment("Testing element");
    }





    this.testDefaultAppBarCommandParameters = function () {
        // Get the AppBarCommand element from the DOM
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand element");
        var AppBarCommand = new WinJS.UI.AppBarCommand(null, { label: 'test', icon: 'test.png' });
        LiveUnit.LoggingCore.logComment("AppBarCommand has been instantiated.");
        LiveUnit.Assert.isNotNull(AppBarCommand, "AppBarCommand element should not be null when instantiated.");

        LiveUnit.Assert.isNotNull(AppBarCommand.element, "Verifying that element is not null");
        LiveUnit.Assert.areEqual("global", AppBarCommand.section, "Verifying that section is 'global'");
        LiveUnit.Assert.areEqual("", AppBarCommand.id, "Verifying that id is empty string");
        LiveUnit.Assert.areEqual("button", AppBarCommand.type, "Verifying that type is 'button'");
        LiveUnit.Assert.areEqual("test", AppBarCommand.label, "Verifying that label is 'test'");
        LiveUnit.Assert.areEqual("test.png", AppBarCommand.icon, "Verifying that icon is 'test.png'");
        // Tooltip should be set if label was set
        LiveUnit.Assert.areEqual("test", AppBarCommand.tooltip, "Verifying that tooltip is 'test'");
        LiveUnit.Assert.isFalse(AppBarCommand.disabled, "Verifying that disabled is false");
        LiveUnit.Assert.isFalse(AppBarCommand.hidden, "Verifying that hidden is false");
        LiveUnit.Assert.isFalse(AppBarCommand.selected, "Verifying that selected is false");
    }





    // Simple Property tests
    this.testSimpleAppBarCommandProperties = function () {
        // Get the AppBarCommand element from the DOM
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand element");
        var appBarCommand = new WinJS.UI.AppBarCommand(null, { label: 'test', icon: 'test.png', type: 'toggle', extraClass: 'extra' });
        LiveUnit.LoggingCore.logComment("AppBarCommand has been instantiated.");
        LiveUnit.Assert.isNotNull(appBarCommand, "AppBarCommand element should not be null when instantiated.");

        // Cycle selected
        LiveUnit.Assert.areEqual(false, appBarCommand.selected, "Verifying that selected is false");
        appBarCommand.selected = true;
        LiveUnit.Assert.areEqual(true, appBarCommand.selected, "Verifying that selected is true");
        appBarCommand.selected = false;
        LiveUnit.Assert.areEqual(false, appBarCommand.selected, "Verifying that selected goes back to false");

        // Cycle extra class
        LiveUnit.Assert.areEqual("extra", appBarCommand.extraClass, "Verifying that extraClass is 'extra'");
        LiveUnit.Assert.isTrue(appBarCommand.element.classList.contains("extra"), "Verifying that extraClass is 'extra'");
        appBarCommand.extraClass = "somethingElse";
        LiveUnit.Assert.areEqual("somethingElse", appBarCommand.extraClass, "Verifying that extraClass is 'somethingElse");
        LiveUnit.Assert.isTrue(appBarCommand.element.classList.contains("somethingElse"), "Verifying that className is 'somethingElse");
        appBarCommand.extraClass = "another";
        LiveUnit.Assert.areEqual("another", appBarCommand.extraClass, "Verifying that extraClass is 'another'");
        LiveUnit.Assert.isTrue(appBarCommand.element.classList.contains("another"), "Verifying that className is 'another'");

        // Check flyout with empty id
        var fakeDomObject = { uniqueID: 'unique' };
        appBarCommand.flyout = fakeDomObject;
        LiveUnit.Assert.areEqual("unique", fakeDomObject.id, "Verifying that id is set to 'unique' from uniqueID");
        LiveUnit.Assert.areEqual("unique", appBarCommand.element.getAttribute("aria-owns"), "Verifying that aria-owns is set by flyout setter");
    }






    // Hidden Property tests
    this.testHiddenProperty = function () {
        LiveUnit.LoggingCore.logComment("Attempt to test hidden property on appbarcommand");
        var AppBarElement = document.createElement("div");
        document.body.appendChild(AppBarElement);
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar element");
        var AppBar = new WinJS.UI.AppBar(AppBarElement, { commands: { type: 'separator', id: 'sep' } });
        LiveUnit.LoggingCore.logComment("set commands");
        AppBar.commands = [{ id: 'cmdA', label: 'One', icon: 'back', section: 'global', tooltip: 'Test glyph by name' }];
        var commandVisibilityChangedCount = 0;
        AppBarElement.addEventListener("commandvisibilitychanged", function () {
            commandVisibilityChangedCount++;
        });
        AppBar.hide();
        var cmd = AppBar.getCommandById("cmdA");
        cmd.hidden = true;
        LiveUnit.Assert.areEqual(true, cmd.hidden, "verify the command is now hidden");
        LiveUnit.Assert.areEqual(1, commandVisibilityChangedCount, "commandvisibilitychanged event should have been fired");

        AppBar.show();
        var result = false;
        try {
            cmd.hidden = false;
        } catch (err) {
            // we throw
            result = true;
        } finally {
            LiveUnit.Assert.areEqual(true, cmd.hidden, "verify that hidden property did not change");
            LiveUnit.Assert.areEqual(true, result, "verify the hidden property throw the exception");
            LiveUnit.Assert.areEqual(2, commandVisibilityChangedCount, "commandvisibilitychanged event should have been fired");
            AppBar.hide();
            document.body.removeChild(AppBarElement);
        }
    }






    // Tests for dispose members and requirements
    this.testAppBarCommandDispose = function () {
        var button = document.createElement("button");
        var abc = new WinJS.UI.AppBarCommand(button);
        LiveUnit.Assert.isTrue(abc.dispose);
        LiveUnit.Assert.isTrue(abc.element.classList.contains("win-disposable"));
        LiveUnit.Assert.isFalse(abc._disposed);
        LiveUnit.Assert.isFalse(abc._tooltipControl._disposed);

        // Double dispose sentinel
        var sentinel = document.createElement("div");
        sentinel.disposed = false;
        WinJS.Utilities.addClass(sentinel, "win-disposable");
        button.appendChild(sentinel);
        sentinel.dispose = function () {
            if (sentinel.disposed) {
                LiveUnit.Assert.fail("Unexpected double dispose occured.");
            }
            sentinel.disposed = true;
        };

        abc.dispose();
        LiveUnit.Assert.isTrue(sentinel.disposed);
        LiveUnit.Assert.isTrue(abc._disposed);
        LiveUnit.Assert.isTrue(abc._tooltipControl._disposed);
        abc.dispose();
    };



    // Tests firstElementFocus and lastElementFocus properties of content type AppBarCommand
    this.testContentAppBarCommandFocusProperties = function () {
        var element = document.createElement("div");
        var HTMLString = "" +
            "<button id=\"button1\"><button>" +
            "<button id=\"button2\"><button>" +
            "<button id=\"button3\"><button>;"
        element.innerHTML = HTMLString;
        var contentCommand = new WinJS.UI.AppBarCommand(element, { id: "contentCommand", type: "content" });

        document.body.appendChild(contentCommand.element);

        var button1 = document.getElementById("button1");
        var button2 = document.getElementById("button2");
        var button3 = document.getElementById("button3");


        // Verify that both firstElementFocus and lastElementFocus properties return the containing contentCommand element by default.
        LiveUnit.Assert.areEqual(contentCommand.firstElementFocus, contentCommand.element, "By default, firstElementFocus returns to the container element");
        LiveUnit.Assert.areEqual(contentCommand.lastElementFocus, contentCommand.element, "By default, lastElementFocus returns to the container element");
        // Verify that the contentCommand element is a tabstop by default. Important to use getAttibute() rather than the tabindex property here because of their differing default values when neither has been set.
        LiveUnit.Assert.areEqual(contentCommand.element.getAttribute("tabindex"), "0", "content command element should be a tabstop by default");


        // Verify that setting firstElementFocus without setting lastElementFocus causes firstElementFocus and lastElementFocus to return the value of firstElementFocus
        contentCommand.firstElementFocus = button1;
        LiveUnit.Assert.areEqual(contentCommand.firstElementFocus, button1, "firstElementFocus should point to the element it was assigned to");
        LiveUnit.Assert.areEqual(contentCommand.lastElementFocus, contentCommand.firstElementFocus, "When firstElementFocus has been set, but lastElementFocus has not been set, lastElementFocus returns the value of firstElementFocus")
        // Verify that the contentCommand element is not a tabstop when either focus property points to any other HTML element other than the container element.
        LiveUnit.Assert.areEqual(contentCommand.element.getAttribute("tabindex"), "-1", "content command element should not be a tabstop when either of the content command's focus properties point to any other element");


        // Verify that firstElementFocus and lastElementFocus return the elements they point to once they've been set.
        contentCommand.lastElementFocus = button3;
        LiveUnit.Assert.areEqual(contentCommand.firstElementFocus, button1, "firstElementFocus should return the element it points to");
        LiveUnit.Assert.areEqual(contentCommand.lastElementFocus, button3, "lastElementFocus should return the element it points to")
        LiveUnit.Assert.areEqual(contentCommand.element.getAttribute("tabindex"), "-1", "content command element should not be a tabstop when either of the content command's focus properties point to any other element");


        // Verify that setting firstElementFocus back to null causes it to return the value of lastElementFocus
        contentCommand.firstElementFocus = null;
        LiveUnit.Assert.areEqual(contentCommand.firstElementFocus, contentCommand.lastElementFocus, "If firstElementFocus is null, it should return the value of lastElementFocus.");
        LiveUnit.Assert.areEqual(contentCommand.lastElementFocus, button3, "lastElementFocus should return the element it points to.")
        LiveUnit.Assert.areEqual(contentCommand.element.getAttribute("tabindex"), "-1", "content command element should not be a tabstop when either of the content command's focus properties point to any other element");


        // Verify that also setting lastElementFocus back to null causes both focus properties to return contentCommand.element
        contentCommand.lastElementFocus = null;
        LiveUnit.Assert.areEqual(contentCommand.firstElementFocus, contentCommand.element, "When not set, firstElementFocus returns the container element");
        LiveUnit.Assert.areEqual(contentCommand.lastElementFocus, contentCommand.element, "when not set, lastElementFocus returns the container element")
        // Verify that the contentCommand element is a tabstop when neither focus property points to an HTML element other than the container element.
        LiveUnit.Assert.areEqual(contentCommand.element.getAttribute("tabindex"), "0", "content command element should be a tabstop.");


        // Verify that setting lastElementFocus explicity to contentCommand.element is the same as setting it to null, and that contentCommand.element is not a tab stop while firstElementFocus has been set.
        contentCommand.firstElementFocus = button2;
        contentCommand.lastElementFocus = contentCommand.element;
        LiveUnit.Assert.areEqual(contentCommand._lastElementFocus, null, "Setting public lastElementFocus property to contentCommand.element should be the same as setting it to null.");
        LiveUnit.Assert.areEqual(contentCommand.firstElementFocus, button2, "firstElementFocus returns the element it points to");
        LiveUnit.Assert.areEqual(contentCommand.lastElementFocus, contentCommand.firstElementFocus, "when lastElementFocus not set, it should return the value of firstElementFocus")
        // Verify that the contentCommand element is stil a tabstop since lastElementFocus property points to it.
        LiveUnit.Assert.areEqual(contentCommand.element.getAttribute("tabindex"), "-1", "content command element should not be a tabstop when either of the content command's focus properties point to any other element");

        document.body.removeChild(contentCommand.element);
    };



    /// Tests that previous innerHTML is cleared when we instantiate a new button.
    this.testAppBarCommandButtonsRemoveOldInnerHTML = function () {
        var button = document.createElement("button");
        button.innerHTML = "<div id='testAppBarCommandButtonsRemoveOldInnerHTML'>";
        LiveUnit.Assert.isTrue(button.querySelector("#testAppBarCommandButtonsRemoveOldInnerHTML"));
        var ac = new WinJS.UI.AppBarCommand(button);
        LiveUnit.Assert.isFalse(button.querySelector("#testAppBarCommandButtonsRemoveOldInnerHTML"), "AppBarCommand buttons should lose previous innerHTML on control Instantiation");

    }


}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.AppBarCommandTests");
