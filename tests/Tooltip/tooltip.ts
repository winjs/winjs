// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

module CorsicaTests {

    "use strict";

    export class TooltipTests {

        anchorElement: HTMLDivElement;

        // Initial setup for each test to create the anchor element
        setUp() {
            var newNode = document.createElement("div");
            newNode.id = "tooltipTestDiv";
            newNode.innerHTML =
            "This is a test for tooltip <span id=\"anchorElement\">hover for tooltip</span>";
            document.body.appendChild(newNode);
            this.anchorElement = newNode;
        }

        tearDown() {
            var tooltipElement = document.getElementById("tooltipTestDiv");
            if (tooltipElement) {
                WinJS.Utilities.disposeSubTree(tooltipElement);
                document.body.removeChild(tooltipElement);
            }
        }

        // Test Tooltip Instantiation
        testTooltipInstantiation() {

            function verifyFunction(functionName) {
                LiveUnit.LoggingCore.logComment("Verifying that function " + functionName + " exists");
                if (tooltip[functionName] === undefined) {
                    LiveUnit.Assert.fail(functionName + " missing from tooltip");
                }

                LiveUnit.Assert.isNotNull(tooltip[functionName]);
                LiveUnit.Assert.isTrue(typeof (tooltip[functionName]) === "function", functionName + " exists on tooltip, but it isn't a function");
            }

            // Set the anchor element
            LiveUnit.LoggingCore.logComment("Setting the anchor element");

            // Test tooltip insantiation
            LiveUnit.LoggingCore.logComment("Attempt to Insantiate the tooltip element");
            var tooltip = new WinJS.UI.Tooltip(this.anchorElement);
            LiveUnit.LoggingCore.logComment("Tooltip has been insantiated.");
            LiveUnit.Assert.isNotNull(tooltip, "Tooltip element should not be null when insantiated.");

            verifyFunction("addEventListener");
            verifyFunction("removeEventListener");
            verifyFunction("open");
            verifyFunction("close");
        }


        // Test Tooltip Instatiation with null anchor element
        testTooltipNullInstatiation() {
            LiveUnit.LoggingCore.logComment("Attempt to Instantiate the tooltip with null element");
            var tooltip = null;

            try {
                tooltip = new WinJS.UI.Tooltip(null);
            } catch (e) {
                tooltip = null;
            } finally {
                LiveUnit.Assert.isNotNull(tooltip, "Tooltip should allow instantiating with a null anchor.");
                LiveUnit.Assert.isNotNull(tooltip.element, "When tooltip is instantiating with a null anchor, an anchor is generated for it.");
                tooltip.dispose();
            }
        }





        // Test multiple instantiation of the same anchor element
        testTooltipMultipleInstantiation() {

            var tooltip = new WinJS.UI.Tooltip(this.anchorElement);

            LiveUnit.LoggingCore.logComment("Attempt to Insantiate tooltip2 on the same anchor element");
            var tooltip2 = new WinJS.UI.Tooltip(this.anchorElement);
            LiveUnit.LoggingCore.logComment("Tooltip2 has been instantiated.");
            LiveUnit.Assert.isNotNull(tooltip2, "Tooltip2 element should not be null when instantiated.");
            LiveUnit.Assert.areEqual(tooltip, tooltip2, "Multiple calls to new WinJS.UI.Tooltip() on the same element should return the same tooltip object");

        }





        // Test tooltip parameters
        testGoodInitOption() {
            var options = {};
            options["placement"] = "bottom";
            var tooltip = new WinJS.UI.Tooltip(this.anchorElement, options);
            LiveUnit.Assert.areEqual("bottom", tooltip.placement);
        }

        testGoodInitOption2() {
            var options = {};
            options["innerHTML"] = "<B>Header of my tip</B><BR>Main text of my tip3";
            var tooltip = new WinJS.UI.Tooltip(this.anchorElement, options);
            LiveUnit.Assert.areEqual("<B>Header of my tip</B><BR>Main text of my tip3", tooltip.innerHTML);
        }







        // Simple Function Tests
        testSimpleTooltipFunctions() {
            var tooltip = new WinJS.UI.Tooltip(this.anchorElement);
            LiveUnit.Assert.isNotNull(tooltip, "Tooltip element should not be null when instantiated.");

            LiveUnit.LoggingCore.logComment("open");
            tooltip.open();

            LiveUnit.LoggingCore.logComment("close");
            tooltip.close();

        }





        // Tests for dispose members and requirements
        testTooltipDispose() {


            var tt = <WinJS.UI.PrivateTooltip> new WinJS.UI.Tooltip(this.anchorElement, { innerHTML: "<div></div>" });
            tt.open();
            LiveUnit.Assert.isTrue(tt.dispose);
            LiveUnit.Assert.isFalse(tt._disposed);

            tt.addEventListener("click", function () {
                LiveUnit.Assert.fail("Click shouldn't happen after dispose");
            });

            // Double dispose sentinel
            var sentinel: any = document.createElement("div");
            sentinel.disposed = false;
            WinJS.Utilities.addClass(sentinel, "win-disposable");
            tt._domElement.appendChild(sentinel);
            sentinel.dispose = function () {
                if (sentinel.disposed) {
                    LiveUnit.Assert.fail("Unexpected double dispose occured.");
                }
                sentinel.disposed = true;
            };

            tt.dispose();
            LiveUnit.Assert.isTrue(sentinel.disposed);
            LiveUnit.Assert.isTrue(tt._disposed);
            LiveUnit.Assert.isFalse(WinJS.Utilities.data(this.anchorElement).tooltip);
            this.anchorElement.click();
            tt.dispose();

        }


    }

}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("CorsicaTests.TooltipTests");
