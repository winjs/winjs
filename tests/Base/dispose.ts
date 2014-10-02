// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

interface HTMLElement {
    dispose();
}

module CorsicaTests {

    "use strict";

    var mockControl = function () {
        this.element = document.createElement("div");
        this.element.winControl = this;
    };

    function createNestedTree(root:HTMLElement, levels:number, children:number, disposeImpl?) {
        if (!disposeImpl) {
            disposeImpl = function () { };
        }

        WinJS.Utilities.markDisposable(root, disposeImpl.bind(root));
        if (levels == 1) return;

        for (var i = 0; i < children; i++) {
            var child = document.createElement("div");
            root.appendChild(child);
            createNestedTree(child, levels - 1, children, disposeImpl);
        }
    };

    function markDisposableOrder(root, callback) {
        var n = root;
        while (n) {
            // Find first left most leaf on a path which have not yet been visited
            if (n.firstChild && !n.v) {
                n.v = true; // Mark node as visited
                n = n.firstChild;
            }
            else {
                if (callback)
                    callback(n);
                //n.id = order++; // add id
                if (n == root)  // If n is root node, traversal is complete so break loop
                    break;
                // Else find next node
                if (n.nextSibling)
                    n = n.nextSibling;
                else
                    n = n.parentNode;
            }
        }
    }

    export class Dispose {

        testMarkDomElmntDisposable(complete) {
            var div = document.createElement("div");
            WinJS.Utilities.markDisposable(div, function () {
                document.body.removeChild(div);
                complete();
            });
            document.body.appendChild(div);
            div.dispose();
        }

        testMarkIframeDisposable(complete) {
            var iframe = document.createElement("iframe");
            WinJS.Utilities.markDisposable(iframe, function () {
                document.body.removeChild(iframe);
                complete();
            });
            document.body.appendChild(iframe);
            iframe.dispose();
        }

        testDisposeImplCalledBottomUp() {
            var root = document.createElement("div");
            var callOrder = [];
            var startId = 0;
            var levels = 6;
            var children = 2;

            createNestedTree(root, levels, children, function () {
                callOrder.push(this.id);
            });

            markDisposableOrder(root, function (e) {
                if (e.className.indexOf("win-disposable") >= 0) // mark if element is disposable
                    e.id = startId++;
            });

            root.dispose();

            //verify call order
            var count = 0;
            for (var i in callOrder) {
                if (count != i)
                    LiveUnit.Assert.areEqual(count, i, "dispose order is in correct for : " + root.innerHTML);
                else
                    count++;
            }
        }

        testDisposeCalledOnTreeWithRandomDispElmnts() {
            var root = document.createElement("div");
            var callOrder = [];
            var startId = 0;
            var levels = 4;
            var children = 2;

            createNestedTree(root, levels, children, function () {
                callOrder.push(this.id);
            });

            // unmark few elements as non disposable
            (<HTMLElement>root.querySelectorAll("div")[0]).removeAttribute("class");
            (<HTMLElement>root.querySelectorAll("div")[8]).removeAttribute("class");
            (<HTMLElement>root.querySelectorAll("div")[11]).removeAttribute("class");

            markDisposableOrder(root, function (e) {
                if (e.className.indexOf("win-disposable") >= 0) // mark if element is disposable
                    e.id = startId++;
            });

            root.dispose();

            //verify call order
            var count = 0;
            for (var i in callOrder) {
                if (count != i)
                    LiveUnit.Assert.areEqual(count, i, "dispose order is in correct for : " + root.innerHTML);
                else
                    count++;
            }

            if (count != (Math.pow(children, levels) - 1 - 3))
                LiveUnit.Assert.fail("Wrong number of dispose calls");
        }


        testMarkDisposableFulfillsPattern() {
            var div = document.createElement("div");
            var disposeImpl = function () { };
            WinJS.Utilities.markDisposable(div, disposeImpl);

            LiveUnit.Assert.isTrue(div.classList.contains("win-disposable"));
            LiveUnit.Assert.isTrue(div.dispose);
            LiveUnit.Assert.isTrue(div.dispose !== disposeImpl);

            div.dispose();
            div.dispose();
        }

        testDefaultDisposeDoesNotDoubleDispose() {
            var div = document.createElement("div");
            var disposed = false;
            WinJS.Utilities.markDisposable(div, function () {
                if (disposed)
                    LiveUnit.Assert.fail("Default dispose should not call disposeImpl on subsequent dispose calls.");

                disposed = true;
            });

            div.dispose();
            div.dispose();
        }

        testDisposeCallsEveryDisposeImpl() {
            var levels = 5;
            var children = 2;
            var total = Math.pow(children, levels) - 1;
            var calls = 0;

            var root = document.createElement("div");
            createNestedTree(root, levels, children, function () {
                calls++;
            });

            document.body.appendChild(root);
            WinJS.Utilities.disposeSubTree(root);
            LiveUnit.Assert.areEqual(total - 1, calls); // -1 because we are not calling on root node

            // call dispose again on root
            calls = 0;
            root.dispose();
            LiveUnit.Assert.areEqual(1, calls); // called once on root

            // call again on root
            calls = 0;
            root.dispose();
            LiveUnit.Assert.areEqual(0, calls); // called once on root
            document.body.removeChild(root);
        }

        testDisposeSubTreeDoesNotDisposeNestedDisposables() {
            var div = document.createElement("div");
            var child = document.createElement("div");
            var descendant = document.createElement("div");

            WinJS.Utilities.markDisposable(child);
            child.dispose = function () { };
            WinJS.Utilities.markDisposable(descendant, function () { LiveUnit.Assert.fail("Should not have been disposed!"); });

            child.appendChild(descendant);
            div.appendChild(child);

            WinJS.Utilities.disposeSubTree(div);
        }

        testSubsequentDisposeCallsDontCrash() {
            var root = document.createElement("div");
            createNestedTree(root, 5, 3);

            WinJS.Utilities.disposeSubTree(root);
            WinJS.Utilities.disposeSubTree(root);
        }

        testCallMarkDisposeMultipletimes() {
            var div = document.createElement("div");
            var called = 0;
            WinJS.Utilities.markDisposable(div, function () {
                LiveUnit.Assert.fail("This should get overwritten by second call");
            });
            WinJS.Utilities.markDisposable(div, function () {
                called++;
            });

            div.dispose();
            div.dispose();
            div.dispose();
            div.dispose();
            LiveUnit.Assert.areEqual(1, called);
            LiveUnit.Assert.areEqual("win-disposable", div.getAttribute("class")); //make sure only one "win-disposable" is added to class attribute
        }

        testMarkDisposableHandlesWinControlHostElements() {
            var control = new mockControl();

            var disposed = false;
            var dupeCall = false;

            WinJS.Utilities.markDisposable(control.element, function () {
                dupeCall = disposed;
                disposed = true;
            });

            LiveUnit.Assert.isTrue(control.dispose);
            LiveUnit.Assert.isFalse(control.element.dispose);

            control.dispose();

            LiveUnit.Assert.isTrue(disposed);
            LiveUnit.Assert.isFalse(dupeCall);

        }
    }

}

LiveUnit.registerTestClass("CorsicaTests.Dispose");