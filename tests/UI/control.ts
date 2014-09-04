// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />

module CorsicaTests {

    "use strict";

    export class ControlBase {

        testControlDeclaration() {
            var Control = WinJS.Class.define(null, {
                setOptions: function (options) {
                    WinJS.UI.setOptions(this, options);
                },
                raiseEvent: function (type, eventProperties) {
                    this.dispatchEvent(type, eventProperties);
                }
            });
            WinJS.Class.mix(Control, WinJS.UI.DOMEventMixin);

            var TestControl = WinJS.Class.derive(Control, function (element, options) {
                this._domElement = element;
                this.setOptions(options);
            }, {
                    opt1: 0
                });

            var controlElement = document.createElement("div");
            var control = new TestControl(controlElement, { 'opt1': 42 });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.areEqual(42, control.opt1);
        }

        testControlEvents() {
            var Control = WinJS.Class.define(null, {
                setOptions: function (options) {
                    WinJS.UI.setOptions(this, options);
                },
                raiseEvent: function (type, eventProperties) {
                    this.dispatchEvent(type, eventProperties);
                }
            });
            WinJS.Class.mix(Control, WinJS.UI.DOMEventMixin);

            var TestControl = WinJS.Class.derive(Control, function (element, options) {
                this._domElement = element;
                this.setOptions(options);
            }, {});

            var count = 0;
            var controlElement = document.createElement("div");
            var control = new TestControl(controlElement, { 'onFoo': function () { count++; } });
            control.dispatchEvent("Foo");
            LiveUnit.Assert.areEqual(1, count);
        }

        testControlEvents2() {
            var Control = WinJS.Class.define(null, {
                setOptions: function (options) {
                    WinJS.UI.setOptions(this, options);
                },
                raiseEvent: function (type, eventProperties) {
                    this.dispatchEvent(type, eventProperties);
                }
            });
            WinJS.Class.mix(Control, WinJS.UI.DOMEventMixin);
            var TestControl = WinJS.Class.derive(Control, function (element, options) {
                this._domElement = element;
                this.setOptions(options);
            }, {});

            var count = 0;
            var foo = function (evt) { count += evt.detail.amount; };

            var controlElement = document.createElement("div");
            var control = new TestControl(controlElement);
            control.addEventListener("Foo", foo);
            control.dispatchEvent("Foo", { 'amount': 2 });
            LiveUnit.Assert.areEqual(2, count);

            control.removeEventListener("Foo", foo);
            control.raiseEvent("Foo", { 'amount': 2 });
            LiveUnit.Assert.areEqual(2, count);
        }

        testCreatingEventPropertiesPreserveDOMOrdering() {

            function sequenceEquals(l, r) {
                if (l.length === r.length) {
                    for (var i = 0, len = l.length; i < len; i++) {
                        if (l[i] !== r[i]) {
                            return false;
                        }
                    }
                    return true;
                } else {
                    return false;
                }
            }

            var testRunCount = 0;

            var test = function (tc) {
                var hitCount = 0;
                var results = [];
                tc.onmyevent = function () { results.push("one"); };

                tc.dispatchEvent("myevent", "my detail");
                LiveUnit.Assert.areEqual(1, results.length);
                LiveUnit.Assert.isTrue(sequenceEquals(["one"], results));

                // After adding another event listener "one" should still be dispatched first
                results = [];
                tc.addEventListener("myevent", function () { results.push("two"); });
                tc.dispatchEvent("myevent", "my detail");
                LiveUnit.Assert.areEqual(2, results.length);
                LiveUnit.Assert.isTrue(sequenceEquals(["one", "two"], results));

                // After replacing the event listener property value the new property value
                // should be dispatched first.
                results = [];
                tc.onmyevent = function () { results.push("three"); };
                tc.dispatchEvent("myevent", "my detail");
                LiveUnit.Assert.areEqual(2, results.length);
                LiveUnit.Assert.isTrue(sequenceEquals(["three", "two"], results));

                // After setting the event listener property value to null we should
                // only see the explicitly registered listener getting called.
                results = [];
                tc.onmyevent = null;
                tc.dispatchEvent("myevent", "my detail");
                LiveUnit.Assert.areEqual(1, results.length);
                LiveUnit.Assert.isTrue(sequenceEquals(["two"], results));

                // After adding a new event listener property value we see that it is
                // dispatched at the end because the nulling out of the property removed
                // the slot reservation.
                results = [];
                tc.onmyevent = function () { results.push("four"); };
                tc.dispatchEvent("myevent", "my detail");
                LiveUnit.Assert.areEqual(2, results.length);
                LiveUnit.Assert.isTrue(sequenceEquals(["two", "four"], results));

                testRunCount++;
            };

            // Put this in its own function to ensure we don't accidentially capture above.
            //
            (function () {

                var TestClassWithEventMixin = WinJS.Class.define();
                WinJS.Class.mix(TestClassWithEventMixin,
                    WinJS.Utilities.eventMixin,
                    WinJS.Utilities.createEventProperties("myevent", "myotherevent")
                    );

                test(new TestClassWithEventMixin());

                var TestClassWithDOMEventMixin = WinJS.Class.define(function (element) { this._domElement = element; });
                WinJS.Class.mix(TestClassWithDOMEventMixin,
                    WinJS.UI.DOMEventMixin,
                    WinJS.Utilities.createEventProperties("myevent", "myotherevent")
                    );

                test(new TestClassWithDOMEventMixin(document.createElement("div")));
            })();

            LiveUnit.Assert.areEqual(2, testRunCount);
        }
    }

}
LiveUnit.registerTestClass("CorsicaTests.ControlBase");