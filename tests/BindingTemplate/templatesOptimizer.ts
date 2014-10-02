// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />
/// <deploy src="nonCompatTemplate.html" />



module CorsicaTests {
    "use strict";

    var Template = <typeof WinJS.Binding.PrivateTemplate> WinJS.Binding.Template;

    export class BaseContainer {
        createControl(element, bindingList, template) {
        }

        getItemNode(container, index) {
        }
    }

    export class ListViewContainerHelper extends BaseContainer {
        createControl(element, bindingList, template) {
            var control = new WinJS.UI.ListView(element, {
                itemDataSource: bindingList.dataSource,
                itemTemplate: template.element
            });

            return {
                control: control,
                readyPromise: new WinJS.Promise(function (c, e, p) {
                    var listView = control;
                    function waitForReady_handler() {
                        LiveUnit.LoggingCore.logComment("waitForReady_handler: ListView loadingState = " + listView.loadingState);
                        if (listView.loadingState === "complete") {
                            listView.removeEventListener("loadingstatechanged", waitForReady_handler, false);
                            c();
                        }
                    }

                    function waitForReady_work() {
                        LiveUnit.LoggingCore.logComment("waitForReady_work ListView loadingState = " + listView.loadingState);
                        if (listView.loadingState !== "complete") {
                            listView.addEventListener("loadingstatechanged", waitForReady_handler, false);
                        }
                        else {
                            c();
                        }
                    }
                    waitForReady_work();
                }),
            };
        }
        getItemNode(container, index) {
            var nodes = container.element.querySelectorAll(".win-item");
            LiveUnit.Assert.isTrue(nodes.length > 0);
            var node = nodes[index];
            LiveUnit.Assert.isTrue(node.childNodes.length > 0);
            return node;
        }

    }

    export class RepeaterContainerHelper extends BaseContainer {
        createControl(element, bindingList, template) {
            var control = new WinJS.UI.Repeater(element, {
                data: bindingList,
                template: template.element
            });

            return {
                control: control,
                readyPromise: WinJS.Promise.timeout(0),
            };
        }
        getItemNode(container, index) {
            var nodes = container.element.childNodes;
            LiveUnit.Assert.isTrue(nodes.length > 0);
            var node = nodes[index];
            return node;
        }
    }

    export class TestClass {
        _interpretAll: boolean;
        _element;
        _style;
        _containerHelper;

        setUp() {
            this._interpretAll = Template._interpretAll;
            Template._interpretAll = false; // remove this while it is default
            LiveUnit.LoggingCore.logComment("In setup");
            var newNode = document.createElement("div");
            newNode.id = "root";
            document.body.appendChild(newNode);
            this._element = newNode;
            var style = document.createElement("style");
            style.innerHTML = ".show{ display:block; } .hide{ display:none; } .big{ font-size:large; } .small { font-size: small; } .white{ color: #FFF; } .yellow { color: #FF0; } .border{ border: solid 1px red; } .noBorder{ border: none; }";
            document.body.appendChild(style);
            this._style = style;
            window['NonCompatControl'] = WinJS.Utilities.markSupportedForProcessing(function nonCompatControl(element, options) {
                if (element.className === "white") {
                    element.textContent = "White";
                } else {
                    element.textContent = "Yellow";
                }
            });

            window['setAttributeNotSupportedForProcessing'] = function setAttributeNotSupportedForProcessing(source, sourceProperties, dest, destProperties) {
                WinJS.Binding.setAttribute(source, sourceProperties, dest, destProperties);
            };

            window['setAttributeSupportedForProcessing'] = WinJS.Utilities.markSupportedForProcessing(function setAttributeSupportedForProcessing(source, sourceProperties, dest, destProperties) {
                WinJS.Binding.setAttribute(source, sourceProperties, dest, destProperties);
            });
        }
        tearDown() {
            LiveUnit.LoggingCore.logComment("In tearDown");
            if (this._element) {
                WinJS.Utilities.disposeSubTree(this._element);
                document.body.removeChild(this._element);
                this._element = null;
            }

            if (this._style) {
                WinJS.Utilities.disposeSubTree(this._style);
                document.body.removeChild(this._style);
                this._style = null;
            }

            window['NonCompactControl'] = null;
            window['setAttributeNotSupportedForProcessing'] = null;
            window['setAttributeSupportedForProcessing'] = null;
            Template._interpretAll = this._interpretAll;
        }
        _executeTest(c, templateHTML, verify, templateOptions: any = {}, definedInHtml = false) {
            if (!this._containerHelper) {
                LiveUnit.Assert.fail("There's no containerHelper defined for the test");
                return;
            }

            var template, element;
            templateOptions = templateOptions || {};

            if (!templateOptions.href) {
                element = document.createElement("div");
                element.id = "templateElement";
                element.innerHTML = templateHTML;
                this._element.appendChild(element);
            }

            if (definedInHtml) {
                if (element) {
                    element.setAttribute("data-win-control", "WinJS.Binding.Template");
                    WinJS.UI.processAll(element);
                    template = element.winControl;
                    WinJS.UI.setOptions(template, templateOptions);
                }
            } else {
                template = new WinJS.Binding.Template(element, templateOptions);
            }

            var data = [];
            for (var i = 0; i < 10; i++) {
                var item: any = { id: i.toString() };
                item.header = "Item Header";
                item.headerClassName = (i % 7 == 0) ? "show" : "hide";
                item.name = "Name " + item.id;
                item.nameClassName = (i % 2 == 0) ? "big" : "small";
                item.description = "Description " + item.id;
                item.descriptionClassName = (i % 3 == 0) ? "white" : "yellow";
                item.image = "/images/" + item.id + ".png";
                item.imageClassName = (i % 5 == 0) ? "border" : "noborder";
                item.link = "http://microsoft.com/links?id=" + item.id;
                item.userRating = i % 4 + 4;
                item.checked = item.userRating > 5;
                item.classToRemove = "classToRemove";
                data.push(item);
            }
            var bList = new WinJS.Binding.List(data);

            var container = document.createElement("div");
            container.id = "container";
            container.style.height = "400px";
            this._element.appendChild(container);

            var control = this._containerHelper.createControl(container, bList, template);

            var that = this;
            control.readyPromise.then(function () {
                if (typeof verify === "string") {
                    return that._verifyFirstItem(control.control, data, verify);
                } else {
                    return verify(control.control, data);
                }
            }).then(c, c);
        }
        _verifyFirstItem(container, data, expectedHTML) {
            var templateNode = this._containerHelper.getItemNode(container, 0);
            var expectedHTMLArray;

            function verifyAttributes(actualAttributes, expectedNodeHtml) {
                LiveUnit.Assert.areNotEqual(expectedNodeHtml, "undefined", "HTML node not found");

                LiveUnit.Assert.isNotNull(expectedNodeHtml.match(/="/g));
                LiveUnit.Assert.areEqual(expectedNodeHtml.match(/="/g).length, actualAttributes.length);

                for (var i = 0, len = actualAttributes.length; i < len; i++) {
                    var attValue = actualAttributes[i].localName + "=\"" + actualAttributes[i].value + "\"";
                    LiveUnit.Assert.isTrue(expectedNodeHtml.indexOf(attValue) != -1);
                }
            }
            function verifyChildNodes(node) {
                if (/^_win_bind/.test(node.id)) {
                    node.removeAttribute("id");
                }
                var expectedNodeHtml = expectedHTMLArray.shift();
                var regex = new RegExp("^" + node.localName);

                LiveUnit.Assert.isTrue(regex.test(expectedNodeHtml));
                if (node.attributes && node.attributes.length > 0) {
                    verifyAttributes(node.attributes, expectedNodeHtml);
                }

                for (var i = 0, len = node.children.length; i < len; i++) {
                    verifyChildNodes(node.children[i]);
                }
            }

            var keys = Object.keys(data[0]);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                expectedHTML = expectedHTML.replace(new RegExp("{{" + key + "}}", "g"), data[0][key]);
            }

            expectedHTMLArray = expectedHTML.split("<");
            expectedHTMLArray.shift();
            for (var i = 0; i < expectedHTMLArray.length; i++) {
                var regex = new RegExp("^/");
                if (regex.test(expectedHTMLArray[i])) {
                    expectedHTMLArray.splice(i, 1);
                    i--;
                }
            }
            if (templateNode.classList.contains("win-template") && templateNode.ELEMENT_NODE > 0) {
                verifyChildNodes(templateNode.firstElementChild);
            }
            else {
                verifyChildNodes(templateNode);
            }
        }
        testBasicalControls_DefinedInDOM(c) {
            var that = this;
            this._executeTest(
                c,
                "<div><img data-win-bind=\"src: image; alt: name; className: imageClassName\" /><a data-win-bind=\"href: link; textContent: name; className: nameClassName\"></a><div data-win-bind=\"textContent: description; className: descriptionClassName\"></div></div>",
                "<div><img class=\"{{imageClassName}}\" alt=\"{{name}}\" src=\"{{image}}\"><a class=\"{{nameClassName}}\" href=\"{{link}}\">{{name}}</a><div class=\"{{descriptionClassName}}\">{{description}}</div></div>",
                null,
                true);
        }
        testBasicalControls_DefinedInJS(c) {
            var that = this;
            this._executeTest(
                c,
                "<div><img data-win-bind=\"src: image; alt: name; className: imageClassName\" /><a data-win-bind=\"href: link; textContent: name; className: nameClassName\"></a><div data-win-bind=\"textContent: description; className: descriptionClassName\"></div></div>",
                "<div><img class=\"{{imageClassName}}\" alt=\"{{name}}\" src=\"{{image}}\"><a class=\"{{nameClassName}}\" href=\"{{link}}\">{{name}}</a><div class=\"{{descriptionClassName}}\">{{description}}</div></div>");
        }
        testNewBahavior(c) {
            var that = this;
            this._executeTest(
                c,
                "<div data-win-control=\"NonCompatControl\" data-win-bind=\"className: descriptionClassName\"></div>",
                "<div class=\"white\">White</div>");
        }
        testMoreControls(c) {
            if (WinJS.UI.Rating && WinJS.UI.ToggleSwitch) {
                var that = this;
                this._executeTest(
                    c,
                    "<div>"
                    + "<div data-win-control=\"WinJS.UI.Rating\" data-win-options=\"{maxRating: 7}\" data-win-bind=\"winControl.userRating: userRating\"></div>"
                    + "<div data-win-control=\"WinJS.UI.ToggleSwitch\"></div>"
                    + "</div>",
                    function (container, data) {
                        var node = that._containerHelper.getItemNode(container, 0);
                        var ratings = node.querySelectorAll(".win-rating");
                        LiveUnit.Assert.areEqual(1, ratings.length);
                        var rating = ratings[0];
                        LiveUnit.Assert.isTrue(rating.winControl instanceof WinJS.UI.Rating);
                        LiveUnit.Assert.areEqual(7, rating.winControl.maxRating);
                        LiveUnit.Assert.areEqual(data[0].userRating, rating.winControl.userRating);
                        var toggleSwitches = node.querySelectorAll(".win-toggleswitch");
                        LiveUnit.Assert.areEqual(1, toggleSwitches.length);
                        var toggleSwitch = toggleSwitches[0];
                        LiveUnit.Assert.isTrue(toggleSwitch.winControl instanceof WinJS.UI.ToggleSwitch);
                        LiveUnit.Assert.areEqual(data[0].checked, toggleSwitch.winControl.checked);
                    });
            } else {
                c();
            }
        }
        testInitializers_setAttribute(c) {
            this._executeTest(
                c,
                "<div data-win-bind=\"className: descriptionClassName; property: description WinJS.Binding.setAttribute\"></div>",
                "<div class=\"{{descriptionClassName}}\" property=\"{{description}}\"></div>");
        }
        /*
        testInitializers_addClass:function(c){
            this._executeTest(
                c,
                "<div class=\"existingClass\" data-win-bind=\"this: descriptionClassName WinJS.Binding.addClass\"></div>",
                "<div class=\"existingClass {{descriptionClassName}}\"></div>");
        },
        */
        testInitializers_defaultInitializer(c) {
            this._executeTest(
                c,
                "<div data-win-bind=\"property1: descriptionClassName; property2: description; textContent: description WinJS.Binding.oneTime\"></div>",
                "<div property1=\"{{descriptionClassName}}\" property2=\"{{description}}\">{{description}}</div>",
                { bindingInitializer: WinJS.Binding.setAttribute });
        }
        testNonExtractChild(c) {
            var that = this;
            this._executeTest(
                c,
                "<div class=\"firstChild\"><div class=\"firstGrandchild\"></div></div><div class=\"secondChild\"></div>",
                "<div class=\"firstChild\"><div class=\"firstGrandchild\"></div></div><div class=\"secondChild\"></div>");
        }
        /*
        testExtractChild: function (c) {
            this._executeTest(
                c,
                "<div class=\"firstChild\"><div class=\"firstGrandchild\"></div></div><div class=\"secondChild\"></div>",
                "<div class=\"firstChild\"><div class=\"firstGrandchild\"></div>",
               { extractFirstChild: true });
        },
        */
        testClassicBinding_disableOptimizedProcessing(c) {
            this._executeTest(
                c,
                "<div data-win-control=\"NonCompatControl\" data-win-bind=\"className: descriptionClassName\"></div>",
            // Because this uses the interpreted path we don't end up stripping the attributes.
                "<div class=\"white\" data-win-bind=\"className: descriptionClassName\" data-win-control=\"NonCompatControl\">Yellow</div>",
                { disableOptimizedProcessing: true });
        }
        testSecurity_markSupported(c) {
            this._executeTest(
                c,
                "<div data-win-bind=\"textContent: name setAttributeSupportedForProcessing\"></div>",
                "<div textContent=\"{{name}}\"></div>");
        }
    }

    export class ListViewTemplateOptimizerTests extends TestClass {

        constructor() {
            super();
            this._containerHelper = new CorsicaTests.ListViewContainerHelper();
        }
        testClassicBinding_processTimeout(c) {
            this._executeTest(
                c,
                "<div data-win-control=\"NonCompatControl\" data-win-bind=\"className: descriptionClassName\"></div>",
                "<div class=\"white\" data-win-bind=\"className: descriptionClassName\" data-win-control=\"NonCompatControl\">Yellow</div>",
                { processTimeout: -1 });
        }
        testClassicBinding_href(c) {
            var that = this;
            this._executeTest(
                c,
                null,
                function (container, data) {
                    var node = that._containerHelper.getItemNode(container, 0);
                    LiveUnit.Assert.areEqual("Yellow", node.textContent.replace(/\n/g, ''));
                },
                { href: "nonCompatTemplate.html" });
        }
    }

    export class RepeaterTemplateOptimizerTests extends TestClass {

        constructor() {
            super();
            this._containerHelper = new CorsicaTests.RepeaterContainerHelper();
        }

        testNonExtractChild(c) {
            var that = this;
            this._executeTest(
                c,
                "<div class=\"firstChild\"><div class=\"firstGrandchild\"></div></div><div class=\"secondChild\"></div>",
                "<div class=\"firstChild\"><div class=\"firstGrandchild\"></div></div>");
        }
    }
}

LiveUnit.registerTestClass("CorsicaTests.ListViewTemplateOptimizerTests");
LiveUnit.registerTestClass("CorsicaTests.RepeaterTemplateOptimizerTests");