// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="repeaterUtils.ts"/>

module WinJSTests {

    "use strict";

    var utils = repeaterUtils,
        repeaterClass = "win-repeater",
        repeaterChildClass = "repeater-child";

    function createData() {
        var list = new WinJS.Binding.List(),
            days = repeaterUtils.createWeekdaysList();

        days.forEach(function (day) {
            list.push({ title: day, moments: repeaterUtils.getListOfMoments(4) });
        });
        return list;
    }

    export class RepeaterIntegrationTests {


        setUp() {
            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "RepeaterTests";
            newNode.style.width = "400px";
            document.body.appendChild(newNode);
        }

        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            var element = document.getElementById("RepeaterTests");
            if (element) {
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element);
            }
        }



        testTableRendererInMarkUp = function (complete) {
            var data = createData(),
                root = document.getElementById("RepeaterTests");

            window['data'] = data;

            var html = "<table border='1'>" +
                "<caption>This table is generated using WinJS Repeater</caption>" +
                "<thead>" +
                "<tr>" +
                "<th>Days</th>" +
                "</tr>" +
                "</thead>" +
                "<tbody data-win-control='WinJS.UI.Repeater' data-win-options='{ data: window.data }'>" +
                "<tr>" +
                "<td class='row' data-win-bind='textContent: title'></td>" +
                "</tr>" +
                "</tbody>" +
                "</table>";

            root.innerHTML = html;

            WinJS.UI.processAll().
                then(function () {
                    // Verify repeater created
                    var repeater = document.querySelector(".win-repeater").winControl;
                    var numberOfRows = repeater.element.querySelectorAll(".row").length;
                    LiveUnit.Assert.areEqual(data.length, numberOfRows, "Unexpected number of rows in the table");
                    delete window['data'];
                    complete();
                });
        };

        testTableRenderer = function (complete) {
            var data = createData(),
                root = document.getElementById("RepeaterTests"),
                table = document.createElement("table");

            table.style.backgroundColor = "green";
            root.appendChild(table);

            // Add table head
            var thead = document.createElement("thead"),
                theadRow = document.createElement("tr"),
                th = document.createElement("th");

            th.innerHTML = "Days";
            theadRow.appendChild(th);
            thead.appendChild(theadRow);

            function tableRenderer(item) {
                var trow = document.createElement("tr"),
                    td = document.createElement("td");

                td.innerHTML = item.title;
                trow.className = "row";
                trow.appendChild(td);
                return trow;
            }

            // Add table body
            var tbody = document.createElement("tbody");
            table.appendChild(tbody)
        LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(tbody, {
                data: data,
                template: tableRenderer
            });
            LiveUnit.LoggingCore.logComment("Repeater control created");

            // Verify 
            var numberOfRows = tbody.querySelectorAll(".row").length;
            LiveUnit.Assert.areEqual(data.length, numberOfRows, "Unexpected number of rows in the table");
            complete();
        };

        testSelectRenderer = function (complete) {
            var data = createData(),
                root = document.getElementById("RepeaterTests"),
                select = document.createElement("select");

            root.appendChild(select);

            function selectRenderer(item) {
                var option = document.createElement("option");
                option.className = "option";
                option.textContent = item.title;
                return option;
            }

            LiveUnit.LoggingCore.logComment("Creating a repeater control");
            var repeater = new WinJS.UI.Repeater(select, {
                data: data,
                template: selectRenderer
            });
            LiveUnit.LoggingCore.logComment("Repeater control created");

            // Verify
            var numberOfOptions = select.querySelectorAll(".option").length;
            LiveUnit.Assert.areEqual(data.length, numberOfOptions, "Unexpected number of options");
            complete();
        };


    }

    (function () {
        function generateListTest(root) {
            return function (complete) {
                var data = createData(),
                    elem = document.getElementById("RepeaterTests");

                elem.appendChild(root);

                function listItemRenderer(item) {
                    var listItem = document.createElement("li");
                    listItem.className = repeaterChildClass;
                    listItem.textContent = item.title;
                    return listItem;
                }

                LiveUnit.LoggingCore.logComment("Creating a repeater control");
                var repeater = new WinJS.UI.Repeater(root, {
                    data: data,
                    template: listItemRenderer
                });
                LiveUnit.LoggingCore.logComment("Repeater control created");

                // Verify
                var numberOfChildren = elem.querySelectorAll(repeaterChildClass).length;
                complete();
            };
        }

        RepeaterIntegrationTests.prototype["test" + "UnorderedList" + "Renderer"] = generateListTest(document.createElement("ul"));
        RepeaterIntegrationTests.prototype["test" + "OrderedList" + "Renderer"] = generateListTest(document.createElement("ol"));
    })();

    (function () {
        function generateControlTest(renderer) {
            return function (complete) {
                var data = createData(),
                    elem = document.getElementById("RepeaterTests");

                LiveUnit.LoggingCore.logComment("Creating a repeater control");
                var repeater = new WinJS.UI.Repeater(elem, {
                    data: data,
                    template: renderer
                });
                LiveUnit.LoggingCore.logComment("Repeater control created");

                // Verify
                var numberOfChildren = elem.querySelectorAll(repeaterChildClass).length;
                complete();
            };
        }

        function linkRenderer(item) {
            var aTag = document.createElement("a"),
                link = "http://www.bing.com";

            aTag.className = repeaterChildClass;
            aTag.href = link;
            aTag.textContent = item.title;
            return aTag;
        }

        function buttonRenderer(item) {
            var button = document.createElement("button");

            button.className = repeaterChildClass;
            button.textContent = item.title;
            return button;
        }

        function progressRenderer(item) {
            var progress = document.createElement("progress");
            progress.className = repeaterChildClass;
            progress.max = 100;
            progress.value = 30;
            return progress;
        }

        function inputRangeRenderer(item) {
            var input: any = document.createElement("input");
            input.className = repeaterChildClass;
            input.type = "range";
            input.min = 0;
            input.max = 100;
            input.step = 10;
            input.value = 50;
            return input;
        }

        function toggleSwitchRenderer(item) {
            var div = document.createElement("div");
            div.className = repeaterChildClass;
            var toggle = new WinJS.UI.ToggleSwitch(div);
            toggle.labelOff = "Off";
            toggle.labelOn = "On";
            return div;
        }

        RepeaterIntegrationTests.prototype["test" + "HyperLink" + "Renderer"] = generateControlTest(linkRenderer);
        RepeaterIntegrationTests.prototype["test" + "Button" + "Renderer"] = generateControlTest(buttonRenderer);
        RepeaterIntegrationTests.prototype["test" + "Progress" + "Renderer"] = generateControlTest(progressRenderer);
        RepeaterIntegrationTests.prototype["test" + "Range" + "Renderer"] = generateControlTest(inputRangeRenderer);

        if (WinJS.UI.Rating) {
            RepeaterIntegrationTests.prototype["test" + "Ratings" + "Renderer"] = generateControlTest(utils.winJSCtrlRenderer);
        }
        if (WinJS.UI.ToggleSwitch) {
            RepeaterIntegrationTests.prototype["test" + "ToggleSwitch" + "Renderer"] = generateControlTest(toggleSwitchRenderer);
        }
    })();
}
// register the object as a test class by passing in the name
LiveUnit.registerTestClass("WinJSTests.RepeaterIntegrationTests");
