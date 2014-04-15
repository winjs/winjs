// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="../TestLib/ListView/Helpers.js"/>
/// <deploy src="../TestData/" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.Utilities = function () {
    "use strict";
    this.testQueryCollectionExtensibility = function () {
        var holder = document.createElement("div");
        holder.appendChild(document.createElement("div"));
        holder.appendChild(document.createElement("div"));
        var c = 0;
        WinJS.Utilities.QueryCollection.prototype.qq = function () {
            this.forEach(function (item) {
                c++;
            });
        };
        WinJS.Utilities.query("div", holder).qq();
        LiveUnit.Assert.areEqual(2, c);
        delete WinJS.Utilities.QueryCollection.prototype.qq;
        LiveUnit.Assert.isFalse(WinJS.Utilities.query("div", holder).qq);
    };
    this.testQueryCollectionExtensibility2 = function () {
        var holder = document.createElement("div");
        holder.appendChild(document.createElement("div"));
        holder.appendChild(document.createElement("div"));
        var c = 0;
        WinJS.Utilities.QueryCollection.prototype.qq = function () {
            this.forEach(function (item) {
                c++;
            });
            return c;
        };
        LiveUnit.Assert.areEqual(2, WinJS.Utilities.query("div", holder).qq());
        delete WinJS.Utilities.QueryCollection.prototype.qq;
        LiveUnit.Assert.isFalse(WinJS.Utilities.query("div", holder).qq);
    };

    this.testSimpleAddRemove = function () {
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
    };


    this.testRemoveDups = function () {
        var holder = document.createElement("div");

        holder.className = "a  a  a b   a   c ";
        LiveUnit.Assert.areEqual(WinJS.Utilities.removeClass(holder, "a"), holder);
        LiveUnit.Assert.areEqual(holder.className, "b c");
    };

    this.testMultipleAddRemove = function () {
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
    };
    this.testSimpleAddRemoveSVG = function () {
        var holder = document.createElementNS('http://www.w3.org/2000/svg', "g");

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
    };
    this.testSubstringAddRemove = function () {
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
    this.testToggle = function () {
        var holder = document.createElement("div");
        LiveUnit.Assert.areEqual(WinJS.Utilities.toggleClass(holder, "a"), holder);
        LiveUnit.Assert.areEqual(holder.className, "a");
        WinJS.Utilities.toggleClass(holder, "a");
        LiveUnit.Assert.areEqual(holder.className, "");

        var holder = document.createElementNS('http://www.w3.org/2000/svg', "g");
        WinJS.Utilities.addClass(holder, "a");
        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "a"));
        WinJS.Utilities.toggleClass(holder, "a");
        LiveUnit.Assert.isFalse(WinJS.Utilities.hasClass(holder, "a"));
        WinJS.Utilities.toggleClass(holder, "a");
        LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(holder, "a"));
    }
    this.testLongToggle = function () {
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
    this.testLongAddRemove = function () {
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

    this.testQuery = function () {
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

        LiveUnit.Assert.areEqual(r2.reduce(function (r, e) { return r + 1; }, 0), 2);

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

    this.testQueryEvents = function () {
        var holder = document.createElement("div");
        holder.innerHTML = "<div class='a'></div>";

        var result = WinJS.Utilities.query(".a", holder);
        LiveUnit.Assert.areEqual(result.length, 1);

        var clicked = 0;

        var clickHandler = function () {
            clicked++;
        }

        result.listen("click", clickHandler, false);

        var event = document.createEvent("UIEvents");
        event.initUIEvent("click", true, true, window, 1);
        holder.firstChild.dispatchEvent(event);

        LiveUnit.Assert.areEqual(1, clicked);

        result.removeEventListener("click", clickHandler, false);
        holder.firstChild.dispatchEvent(event);

        LiveUnit.Assert.areEqual(1, clicked);
    }
    this.testQueryAttribute = function () {
        var holder = document.createElement("div");
        holder.innerHTML = "<div class='a'></div><div class='b'></div><div class='b'></div><div class='c'></div>";

        var result = WinJS.Utilities.query(".b", holder);
        LiveUnit.Assert.areEqual(result.length, 2);

        result.setAttribute("role", "button");
        LiveUnit.Assert.areEqual(holder.firstChild.nextSibling.getAttribute("role"), "button");
        LiveUnit.Assert.areEqual(holder.firstChild.nextSibling.nextSibling.getAttribute("role"), "button");
        LiveUnit.Assert.areEqual(result.getAttribute("role"), "button");
    }
    this.testQueryStyle = function () {
        var holder = document.createElement("div");
        holder.innerHTML = "<div class='a'></div><div class='b'></div><div class='b'></div><div class='c'></div>";

        var result = WinJS.Utilities.query(".b", holder);
        LiveUnit.Assert.areEqual(result.length, 2);

        result.setStyle("display", "none");
        LiveUnit.Assert.areEqual(holder.firstChild.nextSibling.style.display, "none");
        LiveUnit.Assert.areEqual(holder.firstChild.nextSibling.nextSibling.style.display, "none");

        result.clearStyle("display", "none");
        LiveUnit.Assert.areEqual(holder.firstChild.nextSibling.style.display, "");
        LiveUnit.Assert.areEqual(holder.firstChild.nextSibling.nextSibling.style.display, "");
    }
    this.testNestedQuery = function () {
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
    this.testForEachInUtilitiesQuery = function () {
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

    // A small do-nothing control used to test manipulation of controls by the QueryCollection

    var DummyControl = WinJS.Class.define(function DummyControl(element, options) {
        this.element = element;
        element.winControl = this;
        WinJS.UI.setOptions(this, options);
    });

    this.testCanCreateSingleControl = function () {
        var holder = document.createElement("div");
        holder.innerHTML = "<div class='target'></div>";

        WinJS.Utilities.query(".target", holder).control(DummyControl, { a: 1 });

        var target = holder.querySelector(".target");
        LiveUnit.Assert.isTrue(target.winControl);
        LiveUnit.Assert.areEqual(1, target.winControl.a);
        LiveUnit.Assert.isTrue(target.winControl instanceof DummyControl);
    }

    this.testCanCreateMultipleControls = function () {
        var holder = document.createElement("div");
        holder.innerHTML = "<div class='target'></div><span>Some Text Here</span><div class='target'></div>";

        WinJS.Utilities.query(".target", holder).control(DummyControl, { b: 2 });

        var targets = holder.querySelectorAll(".target");

        var controls = [];
        for (var i = 0, len = targets.length; i < len; ++i) {
            controls.push(targets[i].winControl);
        }

        LiveUnit.Assert.areEqual(2, controls.length);
        controls.forEach(function (control) {
            LiveUnit.Assert.areEqual(2, control.b);
        });
    }

    this.testControlFunctionOverwritesExistingControl = function () {
        var holder = document.createElement("div");
        holder.innerHTML = "<div class='target'></div>";

        var target = holder.querySelector(".target");
        var original = new DummyControl(target, { a: 1 });

        WinJS.Utilities.query(".target", holder).control(DummyControl, { c: "new control" });

        var currentControl = target.winControl;
        LiveUnit.Assert.isFalse(currentControl.a);
        LiveUnit.Assert.areEqual("new control", currentControl.c);
    }

    this.testCanUpdateControl = function () {
        var holder = document.createElement("div");
        holder.innerHTML = "<div class='target'></div>";

        var target = holder.querySelector(".target");
        var control = new DummyControl(target, { a: 1 });

        WinJS.Utilities.query(".target", holder).control({ b: 3 });

        LiveUnit.Assert.areEqual(1, control.a);
        LiveUnit.Assert.areEqual(3, control.b);
    }

    this.testCanChainAfterControlMethod = function () {
        var holder = document.createElement("div");
        holder.innerHTML = "<div class='target'></div><span>Some Text Here</span><div class='target'></div>";

        WinJS.Utilities.query(".target", holder).control(DummyControl, { b: 2 })
            .addClass("chained");

        var chained = holder.querySelectorAll(".chained");

        LiveUnit.Assert.areEqual(2, chained.length);

        for (var i = 0, len = chained.length; i < len; ++i) {
            var element = chained[i];
            LiveUnit.Assert.isTrue(WinJS.Utilities.hasClass(element, "target"));
            LiveUnit.Assert.isTrue(element.winControl);
            LiveUnit.Assert.areEqual(2, element.winControl.b);
        }
    }

    this.testCanUpdateDeclarativeControl = function () {
        window.QueryCollectionTest = { DummyControl: DummyControl };

        var holder = document.createElement("div");
        holder.innerHTML = "<div class='target' data-win-control='QueryCollectionTest.DummyControl' data-win-options='{a: 5}'></div>";

        WinJS.Utilities.query(".target", holder).control({ c: "new value" });

        var control = holder.querySelector(".target").winControl;
        LiveUnit.Assert.isTrue(control);
        LiveUnit.Assert.areEqual(5, control.a);
        LiveUnit.Assert.areEqual("new value", control.c);
    }

    this.testInclude = function () {
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
        result.include(fragment);
        LiveUnit.Assert.areEqual(result.length, 10);
    }

    this.testData = function () {
        var holder = document.createElement("div");
        WinJS.Utilities.data(holder).int = 1;
        LiveUnit.Assert.areEqual(WinJS.Utilities.data(holder).int, 1);
        LiveUnit.Assert.areEqual(WinJS.Utilities.data(holder).dummy, undefined);
    }

    this.testEmpty = function () {
        var temp = document.createElement("div");
        for (var i = 0; i < 5; i++) {
            var el = document.createElement("p");
            el.textContent = "lorem ipsum";
            temp.appendChild(el);
        }

        WinJS.Utilities.empty(temp);

        LiveUnit.Assert.areEqual(0, temp.children.length);
    }

    this.testGetRelativeLeft = function () {

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

    this.testGetRelativeTop = function () {

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

    this.testMetrics = function (complete) {

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

        var s = document.createElement("link");
        s.setAttribute("rel", "stylesheet");
        s.setAttribute("href", "$(TESTDATA)/metrics.css");
        document.head.appendChild(s);

        waitForCSSFile("metrics.css").then(function () {
            var newNode = document.createElement("div");
            newNode.id = "MetricsTests";
            newNode.innerHTML =
                "<div id='defaults'></div>" +
                "<div id='one'></div>" +
                "<div id='two'></div>" +
                "<div id='three'></div>" +
                "<div id='four'></div>" +
                "<div id='five'></div>";
            document.body.appendChild(newNode);

            verify("defaults", [10, 10, 10, 20, 20, 20]);
            verify("one", [10, 10, 10, 20, 20, 20]);
            verify("two", [10, 16, 16, 20, 24, 24]);
            verify("three", [10, 22, 22, 20, 28, 28]);
            verify("four", [10, 22, 52, 20, 28, 48]);
            verify("five", [10, 298, 394, 20, 308, 404]);

            document.body.removeChild(newNode);

            if (s) {
                document.head.removeChild(s);
            }
            complete();
        });
    };

    this.testPositon = function () {

        function check(x, y, childId, markup, callback) {
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
    };
}


LiveUnit.registerTestClass("CorsicaTests.Utilities");