// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="../TestLib/Helper.ts"/>
// <reference path="../TestData/Metrics.less.css" />

module CorsicaTests {

    "use strict";

    // A small do-nothing control used to test manipulation of controls by the QueryCollection

    var DummyControl = WinJS.Class.define(function DummyControl(element, options) {
        this.element = element;
        element.winControl = this;
        WinJS.UI.setOptions(this, options);
    });

    // Options:
    // - eventProperties: An object representing the event's properties that should be passed to initEvent.
    // - overridenProperties: An object representing the properties that should be overriden by the
    //                        PointerEventProxy object.
    // - eventHandler: An event handler which receives a PointerEventProxy instance as its argument.
    //                 Use this callback as an opportunity to make assertions on the PointerEventProxy object.
    // Returns false if any handler called preventDefault. Returns true otherwise. (the return value of dispatchEvent).
    function testPointerEventProxy(options) {
        var eventProperties = options.eventProperties || {};
        var overridenProperties = options.overridenProperties || {};
        var eventHandler = options.eventHandler || function () { };

        var targetElement = document.createElement("div");

        try {
            targetElement.id = "target-element";
            document.body.appendChild(targetElement);

            var eventObject = document.createEvent("MouseEvent");
            Helper.initMouseEvent(eventObject, "touchstart", eventProperties);

            var handlerRan = false;
            targetElement.addEventListener("touchstart", function (e) {
                eventHandler(new WinJS.Utilities._PointerEventProxy(e, overridenProperties));
                handlerRan = true;
            });
            var doDefaultAction = targetElement.dispatchEvent(eventObject);
            LiveUnit.Assert.isTrue(handlerRan, "touchstart event handler should have run");

            return doDefaultAction;
        } finally {
            var parent = targetElement.parentNode;
            parent && parent.removeChild(targetElement);
        }
    }

    export class Utilities {

        testSimpleAddRemove() {
            var holder = document.createElement("div");

            LiveUnit.Assert.areEqual(holder.className, "");
            LiveUnit.Assert.areEqual(WinJS.Utilities.addClass(holder, "a"), holder);
            LiveUnit.Assert.areEqual(holder.className, "a");
            WinJS.Utilities.addClass(holder, "a");
            LiveUnit.Assert.areEqual(holder.className, "a");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "a"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "b"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "c"));
            WinJS.Utilities.addClass(holder, "b");
            LiveUnit.Assert.areEqual(holder.className, "a b");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "a"));
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "b"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "c"));
            WinJS.Utilities.addClass(holder, "b");
            LiveUnit.Assert.areEqual(holder.className, "a b");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "a"));
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "b"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "c"));
            LiveUnit.Assert.areEqual(WinJS.Utilities.removeClass(holder, "a"), holder);
            LiveUnit.Assert.areEqual(holder.className, "b");
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "a"));
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "b"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "c"));
            WinJS.Utilities.removeClass(holder, "a");
            LiveUnit.Assert.areEqual(holder.className, "b");
            WinJS.Utilities.removeClass(holder, "b");
            LiveUnit.Assert.areEqual(holder.className, "");
            WinJS.Utilities.removeClass(holder, "b");
            LiveUnit.Assert.areEqual(holder.className, "");
        }


        testRemoveDups() {
            var holder = document.createElement("div");

            holder.className = "a  a  a b   a   c ";
            LiveUnit.Assert.areEqual(WinJS.Utilities.removeClass(holder, "a"), holder);
            LiveUnit.Assert.areEqual(holder.classList.length, 2);
            LiveUnit.Assert.isTrue(holder.classList.contains("b"));
            LiveUnit.Assert.isTrue(holder.classList.contains("c"));
        }

        testMultipleAddRemove() {
            var holder = document.createElement("div");

            LiveUnit.Assert.areEqual(holder.className, "");
            LiveUnit.Assert.areEqual(WinJS.Utilities.addClass(holder, "a   b"), holder);
            LiveUnit.Assert.areEqual(holder.className, "a b");
            WinJS.Utilities.addClass(holder, "a");
            LiveUnit.Assert.areEqual(holder.className, "a b");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "a"));
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "b"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "c"));
            WinJS.Utilities.addClass(holder, "b");
            LiveUnit.Assert.areEqual(holder.className, "a b");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "a"));
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "b"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "c"));
            WinJS.Utilities.addClass(holder, "b");
            LiveUnit.Assert.areEqual("a b", holder.className);
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "a"));
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "b"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "c"));
            LiveUnit.Assert.areEqual(WinJS.Utilities.removeClass(holder, " a   b  "), holder);
            LiveUnit.Assert.areEqual("", holder.className);
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "a"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "b"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "c"));
            WinJS.Utilities.removeClass(holder, "a");
            LiveUnit.Assert.areEqual("", holder.className);
            WinJS.Utilities.removeClass(holder, "b");
            LiveUnit.Assert.areEqual("", holder.className);
            WinJS.Utilities.removeClass(holder, "b");
            LiveUnit.Assert.areEqual("", holder.className);

            LiveUnit.Assert.areEqual(WinJS.Utilities.addClass(holder, "a  b"), holder);
            LiveUnit.Assert.areEqual(WinJS.Utilities.addClass(holder, " b c "), holder);
            LiveUnit.Assert.areEqual(WinJS.Utilities.addClass(holder, "a b c d "), holder);
            LiveUnit.Assert.areEqual(WinJS.Utilities.removeClass(holder, " b c "), holder);
            LiveUnit.Assert.areEqual("a d", holder.className);
            LiveUnit.Assert.areEqual(WinJS.Utilities.removeClass(holder, " b c "), holder);
            LiveUnit.Assert.areEqual("a d", holder.className);
            LiveUnit.Assert.areEqual(WinJS.Utilities.removeClass(holder, "a b c d"), holder);
            LiveUnit.Assert.areEqual("", holder.className);
        }
        testSimpleAddRemoveSVG() {
            var holder = <any>document.createElementNS('http://www.w3.org/2000/svg', "g");

            LiveUnit.Assert.areEqual(holder.className.baseVal, "");
            WinJS.Utilities.addClass(holder, "a");
            LiveUnit.Assert.areEqual(holder.className.baseVal, "a");
            WinJS.Utilities.addClass(holder, "a");
            LiveUnit.Assert.areEqual(holder.className.baseVal, "a");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "a"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "b"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "c"));
            WinJS.Utilities.addClass(holder, "b");
            LiveUnit.Assert.areEqual(holder.className.baseVal, "a b");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "a"));
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "b"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "c"));
            WinJS.Utilities.addClass(holder, "b");
            LiveUnit.Assert.areEqual(holder.className.baseVal, "a b");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "a"));
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "b"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "c"));
            WinJS.Utilities.removeClass(holder, "a");
            LiveUnit.Assert.areEqual(holder.className.baseVal, "b");
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "a"));
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "b"));
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "c"));
            WinJS.Utilities.removeClass(holder, "a");
            LiveUnit.Assert.areEqual(holder.className.baseVal, "b");
            WinJS.Utilities.removeClass(holder, "b");
            LiveUnit.Assert.areEqual(holder.className.baseVal, "");
            WinJS.Utilities.removeClass(holder, "b");
            LiveUnit.Assert.areEqual(holder.className.baseVal, "");
        }
        testSubstringAddRemove() {
            var holder = document.createElement("div");

            LiveUnit.Assert.areEqual(holder.className, "");
            WinJS.Utilities.addClass(holder, "aa");
            LiveUnit.Assert.areEqual(holder.className, "aa");
            WinJS.Utilities.addClass(holder, "a");
            LiveUnit.Assert.areEqual(holder.className, "aa a");
            WinJS.Utilities.removeClass(holder, "a");
            LiveUnit.Assert.areEqual(holder.className, "aa");
            WinJS.Utilities.removeClass(holder, "aa");
            LiveUnit.Assert.areEqual(holder.className, "");
        }
        testToggle() {
            var holder = <HTMLElement>document.createElement("div");
            LiveUnit.Assert.areEqual(WinJS.Utilities.toggleClass(holder, "a"), holder);
            LiveUnit.Assert.areEqual(holder.className, "a");
            WinJS.Utilities.toggleClass(holder, "a");
            LiveUnit.Assert.areEqual(holder.className, "");

            var holder = <HTMLElement>document.createElementNS('http://www.w3.org/2000/svg', "g");
            WinJS.Utilities.addClass(holder, "a");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "a"));
            WinJS.Utilities.toggleClass(holder, "a");
            LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "a"));
            WinJS.Utilities.toggleClass(holder, "a");
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "a"));
        }
        testLongToggle() {
            var holder = document.createElement("div");
            WinJS.Utilities.toggleClass(holder, "a");
            WinJS.Utilities.toggleClass(holder, "b");
            WinJS.Utilities.toggleClass(holder, "c");
            WinJS.Utilities.toggleClass(holder, "d");
            WinJS.Utilities.toggleClass(holder, "e");
            LiveUnit.Assert.areEqual(holder.className, "a b c d e");
            WinJS.Utilities.toggleClass(holder, "b");
            WinJS.Utilities.toggleClass(holder, "d");
            LiveUnit.Assert.areEqual(holder.className, "a c e");
            WinJS.Utilities.toggleClass(holder, "a");
            WinJS.Utilities.toggleClass(holder, "c");
            WinJS.Utilities.toggleClass(holder, "e");
            LiveUnit.Assert.areEqual(holder.className, "");
        }
        testLongAddRemove() {
            var holder = document.createElement("div");

            WinJS.Utilities.addClass(holder, "a");
            WinJS.Utilities.addClass(holder, "b");
            WinJS.Utilities.addClass(holder, "c");
            WinJS.Utilities.addClass(holder, "d");
            WinJS.Utilities.addClass(holder, "e");
            WinJS.Utilities.removeClass(holder, "b");
            WinJS.Utilities.removeClass(holder, "d");
            LiveUnit.Assert.areEqual(holder.className, "a c e");
            WinJS.Utilities.removeClass(holder, "a");
            WinJS.Utilities.removeClass(holder, "c");
            WinJS.Utilities.removeClass(holder, "e");
            LiveUnit.Assert.areEqual(holder.className, "");
        }

        testQuery() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div class='a'></div><div class='b'></div><div class='b'></div><div class='c'></div>";

            var result = WinJS.Utilities.children(holder);
            LiveUnit.Assert.areEqual(result.length, 4);
            LiveUnit.Assert.areEqual(result.get(0).className, "a");
            LiveUnit.Assert.areEqual(result.get(1).className, "b");
            LiveUnit.Assert.areEqual(result.get(2).className, "b");
            LiveUnit.Assert.areEqual(result.get(3).className, "c");

            result = WinJS.Utilities.query(".b", holder);
            LiveUnit.Assert.areEqual(result.length, 2);

            LiveUnit.Assert.isTrue(result[0] === holder.firstChild.nextSibling);

            var r2 = WinJS.Utilities.query(".qq", holder);
            LiveUnit.Assert.areEqual(r2.length, 0);

            result.toggleClass("qq");
            LiveUnit.Assert.areEqual(true, result.hasClass("qq"));

            r2 = WinJS.Utilities.query(".qq", holder);
            LiveUnit.Assert.areEqual(r2.length, 2);

            result.removeClass("qq");
            LiveUnit.Assert.areEqual(false, result.hasClass("qq"));

            r2 = WinJS.Utilities.query(".qq", holder);
            LiveUnit.Assert.areEqual(r2.length, 0);

            result.addClass("qq");

            r2 = WinJS.Utilities.query(".qq", holder);
            LiveUnit.Assert.areEqual(r2.length, 2);

            LiveUnit.Assert.areEqual(r2.reduce(function (r: any, e) { return r + 1; }, 0), 2);

            var element = document.createElement("div");
            element.id = "testQueryById";
            document.body.appendChild(element);

            result = WinJS.Utilities.id("testQueryById1");
            LiveUnit.Assert.areEqual(result.length, 0);

            result = WinJS.Utilities.id("testQueryById");
            LiveUnit.Assert.areEqual(result.length, 1);
            LiveUnit.Assert.areEqual(result.get(0), element);

            document.body.removeChild(element);
        }

        testQueryEvents() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div class='a'></div>";

            var result = WinJS.Utilities.query(".a", holder);
            LiveUnit.Assert.areEqual(result.length, 1);

            var clicked = 0;

            var clickHandler = function () {
                clicked++;
            }

        result.listen("click", clickHandler, false);

            var event = <UIEvent>document.createEvent("UIEvents");
            event.initUIEvent("click", true, true, window, 1);
            holder.firstChild.dispatchEvent(event);

            LiveUnit.Assert.areEqual(1, clicked);

            result.removeEventListener("click", clickHandler, false);
            holder.firstChild.dispatchEvent(event);

            LiveUnit.Assert.areEqual(1, clicked);
        }
        testQueryAttribute() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div class='a'></div><div class='b'></div><div class='b'></div><div class='c'></div>";

            var result = WinJS.Utilities.query(".b", holder);
            LiveUnit.Assert.areEqual(result.length, 2);

            result.setAttribute("role", "button");
            LiveUnit.Assert.areEqual((<Element>holder.firstChild.nextSibling).getAttribute("role"), "button");
            LiveUnit.Assert.areEqual((<Element>holder.firstChild.nextSibling.nextSibling).getAttribute("role"), "button");
            LiveUnit.Assert.areEqual(result.getAttribute("role"), "button");
        }
        testQueryStyle() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div class='a'></div><div class='b'></div><div class='b'></div><div class='c'></div>";

            var result = WinJS.Utilities.query(".b", holder);
            LiveUnit.Assert.areEqual(result.length, 2);

            result.setStyle("display", "none");
            LiveUnit.Assert.areEqual((<HTMLElement>holder.firstChild.nextSibling).style.display, "none");
            LiveUnit.Assert.areEqual((<HTMLElement>holder.firstChild.nextSibling.nextSibling).style.display, "none");

            result.clearStyle("display");
            LiveUnit.Assert.areEqual((<HTMLElement>holder.firstChild.nextSibling).style.display, "");
            LiveUnit.Assert.areEqual((<HTMLElement>holder.firstChild.nextSibling.nextSibling).style.display, "");
        }
        testNestedQuery() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div class='a'></div><div class='b'><div></div><div></div></div><div class='b'><div></div><div></div></div><div class='c'></div>";

            var result = WinJS.Utilities.query(".b", holder);
            var count = 0;
            // checks that forEach works, and returns QueryCollection
            //
            result = result.forEach(function () { count++; });
            LiveUnit.Assert.areEqual(2, count);
            LiveUnit.Assert.areEqual(2, result.length);

            var nested = result.query("div");
            LiveUnit.Assert.areEqual(4, nested.length);
        }
        testForEachInUtilitiesQuery() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div class='a'></div><div class='b'><div></div><div></div></div><div class='b'><div></div><div></div></div><div class='d'></div>";

            var result = 0;
            WinJS.Utilities.query(".b", holder).forEach(function (e) {
                e.classList.add('c')
            result++;
            });
            LiveUnit.Assert.areEqual(result, 2, "counting the number of b classes");
            result = 0;
            WinJS.Utilities.query(".c", holder).forEach(function (e) {
                LiveUnit.Assert.areEqual(e.classList.length, 2, "Checking the presence of two classes ");
                result++;
            });
            LiveUnit.Assert.areEqual(result, 2, "counting the number of c classes");

        }



        testCanCreateSingleControl() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div class='target'></div>";

            WinJS.Utilities.query(".target", holder).control(DummyControl, { a: 1 });

            var target = holder.querySelector(".target");
            LiveUnit.Assert.isTrue(target.winControl);
            LiveUnit.Assert.areEqual(1, target.winControl.a);
            LiveUnit.Assert.isTrue(target.winControl instanceof DummyControl);
        }

        testCanCreateMultipleControls() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div class='target'></div><span>Some Text Here</span><div class='target'></div>";

            WinJS.Utilities.query(".target", holder).control(DummyControl, { b: 2 });

            var targets = holder.querySelectorAll(".target");

            var controls = [];
            for (var i = 0, len = targets.length; i < len; ++i) {
                controls.push((<Element>targets[i]).winControl);
            }

            LiveUnit.Assert.areEqual(2, controls.length);
            controls.forEach(function (control) {
                LiveUnit.Assert.areEqual(2, control.b);
            });
        }

        testControlFunctionOverwritesExistingControl() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div class='target'></div>";

            var target = holder.querySelector(".target");
            var original = new DummyControl(target, { a: 1 });

            WinJS.Utilities.query(".target", holder).control(DummyControl, { c: "new control" });

            var currentControl = target.winControl;
            LiveUnit.Assert.isFalse(currentControl.a);
            LiveUnit.Assert.areEqual("new control", currentControl.c);
        }

        testCanUpdateControl() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div class='target'></div>";

            var target = holder.querySelector(".target");
            var control = new DummyControl(target, { a: 1 });

            WinJS.Utilities.query(".target", holder).control({ b: 3 });

            LiveUnit.Assert.areEqual(1, control.a);
            LiveUnit.Assert.areEqual(3, control.b);
        }

        testCanChainAfterControlMethod() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div class='target'></div><span>Some Text Here</span><div class='target'></div>";

            WinJS.Utilities.query(".target", holder).control(DummyControl, { b: 2 })
                .addClass("chained");

            var chained = holder.querySelectorAll(".chained");

            LiveUnit.Assert.areEqual(2, chained.length);

            for (var i = 0, len = chained.length; i < len; ++i) {
                var element = <HTMLElement>chained[i];
                LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(element, "target"));
                LiveUnit.Assert.isTrue(element.winControl);
                LiveUnit.Assert.areEqual(2, element.winControl.b);
            }
        }

        testCanUpdateDeclarativeControl() {
            window['QueryCollectionTest'] = { DummyControl: DummyControl };

            var holder = document.createElement("div");
            holder.innerHTML = "<div class='target' data-win-control='QueryCollectionTest.DummyControl' data-win-options='{a: 5}'></div>";

            WinJS.Utilities.query(".target", holder).control({ c: "new value" });

            var control = holder.querySelector(".target").winControl;
            LiveUnit.Assert.isTrue(control);
            LiveUnit.Assert.areEqual(5, control.a);
            LiveUnit.Assert.areEqual("new value", control.c);
            delete window['QueryCollectionTest'];
        }

        testInclude() {
            var holder = document.createElement("div");
            holder.innerHTML = "<div class='a'></div><div class='a'></div><div class='b'></div><div class='b'></div>";

            var result = WinJS.Utilities.query(".a", holder);
            LiveUnit.Assert.areEqual(result.length, 2);

            result.include(WinJS.Utilities.query(".b", holder));
            LiveUnit.Assert.areEqual(result.length, 4);

            result.include(document.createElement("div"));
            LiveUnit.Assert.areEqual(result.length, 5);

            var element = document.createElement("div");
            element.innerHTML = "<div class='c'></div><div class='c'></div>";
            result.include(element.children);
            LiveUnit.Assert.areEqual(result.length, 7);

            var fragment = document.createDocumentFragment();
            fragment.appendChild(document.createElement("div"));
            fragment.appendChild(document.createElement("div"));
            fragment.appendChild(document.createElement("div"));
            result.include(<HTMLElement>fragment);
            LiveUnit.Assert.areEqual(result.length, 10);
        }

        testData() {
            var holder = document.createElement("div");
            WinJS.Utilities.data(holder).int = 1;
            LiveUnit.Assert.areEqual(WinJS.Utilities.data(holder).int, 1);
            LiveUnit.Assert.areEqual(WinJS.Utilities.data(holder).dummy, undefined);
        }

        testEmpty() {
            var temp = document.createElement("div");
            for (var i = 0; i < 5; i++) {
                var el = document.createElement("p");
                el.textContent = "lorem ipsum";
                temp.appendChild(el);
            }

            WinJS.Utilities.empty(temp);

            LiveUnit.Assert.areEqual(0, temp.children.length);
        }

        testGetRelativeLeft() {

            LiveUnit.Assert.areEqual(0, WinJS.Utilities.getRelativeLeft(null));

            var temp = document.createElement("div");
            temp.style.padding = "10px";
            var child = document.createElement("p");
            child.textContent = "lorem ipsum";
            temp.appendChild(child);
            document.body.appendChild(temp);
            var offset = WinJS.Utilities.getRelativeLeft(child, temp);
            document.body.removeChild(temp);

            LiveUnit.Assert.areEqual(10, offset);
        }

        testGetRelativeTop() {

            LiveUnit.Assert.areEqual(0, WinJS.Utilities.getRelativeTop(null));

            var temp = document.createElement("div");
            temp.style.padding = "10px";
            var child = document.createElement("div");
            child.textContent = "lorem ipsum";
            temp.appendChild(child);
            document.body.appendChild(temp);
            var offset = WinJS.Utilities.getRelativeTop(child, temp);
            document.body.removeChild(temp);

            LiveUnit.Assert.areEqual(10, offset);
        }

        testMetrics() {

            function verify(selector, dimensions) {
                var utils = WinJS.Utilities;
                var element = document.getElementById(selector);
                LiveUnit.Assert.areEqual(dimensions[0], utils.getContentWidth(element));
                LiveUnit.Assert.areEqual(dimensions[1], element.offsetWidth);
                LiveUnit.Assert.areEqual(dimensions[2], utils.getTotalWidth(element));
                LiveUnit.Assert.areEqual(dimensions[3], utils.getContentHeight(element));
                LiveUnit.Assert.areEqual(dimensions[4], element.offsetHeight);
                LiveUnit.Assert.areEqual(dimensions[5], utils.getTotalHeight(element));
            }

            var newNode = document.createElement("div");
            newNode.id = "file-metrics-css";
            newNode.innerHTML =
            "<div id='defaults'></div>" +
            "<div id='one'></div>" +
            "<div id='two'></div>" +
            "<div id='three'></div>" +
            "<div id='four'></div>" +
            "<div id='five'></div>";
            document.body.appendChild(newNode);

            try {
                verify("defaults", [10, 10, 10, 20, 20, 20]);
                verify("one", [10, 10, 10, 20, 20, 20]);
                verify("two", [10, 16, 16, 20, 24, 24]);
                verify("three", [10, 22, 22, 20, 28, 28]);
                verify("four", [10, 22, 52, 20, 28, 48]);
                verify("five", [10, 298, 394, 20, 308, 404]);
            } finally {
                document.body.removeChild(newNode);
            }
        }

        testPositon() {

            function check(x, y, childId, markup, callback?) {
                var utils = WinJS.Utilities,
                    root,
                    rootPos,
                    child,
                    childPos;

                root = document.createElement("div");
                root.style.padding = "10px 10px 10px 10px";
                root.innerHTML = markup;
                document.body.appendChild(root);

                if (callback) {
                    callback(root);
                }

                rootPos = utils.getPosition(root);
                child = document.getElementById(childId);
                childPos = utils.getPosition(child);

                LiveUnit.Assert.areEqual(x, childPos.left - rootPos.left - 10);
                LiveUnit.Assert.areEqual(y, childPos.top - rootPos.top - 10);

                document.body.removeChild(root);
            }

            function checkAbsolute(x, y, childId, markup) {
                var utils = WinJS.Utilities,
                    root,
                    child,
                    childPos;

                root = document.createElement("div");
                root.style.padding = "10px 10px 10px 10px";
                root.innerHTML = markup;
                document.body.appendChild(root);

                child = document.getElementById(childId);
                childPos = utils.getPosition(child);

                LiveUnit.Assert.areEqual(x, childPos.left);
                LiveUnit.Assert.areEqual(y, childPos.top);

                document.body.removeChild(root);
            }

            check(10, 20, "child1", "<div id='child1' style='width:100px; height: 100px; margin: 20px 10px'>Child1</div>");
            check(17, 25, "child2",
                "<div id='child1' style='margin: 20px 10px; padding: 5px 7px'>" +
                "<div id='child2' style='width:100px; height: 100px'>" +
                "</div>" +
                "</div>");
            check(27, 31, "child4",
                "<div id='child1' style='margin: 20px 10px; padding: 5px 7px'>" +
                "<div id='child2' style='position: relative; top: -4px'>" +
                "<div id='child3' style='border: 10px solid black'>" +
                "<div id='child4' style='width:100px; height: 100px'>" +
                "</div>" +
                "</div>" +
                "</div>" +
                "</div>");
            check(90, 0, "child2",
                "<div id='child1' style='width:100px; height: 100px'>" +
                "<div id='child2' style='float: right; width:10px; height: 10px'>" +
                "</div>" +
                "</div>");
            checkAbsolute(48, 48, "child1",
                "<div id='child1' style='position: absolute; left:48px; top: 48px'>" +
                "</div>");
            check(10, 20, "child2",
                "<div id='child1' style='width:100px; height: 100px; overflow: scroll; margin: 50px 10px; '>" +
                "<div id='child2' style='width:100px; height: 1000px'>" +
                "</div>" +
                "</div>",
                function (root) {
                    var child1 = document.getElementById("child1");
                    child1.scrollTop = 30;
                });
        }





        testPointerEventProxyBasic() {
            testPointerEventProxy({
                eventProperties: {
                    cancelable: true,
                    clientX: 19,
                    clientY: 46
                },
                eventHandler: function (e) {
                    LiveUnit.Assert.areEqual("touchstart", e.type, "event.type incorrectly initialized");
                    LiveUnit.Assert.areEqual(19, e.clientX, "event.clientX incorrectly initialized");
                    LiveUnit.Assert.areEqual(46, e.clientY, "event.clientY incorrectly initialized");
                }
            });
        }

        testPointerEventProxyOverrides() {
            testPointerEventProxy({
                eventProperties: {
                    cancelable: true,
                    clientX: 19,
                    clientY: 46
                },
                overridenProperties: {
                    clientX: 84
                },
                eventHandler: function (e) {
                    LiveUnit.Assert.areEqual("touchstart", e.type, "event.type incorrectly initialized");
                    LiveUnit.Assert.areEqual(84, e.clientX, "event.clientX should have been overriden");
                    LiveUnit.Assert.areEqual(46, e.clientY, "event.clientY incorrectly initialized");
                }
            });
        }

        testPointerEventProxyFunctions() {
            var doDefaultAction;

            doDefaultAction = testPointerEventProxy({
                eventProperties: { cancelable: true }
            });
            LiveUnit.Assert.isTrue(doDefaultAction, "default should not have been prevented");

            doDefaultAction = testPointerEventProxy({
                eventProperties: { cancelable: true },
                eventHandler: function (e) {
                    e.preventDefault();
                }
            });
            LiveUnit.Assert.isFalse(doDefaultAction, "default should have been prevented");
        }
        
        // Verifies that WinJS.Utilities._getComputedStyle returns an object whose keys map to strings
        // even when called within an iframe that is display:none.
        testGetComputedStyleHelperInHiddenIframe(complete) {
            var iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = "$(TESTDATA)/WinJSSandbox.html";
            iframe.onload = function () {
                var iframeGlobal = iframe.contentWindow;
                var element = iframeGlobal.document.createElement("div");
                iframeGlobal.document.body.appendChild(element);
                var computedStyle = (<any>iframeGlobal).WinJS.Utilities._getComputedStyle(element);
                LiveUnit.Assert.isNotNull(computedStyle, "getComputedStyle helper should return an object");
                LiveUnit.Assert.isTrue(typeof computedStyle.color === "string",
                    "getComputedStyle helper should return an object with a 'color' property that is a string ");
                
                document.body.removeChild(iframe);
                complete();
            };
            document.body.appendChild(iframe);
        }
    }

    // Verifies that *setActive* gives an element focus without causing its parent scroller to scroll.
    function generateTestNoScroll(rtl, setActive) {
        return function (complete) {
            var scroller = document.createElement("div");
            var child = document.createElement("div");

            if (rtl) {
                scroller.setAttribute("dir", "rtl");
            }
            scroller.style.position = "relative";
            scroller.style.overflow = "auto";
            scroller.style.width = "100px";
            scroller.style.height = "100px";
            scroller.style.backgroundColor = "steelblue";
            scroller.className = "testNoScroll";

            child.style.position = "absolute";
            child.style.left = (rtl ? -200 : 200) + "px";
            child.style.top = "200px";
            child.style.width = "50px";
            child.style.height = "50px";
            child.tabIndex = 0;
            child.style.backgroundColor = "orange";

            scroller.appendChild(child);
            document.body.appendChild(scroller);

            var initPos = { scrollLeft: 5, scrollTop: 8 };

            Helper.waitForScroll(scroller).then(function () {
                var pos = WinJS.Utilities.getScrollPosition(scroller);
                LiveUnit.Assert.areEqual(initPos.scrollLeft, pos.scrollLeft, "scrollLeft wasn't initialized properly");
                LiveUnit.Assert.areEqual(initPos.scrollTop, pos.scrollTop, "scrollTop wasn't initialized properly");

                return Helper.waitForFocus(child, function () {
                    setActive(child, scroller);
                });
            }).then(function () {
                    // Post to guarantee we aren't running within a focus handler. Within a focus handler, the
                    // setActive helper may not have restored the scroll position yet.
                    return WinJS.Promise.timeout();
                }).then(function () {
                    var pos = WinJS.Utilities.getScrollPosition(scroller);
                    LiveUnit.Assert.areEqual(child, document.activeElement, "Focus should have been moved to child");
                    LiveUnit.Assert.areEqual(initPos.scrollLeft, pos.scrollLeft, "scroller's scrollLeft shouldn't have changed");
                    LiveUnit.Assert.areEqual(initPos.scrollTop, pos.scrollTop, "scroller's scrollTop shouldn't have changed");

                    scroller.parentNode && scroller.parentNode.removeChild(scroller);
                    complete();
                });

            WinJS.Utilities.setScrollPosition(scroller, initPos);
        };
    };

    // Sets the tabIndex before calling *setActiveWithin*.
    function setActiveWithinWithTabIndex(tabIndex, setActiveWithin) {
        return function (elem, scroller) {
            elem.tabIndex = tabIndex;
            setActiveWithin(scroller, scroller);
        };
    }

    var Utils = WinJS.Utilities;

    var setActiveTests = {
        _setActive: Utils._setActive.bind(Utils),
        _trySetActive: Utils._trySetActive.bind(Utils),
        _setActiveFirstFocusableElement0: setActiveWithinWithTabIndex(0, Utils._setActiveFirstFocusableElement.bind(Utils)),
        _setActiveFirstFocusableElementPos: setActiveWithinWithTabIndex(1, Utils._setActiveFirstFocusableElement.bind(Utils)),
        _setActiveLastFocusableElement0: setActiveWithinWithTabIndex(0, Utils._setActiveLastFocusableElement.bind(Utils)),
        _setActiveLastFocusableElementPos: setActiveWithinWithTabIndex(1, Utils._setActiveLastFocusableElement.bind(Utils)),

    };
    Object.keys(setActiveTests).forEach(function (name) {
        Utilities.prototype["testNoScroll" + name + "_ltr"] = generateTestNoScroll(false, setActiveTests[name]);
        Utilities.prototype["testNoScroll" + name + "_rtl"] = generateTestNoScroll(true, setActiveTests[name]);
    });
    
    var disabledTestsRegistry = {
        testNoScroll_setActive_ltr: [Helper.Browsers.firefox, Helper.Browsers.ie11],
        testNoScroll_trySetActive_ltr: [Helper.Browsers.firefox, Helper.Browsers.ie11],
        testNoScroll_setActiveFirstFocusableElement0_ltr: [Helper.Browsers.firefox, Helper.Browsers.ie11],
        testNoScroll_setActiveFirstFocusableElementPos_ltr: [Helper.Browsers.firefox, Helper.Browsers.ie11],
        testNoScroll_setActiveLastFocusableElement0_ltr: [Helper.Browsers.firefox, Helper.Browsers.ie11],
        testNoScroll_setActiveLastFocusableElementPos_ltr: [Helper.Browsers.firefox, Helper.Browsers.ie11],
        testNoScroll_setActive_rtl: [Helper.Browsers.firefox, Helper.Browsers.ie11],
        testNoScroll_trySetActive_rtl: [Helper.Browsers.firefox, Helper.Browsers.ie11],
        testNoScroll_setActiveFirstFocusableElement0_rtl: [Helper.Browsers.firefox, Helper.Browsers.ie11],
        testNoScroll_setActiveFirstFocusableElementPos_rtl: [Helper.Browsers.firefox, Helper.Browsers.ie11],
        testNoScroll_setActiveLastFocusableElement0_rtl: [Helper.Browsers.firefox, Helper.Browsers.ie11],
        testNoScroll_setActiveLastFocusableElementPos_rtl: [Helper.Browsers.firefox, Helper.Browsers.ie11]
    };
    Helper.disableTests(Utilities, disabledTestsRegistry);
}
LiveUnit.registerTestClass("CorsicaTests.Utilities");