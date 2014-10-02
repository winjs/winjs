// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {

    "use strict";

    export class Nav2Tests {
        
        testNavigationEvents(complete) {
            WinJS.Navigation.history = {};
            var navHit = false;
            var navPromiseHit = false;
            var navingHit = false;
            var navingPromiseHit = false;
            var beforeNavHit = false;

            var nav = function (e) {
                WinJS.Navigation.removeEventListener("navigated", nav, true);

                navHit = true;
                LiveUnit.Assert.areEqual("navigated", e.type);
                LiveUnit.Assert.areEqual("home", e.detail.location);
                LiveUnit.Assert.areEqual(123, e.detail.state.a);

                LiveUnit.Assert.areEqual("home", WinJS.Navigation.location);
                e.detail.setPromise(WinJS.Promise.timeout(16).then(function () { navPromiseHit = true; }));
            };
            var naving = function (e) {
                WinJS.Navigation.removeEventListener("navigating", naving, true);

                navingHit = true;
                LiveUnit.Assert.areEqual("navigating", e.type);
                LiveUnit.Assert.areEqual("home", e.detail.location);
                LiveUnit.Assert.areEqual(123, e.detail.state.a);

                LiveUnit.Assert.areEqual("home", WinJS.Navigation.location);

                e.detail.setPromise(WinJS.Promise.timeout(16).then(function () { navingPromiseHit = true; }));
            };
            var beforeNav = function (e) {
                WinJS.Navigation.removeEventListener("beforenavigate", beforeNav, true);

                LiveUnit.Assert.areEqual("beforenavigate", e.type);
                LiveUnit.Assert.areEqual("home", e.detail.location);
                LiveUnit.Assert.areEqual(123, e.detail.state.a);
                e.detail.setPromise(WinJS.Promise.timeout(16).then(function () { beforeNavHit = true; }));
            };
            WinJS.Navigation.addEventListener("navigating", naving, true);
            WinJS.Navigation.addEventListener("navigated", nav, true);
            WinJS.Navigation.addEventListener("beforenavigate", beforeNav, true);

            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack);
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoForward);
            WinJS.Navigation.navigate("home", { a: 123 }).then(function () {
                LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack);
                LiveUnit.Assert.isFalse(WinJS.Navigation.canGoForward);

                LiveUnit.Assert.isTrue(navingHit);
                LiveUnit.Assert.isTrue(navingPromiseHit);
                LiveUnit.Assert.isTrue(navHit);
                LiveUnit.Assert.isTrue(navPromiseHit);
                LiveUnit.Assert.isTrue(beforeNavHit);

                var cancelBeforeNav = function (e) {
                    WinJS.Navigation.removeEventListener("beforenavigate", cancelBeforeNav, true);
                    e.preventDefault();
                };
                WinJS.Navigation.addEventListener("beforenavigate", cancelBeforeNav, true);
                WinJS.Navigation.navigate("second!").then(function (s) {
                    LiveUnit.Assert.isFalse(s);
                    LiveUnit.Assert.areEqual("home", WinJS.Navigation.location);
                    complete();
                });
            });
        }

        testNavigationEventsTyped(complete) {
            WinJS.Navigation.history = {};
            var navHit = false;
            var navPromiseHit = false;
            var navingHit = false;
            var navingPromiseHit = false;
            var beforeNavHit = false;

            var nav = function (e) {
                WinJS.Navigation.onnavigated = undefined;

                navHit = true;
                LiveUnit.Assert.areEqual("navigated", e.type);
                LiveUnit.Assert.areEqual("home", e.detail.location);
                LiveUnit.Assert.areEqual(123, e.detail.state.a);

                LiveUnit.Assert.areEqual("home", WinJS.Navigation.location);
                e.detail.setPromise(WinJS.Promise.timeout(16).then(function () { navPromiseHit = true; }));
            };
            var naving = function (e) {
                WinJS.Navigation.onnavigating = undefined;

                navingHit = true;
                LiveUnit.Assert.areEqual("navigating", e.type);
                LiveUnit.Assert.areEqual("home", e.detail.location);
                LiveUnit.Assert.areEqual(123, e.detail.state.a);

                LiveUnit.Assert.areEqual("home", WinJS.Navigation.location);

                e.detail.setPromise(WinJS.Promise.timeout(16).then(function () { navingPromiseHit = true; }));
            };
            var beforeNav = function (e) {
                WinJS.Navigation.onbeforenavigate = undefined;

                LiveUnit.Assert.areEqual("beforenavigate", e.type);
                LiveUnit.Assert.areEqual("home", e.detail.location);
                LiveUnit.Assert.areEqual(123, e.detail.state.a);
                e.detail.setPromise(WinJS.Promise.timeout(16).then(function () { beforeNavHit = true; }));
            };
            WinJS.Navigation.onnavigating = naving;
            WinJS.Navigation.onnavigated = nav;
            WinJS.Navigation.onbeforenavigate = beforeNav;

            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack);
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoForward);
            WinJS.Navigation.navigate("home", { a: 123 }).then(function () {
                LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack);
                LiveUnit.Assert.isFalse(WinJS.Navigation.canGoForward);

                LiveUnit.Assert.isTrue(navingHit);
                LiveUnit.Assert.isTrue(navingPromiseHit);
                LiveUnit.Assert.isTrue(navHit);
                LiveUnit.Assert.isTrue(navPromiseHit);
                LiveUnit.Assert.isTrue(beforeNavHit);

                var cancelBeforeNav = function (e) {
                    WinJS.Navigation.onbeforenavigate = undefined;
                    e.preventDefault();
                };
                WinJS.Navigation.onbeforenavigate = cancelBeforeNav;
                WinJS.Navigation.navigate("second!").then(function (s) {
                    LiveUnit.Assert.isFalse(s);
                    LiveUnit.Assert.areEqual("home", WinJS.Navigation.location);
                    complete();
                });
            });
        }
        testNavigationErrors(complete) {
            WinJS.Navigation.history = {};
            var navHit = false;
            var navingHit = false;
            var navingPromiseHit = false;

            var nav = function (e) {
                WinJS.Navigation.removeEventListener("navigated", nav, true);

                navHit = true;
                LiveUnit.Assert.areEqual("navigated", e.type);
                LiveUnit.Assert.areEqual("error", e.detail.error);
                LiveUnit.Assert.areEqual("home", e.detail.location);
                LiveUnit.Assert.areEqual(123, e.detail.state.a);

                LiveUnit.Assert.areEqual("home", WinJS.Navigation.location);
            };
            var naving = function (e) {
                WinJS.Navigation.removeEventListener("navigating", naving, true);

                navingHit = true;
                LiveUnit.Assert.areEqual("navigating", e.type);
                LiveUnit.Assert.areEqual("home", e.detail.location);
                LiveUnit.Assert.areEqual(123, e.detail.state.a);

                LiveUnit.Assert.areEqual("home", WinJS.Navigation.location);

                e.detail.setPromise(WinJS.Promise.timeout(16).then(function () { navingPromiseHit = true; throw "error" }));
            };
            WinJS.Navigation.addEventListener("navigating", naving, true);
            WinJS.Navigation.addEventListener("navigated", nav, true);

            // error is signaled *before* navigated is raised.
            //
            WinJS.Navigation.navigate("home", { a: 123 }).
                then(
                function () {
                    LiveUnit.Assert.fail("This should not be called!");
                },
                function (err) {
                    LiveUnit.Assert.areEqual("error", err);
                    LiveUnit.Assert.isTrue(navingHit);
                    LiveUnit.Assert.isTrue(navingPromiseHit);
                    LiveUnit.Assert.isTrue(navHit); // per WinBlue:136721 "If there is any error from 'navigating' then 'navigated' event should be fired after error is signaled"

                    complete();
                }
                );
        }
        testBasicNavigation(complete) {
            WinJS.Navigation.history = {};

            WinJS.Navigation.navigate("home", { a: 123 }).then(function () {
                ;
                LiveUnit.Assert.areEqual("home", WinJS.Navigation.location, "first nav location correct");
                LiveUnit.Assert.areEqual(123, WinJS.Navigation.state.a, "first nav state correct");
                LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack);
                LiveUnit.Assert.isFalse(WinJS.Navigation.canGoForward);

                return WinJS.Navigation.navigate("a", { a: 321 });
            }).then(function () {
                    LiveUnit.Assert.areEqual("a", WinJS.Navigation.location, "second nav location correct");
                    LiveUnit.Assert.areEqual(321, WinJS.Navigation.state.a, "second nav state correct");
                    LiveUnit.Assert.isTrue(WinJS.Navigation.canGoBack);
                    LiveUnit.Assert.isFalse(WinJS.Navigation.canGoForward);

                    return WinJS.Navigation.back();
                }).then(function () {
                    LiveUnit.Assert.areEqual("home", WinJS.Navigation.location, "back worked");
                    LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack);
                    LiveUnit.Assert.isTrue(WinJS.Navigation.canGoForward);

                    return WinJS.Navigation.forward();
                }).then(function () {
                    LiveUnit.Assert.areEqual("a", WinJS.Navigation.location, "forward worked");
                    LiveUnit.Assert.isTrue(WinJS.Navigation.canGoBack);
                    LiveUnit.Assert.isFalse(WinJS.Navigation.canGoForward);

                    complete();
                });
        }
        testCanceledNavigation(complete) {
            var cancelBeforeNav = function (e) {
                e.preventDefault();
            };

            WinJS.Navigation.history = {};

            WinJS.Navigation.navigate("home", { a: 123 });
            LiveUnit.Assert.areEqual("home", WinJS.Navigation.location);
            LiveUnit.Assert.areEqual(123, WinJS.Navigation.state.a);
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack);
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoForward);

            WinJS.Navigation.navigate("a", { a: 321 });
            LiveUnit.Assert.areEqual("a", WinJS.Navigation.location);
            LiveUnit.Assert.areEqual(321, WinJS.Navigation.state.a);
            LiveUnit.Assert.isTrue(WinJS.Navigation.canGoBack);
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoForward);

            WinJS.Navigation.addEventListener("beforenavigate", cancelBeforeNav);
            WinJS.Navigation.back().then(function (s) {
                LiveUnit.Assert.isFalse(s);
                LiveUnit.Assert.areEqual("a", WinJS.Navigation.location);
                WinJS.Navigation.removeEventListener("beforenavigate", cancelBeforeNav);

                return WinJS.Navigation.back();
            }).then(function (s) {
                    LiveUnit.Assert.isTrue(s);
                    LiveUnit.Assert.areEqual("home", WinJS.Navigation.location);
                    WinJS.Navigation.addEventListener("beforenavigate", cancelBeforeNav);

                    return WinJS.Navigation.forward();
                }).then(function (s) {
                    LiveUnit.Assert.isFalse(s);
                    WinJS.Navigation.removeEventListener("beforenavigate", cancelBeforeNav);
                    complete();
                });
        }

        testStateRoundtrip(complete) {
            WinJS.Navigation.history = {};
            WinJS.Navigation.navigate("home", { a: 123 });
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack);
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoForward);

            var lastState = WinJS.Navigation.history;

            WinJS.Navigation.history = {};
            LiveUnit.Assert.areEqual("", WinJS.Navigation.location);
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack);
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoForward);

            WinJS.Navigation.history = lastState;
            LiveUnit.Assert.areEqual("home", WinJS.Navigation.location);
            LiveUnit.Assert.areEqual(123, WinJS.Navigation.state.a);
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack);
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoForward);
            complete();
        }

        testBackForwardDepthTest(complete) {
            WinJS.Navigation.history = {};
            WinJS.Navigation.navigate("a");
            WinJS.Navigation.navigate("b");
            WinJS.Navigation.navigate("c");
            WinJS.Navigation.navigate("d");

            WinJS.Navigation.back();
            LiveUnit.Assert.areEqual("c", WinJS.Navigation.location);

            WinJS.Navigation.forward();
            LiveUnit.Assert.areEqual("d", WinJS.Navigation.location);

            WinJS.Navigation.back(2);
            LiveUnit.Assert.areEqual("b", WinJS.Navigation.location);

            WinJS.Navigation.forward();
            LiveUnit.Assert.areEqual("c", WinJS.Navigation.location);
            WinJS.Navigation.forward();
            LiveUnit.Assert.areEqual("d", WinJS.Navigation.location);

            WinJS.Navigation.back(3);
            LiveUnit.Assert.areEqual("a", WinJS.Navigation.location);

            WinJS.Navigation.forward(2);
            LiveUnit.Assert.areEqual("c", WinJS.Navigation.location);

            WinJS.Navigation.forward(1);
            LiveUnit.Assert.areEqual("d", WinJS.Navigation.location);

            WinJS.Navigation.back(1000);
            LiveUnit.Assert.areEqual("a", WinJS.Navigation.location);

            WinJS.Navigation.forward(1000).then(function () {
                LiveUnit.Assert.areEqual("d", WinJS.Navigation.location);

                complete();
            });
        }

        testInitialNavigation(complete) {
            WinJS.Navigation.history = {
                backStack: [],
                current: { location: "", initialPlaceholder: true },
                forwardStack: []
            };
            WinJS.Navigation.navigate("a");
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack);

            WinJS.Navigation.history = {};
            WinJS.Navigation.navigate("a");
            LiveUnit.Assert.isFalse(WinJS.Navigation.canGoBack);
            complete();
        }
        testStateManip(complete) {
            WinJS.Navigation.history = {};

            WinJS.Navigation.navigate("a", { step: 1 });
            WinJS.Navigation.navigate("b", { step: 2 });
            WinJS.Navigation.navigate("c", { step: 3 });

            LiveUnit.Assert.areEqual("c", WinJS.Navigation.location);
            LiveUnit.Assert.areEqual(3, WinJS.Navigation.state.step);

            WinJS.Navigation.state = { step: 5 };

            LiveUnit.Assert.areEqual(5, WinJS.Navigation.state.step);

            WinJS.Navigation.back();

            LiveUnit.Assert.areEqual("b", WinJS.Navigation.location);
            LiveUnit.Assert.areEqual(2, WinJS.Navigation.state.step);

            WinJS.Navigation.state = { step: 4 };

            WinJS.Navigation.forward();
            LiveUnit.Assert.areEqual("c", WinJS.Navigation.location);
            LiveUnit.Assert.areEqual(5, WinJS.Navigation.state.step);

            WinJS.Navigation.back();
            LiveUnit.Assert.areEqual("b", WinJS.Navigation.location);
            LiveUnit.Assert.areEqual(4, WinJS.Navigation.state.step);

            complete();
        }
        testCheckEventErrors(complete) {
            WinJS.Navigation.history = {};
            var failed1;
            var failed2;

            try {
                WinJS.Navigation.addEventListener("foo", function () { });
                failed1 = true;
            }
            catch (e) {
                failed1 = e;
            }

            try {
                WinJS.Navigation.removeEventListener("foo", function () { });
                failed2 = true;
            }
            catch (e) {
                failed2 = e;
            }

            LiveUnit.Assert.areEqual(true, failed1);
            LiveUnit.Assert.isTrue(true, failed2);

            complete();
        }

        // use different types for location and state
        testTypeAsLocationState() {
            WinJS.Navigation.history = {};

            // string, number, array, Boolean, Date, regex, function.  If you want to add new types, just add them to the array.
            var jsTypes = ["string", 2, [1, 2], true, new Date(), /^\d+$/, function () { return 3; }];

            // assign different types to location going forward
            jsTypes.forEach(function (item, index) {
                LiveUnit.Assert.isTrue(WinJS.Navigation.navigate(item, item));
                LiveUnit.Assert.isFalse(WinJS.Navigation.canGoForward);
                LiveUnit.Assert.areEqual(WinJS.Navigation.canGoBack, index > 0);
            });

            // now go backwards and verify location == jsType[n]
            for (var n = jsTypes.length - 1; n >= 0; n--) {
                LiveUnit.Assert.areEqual(jsTypes[n], WinJS.Navigation.location);
                LiveUnit.Assert.areEqual(jsTypes[n], WinJS.Navigation.state);

                LiveUnit.Assert.areEqual(WinJS.Navigation.canGoForward, n < jsTypes.length - 1);

                LiveUnit.Assert.areEqual(WinJS.Navigation.canGoBack, n > 0);
                if (WinJS.Navigation.canGoBack) {
                    LiveUnit.Assert.isTrue(WinJS.Navigation.back());
                }
            }
        }

        testBoundaryConditions(complete) {
            WinJS.Navigation.history = {};

            // going back with empty history should be ignored
            WinJS.Navigation.back().then(function (v) {
                LiveUnit.Assert.isFalse(v);

                // going forward with empty history should be ignored
                return WinJS.Navigation.forward();
            }).then(function (v) {
                    LiveUnit.Assert.isFalse(v);

                    WinJS.Navigation.navigate("a");
                    WinJS.Navigation.navigate("b");

                    return WinJS.Navigation.forward();
                }).then(function (v) {
                    // going forward from the end of the history 'b' should be ignored
                    LiveUnit.Assert.isFalse(v);

                    WinJS.Navigation.back(1);

                    // going back from the start of the history 'a' should be ignored
                    return WinJS.Navigation.back();
                }).then(function (v) {
                    LiveUnit.Assert.isFalse(v);
                    complete();
                });
        }
    };

}
LiveUnit.registerTestClass("CorsicaTests.Nav2Tests");