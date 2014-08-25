// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/LegacyLiveUnit/CommonUtils.ts"/>

module CorsicaTests {

    var canElementResize: boolean = null;
    // note: the .win-viewbox style comes from ui-dark.css or ui-light.css 
    //      "<style>.win-viewbox { width:100%; height:100%; position:relative; }</style>";
    var square = "<div data-win-control='WinJS.UI.ViewBox'><div class='sizer' style='width:100px;height:100px;'>Content</div></div>";

    export class ViewBox {
        "use strict";

        unhandledTestError(msg) {
            try {
                LiveUnit.Assert.fail("unhandled test exception: " + msg);
            } catch (ex) {
                // don't rethrow assertion failure exception
            }
        }

        setUp(completed) {
            CommonUtilities.detectMsElementResize((canResize) => {
                canElementResize = canResize;
                completed();
            });
        }

        testScalingSquare(completed) {
            var container = document.createElement("div");

            try {
                document.body.appendChild(container);
                container.innerHTML = square;
                container.style.width = "300px";
                container.style.height = "50px";

                WinJS.UI.processAll(container);
                var sizer = <HTMLElement>container.querySelector(".sizer");
                LiveUnit.Assert.areEqual("translate(125px, 0px) scale(0.5)", sizer.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName]);

                container.style.height = "300px";

                if (!canElementResize) {
                    WinJS.Utilities._resizeNotifier._handleResize();
                }

                WinJS.Promise.timeout(16).then(function () {
                    LiveUnit.Assert.areEqual("translate(0px, 0px) scale(3)", sizer.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName]);
                    document.body.removeChild(container);
                }).
                    then(null, this.unhandledTestError).
                    then(completed);
            } catch (ex) {
                document.body.removeChild(container);
                LiveUnit.Assert.fail("unhandled exception: " + ex);
                completed();
            }
        }

        testSwappingChildren(completed) {
            var container = document.createElement("div");

            try {
                document.body.appendChild(container);
                container.innerHTML = square;
                container.style.width = "300px";
                container.style.height = "50px";

                WinJS.UI.processAll(container);
                var sizer = <HTMLElement>container.querySelector(".sizer");
                LiveUnit.Assert.areEqual("translate(125px, 0px) scale(0.5)", sizer.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName]);

                container.style.height = "300px";

                if (!canElementResize) {
                    WinJS.Utilities._resizeNotifier._handleResize();
                }

                WinJS.Promise.timeout(16).then(function () {
                    LiveUnit.Assert.areEqual("translate(0px, 0px) scale(3)", sizer.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName]);
                }).
                    then(function () {
                        var box = <HTMLElement>document.querySelector(".sizer").parentNode;
                        var newChild = document.createElement("div");
                        newChild.className = "sizer";
                        newChild.style.width = "50px";
                        newChild.style.height = "100px";
                        box.removeChild(sizer);
                        box.appendChild(newChild);
                        sizer = newChild;
                        box.winControl.forceLayout();
                        return WinJS.Promise.timeout(16);
                    }).
                    then(function () {
                        LiveUnit.Assert.areEqual("translate(75px, 0px) scale(3)", sizer.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName]);
                    }).
                    then(function () {
                        document.body.removeChild(container);
                    }).
                    then(null, this.unhandledTestError).
                    then(completed);
            } catch (ex) {
                document.body.removeChild(container);
                LiveUnit.Assert.fail("unhandled exception: " + ex);
                completed();
            }
        }

        // return a string that looks like this:   "translate(338.5px, 0px) scale(1)"
        computeTranslateString(originalWidth, originalHeight, containerWidth, containerHeight) {
            var scale;
            var translateString;

            if (containerWidth < containerHeight) {
                scale = containerWidth / originalWidth;
            } else {
                scale = containerHeight / originalHeight;
            }

            // calculate the centering
            var newWidth = originalWidth * scale;
            var newHeight = originalHeight * scale;
            var newX = (containerWidth - newWidth) / 2;
            var newY = (containerHeight - newHeight) / 2;

            translateString = "translate(" + newX + "px, " + newY + "px) scale(" + scale + ")";
            var results = {
                translateString: translateString,
                scale: scale
            };
            return results;
        }

        // if WinJS.validation=true, viewbox should throw exception if it's wrapping > 1 child elements
        test2containersWithValidation() {
            var container = document.createElement("div");
            var squareHTML = "<div id='testDiv' data-win-control='WinJS.UI.ViewBox'><div id='secondViewBoxChild'></div><div class='sizer' style='width:200px;height:200px;background:white;'><div class='inner' style='width:100px;height:100px;background:green;'>C</div></div></div>";
            var viewboxExceptionCaught = false;

            // this is a user setting, you have to opt in
            var old = WinJS.validation;
            WinJS.validation = true;
            try {
                document.body.appendChild(container);
                container.innerHTML = squareHTML;
                container.style.width = "200px";
                container.style.height = "200px";

                // exception should occur when the viewbox constructor is called.  Since processAll() 
                // is a promise, we need to snap on a then() to react to the exception.
                WinJS.UI.processAll(container).
                    then(null,
                    function (error) {
                        if (error.message.indexOf("ViewBox") != -1) {
                            viewboxExceptionCaught = true;
                        }
                    });
            } finally {
                document.body.removeChild(container);
                WinJS.validation = old;
                LiveUnit.Assert.isTrue(viewboxExceptionCaught);
            }
        }

    // if WinJS.validation=false, viewbox should not throw exception if wrapping > 1 child elements
    test2containersWithoutValidation() {
            var container = document.createElement("div");
            var squareHTML = "<div id='testDiv' data-win-control='WinJS.UI.ViewBox'><div id='secondViewBoxChild'></div><div class='sizer' style='width:200px;height:200px;background:white;'><div class='inner' style='width:100px;height:100px;background:green;'>C</div></div></div>";
            var viewboxExceptionCaught = false;

            // note   WinJS.validation = false;   is the default
            LiveUnit.Assert.isFalse(WinJS.validation);

            try {
                document.body.appendChild(container);
                container.innerHTML = squareHTML;
                container.style.width = "200px";
                container.style.height = "200px";

                // exception should not occur here 
                WinJS.UI.processAll(container).
                    then(null,
                    function (error) {
                        if (error.indexOf("ViewBox") > 0) {
                            viewboxExceptionCaught = true;
                        }
                    });
            } finally {
                document.body.removeChild(container);
                WinJS.validation = false;
                LiveUnit.Assert.isFalse(viewboxExceptionCaught);
            }
        }

    testHTMLScaling() {
            try {
                var container = document.createElement("div");
                var squareHTML = "<div id='testDiv' data-win-control='WinJS.UI.ViewBox'><div class='sizer' style='width:200px;height:200px;background:white;'><div class='inner' style='width:100px;height:100px;background:green;'>C</div></div></div>";
                document.body.appendChild(container);
                container.innerHTML = squareHTML;

                // setting the width, height as values depends on the html tag getting styled to w=h=800px
                container.style.width = "800px";
                container.style.height = "800px";
                WinJS.UI.processAll(container);

                var testDiv = document.getElementById("testDiv");

                // validate the class was applied
                LiveUnit.Assert.isTrue(testDiv.classList.contains("win-viewbox"));

                // validate style is correct: { "width=800px; height=800px; position:relative" }
                LiveUnit.Assert.areEqual("800px", getComputedStyle(testDiv).width);
                LiveUnit.Assert.areEqual("800px", getComputedStyle(testDiv).height);
                LiveUnit.Assert.areEqual("relative", getComputedStyle(testDiv).position);

                var sizer = <HTMLElement>container.querySelector(".sizer");
                var actualTransform = sizer.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName];

                // consider container.clientWidth, clientHeight instead of window / 2 
                //                 var myTransform = computeTranslateString(200, 200, window.innerWidth / 2, window.innerHeight / 2);
                // bug373135       LiveUnit.Assert.areEqual(myTransform.translateString, actualTransform);

                var actualScale = parseFloat(actualTransform.match(".*scale[(](.*)[)]")[1]);
                var minClientDimension = Math.min(container.clientHeight, container.clientWidth);
                LiveUnit.LoggingCore.logComment("minClientDimension=" + minClientDimension + ", actualScale=" + actualScale);

                // there is a "chance" that scaling could be 1 if the container is 200px, 
                // but scaling == 1 is 99% of the time an indicator that scaling is not occuring
                if (minClientDimension >= 200) {
                    LiveUnit.Assert.isTrue(actualScale >= 1);
                } else {
                    LiveUnit.Assert.isTrue(actualScale < 1);
                }

            } finally {
                document.body.removeChild(container);
            }
        }

        testViewBoxNotYetInTheDOM(completed) {
            var container = document.createElement("div");
            try {
                container.innerHTML = square;
                container.style.width = "300px";
                container.style.height = "50px";

                WinJS.UI.processAll(container).
                    then(function () {
                        var sizer = <HTMLElement>container.querySelector(".sizer");
                        LiveUnit.Assert.areEqual("", sizer.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName]);
                        document.body.appendChild(container);
                        if (!canElementResize) {
                            WinJS.Utilities._resizeNotifier._handleResize();
                        }
                        return WinJS.Promise.timeout();
                    }).
                    then(function () {
                        var sizer = <HTMLElement>container.querySelector(".sizer");
                        LiveUnit.Assert.areEqual("translate(125px, 0px) scale(0.5)", sizer.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName]);

                        container.style.height = "300px";
                        if (!canElementResize) {
                            WinJS.Utilities._resizeNotifier._handleResize();
                        }
                    }).
                    then(function () {
                        return WinJS.Promise.timeout(16);
                    }).
                    then(function () {
                        var sizer = <HTMLElement>container.querySelector(".sizer");
                        LiveUnit.Assert.areEqual("translate(0px, 0px) scale(3)", sizer.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName]);
                    }).
                    then(null, this.unhandledTestError).
                    then(function () {
                        document.body.removeChild(container);
                    }).
                    then(completed);

            } catch (ex) {
                document.body.removeChild(container);
                LiveUnit.Assert.fail("unhandled exception: " + ex);
                completed();
            }
        }

        testRTL() {
            try {
                var container = document.createElement("div");
                var squareHTML = "<div id='testDiv' dir='rtl' data-win-control='WinJS.UI.ViewBox'><div class='sizer' style='width:200px;height:200px;background:white;'><div class='inner' style='width:100px;height:100px;background:green;'>C</div></div></div>";
                document.body.appendChild(container);
                container.innerHTML = squareHTML;
                var testDiv = document.getElementById("testDiv");

                // setting the width, height as values depends on the html tag getting styled to w=h=800px
                container.style.width = "800px";
                container.style.height = "800px";
                WinJS.UI.processAll(container);

                // validate the class was applied
                LiveUnit.Assert.isTrue(testDiv.classList.contains("win-viewbox"));

                // validate style is correct: { "width=800px; height=800px; position:relative" }
                LiveUnit.Assert.areEqual("800px", getComputedStyle(testDiv).width);
                LiveUnit.Assert.areEqual("800px", getComputedStyle(testDiv).height);
                LiveUnit.Assert.areEqual("relative", getComputedStyle(testDiv).position);

                var sizer = <HTMLElement>container.querySelector(".sizer");
                var actualTransform = sizer.style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName];

                LiveUnit.Assert.areEqual(0, actualTransform.indexOf("translate("));

                var firstCharOfTranslate = actualTransform["translate(".length];
                LiveUnit.Assert.isTrue(firstCharOfTranslate === "-" || firstCharOfTranslate === "0", "Because this is RTL the x transform should be negative or if the aspect ratio is the other way it should be 0");

            } finally {
                document.body.removeChild(container);
            }
        }

    testViewBoxDispose() {
            var vb = new WinJS.UI.ViewBox();
            LiveUnit.Assert.isTrue(vb.dispose);
            LiveUnit.Assert.isFalse((<any>vb)._disposed);

            // Double dispose sentinel
            var sentinel: any = document.createElement("div");
            sentinel.disposed = false;
            WinJS.Utilities.addClass(sentinel, "win-disposable");
            vb.element.appendChild(sentinel);
            sentinel.dispose = function () {
                if (sentinel.disposed) {
                    LiveUnit.Assert.fail("Unexpected double dispose occured.");
                }
                sentinel.disposed = true;
            };

            vb.dispose();
            LiveUnit.Assert.isTrue(sentinel.disposed);
            LiveUnit.Assert.isTrue((<any>vb)._disposed);
            vb.dispose();
        }
    }
}
LiveUnit.registerTestClass("CorsicaTests.ViewBox");