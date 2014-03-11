// <!-- saved from url=(0014)about:internet -->
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/commonutils.js"/> 

var CorsicaTests = CorsicaTests || {};

CorsicaTests.FlyoutTests = function () {
    "use strict";
    
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
        var flyoutElement = document.createElement('div');
        document.body.appendChild(flyoutElement);
        this._element = flyoutElement;
    };

    this.tearDown = function () {
        LiveUnit.LoggingCore.logComment("In tearDown");
        var flyouts = document.querySelectorAll(".win-flyout");
        Array.prototype.forEach.call(flyouts, function(element){
            WinJS.Utilities.disposeSubTree(element);
            document.body.removeChild(element);
            element = null;
        });
        this._element = null;
        
        disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingAppBarClass));
        disposeAndRemove(document.querySelector("." + WinJS.UI._Overlay._clickEatingFlyoutClass));
    };
    var that = this;
    // Test flyout Instantiation
    this.testFlyoutInstantiation = function () {        
        var flyout = new WinJS.UI.Flyout(that._element);
        LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
        LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");

        function verifyFunction(functionName) {
            LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
            if (flyout[functionName] === undefined) {
                LiveUnit.Assert.fail(functionName + " missing from flyout");
            }

            LiveUnit.Assert.isNotNull(flyout[functionName]);
            LiveUnit.Assert.isTrue(typeof (flyout[functionName]) === "function", functionName + " exists on flyout, but it isn't a function");
        }

        verifyFunction("show");
        verifyFunction("hide");
        verifyFunction("addEventListener");
        verifyFunction("removeEventListener");
    }
    this.testFlyoutInstantiation["Owner"] = "shawnste";
    this.testFlyoutInstantiation["Priority"] = "0";
    this.testFlyoutInstantiation["Description"] = "Test flyout instantiation + function presence";
    this.testFlyoutInstantiation["Category"] = "Instantiation";

    // Test flyout Instantiation with null element
    this.testFlyoutNullInstantiation = function () {
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flyout with null element");
        var flyout = new WinJS.UI.Flyout(null);
        LiveUnit.Assert.isNotNull(flyout, "flyout instantiation was null when sent a null flyout element.");
    }
    this.testFlyoutNullInstantiation["Owner"] = "shawnste";
    this.testFlyoutNullInstantiation["Priority"] = "1";
    this.testFlyoutNullInstantiation["Description"] = "Test flyout Instantiation with null flyout element";
    this.testFlyoutNullInstantiation["Category"] = "Instantiation";

    // Test multiple instantiation of the same flyout DOM element
    this.testFlyoutMultipleInstantiation = function () {
        var flyout = new WinJS.UI.Flyout(that._element);
        LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
        LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");
        new WinJS.UI.Flyout(that._element);
    }
    this.testFlyoutMultipleInstantiation["Owner"] = "shawnste";
    this.testFlyoutMultipleInstantiation["Priority"] = "1";
    this.testFlyoutMultipleInstantiation["Description"] = "Test flyout Duplicate Instantiation with same DOM element";
    this.testFlyoutMultipleInstantiation["Category"] = "Instantiation";
    this.testFlyoutMultipleInstantiation["LiveUnit.ExpectedException"] = { message: WinJS.Resources._getWinJSString("ui/duplicateConstruction").value }; // This is the exception that is expected

    // Test flyout parameters
    this.testFlyoutParams = function () {
        function testGoodInitOption(paramName, value) {
            LiveUnit.LoggingCore.logComment("Testing creating a flyout using good parameter " + paramName + "=" + value);
            var div = document.createElement("div");
            document.body.appendChild(div);
            var options = {};
            options[paramName] = value;
            var flyout = new WinJS.UI.Flyout(div, options);
            LiveUnit.Assert.isNotNull(flyout);
        }

        function testBadInitOption(paramName, value, expectedName, expectedMessage) {
            LiveUnit.LoggingCore.logComment("Testing creating a flyout using bad parameter " + paramName + "=" + value);
            var div = document.createElement("div");
            document.body.appendChild(div);
            var options = {};
            options[paramName] = value;
            var exception = null;
            try {
                new WinJS.UI.Flyout(div, options);
                LiveUnit.Assert.fail("Expected creating Flyout with " + paramName + "=" + value + " to throw an exception");
            } catch (e) {
                exception = e;
                LiveUnit.LoggingCore.logComment(exception !== null);
                LiveUnit.LoggingCore.logComment(exception.message);
                LiveUnit.Assert.isTrue(exception !== null);
                LiveUnit.Assert.isTrue(exception.name === expectedName);
                LiveUnit.Assert.isTrue(exception.message === expectedMessage);
            }
        }

        LiveUnit.LoggingCore.logComment("Testing anchor");
        testGoodInitOption("anchor", "ralph");
        testGoodInitOption("anchor", "fred");
        testGoodInitOption("anchor", -1);
        testGoodInitOption("anchor", 12);
        testGoodInitOption("anchor", {});
        LiveUnit.LoggingCore.logComment("Testing alignment");
        testGoodInitOption("alignment", "left");
        testGoodInitOption("alignment", "right");
        testGoodInitOption("alignment", "center");
        var badAlignment = WinJS.Resources._getWinJSString("ui/badAlignment").value;
        testBadInitOption("alignment", "fred", "WinJS.UI.Flyout.BadAlignment", badAlignment);
        testBadInitOption("alignment", -1, "WinJS.UI.Flyout.BadAlignment", badAlignment);
        testBadInitOption("alignment", 12, "WinJS.UI.Flyout.BadAlignment", badAlignment);
        testBadInitOption("alignment", {}, "WinJS.UI.Flyout.BadAlignment", badAlignment);
        LiveUnit.LoggingCore.logComment("Testing placement");
        testGoodInitOption("placement", "top");
        testGoodInitOption("placement", "bottom");
        testGoodInitOption("placement", "left");
        testGoodInitOption("placement", "right");
        testGoodInitOption("placement", "auto");
        var badPlacement = WinJS.Resources._getWinJSString("ui/badPlacement").value;
        testBadInitOption("placement", "fred", "WinJS.UI.Flyout.BadPlacement", badPlacement);
        testBadInitOption("placement", -1, "WinJS.UI.Flyout.BadPlacement", badPlacement);
        testBadInitOption("placement", 12, "WinJS.UI.Flyout.BadPlacement", badPlacement);
        testBadInitOption("placement", {}, "WinJS.UI.Flyout.BadPlacement", badPlacement);
    }
    this.testFlyoutParams["Owner"] = "shawnste";
    this.testFlyoutParams["Priority"] = "1";
    this.testFlyoutParams["Description"] = "Test initializing a flyout with good and bad initialization options";
    this.testFlyoutParams["Category"] = "Instantiation";

    // Test defaults
    this.testDefaultflyoutParameters = function () {    
        var flyout = new WinJS.UI.Flyout(that._element);
        LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
        LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");

        LiveUnit.Assert.areEqual(flyout.element, that._element, "Verifying that element is what we set it with");
        LiveUnit.Assert.areEqual(flyout.autoHide, undefined, "Verifying that autoHide is undefined");
        LiveUnit.Assert.areEqual(flyout.lightDismiss, undefined, "Verifying that lightDismiss is undefined");
    }
    this.testDefaultflyoutParameters["Owner"] = "shawnste";
    this.testDefaultflyoutParameters["Priority"] = "1";
    this.testDefaultflyoutParameters["Description"] = "Test default flyout parameters";
    this.testDefaultflyoutParameters["Category"] = "Instantiation";

    // Simple Function Tests
    this.testSimpleflyoutFunctions = function () {       
        var flyout = new WinJS.UI.Flyout(that._element);
        LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
        LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");

        LiveUnit.LoggingCore.logComment("show");
        flyout.show(document.body, "top");

        LiveUnit.LoggingCore.logComment("hide");
        flyout.hide();

        LiveUnit.LoggingCore.logComment("addEventListener");
        flyout.addEventListener();

        LiveUnit.LoggingCore.logComment("removeEventListener");
        flyout.removeEventListener();
    }
    this.testSimpleflyoutFunctions["Owner"] = "shawnste";
    this.testSimpleflyoutFunctions["Priority"] = "1";
    this.testSimpleflyoutFunctions["Description"] = "Test default flyout parameters";
    this.testSimpleflyoutFunctions["Category"] = "Instantiation";
    
    this.testFlyoutDispose = function () {
        var flyout = new WinJS.UI.Flyout();
        LiveUnit.Assert.isTrue(flyout.dispose);
        LiveUnit.Assert.isFalse(flyout._disposed);
        
        // Double dispose sentinel
        var sentinel = document.createElement("div");
        sentinel.disposed = false;
        WinJS.Utilities.addClass(sentinel, "win-disposable");
        flyout.element.appendChild(sentinel);
        sentinel.dispose = function () {
            if (sentinel.disposed) {
                LiveUnit.Assert.fail("Unexpected double dispose occured.");
            }
            sentinel.disposed = true;
        };

        flyout.dispose();
        LiveUnit.Assert.isTrue(sentinel.disposed);
        LiveUnit.Assert.isTrue(flyout._disposed);
        flyout.dispose();
    }
    this.testFlyoutDispose["Owner"] = "seanxu";
    this.testFlyoutDispose["Description"] = "Unit test for dispose requirements.";
        
    this.testFlyoutShowThrows = function (complete) {
        var flyout = new WinJS.UI.Flyout(that._element);
        LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
        LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");

        LiveUnit.LoggingCore.logComment("Calling show() with no parameters should throw");
        try {
            flyout.show();
        } catch (e) {            
            LiveUnit.Assert.areEqual(WinJS.Resources._getWinJSString("ui/noAnchor").value, e.message);
        }

        LiveUnit.LoggingCore.logComment("Calling show() with null should throw");
        try {
            flyout.show(null);
        } catch (e) {
            LiveUnit.Assert.areEqual(WinJS.Resources._getWinJSString("ui/noAnchor").value, e.message);
        }

        complete();
    }

    this.testFlyoutInnerHTMLChangeDuringShowAnimation = function (complete) {      
        LiveUnit.LoggingCore.logComment("Attempt to Instantiate the flyout element");
        var flyout = new WinJS.UI.Flyout(that._element);
        LiveUnit.LoggingCore.logComment("flyout has been instantiated.");
        LiveUnit.Assert.isNotNull(flyout, "flyout element should not be null when instantiated.");

        LiveUnit.LoggingCore.logComment("Remove HTML Elements from Flyout innerHTML before Flyout show animation completes.");        
        flyout.show(document.body);
        flyout.element.innerHTML = "Not an HTML Element"; // A text Node !== an HTML Element

        CommonUtilities.waitForEvent(that._element, "aftershow").done(complete);
    }

    this.testDisposeRemovesFlyoutClickEatingDiv = function (complete) {
        WinJS.UI._Overlay._clickEatingAppBarDiv = null;
        WinJS.UI._Overlay._clickEatingFlyoutDiv = null;

        var flyout = new WinJS.UI.Flyout();
        document.body.appendChild(flyout.element);
        flyout.show(document.body);

        // ClickEater add/remove are high priority scheduler jobs, so we schedule an idle priority asserts
        flyout.addEventListener("aftershow", function () {
            var clickEater = document.querySelector("." + WinJS.UI._Overlay._clickEatingFlyoutClass);
            LiveUnit.Assert.isTrue(clickEater);
            LiveUnit.Assert.areNotEqual("none", clickEater.style.display);

            flyout.dispose();

            WinJS.Utilities.Scheduler.schedule(function () {
                LiveUnit.Assert.areEqual("none", clickEater.style.display);
                complete();
            }, WinJS.Utilities.Scheduler.Priority.idle);
        });
    };

    var expectedDistanceFromAnchor = 5;
    var anchorStyling = "position:absolute; top:50%; left:50%; height:10px; width:10px; background-color: red;"

    this.testTopPlacement = function (complete) {
        var anchor = document.createElement("DIV");
        anchor.style.cssText = anchorStyling;
        document.body.appendChild(anchor);

        var flyout = new WinJS.UI.Flyout(that._element);
        flyout.show(anchor, "top");

        flyout.addEventListener('aftershow', function () {
            var anchorRect = anchor.getBoundingClientRect();
            var flyoutRect = flyout.element.getBoundingClientRect();

            // In High DPI scenarios the actual distance may be within 1px of the expected distance.
            var actualDistance = anchorRect.top - flyoutRect.bottom;

            LiveUnit.LoggingCore.logComment("Flyout should be on top of the anchor")
            LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
            LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

            LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
            document.body.removeChild(anchor);
            complete();
        }, false);
    };

    this.testBottomPlacement = function (complete) {
        var anchor = document.createElement("DIV");
        anchor.style.cssText = anchorStyling;
        document.body.appendChild(anchor);

        var flyout = new WinJS.UI.Flyout(that._element);
        flyout.show(anchor, "bottom");

        flyout.addEventListener('aftershow', function () {
            var anchorRect = anchor.getBoundingClientRect();
            var flyoutRect = flyout.element.getBoundingClientRect();

            // In High DPI scenarios the actual distance may be within 1px of the expected distance.
            var actualDistance = flyoutRect.top - anchorRect.bottom;

            LiveUnit.LoggingCore.logComment("Flyout should be underneath the anchor")
            LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
            LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

            LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
            document.body.removeChild(anchor);
            complete();
        }, false);
    };

    this.testLeftPlacement = function (complete) {
        var anchor = document.createElement("DIV");
        anchor.style.cssText = anchorStyling;
        document.body.appendChild(anchor);

        var flyout = new WinJS.UI.Flyout(that._element);
        flyout.show(anchor, "left");

        flyout.addEventListener('aftershow', function () {
            var anchorRect = anchor.getBoundingClientRect();
            var flyoutRect = flyout.element.getBoundingClientRect();

            // In High DPI scenarios the actual distance may be within 1px of the expected distance.
            var actualDistance = anchorRect.left - flyoutRect.right;

            LiveUnit.LoggingCore.logComment("Flyout should be to the left of the anchor")
            LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
            LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

            LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
            document.body.removeChild(anchor);
            complete();
        }, false);
    };

    this.testRightPlacement = function (complete) {
        var anchor = document.createElement("DIV");
        anchor.style.cssText = anchorStyling;
        document.body.appendChild(anchor);

        var flyout = new WinJS.UI.Flyout(that._element);
        flyout.show(anchor, "right");

        flyout.addEventListener('aftershow', function () {
            var anchorRect = anchor.getBoundingClientRect();
            var flyoutRect = flyout.element.getBoundingClientRect();

            // In High DPI scenarios the actual distance may be within 1px of the expected distance.
            var actualDistance = flyoutRect.left - anchorRect.right;

            LiveUnit.LoggingCore.logComment("Flyout should be to the right of the anchor")
            LiveUnit.LoggingCore.logComment("actual: " + actualDistance);
            LiveUnit.LoggingCore.logComment("expected: " + expectedDistanceFromAnchor);

            LiveUnit.Assert.isTrue(Math.abs(expectedDistanceFromAnchor - actualDistance) < 1, "Flyout is not in the right location");
            document.body.removeChild(anchor);
            complete();
        }, false);
    };

}

// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.FlyoutTests");
