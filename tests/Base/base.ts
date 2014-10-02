// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {
    "use strict";

    export class Base {

        testPatching() {
            var Test:any = {};
            WinJS.Namespace.defineWithParent(Test, "Foo.Bar", { x: function () { return 5; } });
            LiveUnit.Assert.areEqual(5, Test.Foo.Bar.x());
            Test.Foo.Bar.x = function () { return 10; };
            LiveUnit.Assert.areEqual(10, Test.Foo.Bar.x());
        }

        testEmptyNamespace() {
            var Test = {};
            WinJS.Namespace.defineWithParent(Test, "TestNamespace");
            LiveUnit.Assert.isTrue("TestNamespace" in Test);
        }

        testNamespaceDefine = function () {
            var Test:any = {};
            WinJS.Namespace.defineWithParent(Test, "TestNamespace", {
                foo: 33,
                bar: function () { return 42; }
            });

            LiveUnit.Assert.isTrue("TestNamespace" in Test);
            LiveUnit.Assert.isTrue("foo" in Test.TestNamespace);
            LiveUnit.Assert.areEqual(33, Test.TestNamespace.foo);

            LiveUnit.Assert.isTrue("bar" in Test.TestNamespace);
            LiveUnit.Assert.areEqual(42, Test.TestNamespace.bar());
        };

        testGlobalNamespaceDefine() {
            if ("TestNamespace" in window) {
                LiveUnit.Assert.isFalse(true, "Some other test left 'TestNamespace' defined on the Window object!");
            }

            try {

                WinJS.Namespace.define("TestNamespace", {
                    foo: 33,
                    bar: function () { return 42; }
                });
                var global: any = window;
                LiveUnit.Assert.isTrue("TestNamespace" in global);
                LiveUnit.Assert.isTrue("foo" in global.TestNamespace);
                LiveUnit.Assert.areEqual(33, global.TestNamespace.foo);

                LiveUnit.Assert.isTrue("bar" in global.TestNamespace);
                LiveUnit.Assert.areEqual(42, global.TestNamespace.bar());
            }
            finally {
                delete window["TestNamespace"];
            }
        }

        testNamespaceDoubleDefine() {
            var Test:any = {};

            WinJS.Namespace.defineWithParent(Test, "TestNamespace", {
                foo: 33,
                bar: function () { return 42; }
            });

            WinJS.Namespace.defineWithParent(Test, "TestNamespace", {
                baz: 99,
                qux: function () { return "xyzzy"; }
            });

            LiveUnit.Assert.isTrue("TestNamespace" in Test);
            LiveUnit.Assert.isTrue("foo" in Test.TestNamespace);
            LiveUnit.Assert.areEqual(33, Test.TestNamespace.foo);

            LiveUnit.Assert.isTrue("bar" in Test.TestNamespace);
            LiveUnit.Assert.areEqual(42, Test.TestNamespace.bar());


            LiveUnit.Assert.isTrue("baz" in Test.TestNamespace);
            LiveUnit.Assert.areEqual(99, Test.TestNamespace.baz);

            LiveUnit.Assert.isTrue("qux" in Test.TestNamespace);
            LiveUnit.Assert.areEqual("xyzzy", Test.TestNamespace.qux());

        }

        testDeepNamespaceDefine() {
            var Test:any = {};

            WinJS.Namespace.defineWithParent(Test, "a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t", {
                foo: 33,
                bar: function () { return 42; }
            });

            LiveUnit.Assert.areEqual(33, Test.a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.foo);
            LiveUnit.Assert.areEqual(42, Test.a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.bar());

        }

        testBigNamespaceDefine() {
            var Test:any = {};

            var members = {};

            for (var i = 0; i < 1000; i++) {
                members["foo" + i] = 42;
            }
            WinJS.Namespace.defineWithParent(Test, "TestNamespace", members);

            LiveUnit.Assert.isTrue("TestNamespace" in Test);

            LiveUnit.Assert.areEqual(1000, Object.getOwnPropertyNames(Test.TestNamespace).length);

            for (i = 0; i < 1000; i++) {
                LiveUnit.Assert.isTrue("foo" + i in Test.TestNamespace);
                LiveUnit.Assert.areEqual(42, Test.TestNamespace["foo" + i]);
            }
        }

        testNamespaceExtending() {
            var Test:any = {};

            var members;

            for (var i = 0; i < 1000; i = i + 2) {
                members = {};
                members["foo" + i] = i;
                members["foo" + (i + 1)] = (i + 1);
                WinJS.Namespace.defineWithParent(Test, "TestNamespace", members);
            }


            LiveUnit.Assert.isTrue("TestNamespace" in Test);

            LiveUnit.Assert.areEqual(1000, Object.getOwnPropertyNames(Test.TestNamespace).length);

            for (i = 0; i < 1000; i++) {
                LiveUnit.Assert.isTrue("foo" + i in Test.TestNamespace);
                LiveUnit.Assert.areEqual(i, Test.TestNamespace["foo" + i]);
            }
        }

        testClassDefine() {
            var testClass = WinJS.Class.define(null, {
                prop1: 10,
                func1: function () { return 42; }
            });

            LiveUnit.Assert.isTrue("prototype" in testClass);
            LiveUnit.Assert.isFalse("prop1" in testClass);
            LiveUnit.Assert.isFalse("func1" in testClass);

            var instance = new testClass();
            LiveUnit.Assert.isTrue("prop1" in instance);
            LiveUnit.Assert.isTrue("func1" in instance);

            LiveUnit.Assert.areEqual(10, instance.prop1);
            LiveUnit.Assert.areEqual(42, instance.func1());
        }

        testClassDefineWithStatics() {
            var testClass = WinJS.Class.define(null, {
                prop1: 10,
                func1: function () { return 42; }
            });
            testClass.static1 = 23;
            testClass.static2 = function () { return 32; };

            LiveUnit.Assert.isTrue("prototype" in testClass);
            LiveUnit.Assert.isTrue("static1" in testClass);
            LiveUnit.Assert.isTrue("static2" in testClass);

            LiveUnit.Assert.areEqual(23, testClass.static1);
            LiveUnit.Assert.areEqual(32, testClass.static2());

            var instance = new testClass();
            LiveUnit.Assert.isFalse("static1" in instance);
            LiveUnit.Assert.isFalse("static2" in instance);
        }

        testClassDefineWithConstructor() {
            var testClass = WinJS.Class.define(function (value) {
                this.prop1 = value;
                return this;
            }, {
                    prop1: 10,
                    func1: function () { return 42; }
                });

            LiveUnit.Assert.isTrue("prototype" in testClass);

            var instance = new testClass("hello");
            LiveUnit.Assert.areEqual("hello", instance.prop1);
        }

        testClassDefineWithFactoryPattern() {
            var testClass = WinJS.Class.define(function (value) {
                this.prop1 = value;
                return this;
            }, {
                    prop1: 10,
                    func1: function () { return 42; }
                });

            testClass.create = function (value) {
                return new testClass(value);
            };

            LiveUnit.Assert.isTrue("prototype" in testClass);

            var instance1 = new testClass("hello");
            LiveUnit.Assert.areEqual("hello", instance1.prop1);

            var instance2 = testClass.create("hello2");
            LiveUnit.Assert.areEqual("hello2", instance2.prop1);
        }

        testClassDefineWithConstructor2() {
            var testClass = WinJS.Class.define(function (value) {
                if (this === undefined) {
                    // 'this' is undefined in strict mode, as opposed to 'window'
                    return new testClass(value);
                }

                this.prop1 = value;
            }, {
                    prop1: 10,
                    func1: function () { return 42; }
                });

            var instance1 = new testClass("hello");
            LiveUnit.Assert.areEqual("hello", instance1.prop1);

            var instance2 = testClass("hello2");
            LiveUnit.Assert.areEqual("hello2", instance2.prop1);
        }

        testClassDefineWithNoMembers() {
            var testClass = WinJS.Class.define(null, null);

            var instance = new testClass();
            LiveUnit.Assert.isTrue(instance !== undefined);
        }

        testClassWithAllMemberTypes() {
            var testClass = WinJS.Class.define(function (val) { this.inctor = val; return this; },
                { ip1: "hi", im1: function () { return "bye"; } });
            testClass.sp1 = "static hi";
            testClass.sm1 = function () { return "static bye"; };

            LiveUnit.Assert.areEqual("static hi", testClass.sp1);
            LiveUnit.Assert.areEqual("static bye", testClass.sm1());

            var instance = new testClass("ctor");
            LiveUnit.Assert.areEqual(instance.ip1, "hi");
            LiveUnit.Assert.areEqual(instance.im1(), "bye");
            LiveUnit.Assert.areEqual(instance.inctor, "ctor");
        }

        testClassWithInheritance() {
            var baseClass = WinJS.Class.define(null, { prop1: "base" });
            var testClass = WinJS.Class.derive(baseClass, null, { prop2: "child" });

            var instance = new testClass();
            LiveUnit.Assert.areEqual("base", instance.prop1);
            LiveUnit.Assert.areEqual("child", instance.prop2);
        }

        testClassWithDeepInheritance() {
            var DEPTH = 20;
            var myClass = WinJS.Class.define(null, { a: "base" });

            for (var i = 0; i < DEPTH; i++) {
                var members = {};
                members["p" + i] = i;
                myClass = WinJS.Class.derive(myClass, null, members);
            }

            var instance = new myClass();
            LiveUnit.Assert.areEqual(instance.a, "base");
            LiveUnit.Assert.areEqual(instance.p5, 5);
            LiveUnit.Assert.areEqual(instance.p19, 19);

            var proto = Object.getPrototypeOf(instance);
            LiveUnit.Assert.isFalse(proto.hasOwnProperty("p5"));
            LiveUnit.Assert.isTrue(proto.hasOwnProperty("p19"));
        }

        testClassDefineWithPrivates() {
            var testClass = WinJS.Class.define(null, {
                _foo: "private!",
                foo: "public!",
            });

            var instance = new testClass();
            LiveUnit.Assert.areEqual("private!", instance._foo);
            LiveUnit.Assert.areEqual("public!", instance.foo);

            var desc1 = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(instance), "_foo");
            LiveUnit.Assert.isFalse(desc1.enumerable);
            var desc2 = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(instance), "foo");
            LiveUnit.Assert.isTrue(desc2.enumerable);
        }

        testClassDefineWithPartialAccessors() {
            var testClass = WinJS.Class.define(null, {
                prop1: {
                    get: function () { return this._prop1; },
                    set: function (v) { this._prop1 = v; }
                },
                prop2: {
                    get: function () { return 42; },
                },
                prop3: {
                    set: function (v) { this.prop1 = v; }
                }
            });

            var instance = new testClass();
            instance.prop1 = 1;
            LiveUnit.Assert.areEqual(1, instance.prop1);
            LiveUnit.Assert.areEqual(42, instance.prop2);

            instance.prop3 = 18;
            LiveUnit.Assert.areEqual(18, instance.prop1);
            LiveUnit.Assert.areEqual(undefined, instance.prop3);

            try {
                instance.prop2 = 10;
            }
            catch (e) {
                // can't assign to read-only properties in strict mode
            }
            finally {
                LiveUnit.Assert.areEqual(42, instance.prop2);
            }
        }

        testProperties() {
            var testClass = WinJS.Class.define(null, {
                prop1: 10,
                prop2: {
                    get: function () { return this.prop1; },
                    set: function (v) { this.prop1 = v; }
                }
            });

            var instance = new testClass();
            LiveUnit.Assert.areEqual(10, instance.prop1);
            LiveUnit.Assert.areEqual(10, instance.prop2);

            instance.prop2 = 32;
            LiveUnit.Assert.areEqual(32, instance.prop1);
            LiveUnit.Assert.areEqual(32, instance.prop2);
        }

        testAsyncTestCompletion(complete) {
            var i = 0;
            setTimeout(function () {
                i++;
                LiveUnit.Assert.areEqual(i, 1);
                complete();
            }, 1);
            LiveUnit.Assert.areEqual(i, 0);
        }

        testPropertyDefinition1() {

            var testClass = WinJS.Class.define(null, {
                _prop1: {
                    get: function () { return 10; },
                    set: function (v) { v = 10; }
                },
                prop2: {
                    get: function () { return this._prop1; },
                    set: function (v) { this._prop1 = v; }
                }
            });

            LiveUnit.Assert.areEqual(1, Object.keys(testClass.prototype).length);
            LiveUnit.Assert.areEqual("prop2", Object.keys(testClass.prototype)[0]);
            LiveUnit.Assert.areEqual(10, testClass.prototype._prop1);
            LiveUnit.Assert.areEqual(10, testClass.prototype.prop2);
        }

        testPropertyDefinition2() {

            var testClass = WinJS.Class.define(null, {
                _prop1: {
                    get: function () { return 10; },
                    set: function (v) { v = 10; },
                    enumerable: true
                },
                prop2: {
                    get: function () { return this._prop1; },
                    set: function (v) { this._prop1 = v; },
                    enumerable: false
                }
            });

            LiveUnit.Assert.areEqual(1, Object.keys(testClass.prototype).length);
            LiveUnit.Assert.areEqual("_prop1", Object.keys(testClass.prototype)[0]);
            LiveUnit.Assert.areEqual(10, testClass.prototype._prop1);
            LiveUnit.Assert.areEqual(10, testClass.prototype.prop2);
        }

        testNamespaceCaseSensitivity() {
            var Test:any = {};

            WinJS.Namespace.defineWithParent(Test, "TestNamespace.subnamespace", {
                foo: 33,
                bar: function () { return 42; }
            });

            WinJS.Namespace.defineWithParent(Test, "TestNamespace.subnamespace", {
                FOO: 99,
                BAR: function () { return 1764; }
            });

            WinJS.Namespace.defineWithParent(Test, "TestNamespace.SUBNAMESPACE", {
                baz: 99,
                qux: function () { return "xyzzy"; }
            });

            LiveUnit.Assert.isTrue("TestNamespace" in Test);
            LiveUnit.Assert.isTrue("subnamespace" in Test.TestNamespace);
            LiveUnit.Assert.isTrue("SUBNAMESPACE" in Test.TestNamespace);
            LiveUnit.Assert.isTrue("foo" in Test.TestNamespace.subnamespace);
            LiveUnit.Assert.areEqual(33, Test.TestNamespace.subnamespace.foo);

            LiveUnit.Assert.isTrue("bar" in Test.TestNamespace.subnamespace);
            LiveUnit.Assert.areEqual(42, Test.TestNamespace.subnamespace.bar());

            LiveUnit.Assert.isTrue("FOO" in Test.TestNamespace.subnamespace);
            LiveUnit.Assert.areEqual(99, Test.TestNamespace.subnamespace.FOO);

            LiveUnit.Assert.isTrue("BAR" in Test.TestNamespace.subnamespace);
            LiveUnit.Assert.areEqual(1764, Test.TestNamespace.subnamespace.BAR());


            LiveUnit.Assert.isTrue("baz" in Test.TestNamespace.SUBNAMESPACE);
            LiveUnit.Assert.areEqual(99, Test.TestNamespace.SUBNAMESPACE.baz);

            LiveUnit.Assert.isTrue("qux" in Test.TestNamespace.SUBNAMESPACE);
            LiveUnit.Assert.areEqual("xyzzy", Test.TestNamespace.SUBNAMESPACE.qux());

        }

        testNamespaceUnicodeDefine() {
            var Test:any = {};

            WinJS.Namespace.defineWithParent(Test, "TestNamespace.I", {
                foo: 1,
            });

            WinJS.Namespace.defineWithParent(Test, "TestNamespace.\u026a", {
                foo: 2,
            });

            // Define a namespace using a long unicode string
            WinJS.Namespace.defineWithParent(Test, "\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7Abcd123", {
                foo: 42
            });

            LiveUnit.Assert.isTrue("TestNamespace" in Test);
            LiveUnit.Assert.isTrue("I" in Test.TestNamespace);
            LiveUnit.Assert.isTrue("foo" in Test.TestNamespace.I);
            LiveUnit.Assert.areEqual(1, Test.TestNamespace.I.foo);

            LiveUnit.Assert.isTrue("\u026a" in Test.TestNamespace);
            LiveUnit.Assert.isTrue("foo" in Test.TestNamespace["\u026a"]);
            LiveUnit.Assert.areEqual(2, Test.TestNamespace["\u026a"].foo);

            // Test namespace using a long unicode string
            LiveUnit.Assert.isTrue("\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7Abcd123" in Test);
            LiveUnit.Assert.areEqual(42, Test["\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7\u624d\u80fd\u30bd\u042b\u2168\u84a4\u90f3\u0930\u094d\u0915\u094d\u0921\u094d\u0930\u093e\u00fc\u0131\u015f\u011f\u0130li\u064a\u0648\u0646\u064a\u0643\u0648\u062f\u00f6\u00c4\u00fc\u00df\u00a7Abcd123"].foo);

        }

        testNamespaceDelete() {
            var Test:any = {};
            WinJS.Namespace.defineWithParent(Test, "TestNamespace", {
                foo: 33,
                bar: function () { return 42; }
            });

            LiveUnit.Assert.isTrue("TestNamespace" in Test);

            var old = Test.TestNamespace;
            try {
                Test.TestNamespace = 42;
            }
            catch (e) {
                // can't assign to read-only properties in strict mode
            }
            finally {
                LiveUnit.Assert.areEqual(old, Test.TestNamespace, "Namespaces should be non-writable");
            }

            delete Test.TestNamespace;
            LiveUnit.Assert.isFalse("TestNamespace" in Test, "Namespaces should be configurable");
        }

        testExecuteAfterDomLoaded() {
            (<any>WinJS.Utilities.ready)._testReadyState = "loading";


            var callbackHit = false;
            var callback = function () {
                callbackHit = true;
            };

            var oldAddEventListener = window.addEventListener;


            window.addEventListener = function (name, func, capture) {
                LiveUnit.Assert.areEqual("DOMContentLoaded", name);
                LiveUnit.Assert.areEqual(false, capture);
                func();
            };

            try {
                WinJS.Utilities.ready(callback);
                LiveUnit.Assert.areEqual(true, callbackHit);
            }
            finally {
                delete (<any>WinJS.Utilities.ready)._testReadyState;
                window.addEventListener = oldAddEventListener;
            }
        }

        testSimpleDefine() {
            var ctorFn = function (v) { this.bar = v; };

            var testClass = WinJS.Class.define(ctorFn, {
                bar: 23,
                foo: function () { return this.bar; }
            });

            var obj = new testClass(42);
            LiveUnit.Assert.areEqual(42, obj.bar);
            LiveUnit.Assert.areEqual(42, obj.foo());
            LiveUnit.Assert.areEqual(ctorFn, obj.constructor);
        }

        testSimpleDefineNoCtor() {
            var testClass = WinJS.Class.define(null, {
                bar: 23,
                foo: function () { return this.bar; }
            });

            var obj = new testClass(42);
            LiveUnit.Assert.areEqual(23, obj.bar);
            LiveUnit.Assert.areEqual(23, obj.foo());
        }

        testDefineWithStatics() {
            var ctorFn = function (v) { this.bar = v; };

            var TestClass = WinJS.Class.define(
                ctorFn,
                {
                    bar: 23,
                    foo: function () { return this.bar; }
                },
                {
                    myStatic: 54
                }
                );

            var obj = new TestClass(42);
            LiveUnit.Assert.areEqual(42, obj.bar);
            LiveUnit.Assert.areEqual(42, obj.foo());
            LiveUnit.Assert.areEqual(ctorFn, obj.constructor);
            LiveUnit.Assert.areEqual(54, TestClass.myStatic);
            LiveUnit.Assert.areEqual(undefined, obj.myStatic);
        }

        testDeriveWithStatics() {
            var ctorFn = function (v) { this.bar = v; };
            var ctorFn2 = function (v) { this.bar = v; };

            var TestClass1 = WinJS.Class.define(ctorFn, {
                bar: 23,
                foo: function () { return this.bar; }
            });

            var TestClass2 = WinJS.Class.derive(TestClass1,
                ctorFn2,
                {
                    baz: 32
                },
                {
                    myStatic: 45
                }
                );


            var obj = new TestClass1(42);
            LiveUnit.Assert.isTrue(obj instanceof TestClass1);
            LiveUnit.Assert.isFalse(obj instanceof TestClass2);

            LiveUnit.Assert.areEqual(42, obj.bar);
            LiveUnit.Assert.areEqual(42, obj.foo());
            LiveUnit.Assert.areEqual(undefined, obj.baz);
            LiveUnit.Assert.areEqual(ctorFn, obj.constructor);

            var obj2 = new TestClass2(42);
            LiveUnit.Assert.isTrue(obj2 instanceof TestClass1);
            LiveUnit.Assert.isTrue(obj2 instanceof TestClass2);

            LiveUnit.Assert.areEqual(45, TestClass2.myStatic);
            LiveUnit.Assert.areEqual(undefined, obj2.myStatic);

            LiveUnit.Assert.areEqual(42, obj2.bar);
            LiveUnit.Assert.areEqual(42, obj2.foo());
            LiveUnit.Assert.areEqual(32, obj2.baz);
            LiveUnit.Assert.areEqual(ctorFn2, obj2.constructor);
        }

        testDerive() {
            var ctorFn = function (v) { this.bar = v; };
            var ctorFn2 = function (v) { this.bar = v; };

            var TestClass1 = WinJS.Class.define(ctorFn, {
                bar: 23,
                foo: function () { return this.bar; }
            });

            var TestClass2 = WinJS.Class.derive(TestClass1, ctorFn2, {
                baz: 32
            });

            var obj = new TestClass1(42);
            LiveUnit.Assert.isTrue(obj instanceof TestClass1);
            LiveUnit.Assert.isFalse(obj instanceof TestClass2);

            LiveUnit.Assert.areEqual(42, obj.bar);
            LiveUnit.Assert.areEqual(42, obj.foo());
            LiveUnit.Assert.areEqual(undefined, obj.baz);
            LiveUnit.Assert.areEqual(ctorFn, obj.constructor);

            var obj2 = new TestClass2(42);
            LiveUnit.Assert.isTrue(obj2 instanceof TestClass1);
            LiveUnit.Assert.isTrue(obj2 instanceof TestClass2);

            LiveUnit.Assert.areEqual(42, obj2.bar);
            LiveUnit.Assert.areEqual(42, obj2.foo());
            LiveUnit.Assert.areEqual(32, obj2.baz);
            LiveUnit.Assert.areEqual(ctorFn2, obj2.constructor);
        }

        testDeriveNoCtor() {
            var testClass1 = WinJS.Class.define(null, {
                bar: 23,
                foo: function () { return this.bar; }
            });

            var testClass2 = WinJS.Class.derive(testClass1, null, {
                baz: 32
            });

            var obj = new testClass2(42);
            LiveUnit.Assert.isTrue(obj instanceof testClass1);
            LiveUnit.Assert.isTrue(obj instanceof testClass2);

            LiveUnit.Assert.areEqual(23, obj.bar);
            LiveUnit.Assert.areEqual(23, obj.foo());
            LiveUnit.Assert.areEqual(32, obj.baz);
        }

        testMix() {
            var ctorFn = function (v) { this.bar = v; };

            var mixin1 = {
                bar: 23,
                foo: function () { return this.bar; }
            };

            var mixin2 = {
                bar2: 32
            };

            var mixin3 = {
                bar3: 43
            };

            var testClass = WinJS.Class.mix(ctorFn, mixin1, mixin2, mixin3);
            var obj = new testClass(42);

            LiveUnit.Assert.areEqual(42, obj.bar);
            LiveUnit.Assert.areEqual(42, obj.foo());
            LiveUnit.Assert.areEqual(32, obj.bar2);
            LiveUnit.Assert.areEqual(43, obj.bar3);
            LiveUnit.Assert.areEqual(ctorFn, obj.constructor);
        }

        testMix2() {
            var ctorFn = function (v) { this.bar = v; };

            var TestClass = WinJS.Class.define(ctorFn, {
                name: "Harry"
            });

            var mixin1 = {
                bar: 23,
                foo: function () { return this.bar; }
            };

            var mixin2 = {
                bar2: 32
            };

            var mixin3 = {
                bar3: 43
            };

            WinJS.Class.mix(TestClass, mixin1, mixin2);

            var obj = new TestClass(42);

            LiveUnit.Assert.areEqual("Harry", obj.name);
            LiveUnit.Assert.areEqual(42, obj.bar);
            LiveUnit.Assert.areEqual(42, obj.foo());
            LiveUnit.Assert.areEqual(32, obj.bar2);
            LiveUnit.Assert.areEqual(undefined, obj.bar3);
            LiveUnit.Assert.areEqual(ctorFn, obj.constructor);

            WinJS.Class.mix(TestClass, mixin3);

            LiveUnit.Assert.areEqual("Harry", obj.name);
            LiveUnit.Assert.areEqual(42, obj.bar);
            LiveUnit.Assert.areEqual(42, obj.foo());
            LiveUnit.Assert.areEqual(32, obj.bar2);
            LiveUnit.Assert.areEqual(43, obj.bar3);
            LiveUnit.Assert.areEqual(ctorFn, obj.constructor);
        }

        testValidation() {
            LiveUnit.Assert.areEqual(false, WinJS.validation);
            WinJS.validation = true;
            try {
                LiveUnit.Assert.areEqual(true, WinJS.validation);
            } finally {
                // Make sure to set this back
                WinJS.validation = false;
            }
        }
    }
}

LiveUnit.registerTestClass("CorsicaTests.Base");