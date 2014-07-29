// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.TemplateQueryTests = function () {
    "use strict";
    var q = WinJS.Utilities.query;
    
    this.testCanRenderSingleTemplate = function (complete) {
        var holder = document.createElement("div");
        holder.innerHTML = "<div id='template' data-win-control='WinJS.Binding.Template'>" +
            "<span>Your text here</span>" +
            "</div>" +
            "<div id='target'></div>";
        
        
        WinJS.UI.processAll(holder).then(function () {  
            var undefined;
            var renderPromise = null;
            q("#target", holder).template(q("#template", holder), undefined, function (donePromise) {
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
    
    this.testCanRenderTemplatesWithData = function (complete) {
        var holder = document.createElement("div");
        holder.innerHTML = "<div id='template' data-win-control='WinJS.Binding.Template'>" +
            "<span class='rendered' data-win-bind='textContent: title'></span>" +
            "</div>" +
            "<div id='target'></div>";
        var data = [ {title: "first"}, {title: "second"}, {title: "third"} ];
            
        WinJS.UI.processAll(holder).then(function () {
            var renderPromise = null;
            q("#target", holder).template(q("#template", holder), data, function (donePromise) {
                renderPromise = donePromise;
            });
            return renderPromise;
       }).done(function () {
           var rendered = holder.querySelectorAll(".rendered");
           LiveUnit.Assert.areEqual(data.length, rendered.length);
           for(var i = 0, len = data.length; i < len; ++i) {
               LiveUnit.Assert.areEqual(data[i].title, rendered[i].textContent);
           }
           complete();
       });
    }
    
    this.testCanRenderTemplatesReferencedAsElement = function (complete) {
        var holder = document.createElement("div");
        holder.innerHTML = "<div id='template' data-win-control='WinJS.Binding.Template'>" +
            "<span class='rendered' data-win-bind='textContent: title'></span>" +
            "</div>" +
            "<div id='target'></div>";
        var data = [ {title: "first"}, {title: "second"}, {title: "third"} ];
        var template = holder.querySelector("#template");
                    
        WinJS.UI.processAll(holder).then(function () {
            var renderPromise = null;
            q("#target", holder).template(template, data, function (donePromise) {
                renderPromise = donePromise;
            });
            return renderPromise;
       }).done(function () {
           var rendered = holder.querySelectorAll(".rendered");
           LiveUnit.Assert.areEqual(data.length, rendered.length);
           for(var i = 0, len = data.length; i < len; ++i) {
               LiveUnit.Assert.areEqual(data[i].title, rendered[i].textContent);
           }
           complete();
       });
    }
    
    this.testCanChainOffTemplateMethod = function (complete) {
        var holder = document.createElement("div");
        holder.innerHTML = "<div id='template' data-win-control='WinJS.Binding.Template'>" +
            "<span class='rendered' data-win-bind='textContent: title'></span>" +
            "</div>" +
            "<div id='target'></div>";
        var data = [ {title: "first"}, {title: "second"}, {title: "third"} ];
            
        WinJS.UI.processAll(holder).then(function () {
            q("#target", holder).template(q("#template", holder), data).addClass("chained");
       }).done(function () {
           LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(q("#target", holder)[0], "chained"));
           complete();
       });
    }       
};

LiveUnit.registerTestClass("CorsicaTests.TemplateQueryTests");

