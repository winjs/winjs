// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {
    "use strict";

    export class BaseEvents {


        testEventsMixin() {
            var TC = WinJS.Class.define();
            WinJS.Class.mix(TC, WinJS.Utilities.eventMixin);

            var hitCount = 0;
            var tc = new TC();
            var f = function (e) {
                hitCount++;
                LiveUnit.Assert.areEqual(tc, e.target);
                LiveUnit.Assert.areEqual("my detail", e.detail);
            };
            tc.addEventListener("myevent", f);
            var f2 = function (e) {
                hitCount++;
                LiveUnit.Assert.areEqual(tc, e.target);
                LiveUnit.Assert.areEqual("my detail", e.detail);
            };
            tc.addEventListener("myevent", f2);
            LiveUnit.Assert.areEqual(0, hitCount);
            tc.dispatchEvent("myevent", "my detail");
            LiveUnit.Assert.areEqual(2, hitCount);
        }

        testEventsMixinRemoveWithMultipleEvents() {
            var TC = WinJS.Class.define();
            WinJS.Class.mix(TC, WinJS.Utilities.eventMixin);

            var tc = new TC();
            var handler = function handler() {
                tc.removeEventListener("myevent", handler, false);
            };
            tc.addEventListener("myevent", handler, false);
            tc.addEventListener("myevent", handler, false);
            tc.dispatchEvent("myevent");
        }

        testEventsMixin_removeEvent() {
            var TC = WinJS.Class.define();
            WinJS.Class.mix(TC, WinJS.Utilities.eventMixin);

            var hitCount = 0;
            var tc = new TC();
            var f = function (e) {
                hitCount++;
                LiveUnit.Assert.areEqual(tc, e.target);
                LiveUnit.Assert.areEqual("my detail", e.detail);
            };
            tc.addEventListener("myevent", f);
            var f2 = function (e) {
                hitCount++;
                LiveUnit.Assert.areEqual(tc, e.target);
                LiveUnit.Assert.areEqual("my detail", e.detail);
            };
            tc.addEventListener("myevent", f2);
            LiveUnit.Assert.areEqual(0, hitCount);
            var result = tc.dispatchEvent("myevent", "my detail");
            LiveUnit.Assert.areEqual(false, result);
            LiveUnit.Assert.areEqual(2, hitCount);

            tc.removeEventListener("myevent", f2);
            tc.dispatchEvent("myevent", "my detail");
            LiveUnit.Assert.areEqual(3, hitCount);
            tc.dispatchEvent("myevent", "my detail");
            LiveUnit.Assert.areEqual(4, hitCount);

            tc.removeEventListener("myevent", f);
            LiveUnit.Assert.areEqual(4, hitCount);
            tc.dispatchEvent("myevent", "my detail");
            LiveUnit.Assert.areEqual(4, hitCount);

            // Remove the event one extra time, should not fail.
            tc.removeEventListener("myevent", f);
            tc.dispatchEvent("myevent", "my detail");
            LiveUnit.Assert.areEqual(4, hitCount);

            // Add twice should only result in one registration
            tc.addEventListener("myevent", f);
            tc.addEventListener("myevent", f);
            tc.dispatchEvent("myevent", "my detail");
            LiveUnit.Assert.areEqual(5, hitCount);

            // Remove should remove the handler even though it was registered twice.
            tc.removeEventListener("myevent", f);
            tc.dispatchEvent("myevent", "my detail");
            LiveUnit.Assert.areEqual(5, hitCount);
        }

        testEventsMixin_cancelEvent() {
            var TC = WinJS.Class.define();
            WinJS.Class.mix(TC, WinJS.Utilities.eventMixin);

            var hitCount = 0;
            var tc = new TC();
            var f = function (e) {
                hitCount++;
                LiveUnit.Assert.areEqual(tc, e.target);
                LiveUnit.Assert.areEqual("my detail", e.detail);
                e.preventDefault();
            };
            tc.addEventListener("myevent", f);
            var f2 = function (e) {
                hitCount++;
                LiveUnit.Assert.areEqual(tc, e.target);
                LiveUnit.Assert.areEqual("my detail", e.detail);
            };
            tc.addEventListener("myevent", f2);
            LiveUnit.Assert.areEqual(0, hitCount);
            var result = tc.dispatchEvent("myevent", "my detail");
            LiveUnit.Assert.areEqual(true, result);
            LiveUnit.Assert.areEqual(2, hitCount);
        }

        testEventsMixin_stopPropagation() {
            var TC = WinJS.Class.define();
            WinJS.Class.mix(TC, WinJS.Utilities.eventMixin);

            var hitCount = 0;
            var tc = new TC();
            var f = function (e) {
                hitCount++;
                LiveUnit.Assert.areEqual(tc, e.target);
                LiveUnit.Assert.areEqual("my detail", e.detail);
                e.stopImmediatePropagation();
            };
            tc.addEventListener("myevent", f);
            var f2 = function (e) {
                hitCount++;
                LiveUnit.Assert.areEqual(tc, e.target);
                LiveUnit.Assert.areEqual("my detail", e.detail);
            };
            tc.addEventListener("myevent", f2);
            LiveUnit.Assert.areEqual(0, hitCount);
            var result = tc.dispatchEvent("myevent", "my detail");
            LiveUnit.Assert.areEqual(false, result);
            LiveUnit.Assert.areEqual(1, hitCount);
        }

        testCreatingEventPropertiesWithEventMixins() {

            var testRunCount = 0;

            var test = function (tc, expectedEventTarget) {

                var hitCount = 0;
                var onmyeventHandler1 = function (e) {
                    hitCount++;
                    LiveUnit.Assert.areEqual(expectedEventTarget, e.target);
                    LiveUnit.Assert.areEqual("my detail", e.detail);
                };
                tc.onmyevent = onmyeventHandler1;

                tc.dispatchEvent("myevent", "my detail");
                LiveUnit.Assert.areEqual(1, hitCount);
                LiveUnit.Assert.isTrue(onmyeventHandler1 === tc.onmyevent);

                // Attempt to explicitly remove this event listener, this should fail.
                tc.removeEventListener("myevent", onmyeventHandler1, false);
                tc.dispatchEvent("myevent", "my detail");
                LiveUnit.Assert.areEqual(2, hitCount);

                // Add the same listener again imperatively
                tc.addEventListener("myevent", onmyeventHandler1, false);
                tc.dispatchEvent("myevent", "my detail");
                LiveUnit.Assert.areEqual(4, hitCount);

                // Attempt to explicitly remove this event listener, this should only remove one.
                tc.removeEventListener("myevent", onmyeventHandler1, false);
                tc.dispatchEvent("myevent", "my detail");
                LiveUnit.Assert.areEqual(5, hitCount);

                testRunCount++;
            };

            (function () {
                var TestClassWithEventMixin = WinJS.Class.define();
                WinJS.Class.mix(TestClassWithEventMixin,
                    WinJS.Utilities.eventMixin,
                    WinJS.Utilities.createEventProperties("myevent", "myotherevent")
                    );

                var tcwem = new TestClassWithEventMixin();
                test(tcwem, tcwem);
            })();

            LiveUnit.Assert.areEqual(1, testRunCount);
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

            var test = function (tc, tc2) {
                var hitCount = 0;
                var results = [];
                var results2 = [];
                tc.onmyevent = function () { results.push("one"); };
                tc2.onmyevent = function () { results2.push("one"); };

                tc.dispatchEvent("myevent", "my detail");
                LiveUnit.Assert.areEqual(1, results.length);
                LiveUnit.Assert.isTrue(sequenceEquals(["one"], results));
                LiveUnit.Assert.areEqual(0, results2.length);

                tc2.dispatchEvent("myevent", "my detail");
                LiveUnit.Assert.areEqual(1, results.length);
                LiveUnit.Assert.isTrue(sequenceEquals(["one"], results));
                LiveUnit.Assert.areEqual(1, results2.length);
                LiveUnit.Assert.isTrue(sequenceEquals(["one"], results2));

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

                test(new TestClassWithEventMixin(), new TestClassWithEventMixin());
            })();

            LiveUnit.Assert.areEqual(1, testRunCount);
        }
    }

}

LiveUnit.registerTestClass("CorsicaTests.BaseEvents");