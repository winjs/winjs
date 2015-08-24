// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

module CorsicaTests {
    "use strict";

    var PrivateLegacyAppBar = <typeof WinJS.UI.PrivateLegacyAppBar>WinJS.UI._LegacyAppBar;
    var AppBarCommand = <typeof WinJS.UI.PrivateCommand>WinJS.UI.AppBarCommand;
    var Flyout = <typeof WinJS.UI.PrivateFlyout>WinJS.UI.Flyout;
    var _Constants = Helper.require("WinJS/Controls/_LegacyAppBar/_Constants");

    export class AppBarCommandTests {
        // Test AppBarCommand Instantiation
        testAppBarCommandInstantiation = function () {
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
        testAppBarCommandNullInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand with null element");
            var AppBarCommand = new WinJS.UI.AppBarCommand(null, { type: 'separator' });
            LiveUnit.Assert.isNotNull(AppBarCommand, "AppBarCommand instantiation was null when sent a null AppBarCommand element.");
        }

        // Test AppBarCommand Instantiation with no options
        testAppBarCommandEmptyInstantiation = function () {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand with empty constructor");
            var AppBarCommand = new WinJS.UI.AppBarCommand();
            LiveUnit.Assert.isNotNull(AppBarCommand, "AppBarCommand instantiation was null when sent a Empty AppBarCommand element.");
        }

        // Test multiple instantiation of the same AppBarCommand DOM element
        testAppBarCommandMultipleInstantiation() {
            AppBarCommandTests.prototype.testAppBarCommandMultipleInstantiation["LiveUnit.ExpectedException"] = { message: "Invalid argument: Controls may only be instantiated one time for each DOM element" };
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

        // Test AppBarCommand parameters
        testAppBarCommandParams = function () {
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
            testGoodInitOption("section", "global"); // Deprecated, use primary
            testGoodInitOption("section", "selection"); // Deprecated, use secondary
            testGoodInitOption("section", "primary");
            testGoodInitOption("section", "secondary");
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

        testDefaultAppBarCommandParameters = function () {
            // Get the AppBarCommand element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand element");
            var AppBarCommand = new WinJS.UI.AppBarCommand(null, { label: 'test', icon: 'test.png' });
            LiveUnit.LoggingCore.logComment("AppBarCommand has been instantiated.");
            LiveUnit.Assert.isNotNull(AppBarCommand, "AppBarCommand element should not be null when instantiated.");

            LiveUnit.Assert.isNotNull(AppBarCommand.element, "Verifying that element is not null");
            LiveUnit.Assert.areEqual("primary", AppBarCommand.section, "Verifying that section is 'primary'");
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
        testSimpleAppBarCommandProperties = function () {
            // Get the AppBarCommand element from the DOM
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBarCommand element");
            var appBarCommand = new WinJS.UI.AppBarCommand(null, { label: 'test', icon: 'test.png', type: 'toggle', extraClass: 'extra' });
            LiveUnit.LoggingCore.logComment("AppBarCommand has been instantiated.");
            LiveUnit.Assert.isNotNull(appBarCommand, "AppBarCommand element should not be null when instantiated.");
            // Verify initial state of toggle command.
            LiveUnit.Assert.areEqual("checkbox", appBarCommand.element.getAttribute("role"),
                "Narrator requires 'checkbox' role in order to announce updates to the toggled state");
            LiveUnit.Assert.areEqual(false, appBarCommand.selected, "Verifying that selected is false");
            LiveUnit.Assert.areEqual(appBarCommand.selected.toString(), appBarCommand.element.getAttribute("aria-checked"),
                "aria-checked should map to 'selected' state");

            // Cycle selected
            appBarCommand.selected = true;
            LiveUnit.Assert.areEqual(true, appBarCommand.selected, "Verifying that selected is true");
            LiveUnit.Assert.areEqual(appBarCommand.selected.toString(), appBarCommand.element.getAttribute("aria-checked"),
                "aria-checked should map to 'selected' state");
            appBarCommand.selected = false;
            LiveUnit.Assert.areEqual(false, appBarCommand.selected, "Verifying that selected goes back to false");
            LiveUnit.Assert.areEqual(appBarCommand.selected.toString(), appBarCommand.element.getAttribute("aria-checked"),
                "aria-checked should map to 'selected' state");

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
            var fakeDomObject: any = { uniqueID: 'unique' };
            appBarCommand.flyout = fakeDomObject;
            LiveUnit.Assert.areEqual("unique", fakeDomObject.id, "Verifying that id is set to 'unique' from uniqueID");
            LiveUnit.Assert.areEqual("unique", appBarCommand.element.getAttribute("aria-owns"), "Verifying that aria-owns is set by flyout setter");
        }

        // Hidden Property tests
        testHiddenProperty = function () {
            LiveUnit.LoggingCore.logComment("Attempt to test hidden property on appbarcommand");
            var AppBarElement = document.createElement("div");
            document.body.appendChild(AppBarElement);
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the AppBar element");
            var AppBar = new PrivateLegacyAppBar(AppBarElement, { commands: { type: 'separator', id: 'sep' } });
            LiveUnit.LoggingCore.logComment("set commands");
            AppBar.commands = [{ id: 'cmdA', label: 'One', icon: 'back', section: 'primary', tooltip: 'Test glyph by name' }];
            var commandVisibilityChangedCount = 0;
            AppBarElement.addEventListener("commandvisibilitychanged", function () {
                commandVisibilityChangedCount++;
            });

            var cmd = AppBar.getCommandById("cmdA");
            cmd.hidden = true;
            LiveUnit.Assert.areEqual(true, cmd.hidden, "verify the command is now hidden");
            LiveUnit.Assert.areEqual(1, commandVisibilityChangedCount, "commandvisibilitychanged event should have been fired");

            cmd.hidden = false;

            LiveUnit.Assert.areEqual(false, cmd.hidden, "verify the command is now visible");
            LiveUnit.Assert.areEqual(2, commandVisibilityChangedCount, "commandvisibilitychanged event should have been fired");
            AppBar.close();
            document.body.removeChild(AppBarElement);

        }

        // Tests for dispose members and requirements
        testAppBarCommandDispose = function () {
            var flyout = new Flyout();
            LiveUnit.Assert.isFalse(flyout._disposed);

            var button = document.createElement("button");
            var abc = new AppBarCommand(button, { type: "flyout", flyout: flyout });
            LiveUnit.Assert.isTrue(abc.dispose);
            LiveUnit.Assert.isTrue(abc.element.classList.contains("win-disposable"));
            LiveUnit.Assert.isFalse(abc._disposed);
            LiveUnit.Assert.isFalse(abc._tooltipControl._disposed);

            // Double dispose sentinel
            var sentinel: any = document.createElement("div");
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
            LiveUnit.Assert.isFalse(flyout._disposed,
                "AppBarCommands do not instantiate the flyout and are not responsible for disposing it.");
            abc.dispose();
        };

        // Tests firstElementFocus and lastElementFocus properties of content type AppBarCommand
        testContentAppBarCommandFocusProperties = function () {
            var element = document.createElement("div");
            var HTMLString = "" +
                "<button id=\"button1\"><button>" +
                "<button id=\"button2\"><button>" +
                "<button id=\"button3\"><button>;"
            element.innerHTML = HTMLString;
            var contentCommand = new AppBarCommand(element, { id: "contentCommand", type: "content" });

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
        testAppBarCommandButtonsRemoveOldInnerHTML = function () {
            var button = document.createElement("button");
            button.innerHTML = "<div id='testAppBarCommandButtonsRemoveOldInnerHTML'>";
            LiveUnit.Assert.isTrue(button.querySelector("#testAppBarCommandButtonsRemoveOldInnerHTML"));
            var ac = new WinJS.UI.AppBarCommand(button);
            LiveUnit.Assert.isFalse(button.querySelector("#testAppBarCommandButtonsRemoveOldInnerHTML"), "AppBarCommand buttons should lose previous innerHTML on control Instantiation");
        }
    }

    // Generate Tests for Observable Properties
    interface IObservablePropertyTestCase {
        id: number;
        oldValue: any;
        newValue: any;
    }
    interface IObservablePropertyTestSuite {
        propertyName: string;
        testCases: Array<IObservablePropertyTestCase>;
        setUp?: Function;
        tearDown?: Function;
    }
    function generateTests_ObservablePropertyTests() {

        function runTestCases(testSuite: IObservablePropertyTestSuite) {
            var mutatedEventName = _Constants.commandPropertyMutated;

            var button = document.createElement("button");
            var abc = new AppBarCommand(button);
            document.body.appendChild(abc.element);

            var propertyName = testSuite.propertyName;
            var testCases = testSuite.testCases;

            var idPrefix = "";
            var currentTestCase: IObservablePropertyTestCase;

            var mutatedEventFired: boolean;
            function verifyMutatedEvent(e: WinJS.UI.AppBarCommandPropertyMutatedEventObj) {
                LiveUnit.Assert.areEqual(propertyName, e.detail.propertyName, idPrefix + "mutation event details contain incorrect property name");
                LiveUnit.Assert.areNotEqual(e.detail.oldValue, e.detail.newValue, idPrefix + "mutation event should not fire if the value has not changed");
                LiveUnit.Assert.areEqual(currentTestCase.oldValue, e.detail.oldValue, idPrefix + "mutation event details contain the wrong oldValue");
                LiveUnit.Assert.areEqual(currentTestCase.newValue, e.detail.newValue, idPrefix + "mutation event details contain the wrong newValue");
                LiveUnit.Assert.areEqual(abc, e.detail.command, idPrefix + "mutation event details contain the wrong AppBarCommand")
                mutatedEventFired = true;
            }

            abc._propertyMutations.bind(verifyMutatedEvent);

            // Run setup if provided
            testSuite.setUp && testSuite.setUp();

            // Run test cases
            for (var i = 0, len = testCases.length; i < len; i++) {
                currentTestCase = testCases[i];
                idPrefix = "CaseID " + currentTestCase.id + ", ";

                // PRECONDITION: currentTest.oldValue !== currentTestCast.newValue
                LiveUnit.Assert.areNotEqual(currentTestCase.oldValue, currentTestCase.newValue,
                    idPrefix + "TEST ERROR: test parameters currentTestCase.oldValue and currentTestCase.newValue must be different");

                // PRECONDITION: abc[propertyName] === currentTestCast.oldValue
                LiveUnit.Assert.areEqual(currentTestCase.oldValue, abc[propertyName],
                    idPrefix + "TEST ERROR: actual starting value of AppBarCommand." + propertyName + " does not match precondition value.");

                mutatedEventFired = false;
                abc[propertyName] = currentTestCase.newValue;
                LiveUnit.Assert.isTrue(mutatedEventFired, idPrefix + "" + mutatedEventName + " event failed to fire")
            }

            // Run teardown if provided
            testSuite.tearDown && testSuite.tearDown();

            abc._propertyMutations.unbind(verifyMutatedEvent);
        }

        var testData = {
            onclick1: () => { },
            onclick2: () => { },
            flyout1: <WinJS.UI.Flyout>undefined,
            flyout2: <WinJS.UI.Flyout>undefined,
        };

        var ObservablePropertyTestSuites: Array<IObservablePropertyTestSuite> = [
            {
                propertyName: "label",
                testCases: [
                    { id: 1, oldValue: <string>undefined, newValue: "add" },
                    { id: 2, oldValue: "add", newValue: "delete" },
                    { id: 3, oldValue: "delete", newValue: null },
                ],
            },
            {
                propertyName: "disabled",
                testCases: [
                    { id: 1, oldValue: false, newValue: true },
                    { id: 2, oldValue: true, newValue: false },
                ],
            },
            {
                propertyName: "flyout",
                // Can't instantiate Flyouts until the DOM is ready, so we create them in the provided setUp 
                // function instead.
                setUp: function () {
                    testData.flyout1 = new WinJS.UI.Flyout();
                    document.body.appendChild(testData.flyout1.element);
                    testData.flyout2 = new WinJS.UI.Flyout();
                    document.body.appendChild(testData.flyout2.element);
                },
                // Pass getters to where the old and new values for each Flyout test case will be stored after
                // they are created in setUp
                testCases: [
                    { id: 1, oldValue: <WinJS.UI.Flyout>undefined, get newValue() { return testData.flyout1; } },
                    { id: 2, get oldValue() { return testData.flyout1; }, get newValue() { return testData.flyout2; } },
                    { id: 3, get oldValue() { return testData.flyout2; }, newValue: null },
                ],
                tearDown: function () {
                    testData.flyout1.element.parentElement.removeChild(testData.flyout1.element);
                    testData.flyout2.element.parentElement.removeChild(testData.flyout2.element);
                    testData.flyout1.dispose();
                    testData.flyout2.dispose();
                },
            },
            {
                propertyName: "extraClass",
                testCases: [
                    { id: 1, oldValue: <string>undefined, newValue: "class1" },
                    { id: 2, oldValue: "class1", newValue: "class2" },
                    { id: 3, oldValue: "class2", newValue: "class1" },
                ],
            },
            {
                propertyName: "selected", testCases: [
                    { id: 1, oldValue: false, newValue: true },
                    { id: 2, oldValue: true, newValue: false },
                ],
            },
            {
                propertyName: "onclick",
                testCases: [
                    { id: 1, oldValue: <Function>undefined, newValue: testData.onclick1 },
                    { id: 2, oldValue: testData.onclick1, newValue: testData.onclick2 },
                    { id: 3, oldValue: testData.onclick2, newValue: <Function>null },
                ],
            },
            {
                propertyName: "hidden", testCases: [
                    { id: 1, oldValue: false, newValue: true },
                    { id: 2, oldValue: true, newValue: false },
                ],
            },
        ];

        ObservablePropertyTestSuites.forEach(function (testSuite: IObservablePropertyTestSuite) {
            AppBarCommandTests.prototype["testObservableProperty_" + testSuite.propertyName] = function (complete) {
                runTestCases(testSuite);
                complete();
            };

        })
    };
    generateTests_ObservablePropertyTests();
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.AppBarCommandTests");