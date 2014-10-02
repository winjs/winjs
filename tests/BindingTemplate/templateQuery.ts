// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {

    "use strict";
    var q = WinJS.Utilities.query;


    export class TemplateQueryTests {


        testCanRenderSingleTemplate = function (complete) {
            var holder = document.createElement("div");
            holder.innerHTML = "<div id='template' data-win-control='WinJS.Binding.Template'>" +
            "<span>Your text here</span>" +
            "</div>" +
            "<div id='target'></div>";


            WinJS.UI.processAll(holder).then(function () {
                var undefined;
                var renderPromise = null;
                q("#target", holder).template(q("#template", holder)[0], undefined, function (donePromise) {
                    renderPromise = donePromise;
                });
                return renderPromise;
            }).done(function () {
                    var expectedSpan = holder.querySelectorAll("div span");

                    LiveUnit.Assert.areEqual(1, expectedSpan.length);
                    LiveUnit.Assert.areEqual("Your text here", expectedSpan[0].textContent);
                    complete();
                });
        }

    testCanRenderTemplatesWithData = function (complete) {
            var holder = document.createElement("div");
            holder.innerHTML = "<div id='template' data-win-control='WinJS.Binding.Template'>" +
            "<span class='rendered' data-win-bind='textContent: title'></span>" +
            "</div>" +
            "<div id='target'></div>";
            var data = [{ title: "first" }, { title: "second" }, { title: "third" }];

            WinJS.UI.processAll(holder).then(function () {
                var renderPromise = null;
                q("#target", holder).template(q("#template", holder)[0], data, function (donePromise) {
                    renderPromise = donePromise;
                });
                return renderPromise;
            }).done(function () {
                    var rendered = holder.querySelectorAll(".rendered");
                    LiveUnit.Assert.areEqual(data.length, rendered.length);
                    for (var i = 0, len = data.length; i < len; ++i) {
                        LiveUnit.Assert.areEqual(data[i].title, rendered[i].textContent);
                    }
                    complete();
                });
        }

    testCanRenderTemplatesReferencedAsElement = function (complete) {
            var holder = document.createElement("div");
            holder.innerHTML = "<div id='template' data-win-control='WinJS.Binding.Template'>" +
            "<span class='rendered' data-win-bind='textContent: title'></span>" +
            "</div>" +
            "<div id='target'></div>";
            var data = [{ title: "first" }, { title: "second" }, { title: "third" }];
            var template = <HTMLElement>holder.querySelector("#template");

            WinJS.UI.processAll(holder).then(function () {
                var renderPromise = null;
                q("#target", holder).template(template, data, function (donePromise) {
                    renderPromise = donePromise;
                });
                return renderPromise;
            }).done(function () {
                    var rendered = holder.querySelectorAll(".rendered");
                    LiveUnit.Assert.areEqual(data.length, rendered.length);
                    for (var i = 0, len = data.length; i < len; ++i) {
                        LiveUnit.Assert.areEqual(data[i].title, rendered[i].textContent);
                    }
                    complete();
                });
        }

    testCanChainOffTemplateMethod = function (complete) {
            var holder = document.createElement("div");
            holder.innerHTML = "<div id='template' data-win-control='WinJS.Binding.Template'>" +
            "<span class='rendered' data-win-bind='textContent: title'></span>" +
            "</div>" +
            "<div id='target'></div>";
            var data = [{ title: "first" }, { title: "second" }, { title: "third" }];

            WinJS.UI.processAll(holder).then(function () {
                q("#target", holder).template(q("#template", holder)[0], data).addClass("chained");
            }).done(function () {
                    LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(q("#target", holder)[0], "chained"));
                    complete();
                });
        }
};
}

LiveUnit.registerTestClass("CorsicaTests.TemplateQueryTests");

