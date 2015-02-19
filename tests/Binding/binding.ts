// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {

    "use strict";
    var b = WinJS.Binding;

    function post(v) {
        return WinJS.Utilities.Scheduler.schedulePromiseNormal().then(function () { return v; });
    }
    function parent(element) {
        document.body.appendChild(element);
        return function () { document.body.removeChild(element); };
    }
    function errorHandler(msg) {
        try {
            LiveUnit.Assert.fail('There was an unhandled error in your test: ' + msg);
        } catch (ex) { }
    }

    export class BindingTests {

        testObservableChainHasPrivateMembers = function () {
            var nonObservableClass = WinJS.Class.define(null, {
                // this is the key. The private here isn't going to be pushed into the observable collections
                // that end up backing the type. Because every property is re-written, and this was defined
                // as non observable, it's not enumerable. because it's not enumerable it's never see in the
                // automagic wrapping of functions.
                _private: "private",
                publicFunction: function () {

                    // by design, "this" will refer to the proxy
                    //
                    LiveUnit.Assert.areEqual(undefined, this._private); // _private will be undefined.
                }
            });

            var observableClass = { instanceOfClass: new nonObservableClass() };

            var instanceOfObservable = WinJS.Binding.as(observableClass);
            instanceOfObservable.instanceOfClass.publicFunction();
        };

        testComplexBindCustomImpl = function (complete) {
            var Point = WinJS.Class.define(
                function (x, y) {
                    this._x = x;
                    this._y = y;
                },
                {
                    x: {
                        get: function () { return this._x; },
                        set: function (v) {
                            var old = this._x;
                            this._x = v;
                            this.notify("x", v, old);
                        }
                    },
                    y: {
                        get: function () { return this._y; },
                        set: function (v) {
                            var old = this._y;
                            this._y = v;
                            this.notify("y", v, old);
                        }
                    }
                }
                );
            Point = WinJS.Class.mix(Point, WinJS.Binding.observableMixin);

            WinJS.Promise.timeout().then(function () {
                var point = new Point();
                point.x = new Point();
                point.x.y = 10;
                var expected = 10;
                var count = 0;

                var token = b.bind(point, {
                    x: {
                        y: function (v) {
                            count++;
                            LiveUnit.Assert.areEqual(expected, point.x.y);
                        }
                    }
                });

                WinJS.Promise.timeout().then(post).then(function () {
                    LiveUnit.Assert.areEqual(count, 1);

                    expected = 5;
                    point.x.y = 5;

                    WinJS.Promise.timeout().then(post).then(function () {
                        LiveUnit.Assert.areEqual(2, count);
                        expected = 3;
                        point.x = new Point(0, 3);

                        WinJS.Promise.timeout().then(post).then(function () {
                            LiveUnit.Assert.areEqual(3, count);
                            LiveUnit.Assert.areEqual(expected, point.x.y);

                            token.cancel();
                            expected = 2;
                            point.x.y = 2;

                            WinJS.Promise.timeout().then(function () {
                                LiveUnit.Assert.areEqual(3, count);
                                LiveUnit.Assert.areEqual(expected, point.x.y);
                            }).
                                then(null, errorHandler).then(complete);
                        });
                    });
                });
            });
        };

        testComplexBind = function (complete) {
            WinJS.Promise.timeout().then(function () {
                var point = b.as({ x: b.as({ y: 10 }) });
                var expected = 10;
                var count = 0;

                var token = b.bind(point, {
                    x: {
                        y: function (v) {
                            count++;
                            LiveUnit.Assert.areEqual(expected, point.x.y);
                        }
                    }
                });

                WinJS.Promise.timeout().then(post).then(function () {
                    LiveUnit.Assert.areEqual(count, 1);

                    expected = 5;
                    point.x.y = 5;

                    WinJS.Promise.timeout().then(post).then(function () {
                        LiveUnit.Assert.areEqual(2, count);
                        expected = 3;
                        point.x = b.as({ y: 3 });

                        WinJS.Promise.timeout().then(post).then(function () {
                            LiveUnit.Assert.areEqual(3, count);
                            LiveUnit.Assert.areEqual(expected, point.x.y);

                            token.cancel();
                            expected = 2;
                            point.x.y = 2;

                            WinJS.Promise.timeout().then(function () {
                                LiveUnit.Assert.areEqual(3, count);
                                LiveUnit.Assert.areEqual(expected, point.x.y);
                            }).
                                then(null, errorHandler).then(complete);
                        });
                    });
                });
            });
        };

        testComplexBindSync = function (complete) {
            WinJS.Promise.timeout().then(function () {
                var point = b.as({ x: b.as({ y: 10 }) });
                var expected = 10;
                var count = 0;

                var token = b.bind(point, {
                    x: {
                        y: function (v) {
                            count++;
                            LiveUnit.Assert.areEqual(expected, point.x.y);
                        }
                    }
                });
                LiveUnit.Assert.areEqual(count, 1);

                WinJS.Promise.timeout().then(post).then(function () {
                    LiveUnit.Assert.areEqual(count, 1);

                    expected = 5;
                    point.x.y = 5;

                    WinJS.Promise.timeout().then(post).then(function () {
                        LiveUnit.Assert.areEqual(2, count);
                        expected = 3;
                        point.x = b.as({ y: 3 });

                        WinJS.Promise.timeout().then(post).then(function () {
                            LiveUnit.Assert.areEqual(3, count);
                            LiveUnit.Assert.areEqual(expected, point.x.y);

                            token.cancel();
                            expected = 2;
                            point.x.y = 2;

                            WinJS.Promise.timeout().then(function () {
                                LiveUnit.Assert.areEqual(3, count);
                                LiveUnit.Assert.areEqual(expected, point.x.y);
                            }).
                                then(null, errorHandler).then(complete);
                        });
                    });
                });
            });
        };

        testComplexBindCancel = function (complete) {
            WinJS.Promise.timeout().then(function () {
                var point = b.as({ x: b.as({ y: 10 }) });
                var expected = 10;
                var count = 0;

                var token = b.bind(point, {
                    x: {
                        y: function (v) {
                            count++;
                            LiveUnit.Assert.areEqual(expected, point.x.y);
                        }
                    }
                });
                LiveUnit.Assert.areEqual(1, count);

                WinJS.Promise.timeout().then(post).then(function () {
                    LiveUnit.Assert.areEqual(1, count);

                    token.cancel();

                    expected = 5;
                    point.x.y = 5;

                    WinJS.Promise.timeout().then(post).then(function () {
                        LiveUnit.Assert.areEqual(1, count);
                    }).
                        then(null, errorHandler).then(complete);
                });
            });
        };

        testNestedComplexBind = function (complete) {
            WinJS.Promise.timeout().then(function () {
                var value: any = b.as({
                    rect: b.as({
                        point: b.as({ x: 10, y: 10 }),
                        size: b.as({ width: 10, height: 10 }),
                    })
                });
                var expected = 10;
                var count = 0;
                var next = step1;

                b.bind(value, {
                    rect: {
                        point: {
                            x: function (v) {
                                LiveUnit.Assert.areEqual(expected, v);
                                count++;
                                next();
                            }
                        }
                    }
                });

                function step1() {
                    next = step2;
                    expected = 20;
                    value.rect.point.x = 20;
                }

                function step2() {
                    next = step3;
                    LiveUnit.Assert.areEqual(2, count);

                    expected = 30;
                    value.rect.point = b.as({ x: 30, y: 10 });
                }

                function step3() {
                    next = step4;
                    LiveUnit.Assert.areEqual(3, count);

                    expected = 40;
                    value.rect = b.as({
                        point: b.as({ x: 40, y: 10 })
                    });
                }

                function step4() {
                    next = null;
                    LiveUnit.Assert.areEqual(4, count);
                    complete();
                }
            });
        };

        testDefaultAction = function (complete) {
            WinJS.Promise.timeout().then(function () {
                var point: any = b.as({ x: 10, y: 10 });
                var expected = 0;
                var count = 0;

                point.bind("x", function (v) {
                    try {
                        LiveUnit.Assert.areEqual(point.x, 10);
                    } finally {
                        complete();
                    }
                });
            });
        };

        testUnbindSingle = function (complete) {
            WinJS.Promise.timeout().then(function () {
                var point: any = b.as({ x: 10, y: 10 });
                var expected = 10;
                var count = 0;

                var remove = function (v) {
                    count++;
                    LiveUnit.Assert.areEqual(1, count);
                };

                point.bind("x", remove);
                point.bind("x", function (v) {
                    LiveUnit.Assert.areEqual(point.x, expected);
                    if (expected === 5) { complete(); }
                });
                point.unbind("x", remove);

                point.x = expected = 5;
            });
        };

        testDeclarativeBinding = function (complete) {
            WinJS.Promise.timeout().then(function () {
                var point: any = b.as({ x: 10, y: 10 });

                var p = document.createElement("div");
                var cleanup = parent(p);
                var d = document.createElement("div");
                d.setAttribute("data-win-bind", "textContent:x");
                p.appendChild(d);
                WinJS.Binding.processAll(p, point);

                WinJS.Promise.timeout().then(post).then(function () {
                    LiveUnit.Assert.areEqual(d.textContent, "10");
                }).
                    then(cleanup, cleanup).
                    then(null, errorHandler).then(complete);
            });
        };


        testUnbindNameAction = function (complete) {
            WinJS.Promise.timeout().then(function () {
                var point: any = b.as({ x: 10, y: 10 });
                var expected = 0;
                var count = 0;

                var a = function (v) {
                    LiveUnit.Assert.areEqual(10, point.x);
                };
                point.bind("x", a);
                point.unbind("x", a);
                point.x = 5;

                WinJS.Promise.timeout().then(post).
                    then(null, errorHandler).then(complete);
            });
        };
        testUnbindName = function (complete) {
            WinJS.Promise.timeout().then(function () {
                var point: any = b.as({ x: 10, y: 10 });
                var expected = 0;
                var count = 0;

                point.bind("x", function (v) {
                    LiveUnit.Assert.areEqual(10, point.x);
                });
                point.unbind("x");
                point.x = 5;

                WinJS.Promise.timeout().then(post).
                    then(null, errorHandler).then(complete);
            });
        };
        testUnbindAll = function (complete) {
            WinJS.Promise.timeout().then(function () {
                var point: any = b.as({ x: 10, y: 10 });
                var expected = 0;
                var count = 0;

                point.bind("x", function (v) {
                    LiveUnit.Assert.areEqual(10, point.x);
                });
                point.unbind();
                point.x = 5;

                WinJS.Promise.timeout().then(post).
                    then(null, errorHandler).then(complete);
            });
        };

        testSimpleBind = function (complete) {
            WinJS.Promise.timeout().then(function () {
                var point: any = b.as({ x: 10, y: 10 });
                var expected = 10;
                var count = 0;

                point.bind("x", function (v) {
                    count++;
                    LiveUnit.Assert.areEqual(point.x, expected);
                });

                expected = 5;
                point.updateProperty("x", 5).then(function () {
                    LiveUnit.Assert.areEqual(2, count);
                }).
                    then(null, errorHandler).then(complete);
            });
        };

        testBindCoelesc = function (complete) {
            WinJS.Promise.timeout().then(function () {
                var point: any = b.as({ x: 10, y: 10 });
                var expected = 10;
                var count = 0;

                point.bind("x", function (v) {
                    count++;
                    LiveUnit.Assert.areEqual(point.x, expected);
                });

                point.x = 1;
                point.x = 2;
                point.x = 3;
                point.x = 4;

                expected = 5;
                point.updateProperty("x", 5).then(function () {
                    LiveUnit.Assert.areEqual(2, count);
                }).
                    then(null, errorHandler).then(complete);
            });
        };

        testObservableProps = function () {
            var backing: any = {};
            var obj: any = b.as(backing);
            obj.addProperty("x", 10);
            obj.addProperty("y", 10);

            LiveUnit.Assert.isTrue(Object.keys(obj).indexOf("x") >= 0);
            LiveUnit.Assert.isTrue(Object.keys(backing).indexOf("x") >= 0);

            LiveUnit.Assert.areEqual(10, backing.x);
            LiveUnit.Assert.areEqual(10, backing.y);
            LiveUnit.Assert.areEqual(10, obj.x);
            LiveUnit.Assert.areEqual(10, obj.y);
            LiveUnit.Assert.areEqual(10, obj.getProperty("x"));
            LiveUnit.Assert.areEqual(10, obj.getProperty("y"));

            obj.setProperty("x", 11);
            LiveUnit.Assert.areEqual(11, backing.x);
            LiveUnit.Assert.areEqual(10, backing.y);
            LiveUnit.Assert.areEqual(11, obj.x);
            LiveUnit.Assert.areEqual(10, obj.y);
            LiveUnit.Assert.areEqual(11, obj.getProperty("x"));
            LiveUnit.Assert.areEqual(10, obj.getProperty("y"));

            obj.addProperty("x", 9);
            LiveUnit.Assert.areEqual(9, backing.x);
            LiveUnit.Assert.areEqual(10, backing.y);
            LiveUnit.Assert.areEqual(9, obj.x);
            LiveUnit.Assert.areEqual(10, obj.y);
            LiveUnit.Assert.areEqual(9, obj.getProperty("x"));
            LiveUnit.Assert.areEqual(10, obj.getProperty("y"));

            obj.x = 12;
            LiveUnit.Assert.areEqual(12, backing.x);
            LiveUnit.Assert.areEqual(10, backing.y);
            LiveUnit.Assert.areEqual(12, obj.x);
            LiveUnit.Assert.areEqual(10, obj.y);
            LiveUnit.Assert.areEqual(12, obj.getProperty("x"));
            LiveUnit.Assert.areEqual(10, obj.getProperty("y"));

            backing.x = 13;
            LiveUnit.Assert.areEqual(13, backing.x);
            LiveUnit.Assert.areEqual(10, backing.y);
            LiveUnit.Assert.areEqual(13, obj.x);
            LiveUnit.Assert.areEqual(10, obj.y);
            LiveUnit.Assert.areEqual(13, obj.getProperty("x"));
            LiveUnit.Assert.areEqual(10, obj.getProperty("y"));

            obj.removeProperty("x");
            LiveUnit.Assert.isTrue(backing.x == undefined);
            LiveUnit.Assert.areEqual(10, backing.y);
            LiveUnit.Assert.isTrue(obj.x == undefined);
            LiveUnit.Assert.areEqual(10, obj.y);
            LiveUnit.Assert.isTrue(obj.getProperty("x") == undefined);
            LiveUnit.Assert.areEqual(obj.getProperty("y"), 10);

            LiveUnit.Assert.areEqual(-1, Object.keys(obj).indexOf("x"));
            LiveUnit.Assert.areEqual(-1, Object.keys(backing).indexOf("x"));

        };

        testGetMake = function (complete) {
            WinJS.Promise.timeout().then(function () {
                var original2: any = { x: 10 };
                var m = b.as(original2);
                var m2 = b.as(original2);

                LiveUnit.Assert.isTrue(original2._getObservable !== undefined);
                LiveUnit.Assert.isTrue(m._getObservable !== undefined);
                LiveUnit.Assert.isTrue(m === m2);
            }).
                then(null, errorHandler).then(complete);
        };

        testMakeFunction = function () {
            var f = function () { return "hi"; };
            LiveUnit.Assert.isTrue(b.as(f) === f);
            LiveUnit.Assert.areEqual("hi", b.as(f)());

            var q = WinJS.Binding.as({ x: f });
            LiveUnit.Assert.isTrue(q.x === f);
            LiveUnit.Assert.areEqual("hi", q.x());
        };

        testMakeNull = function () {
            LiveUnit.Assert.isTrue(b.as(null) === null);
            LiveUnit.Assert.isTrue(b.as(undefined) === undefined);
        };

        testDefine = function () {
            var Type: any = b.define({ x: 0 });

            var instance = new Type();
            LiveUnit.Assert.areEqual(0, instance.x);
            instance.x = 10;
            LiveUnit.Assert.areEqual(10, instance.x);
            instance.addProperty("y", 20);
            LiveUnit.Assert.areEqual(20, instance.y);
            instance.removeProperty("y");
            LiveUnit.Assert.areEqual(undefined, instance.y);
        };

        testPropTypes = function () {
            var Type: any = b.define({ x: 0, f: function () { return this.x * 2; }, a: [1, 2, 3] });

            var instance = new Type();
            LiveUnit.Assert.areEqual(0, instance.x);
            instance.x = 10;
            LiveUnit.Assert.areEqual(10, instance.x);

            LiveUnit.Assert.isTrue(instance.a instanceof Array);
            LiveUnit.Assert.areEqual(1, instance.a[0]);
            LiveUnit.Assert.areEqual(2, instance.a[1]);
            LiveUnit.Assert.areEqual(3, instance.a[2]);

            LiveUnit.Assert.areEqual("function", typeof (instance.f));
            LiveUnit.Assert.areEqual(20, instance.f());
        };

        testPropTypesAs = function () {
            var instance = b.as({ x: 0, f: function () { return this.x * 2; }, a: [1, 2, 3] });

            LiveUnit.Assert.areEqual(0, instance.x);
            instance.x = 10;
            LiveUnit.Assert.areEqual(10, instance.x);

            LiveUnit.Assert.isTrue(instance.a instanceof Array);
            LiveUnit.Assert.areEqual(1, instance.a[0]);
            LiveUnit.Assert.areEqual(2, instance.a[1]);
            LiveUnit.Assert.areEqual(3, instance.a[2]);

            LiveUnit.Assert.areEqual("function", typeof (instance.f));
            LiveUnit.Assert.areEqual(20, instance.f());
        };

        testPropTypesNestedAs = function () {
            var instance = b.as({ i: { x: 0, f: function () { return this.x * 2; }, a: [1, 2, 3] } });

            LiveUnit.Assert.areEqual(0, instance.i.x);
            instance.i.x = 10;
            LiveUnit.Assert.areEqual(10, instance.i.x);

            LiveUnit.Assert.isTrue(instance.i.a instanceof Array);
            LiveUnit.Assert.areEqual(1, instance.i.a[0]);
            LiveUnit.Assert.areEqual(2, instance.i.a[1]);
            LiveUnit.Assert.areEqual(3, instance.i.a[2]);

            LiveUnit.Assert.areEqual("function", typeof (instance.i.f));
            LiveUnit.Assert.areEqual(20, instance.i.f());
        };

        testPropTypesNestedTypeAs = function () {
            var NestedType = WinJS.Class.define(function () { }, { x: 0, f: function () { return this.x * 2; }, a: [1, 2, 3] });
            var instance = b.as({ i: new NestedType() });

            LiveUnit.Assert.areEqual(0, instance.i.x);
            instance.i.x = 10;
            LiveUnit.Assert.areEqual(10, instance.i.x);

            LiveUnit.Assert.isTrue(instance.i.a instanceof Array);
            LiveUnit.Assert.areEqual(1, instance.i.a[0]);
            LiveUnit.Assert.areEqual(2, instance.i.a[1]);
            LiveUnit.Assert.areEqual(3, instance.i.a[2]);

            LiveUnit.Assert.areEqual("function", typeof (instance.i.f));
            LiveUnit.Assert.areEqual(20, instance.i.f());
        };

        testMixinWithNull = function () {
            var Type = WinJS.Class.mix(
                function () {
                    this._initObservable();
                },
                WinJS.Binding.mixin,
                WinJS.Binding.expandProperties({ x: 0 })
                );

            var instance = new Type();
            LiveUnit.Assert.areEqual(undefined, instance.x);
            instance.x = 10;
            LiveUnit.Assert.areEqual(10, instance.x);
            instance.addProperty("y", 20);
            LiveUnit.Assert.areEqual(20, instance.y);
            instance.removeProperty("y");
            LiveUnit.Assert.areEqual(undefined, instance.y);
        };

        testMixinWithNull2 = function () {
            var Type = WinJS.Class.mix(
                function () {
                    this._initObservable();
                },
                WinJS.Binding.mixin,
                WinJS.Binding.expandProperties(undefined)
                );

            var instance = new Type();
            LiveUnit.Assert.areEqual(undefined, instance.x);
            instance.addProperty("y", 20);
            LiveUnit.Assert.areEqual(20, instance.y);
            instance.removeProperty("y");
            LiveUnit.Assert.areEqual(undefined, instance.y);
        };

        testObservableDefine = function (complete) {
            WinJS.Promise.timeout().then(function () {
                var original2 = { x: 10 };

                var Type: any = b.define(original2);
                var instance = new Type();
                LiveUnit.Assert.areEqual(10, instance.x);
                instance.x = 20;
                LiveUnit.Assert.areEqual(20, instance.x);
                LiveUnit.Assert.areEqual(10, original2.x);
            }).
                then(null, errorHandler).then(complete);
        };
        //starts here
        testBindToMoreThanOneParameterWithTheSameFunction = function (complete) {
            var count = 0;
            var expected = 4;
            WinJS.Promise.timeout().then(function () {
                var obj: any = b.as({ x: 1, y: 2, z: 3 });
                obj.bind("x", foo);
                obj.x = 2;
                obj.bind("y", foo);
                obj.y = 3;
                obj.x = 4;
                obj.y = 7;
                obj.z = 10;

                function foo() {
                    count++;
                }
            }).then(post).then(function () {
                    LiveUnit.Assert.areEqual(expected, count);
                }).then(null, errorHandler).then(complete);
        };

        testBindToOneParameterWithMoreThanOneFunction = function (complete) {
            var count = 0;
            var expected = 6;
            WinJS.Promise.timeout().then(function () {
                var obj: any = b.as({ x: 1 });

                obj.bind("x", foo1);
                obj.x = 2;
                obj.bind("x", foo2);
                obj.x = 3;
                obj.bind("x", foo3);
                obj.x = 4;

                function foo1() {
                    count++;
                }
                function foo2() {
                    count++;
                }
                function foo3() {
                    count++;
                }
            }).then(post).then(function () {
                    LiveUnit.Assert.areEqual(expected, count);
                }).then(null, errorHandler).then(complete);

        };

        testUnbindToOneParameterInsideHandler = function (complete) {
            var count = 0;
            var expected_x = 1;
            var obj: any = b.as({ x: 1 });

            WinJS.Promise.timeout().then(function () {
                obj.bind("x", foo1);
                obj.bind("x", foo2);
                obj.bind("x", foo3);
                obj.x = expected_x = 4;

                function foo1() {
                    LiveUnit.Assert.isTrue(count < 3, "Should be called at most twice");
                    obj.unbind("x", foo2);
                    obj.unbind("x", foo3);
                    count++;
                }
                function foo2() {
                    LiveUnit.Assert.areEqual(expected_x, obj.x);
                }
                function foo3() {
                    LiveUnit.Assert.areEqual(expected_x, obj.x);
                }
            }).then(post).
                then(post).
                then(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    obj.x = 8;
                }).then(post).then(function () {
                    LiveUnit.Assert.areEqual(3, count);
                }).then(null, errorHandler).then(complete);

        };

        testUnbindMiddleOneParameterInsideHandler = function (complete) {
            var count = 0;
            var foo2_x = 1;
            var obj: any = b.as({ x: 1 });
            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo1);
                obj.bind("x", foo2);
                obj.bind("x", foo3);
                obj.x = foo2_x = 4;

                function foo1() {
                    obj.unbind("x", foo2);
                    count++;
                }
                function foo2() {
                    LiveUnit.Assert.areEqual(foo2_x, obj.x);
                    count++;
                }
                function foo3() {
                    count++;
                }
            }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(6, count);
                    obj.x = 6;
                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(8, count);
                }).then(null, errorHandler).then(complete);
        };

        testUnbindWithNoParameters = function (complete) {
            var count = 0;
            var expected = 6;
            var obj: any = b.as({ x: 1, y: 2 });

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo1);
                obj.bind("x", foo2);
                obj.bind("y", foo3);
                obj.x = 4;
                obj.y = 3;

                function foo1() {
                    count++;
                }
                function foo2() {
                    count++;
                }
                function foo3() {
                    count++;
                }

            }).then(post).then(post).then(function () {
                    obj.unbind();
                }).then(post).then(function () {
                    LiveUnit.Assert.areEqual(expected, count);
                    count = 0;
                    obj.x = 3;
                    obj.y = 4;
                }).then(post).
                then(function () {
                    LiveUnit.Assert.areEqual(0, count);
                }).then(null, errorHandler).then(complete);
        };
        testUnbindWithNoParametersInsideHandler = function (complete) {
            //Bug: win8: 324718
            var count = 0;
            var expected = 4;
            WinJS.Promise.timeout().then(function () {
                var obj: any = b.as({ x: 1, y: 2 });

                obj.bind("x", foo1);
                obj.bind("x", foo2);
                obj.bind("y", foo3);
                obj.x = 4;
                obj.y = 3;

                function foo1() {
                    count++;

                }
                function foo2() {
                    count++;
                    obj.unbind();
                }
                function foo3() {
                    count++;
                }
            }).then(post).then(function () {

                    LiveUnit.Assert.areEqual(expected, count);
                }).then(null, errorHandler).then(complete);
        };

        testBindToNonUpdatedValues = function (complete) {
            var count = 0;
            var expected = 1;
            var obj: any = b.as({ x: 1, y: 2, z: 3 });

            WinJS.Promise.timeout().then(function () {
                obj.bind("x", foo);

                function foo() {
                    count++;
                }
            }).then(post)
                .then(function () {
                    obj.x = 1;
                })
                .then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
            //complete();
        };

        testAddBindInsideHandler = function (complete) {
            var count = 0;
            var expected = 2;
            WinJS.Promise.timeout().then(function () {
                var obj: any = b.as({ x: 1, y: 2, z: 3 });

                obj.bind("x", foo);

                function foo() {
                    count++;
                    obj.bind("x", foo2);
                }
                function foo2() {
                    LiveUnit.Assert.areEqual(1, count, "should be called in response to the bind, no second pass");
                    count++;
                }

            }).then(post)
                .then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(expected, count);
                }).then(null, errorHandler).then(complete);
        };

        testAddBindInsideHandler2 = function (complete) {
            var count = 0;
            var expected = 4;
            var obj: any = b.as({ x: 1, y: 2, z: 3 });
            var first = 1;

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);
                function foo() {
                    count++;
                    if (first) {
                        obj.bind("x", foo2);
                        first = 0;
                    }
                }
                function foo2() {
                    count++;
                }
            }).then(post)
                .then(function () {
                    obj.x = 2;
                }).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };

        xtestAddBindInsideHandler3 = function (complete) {
            //Bug: win8: 308314
            var count = 0;
            var expected = 1;
            var obj: any = b.as({ x: 1, y: 2, z: 3 });
            var first = 1;
            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);

                function foo() {
                    count++;
                    if (first) {
                        obj.bind("x", foo2);
                        first = 0;
                    }
                }
                function foo2() {
                    count++;
                }

            }).then(post)
                .then(function () {
                    obj.x = 1;
                }).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };

        testAddBindInsideHandler4 = function (complete) {
            var count = 0;
            var obj: any = b.as({ x: 1, y: 2, z: 3 });
            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);

                function foo() {
                    count++;
                    obj.bind("x", foo2);
                }
                function foo2() {
                    count++;
                }

            }).then(post)
                .then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(2, count);
                    obj.x = 2;
                }).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(4, count);
                }).then(null, errorHandler).then(complete);
        };

        testAddSameBindSeveralTimes = function (complete) {
            var count = 0;
            var expected = 1;
            var obj: any = b.as({ x: 1, y: 2, z: 3 });

            WinJS.Promise.timeout().then(function () {

                for (var i = 0; i < 100; i++)
                    obj.bind("x", foo);

                function foo() {
                    count++;
                }

            }).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };

        testAddBindInsideHandlerToAnotherVariable1 = function (complete) {
            var count = 0;
            var expected = 2;
            var obj: any = b.as({ x: 1, y: 2, z: 3 });
            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);

                function foo() {
                    count++;
                    obj.bind("y", foo2);
                }
                function foo2() {
                    count++;
                }

            }).then(post).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };

        testAddBindInsideHandlerToAnotherVariable2 = function (complete) {
            var count = 0;
            var expected = 3;
            var obj: any = b.as({ x: 1, y: 2, z: 3 });
            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);

                function foo() {
                    count++;
                    obj.bind("y", foo2);
                    obj.y = 3;
                }
                function foo2() {
                    count++;
                }

            }).then(post).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(expected, count);
                }).then(null, errorHandler).then(complete);
        };

        testAddBindInsideHandlerToAnotherVariable3 = function (complete) {
            var count = 0;
            var expected = 2;
            var obj: any = b.as({ x: 1, y: 2, z: 3 });
            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);

                function foo() {
                    count++;
                    obj.bind("y", foo2);
                    obj.y = 2;
                }
                function foo2() {
                    count++;
                }

            }).then(post).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };

        testBindingToNonExistingProperty = function (complete) {
            var count = 0;
            var expected = 2;
            var obj: any = b.as({ x: 1, z: 3 });
            WinJS.Promise.timeout().then(function () {

                obj.bind("y", foo);

                function foo() {
                    count++;

                }
            }).then(post)
                .then(function () {
                    obj.addProperty("y", 3);
                })
                .then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };

        testBindingToSimilarNameObject = function (complete) {

            var count = 0;
            var expected = 1;
            var obj: any = b.as({ x: 1, z: 3 });
            var obj2 = b.as({ x: 2, y: 1 });

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);

                function foo() {
                    count++;

                }
                obj2.x = 20;

            }).then(post)
                .then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };

        testBindingToNonWritableProperty = function (complete) {
            var count = 0;
            var expected = 1;
            var obj2 = {};
            Object.defineProperty(obj2, "x",
                {
                    value: 2,
                    writable: false,
                    enumerable: true
                });
            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);

                function foo() {
                    count++;
                }
            }).then(post).then(post)
                .then(function () {
                    try {
                        obj.x = 20;
                    }
                    catch (e) {
                        // trying to set readonly property should throw
                    }
                })
                .then(post)
                .then(function () {

                    LiveUnit.Assert.areEqual(2, obj.x);
                    LiveUnit.Assert.areEqual(expected, count);
                }).then(null, errorHandler).then(complete);
        };

        testBindingToWholeObject = function (complete) {

            var count = 0;
            var expected = 3;

            var obj: any = b.as({ x: 1, y: { c: 1, d: 1 } });
            //var obj = b.as({x:1, y:{x:1, d:1});

            WinJS.Promise.timeout().then(function () {

                obj.bind("y", foo);

                function foo() {
                    count++;
                }
                //LiveUnit.Assert.areEqual(obj.y.d, 2);
            }).then(post).then(post)
                .then(function () {
                    obj.y.c = 20;
                    LiveUnit.Assert.areEqual(obj.y.c, 20);
                })
                .then(post)
                .then(function () {
                    obj.y.d = 2;
                })
                .then(post)
                .then(function () {
                    obj.y.d = 2;
                })
                .then(post)
                .then(function () {
                    obj.y = { a: 2 };
                })
                .then(post)
                .then(function () {
                    obj.y.a = 2;
                })
                .then(post)
                .then(function () {
                    obj.y.a = 3;
                })
                .then(post)
                .then(function () {
                    obj.y = { a: 3 };
                })
                .then(post)
                .then(function () {

                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };

        testBindingToWholeObject2 = function (complete) {

            var count = 0;
            var expected = 1;

            var obj2 = { c: 1, d: 1 };
            var obj: any = b.as({ x: 1, y: obj2 });
            //var obj = b.as({x:1, y:{x:1, d:1});

            WinJS.Promise.timeout().then(function () {

                obj.bind("y", foo);

                function foo() {
                    count++;
                }
                //LiveUnit.Assert.areEqual(obj.y.d, 2);
            }).then(post).then(post)
                .then(function () {
                    obj.y.c = 20;
                    LiveUnit.Assert.areEqual(obj.y.c, 20);
                })
                .then(post)
                .then(function () {
                    obj.y = obj2;
                })
                .then(post)
                .then(function () {
                    obj2.d = 3;
                    obj.y = obj2;
                })
                .then(post)
                .then(function () {

                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };

        xtestBindingDocumentProperty = function (complete) {
            // cannot be tested through webunit
            var count = 0;
            var expected = 2;

            var obj: any = b.as(document);

            WinJS.Promise.timeout().then(function () {

                obj.bind("title", foo);

                function foo() {
                    count++;
                }
            }).then(post).then(post)
                .then(function () {
                    obj.title = "testing";
                })
                .then(post)
                .then(function () {

                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };

        testUnbidningWithNameOnly = function (complete) {

            var count = 0;
            var expected = 3;

            var obj: any = b.as({ x: 1, y: 2 });

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo1);
                obj.bind("x", foo2);
                obj.bind("x", foo3);

                function foo1() {
                    count++;
                }
                function foo2() {
                    count++;
                }
                function foo3() {
                    count++;
                }
            }).then(post).then(post)
                .then(function () {
                    obj.unbind("x");
                })
                .then(post).then(post)
                .then(function () {
                    obj.x = 4;
                })
                .then(post).then(post)
                .then(function () {

                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };

        testUnbidningNonExisting = function (complete) {

            var count = 0;
            var expected = 2;

            var obj: any = b.as({ x: 1, y: 2 });

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);

                function foo() {
                    count++;
                }

            }).then(post).then(post)
                .then(function () {
                    obj.unbind("y");
                })
                .then(post).then(post)
                .then(function () {
                    obj.x = 4;
                })
                .then(post).then(post)
                .then(function () {

                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };

        testUnbidningNonExisting2 = function (complete) {

            var count = 0;
            var expected = 3;

            var obj: any = b.as({ x: 1, y: 2 });

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);

                function foo() {
                    count++;
                }

            }).then(post).then(post)
                .then(function () {
                    obj.unbind("x", "foo2");
                })
                .then(post).then(post)
                .then(function () {
                    obj.x = 4;
                })
                .then(post).then(post)
                .then(function () {
                    obj.unbind("y", "foo1");
                }).then(post)
                .then(function () {
                    obj.x = 10;
                })
                .then(post)
                .then(function () {

                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };

        testBindingToNonEnumProperty = function () {
            var count = 0;
            var expected = 0;
            var obj2 = {};
            Object.defineProperty(obj2, "x",
                {
                    value: 2,
                    enumerable: false //default is false
                });
            var obj: any = b.as(obj2);

            LiveUnit.Assert.isFalse(obj.hasOwnProperty("x"));
        };

        testBindingInvalidTypes = function () {
            var arr = [1, 2, 3];
            var obj: any = b.as(arr);

            LiveUnit.Assert.isTrue(obj === arr);

            var str = "string;to;bind;to";
            var obj2 = b.as(str);

            LiveUnit.Assert.isTrue(obj2 === str);
        };

        testBindingWithAccessorProperty = function (complete) {

            var count = 0;
            var expected = 1;
            var obj2: any = {};
            Object.defineProperty(obj2, "x",
                {
                    set: function (value) {
                        count++;
                    },
                    get: function () { return this._x; },
                    enumerable: true
                });
            obj2._x = 4;
            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {
                obj.bind("x", foo);
                function foo() {
                }
                obj.x = 3;
            }).then(post).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(expected, count);
                }).then(null, errorHandler).then(complete);

        };

        testBindingWithTwoAccessorProperties = function (complete) {

            var count = 0;
            var expected = 4;
            var obj2: any = {};
            Object.defineProperty(obj2, "x",
                {
                    set: function (value) {
                        count++;
                    },
                    get: function () { },
                    enumerable: true
                });
            Object.defineProperty(obj2, "y",
                {
                    set: function (value) {
                        count++;
                    },
                    get: function () { },
                    enumerable: true
                });
            obj2.x = 4;
            obj2.y = 1;
            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);
                obj.bind("y", foo);
                function foo() {
                }
                obj.x = 3;
                obj.y = 4;
            }).then(post).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);

        };

        testCheckingFunctionBind = function (complete) {

            var count = 0;
            var expected = 3;
            function objClass() {
                var localVar: any = b.as({ x: 1 });
                this.func = function () {
                    localVar.bind("x", foo);
                }
            function foo() {
                    count++;
                }
                this.setLocal = function (v) { localVar.x = v };
            };



            var obj = new objClass();

            WinJS.Promise.timeout().then(function () {

                obj.func();
                obj.setLocal(2); //coalescing

            }).then(post).then(post)
                .then(function () {
                    obj.setLocal(3);
                }).then(post).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(expected, count);
                }).then(null, errorHandler).then(complete);
        };

        testBindingToAnObservableObject = function (complete) {

            var count = 0;
            var expected = 0;

            var obj: any = b.as({ x: 1 });
            var obj2 = b.as(obj);

            WinJS.Promise.timeout().then(function () {
                obj.bind("x", foo);
                function foo() {
                    count++;
                }
            }).then(post).then(post)
                .then(function () { obj2.x = 20; })
                .then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(20, obj.x);
                    LiveUnit.Assert.areEqual(obj, obj2);
                    LiveUnit.Assert.areEqual(expected, expected);
                }).then(null, errorHandler).then(complete);
        };

        testAddPropertyWithPreventExtensions = function () {
            var count = 0;
            var expected = 2;
            var obj2 = { x: 1 };
            Object.preventExtensions(obj2);
            LiveUnit.Assert.areEqual(Object.isExtensible(obj2), false);

            try {
                var obj: any = b.as(obj2);
                LiveUnit.Assert.fail("this shouldn't pass");
            } catch (ex) {
            }
        };

        testSimpleAddProperty = function (complete) {

            var count = 0;
            var expected = 3;
            var obj2 = { x: 1 };
            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);
                obj.addProperty("y", 2);

                obj.bind("y", foo);
                function foo() {
                    count++;
                }


            }).then(post).then(post)
                .then(function () {
                    obj.y = 3;
                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(expected, count);
                    LiveUnit.Assert.isTrue(!!Object.getOwnPropertyDescriptor(obj, "y"));
                }).then(null, errorHandler).then(complete);
        };

        testAddAlreadyExistingProperty = function (complete) {

            var count = 0;
            var expected = 3;
            var obj2 = { x: 1 };
            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);
                obj.addProperty("x", 2);

                function foo() {
                    count++;
                }


            }).then(post).then(post)
                .then(function () {
                    obj.x = 3;
                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(expected, count);
                }).then(null, errorHandler).then(complete);
        };

        testAddAlreadyExistingProperty2 = function (complete) {

            var count = 0;
            var expected = 3;
            var obj2 = { x: 1 };
            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);
                obj.addProperty("x", 2);

                function foo() {
                    count++;
                }


            }).then(post).then(post)
                .then(function () {
                    obj.addProperty("x", 3);
                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(expected, count);
                    LiveUnit.Assert.areEqual(3, obj.x);
                }).then(null, errorHandler).then(complete);
        };

        xtestAddNonExistingPropertyAlreadySet = function (complete) {
            //Bug: win8: 308607
            var count = 0;
            var expected = 2;
            var obj2 = {};
            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);
                obj.x = 1;

                function foo() {
                    count++;
                }


            }).then(post).then(post)
                .then(function () {
                    obj.addProperty("x", 3);
                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                    LiveUnit.Assert.areEqual(obj.x, 3);
                }).then(null, errorHandler).then(complete);
        };

        testAddPropertyWithNullValue = function (complete) {

            var count = 0;
            var expected = 2;

            var obj: any = b.as({});

            WinJS.Promise.timeout().then(function () {


                obj.addProperty("x", null);
                LiveUnit.Assert.areEqual(obj.x, null);

                obj.bind("x", foo);

                function foo() {
                    count++;
                }


            }).then(post).then(post)
                .then(function () {
                    obj.x = 3;
                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                    LiveUnit.Assert.areEqual(obj.x, 3);
                }).then(null, errorHandler).then(complete);
        };

        testAddPropertyWithUndefinedValue = function (complete) {

            var count = 0;
            var expected = 2;

            var obj: any = b.as({});

            WinJS.Promise.timeout().then(function () {


                obj.addProperty("x", undefined);
                LiveUnit.Assert.areEqual(obj.x, undefined);

                obj.bind("x", foo);

                function foo() {
                    count++;
                }


            }).then(post).then(post)
                .then(function () {
                    obj.x = 3;
                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                    LiveUnit.Assert.areEqual(obj.x, 3);
                }).then(null, errorHandler).then(complete);
        };

        xtestSetPropertyWithNonConfigurable = function (complete) {
            //Bug: win8: 309461
            var count = 0;
            var expected = 1;
            var obj2 = { x: 1 };
            Object.defineProperty(obj2, "y", { value: 3, writable: false, enumerable: true });

            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("y", foo);

                function foo() {
                    count++;
                }

            }).then(post).then(post)
                .then(function () {
                    obj.setProperty("y", 4);
                })
                .then(post).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };

        testSimpleSetProperty = function (complete) {

            var count = 0;
            var expected = 3;
            var obj2 = { x: 1 };
            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);
                obj.setProperty("x", 2);

                function foo() {
                    count++;
                }


            }).then(post).then(post)
                .then(function () {
                    obj.setProperty("x", 3);
                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(expected, count);
                }).then(null, errorHandler).then(complete);
        };

        testSetNonExistingProperty = function (complete) {

            var count = 0;
            var expected = 3;
            var obj2 = { x: 1 };
            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("y", foo);
                obj.addProperty("y", 2);
                obj.setProperty("y", 2);

                function foo() {
                    count++;
                }


            }).then(post).then(post)
                .then(function () {
                    obj.setProperty("y", 3);
                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(expected, count);
                }).then(null, errorHandler).then(complete);
        };

        testSetPropertyWithNullValue = function (complete) {

            var count = 0;
            var expected = 2;

            var obj: any = b.as({ x: 1 });

            WinJS.Promise.timeout().then(function () {


                obj.setProperty("x", null);
                LiveUnit.Assert.areEqual(obj.x, null);

                obj.bind("x", foo);

                function foo() {
                    count++;
                }


            }).then(post).then(post)
                .then(function () {
                    obj.setProperty("x", 3);
                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                    LiveUnit.Assert.areEqual(obj.x, 3);
                }).then(null, errorHandler).then(complete);
        };

        testSetPropertyWithUndefinedValue = function (complete) {

            var count = 0;
            var expected = 2;

            var obj: any = b.as({ x: 1 });

            WinJS.Promise.timeout().then(function () {


                obj.setProperty("x", undefined);
                LiveUnit.Assert.areEqual(obj.x, undefined);

                obj.bind("x", foo);

                function foo() {
                    count++;
                }

            }).then(post).then(post)
                .then(function () {
                    obj.setProperty("x", 3);
                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                    LiveUnit.Assert.areEqual(obj.x, 3);
                }).then(null, errorHandler).then(complete);
        };

        testSetPropertyWithUndefinedValue2 = function (complete) {

            var count = 0;
            var expected = 2;

            var obj: any = b.as({ y: 1 });

            WinJS.Promise.timeout().then(function () {
                obj.addProperty("x", 2);
                obj.setProperty("x", undefined);
                LiveUnit.Assert.areEqual(obj.x, undefined);

                obj.bind("x", foo);

                function foo() {
                    count++;
                }
            }).then(post).then(post)
                .then(function () {
                    obj.setProperty("x", 3);
                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                    LiveUnit.Assert.areEqual(obj.x, 3);
                }).then(null, errorHandler).then(complete);
        };

        /**************************removeProperty**************************************************/
        testRemovePropertyWithConfigurableFalse = function (complete) {
            var count = 0;
            var expected = 2;
            var obj2 = {};
            Object.defineProperty(obj2, "x", { value: 1, configurable: false, enuemrable: true });

            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);

                function foo() {
                    count++;
                }
                obj.removeProperty("x");
            }).then(post).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(expected, count);
                    LiveUnit.Assert.areEqual(false, obj.hasOwnProperty("x"));
                }).then(null, errorHandler).then(complete);
        };

        testSimpleRemoveProperty = function (complete) {

            var count = 0;
            var expected = 2;
            var obj2 = { x: 1 };
            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);
                function foo() {
                    count++;
                }


            }).then(post).then(post)
                .then(function () {
                    obj.removeProperty("x");
                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(expected, count);
                    LiveUnit.Assert.areEqual(false, obj.hasOwnProperty("x"));
                }).then(null, errorHandler).then(complete);
        };

        testSimpleRemoveProperty2 = function (complete) {

            var count = 0;
            var expected = 2;
            var obj2 = { x: 1 };
            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);
                function foo() {
                    count++;
                }


            }).then(post).then(post)
                .then(function () {
                    obj.removeProperty("x");
                }).then(post).then(post).then(function () {
                    obj.x = 3;
                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                    LiveUnit.Assert.areEqual(obj.x, 3);
                }).then(null, errorHandler).then(complete);
        };

        testRemoveNonExistingProperty = function (complete) {

            var count = 0;
            var expected = 1;
            var obj2 = { x: 1 };
            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);
                function foo() {
                    count++;
                }


            }).then(post).then(post)
                .then(function () {
                    obj.removeProperty("y");
                }).then(post).then(post).then(function () {

                    LiveUnit.Assert.areEqual(count, expected);
                    LiveUnit.Assert.areEqual(false, obj.hasOwnProperty("y"));
                }).then(null, errorHandler).then(complete);
        };

        testGetExistingProperty = function (complete) {

            var count = 0;
            var expected = 1;
            var obj2 = { x: 1 };
            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);
                function foo() {
                    count++;
                }
            }).then(post).then(post)
                .then(function () {
                    var t = obj.getProperty("x");
                    LiveUnit.Assert.areEqual(1, t);
                }).then(null, errorHandler).then(complete);
        };

        testGetNonExistingProperty = function (complete) {

            var count = 0;
            var expected = 1;
            var obj2 = { x: 1 };
            var obj: any = b.as(obj2);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);
                function foo() {
                    count++;
                }
            }).then(post).then(post)
                .then(function () {
                    var t = obj.getProperty("y");
                    LiveUnit.Assert.areEqual(undefined, t);
                }).then(null, errorHandler).then(complete);
        };

        testUnWrapObject = function (complete) {

            var count = 0;
            var expected = 1;
            var t = 0;
            var obj: any = b.as({ x: 1 });

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);

                function foo(v) {

                    LiveUnit.Assert.areEqual(v, 1);
                    count++;
                }
            }).then(post).then(post)
                .then(function () {

                    t = b.unwrap(obj).x;
                }).then(post).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(t, 1);
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);

        };

        testUnWrapObject2 = function (complete) {

            var count = 0;
            var expected = 1;
            var t = 0;
            var obj: any = b.as({ x: 1 });
            var obj2 = b.as(obj);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);

                function foo(v) {

                    LiveUnit.Assert.areEqual(v, 1);
                    count++;
                }
            }).then(post).then(post)
                .then(function () {

                    t = b.unwrap(obj2).x;
                }).then(post).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(t, 1);
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);

        };

        testUnwrapWithDifferentValues = function () {

            var arr = [null, undefined, "string", 1, ""];

            for (var i in arr) {
                var obj = arr[i];
                var t = b.unwrap(obj);
                LiveUnit.Assert.areEqual(t, obj);
            }
        };

        testUnwrapAndGetProperty = function (complete) {

            var count = 0;
            var expected = 1;
            var t = 0;
            var obj: any = b.as({ x: 1 });
            var obj2 = b.as(obj);

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);

                function foo(v) {

                    LiveUnit.Assert.areEqual(v, 1);
                    count++;
                }
            }).then(post).then(post)
                .then(function () {

                    t = b.unwrap(obj.getProperty("x"));
                }).then(post).then(post)
                .then(function () {
                    LiveUnit.Assert.areEqual(t, 1);
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);

        };

        testEspecialCasesInAs = function () {
            var arr = [true, false, undefined, null];

            for (var i in arr) {
                var obj = arr[i];
                var t = b.as(obj);
                LiveUnit.Assert.areEqual(t, obj);
            }
        };

        testDefine2 = function () {
            //Bug: win8: 313871
            var arr = [true, false, undefined, null];

            for (var i in arr) {
                var obj = arr[i];
                var Type = b.define(obj);
                LiveUnit.Assert.areEqual(undefined, Type);
            }
        };

        testDefineWithOnValidation = function () {

            var arr = [true, false, undefined, null];

            var old = WinJS.validation;
            WinJS.validation = true;
            try {
                for (var i in arr) {
                    var obj = arr[i];
                    var Type;
                    try {
                        Type = b.define(obj);
                        LiveUnit.Assert.areEqual(0, 1);
                    } catch (e) {
                        LiveUnit.Assert.areEqual("Unsupported data type", e.message);
                    }

                }
            } finally {
                WinJS.validation = old;
            }
        };

        testDefineWithBinding = function (complete) {
            var Type: any = b.define({ x: 0, f: function () { return this.x * 2; }, a: [1, 2, 3], str: "string" });
            var count = 0;
            var expected = 8;
            var instance = new Type();

            WinJS.Promise.timeout().then(function () {
                instance.bind("x", foo);
                instance.bind("a", foo);
                instance.bind("f", foo);
                instance.bind("str", foo);

                function foo() { count++; }


            }).then(post).then(post).then(function () {

                    instance.x = 10;

                    LiveUnit.Assert.areEqual(10, instance.x);

                    LiveUnit.Assert.isTrue(instance.a instanceof Array);
                    LiveUnit.Assert.areEqual(1, instance.a[0]);
                    LiveUnit.Assert.areEqual(2, instance.a[1]);
                    LiveUnit.Assert.areEqual(3, instance.a[2]);

                    LiveUnit.Assert.areEqual("function", typeof (instance.f));
                    LiveUnit.Assert.areEqual(20, instance.f());

                    instance.f = overridefunc;

                    function overridefunc() { return this.x * 3; }

                    LiveUnit.Assert.areEqual(30, instance.f());
                    instance.a = [4, 5, 6];
                    LiveUnit.Assert.areEqual(4, instance.a[0]);
                    LiveUnit.Assert.areEqual(5, instance.a[1]);
                    LiveUnit.Assert.areEqual(6, instance.a[2]);

                    instance.str = "test";

                }).then(post).then(post).then(function () {
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);
        };
        xtestReturnedFunctionInListener = function (complete) {
            //Bug: win8: 320028
            var count = 0;
            var expected = 2;
            var t = 0;
            var obj: any = b.as({ x: 1 });

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo);

                function foo(v) {

                    count++;
                    return { y: 1, then: foo2 };
                }
                function foo2() {
                    count++;
                }
            }).then(post).then(post)
                .then(function (v) {
                    LiveUnit.Assert.areEqual(v, 1);
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);

        };
        testReturnedPromiseFromUpdateFunction = function (complete) {
            var t: any = 1;
            var result = 1;
            var obj: any = b.as({ x: 1 });

            WinJS.Promise.timeout().then(function () {

                t = obj.updateProperty("y", 6);
                if (t === undefined)
                    t = false;
                else if (t.then === undefined)
                    t = false;

            }).then(post).then(post)
                .then(function (v) {
                    LiveUnit.Assert.isTrue(!!t);
                }).then(null, errorHandler).then(complete);

        };
        testBindingToAPropertyNotifiesOneListener = function (complete) {
            //BugID: 382949
            var count = 0;
            var expected = 3;
            var obj: any = b.as({ x: 1 });

            WinJS.Promise.timeout().then(function () {

                obj.bind("x", foo1);
                obj.bind("x", foo2);
                obj.bind("x", foo3);
                function foo1() {
                    count++;
                }
                function foo2() {
                    count++;
                }
                function foo3() {
                    count++;
                }
            }).then(post).then(post)
                .then(function (v) {
                    LiveUnit.Assert.areEqual(count, expected);
                }).then(null, errorHandler).then(complete);

        };
    };
}
LiveUnit.registerTestClass("CorsicaTests.BindingTests");