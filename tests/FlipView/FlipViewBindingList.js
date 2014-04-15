// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/base.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/ListView/Helpers.js" />
/// <reference path="../FlipView/FlipperHelpers.js"/>


var Tests = Tests || {};

(function (global, undefined) {
    "use strict";

    Tests.FlipViewIntegrationTestingWithBindingList = function () {

        var List = WinJS.Binding.List;
        var join = WinJS.Promise.join;

        function post(v) {
            return WinJS.Promise.timeout().
                then(function () { return v; });
        }
        function errorHandler(msg) {
            try {
                LiveUnit.Assert.fail('There was an unhandled error in your test: ' + msg);
            } catch (ex) { }
        }

        function range(l, h) {
            var res = [];
            for (; l < h; l++) {
                res.push(l);
            }
            return res;
        }

        var seed = 0;
        function rand(nMax) {
            seed = (seed + 0.81282849124) * 2375.238208308;
            seed -= Math.floor(seed);

            return Math.floor(seed * nMax);
        }

        function moveRandom(list) {
            var target = rand(list.length);
            var source = rand(list.length);
            list.move(source, target);
        }
        function spliceRandom(list) {
            var target = rand(list.length);
            var element = { title: target, detail: "New Item spliced at " + target };
            list.splice(target, 0, element);
        }
        function setAtRandom(list) {
            var target = rand(list.length);
            var oldElement = list.getAt(target);
            var newElement = {
                title: oldElement.title,
                detail: oldElement.title + " additional(" + target + ")"
            };
            list.setAt(target, newElement);
        }
        function unshiftAndShiftRandom(list, order, iteration) {
            iteration = iteration;
            var shift = true;
            if (order && order.length) {
                shift = order.pop() ? false : true;
            } else {
                shift = rand(2)  ? false : true;
            }
            if (shift && list.length) {
                var element = list.shift();
                
            } else {
                var newElement = {
                    title: iteration,
                    detail: "New element unshifted on, iteration: " + iteration 
                };
                list.unshift(newElement);
            }
        }
        function pushAndPopRandom(list, order, iteration) {
            iteration = iteration || 0;
            var pop = true;
            if (order && order.length) {
                pop = order.pop() ? false : true;
            } else {
                pop = rand(2) ? false : true;
            }
            if (pop && list.length) {
                list.pop();
            } else {
                var newElement = {
                    title: iteration,
                    detail: "New element pushed on, iteration: " + iteration.toString()
                };
                list.push(newElement);
            }
        }
        function setAtRandomSpecial(list) {
            var target = rand(list.length);
            var oldElement = list.getAt(target);
            var newElement = {
                title: list.getAt(target).title + 2,
                detail: oldElement.title + " additional(" + target + ")"

            };
            list.setAt(target, newElement);
            list.notifyMutated(target);
        }

        function resetSeed() {
            seed = 0;
        }
        function verifyFlipView(flipView, list, obj) {
            flipView = flipView.winControl;
            //var length = flipView.count()._value // for length
            var length = flipView._dataSource.getCount()._value;
            for(var i = 0; i < length; i++){
                var fvElement = flipView.itemDataSource.itemFromIndex(i)._value.data;
                var listElement = list.getAt(i);
                var objectShape = obj || listElement;
                
                for(var j in objectShape){
                    LiveUnit.Assert.areEqual(listElement[j], fvElement[j], "checking the correctness of the flipView element");
                    if (listElement[j] !== fvElement[j]){
                        return false;
                    }
                }
            }
            return list.length === length;
        }
        function parent(element) {
            document.body.appendChild(element);
            element.cleanup = function () { 
                WinJS.Utilities.disposeSubTree(element);
                document.body.removeChild(element); 
            };
            return element;
        }
        function createDataSource(dataSource) {
            var holder = document.createElement("div");
            holder.msParentSelectorScope = true;
            holder.className = "dataSource";
            holder.dataSource = dataSource;
            return holder;
        }
        function createTemplate() {
            var holder = document.createElement("div");
            holder.msParentSelectorScope = true;
            holder.id = "testTemplateWithFlipView";
            holder.innerHTML = '<div class="sampleTemplate" data-win-control="WinJS.Binding.Template" style="display: none">' +
                            '<div>' +
                                '<div data-win-bind="textContent: title"  ></div>' +
                                '<div data-win-bind="textContent: detail"></div>' +
                            '</div>' +
                    '</div>';
            return holder;
        }
        function createTemplateWithViewBox() {
            var holder = document.createElement("div");
            holder.msParentSelectorScope = true;
            holder.id = "testTemplateWithFlipView";
            holder.innerHTML = '<div class="sampleTemplate" data-win-control="WinJS.Binding.Template" style="display: none">' +
                            '<div data-win-control="WinJS.UI.ViewBox">' +
                                '<div style="width:25px;height:25px" class="viewBoxInstance">' +
                                    '<div data-win-bind="textContent: title"  ></div>' +
                                    '<div data-win-bind="textContent: detail"></div>' +
                                '</div>' +
                            '</div>' +
                    '</div>';
            return holder;
        }
        function createFlipView() {
            var holder = document.createElement("div");
            holder.msParentSelectorScope = true;
            holder.cssText = "height:50%;width:50%;overflow:scroll";
            var flipView = document.createElement("div");
            flipView.className = "flipViewExample";
            flipView.setAttribute("data-win-control", "WinJS.UI.FlipView ");
            flipView.setAttribute("data-win-options", "{itemDataSource : select('.dataSource').dataSource , layout:{type:WinJS.UI.ListLayout}, itemTemplate: select('.sampleTemplate') } ");
            flipView.style.height = "200px";
            flipView.style.width = "100px";
            holder.appendChild(flipView);
            return holder;
        }

        function createTestElements(dataSource, templateFactory) {
            templateFactory = templateFactory || createTemplate;
            var holder = document.createElement("div");
            holder.appendChild(createDataSource(dataSource));
            holder.appendChild(templateFactory());
            holder.appendChild(createFlipView());
            return holder;
        }

        WinJS.Promise.onerror = function (e) {
            var x = e;
        }     

        this.testFlipWithViewBox = function (complete) {
            var sampleDataSource = range(0, 20).map(function (i) { return { title: i, detail: "Javascript Toolkit_" + i }; });
            var list = new WinJS.Binding.List(sampleDataSource);

            var elements = parent(createTestElements(list.dataSource, createTemplateWithViewBox));
            var flipView = elements.querySelector(".flipViewExample");

            WinJS.UI.processAll().
                then(function () {
                    return waitForFlipViewReady(flipView);
                }).
                then(function () {
                    var views = elements.querySelectorAll(".viewBoxInstance");
                    for (var i = 0, len = views.length; i < len; i++) {
                        LiveUnit.Assert.areEqual("25px", views[i].style.height);
                        LiveUnit.Assert.areEqual("25px", views[i].style.width);
                        LiveUnit.Assert.areEqual("translate(0px, 50px) scale(4)", views[i].style[WinJS.Utilities._browserStyleEquivalents["transform"].scriptName]);
                        LiveUnit.Assert.areEqual("0px 0px", getComputedStyle(views[i])[WinJS.Utilities._browserStyleEquivalents["transform-origin"].scriptName]);
                    }
                }).
                then(null, errorHandler).
                then(elements.cleanup).
                then(resetSeed).
                then(complete);
        }

        this.testReversingAndSortingFlipView = function (complete) {
            var sampleDataSource = range(0, 20).map(function (i) { return { title: i, detail: "Javascript Toolkit_" + i }; });            
            var list = new WinJS.Binding.List(sampleDataSource);

            var elements = parent(createTestElements(list.dataSource));
            var flipView = elements.querySelector(".flipViewExample");
          
            WinJS.UI.processAll().
                then(post).
                then(function () {
                    list.reverse();
                    // listView.winControl.forceLayout();
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyFlipView(flipView, list), "checking the correctness of reverse");
                    list.sort(function (l, r){ return l.title - r.title; });
                    //listView.winControl.forceLayout();
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyFlipView(flipView, list), "check the correctness of sort");
                }).
                then(null, errorHandler).
                then(elements.cleanup).
                then(resetSeed).
                then(complete);
        }

        this.testFlipViewWithEmptyFiltered = function (complete) {

            var sampleDataSource = [];
            var sorted = new WinJS.Binding.List (sampleDataSource);
            var list = sorted.createFiltered(function (num){ return num.title % 2 === 0 });

            var elements = parent(createTestElements(list.dataSource));
            var flipView = elements.querySelector(".flipViewExample");

            WinJS.UI.processAll().
                then(post).
                then(function () {
                    list.push({ title: 1, detail: "first element" });
                    flipView.winControl.forceLayout();
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyFlipView(flipView, list), "verfying the flipView filter empty insertion");
                }).
                then(null, errorHandler).
                then(elements.cleanup).
                then(resetSeed).
                then(complete);
        }

        this.testFlipViewWithOneElementAndThenDeletedAndThenAdded = function (complete) {
            
            var sampleDataSource = [{ title: 3, detail: "hello world" }];
            var sorted = new WinJS.Binding.List (sampleDataSource);
            var list = sorted.createFiltered(function (num){ return num.title % 2 === 0 });

            var elements = parent(createTestElements(list.dataSource));
            var flipView = elements.querySelector(".flipViewExample");

            WinJS.UI.processAll().
                then(post).
                then(function () {
                    list.pop();
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyFlipView(flipView, list), "checking the correctness of popping the last element");
                    list.push({ title: 2, detail: "hello world2" });
                    flipView.winControl.forceLayout();
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyFlipView(flipView, list), "checking the correctness of pushing the first element");
                }).
                then(null, errorHandler).
                then(elements.cleanup).
                then(resetSeed).
                then(complete);
        }

        this.testFlipViewWithBindingEnabledInSortedList = function (complete) {
            var sampleDataSource = range(0, 20).map(function (i) { return { title: i, detail: "Corsica_" + i }; });

            var list = new WinJS.Binding.List (sampleDataSource, { binding: true });
            var objToCompare = { title: 1, detail: "temp" };

            var elements = parent(createTestElements(list.dataSource));
            var flipView = elements.querySelector(".flipViewExample");

            function assertFlipView(i) {
                return new WinJS.Promise(function (complete) {
                    setTimeout(function () {
                        list.getAt(i).detail = list.getAt(i).detail + '_' + i;
                        complete();
                    }, 100);
                });
            }

            WinJS.UI.processAll().
                then(function () {
                    return join(range(10, list.length).map(assertFlipView));
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyFlipView(flipView, list, objToCompare), "checking the correctness of the flipView after all Mutations are over");
                }).
                then(null, errorHandler).
                then(elements.cleanup).
                then(resetSeed).
                then(complete);
        }

        this.testFlipViewWithBindingAndFiltered = function (complete) {

            var sampleDataSource = range(0, 20).map(function (i) { return { title: i, detail: "Corsica_" + i }; });
            var objToCompare = { title: 1, detail: 1 };
         
            var sort = new WinJS.Binding.List (sampleDataSource, { binding: true });
            var list = sort.createFiltered(function (num){ return (num.title % 2 === 0); });

            var elements = parent(createTestElements(list.dataSource));
            var flipView = elements.querySelector(".flipViewExample");

            function assertFlipView(i) {
                return new WinJS.Promise(function (complete) {
                    setTimeout(function () {
                        if (list.getAt(i)) {
                            list.getAt(i).title = list.getAt(i).title + i + (i % 3);
                            list.notifyMutated(i);
                        }
                        complete();
                    }, i * 100);

                });
            }
            WinJS.UI.processAll().
                then(function () {
                    return join(range(0, list.length).map(assertFlipView));
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyFlipView(flipView, list, objToCompare), "checking the correctness of the flipView after all Mutations are over");
                }).
                then(null, errorHandler).
                then(elements.cleanup).
                then(resetSeed).
                then(complete);
        }

        this.testFlipViewWithBindingAndSorted = function (complete) {
            var sampleDataSource = range(0, 20).map(function (i) { return { title: i, detail: "Corsica_" + i }; });
            var objToCompare = { title: 1, detail: 1 };
            
            var sort = new WinJS.Binding.List (sampleDataSource, { binding: true });
            var list = sort.createSorted(function (l, r){ return l.title - r.title; });

            var elements = parent(createTestElements(list.dataSource));
            var flipView = elements.querySelector(".flipViewExample");

            function assertFlipView(i) {
                return new WinJS.Promise(function (complete) {
                    setTimeout(function () {
                        list.getAt(i).title = list.getAt(i).title + i * 10;
                        list.notifyMutated(i);
                        complete();
                    }, i * 100);
                });
            }
            WinJS.UI.processAll().
                then(function () {
                    return join(range(0, list.length).map(assertFlipView));
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyFlipView(flipView, list, objToCompare), "checking the correctness of the flipView after all Mutations are over");
                }).
                then(null, errorHandler).
                then(elements.cleanup).
                then(resetSeed).
                then(complete);
        }

        this.testFlipViewReplaceCurrentItem = function (complete) {
            var sampleDataSource = range(0, 3).map(function (i) { return { title: i, detail: "hello world " + i }; });

            var list = new WinJS.Binding.List(sampleDataSource);

            var elements = parent(createTestElements(list.dataSource));
            var flipView = elements.querySelector(".flipViewExample");

            WinJS.UI.processAll().
                then(function () {
                    return WinJS.Promise.timeout(100).then(function () {
                        list.pop();
                    });
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyFlipView(flipView, list), "checking the correctness of the flipView after all Mutations are over");
                }).
                then(null, errorHandler).
                then(elements.cleanup).
                then(resetSeed).
                then(complete);
        }

        this.testFlipViewWithSortedProjectionSpecialCases = function (complete) {
            var sampleDataSource = range(0, 10).map(function (i) { return { title: i, detail: "hello world " + i }; });

            var sorted = new WinJS.Binding.List (sampleDataSource);
            var list = sorted.createFiltered(function (num){ return num.title % 2 === 0 });

            var elements = parent(createTestElements(list.dataSource));
            var flipView = elements.querySelector(".flipViewExample");

            function assertFlipView(i) {
                return new WinJS.Promise(function (complete) {
                    setTimeout(function () {
                        if (i <= 11) {
                            sorted.push({ title: i, detail: "hello world " + i });
                        }
                        else if (i < 14) {
                            list.push({ title: i, detail: "hello world " + i });
                        }
                        else if (i == 14) {
                            sorted.length = 6;
                        }
                        else {
                            list.length = 2;
                        }

                        complete();
                    }, i * 100);
                });
            }

            WinJS.UI.processAll().
                then(function () {
                    return join(range(10, 16).map(assertFlipView));
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyFlipView(flipView, list), "checking the correctness of the flipView after all Mutations are over");
                }).
                then(null, errorHandler).
                then(elements.cleanup).
                then(resetSeed).
                then(complete);
        }

        this.testFlipViewWithListMutations = function (complete) {
            var sampleDataSource = range(0, 20).map(function (i) { return { title: "Corsica_" + i, detail: "Javascript Toolkit_" + i }; });

            var list = new WinJS.Binding.List (sampleDataSource);

            var elements = parent(createTestElements(list.dataSource));
            var flipView = elements.querySelector(".flipViewExample");

            var order = [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0];
            function assertFlipView(i) {
                return new WinJS.Promise(function (complete) {
                    setTimeout(function () {
                        switch (rand(4)) {
                            case 0: spliceRandom(list); break;
                            case 1: moveRandom(list); break;
                            case 2: setAtRandom(list); break;
                            case 3: pushAndPopRandom(list, order, i); break;
                            default: throw "NYI";
                        }
                        complete();
                    }, i * 100);
                });
            }

            WinJS.UI.processAll().
                then(post).
                then(function () {
                    return join(range(0, 20).map(assertFlipView));
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyFlipView(flipView, list), "checking the correctness of the flipView after all Mutations are over");
                }).
                then(null, errorHandler).
                then(elements.cleanup).
                then(resetSeed).
                then(complete);
        }

        this.testFlipViewWithSortedListMutations = function (complete) {
            var sampleDataSource = range(0, 20).map(function (i) { return { title: i, detail: "Corsica_" + i }; });

            var sorted = new WinJS.Binding.List (sampleDataSource);
            var list = sorted.createSorted(function (l, r){ return l.title - r.title; });

            var elements = parent(createTestElements(list.dataSource));
            var flipView = elements.querySelector(".flipViewExample");

            var order = [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0];
            function assertFlipView(i) {
                return new WinJS.Promise(function (complete) {
                    setTimeout(function () {
                        switch (rand(4)) {
                            case 0: spliceRandom(list); break;
                            case 1: moveRandom(list); break;
                            case 2: setAtRandom(list); break;
                            case 3: pushAndPopRandom(list, order, i); break;
                            default: throw "NYI";
                        }
                        complete();
                    }, i * 100);
                });
            }

            WinJS.UI.processAll().
                then(post).
                then(function () {
                    return join(range(0, 20).map(assertFlipView));
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyFlipView(flipView, list), "checking the correctness of the flipView after all Mutations are over");
                }).
                then(null, errorHandler).
                then(elements.cleanup).
                then(resetSeed).
                then(complete);
        }

        this.testFlipViewWithFilteredListMutation = function (complete) {
            var sampleDataSource = range(0, 20).map(function (i) { return { title: i, detail: "Corsica_" + i }; });

            var sorted = new WinJS.Binding.List (sampleDataSource);
            var list = sorted.createFiltered(function (num){ return num.title % 2 === 0 });

            var elements = parent(createTestElements(list.dataSource));
            var flipView = elements.querySelector(".flipViewExample");

            var order = [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0];
            function assertFlipView(i) {
                return new WinJS.Promise(function (complete) {
                    setTimeout(function () {
                        switch (rand(4)) {
                            case 0: spliceRandom(list); break;
                            case 1: moveRandom(list); break;
                            case 2: setAtRandomSpecial(list); break;
                            case 3: pushAndPopRandom(list, order, i); break;
                            default: throw "NYI";
                        }
                        complete();
                    }, i * 100)
                });
            }

            WinJS.UI.processAll().
                then(function () {
                    return join(range(0, 20).map(assertFlipView));
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyFlipView(flipView, list), "checking the correctness of the flipView after all Mutations are over");
                }).
                then(null, errorHandler).
                then(elements.cleanup).
                then(resetSeed).
                then(complete);
        }

        this.testFlipViewUsingGroupSortedWithMutations = function (complete) {
            var sampleDataSource = range(0, 20).map(function (i) { return { title: i, detail: "Corsica_" + i }; });

            var sorted = new WinJS.Binding.List (sampleDataSource);
            var compare = function (num){ return (num.title % 2 === 0) ? "even" : "odd"; };
            var list = sorted.createGrouped(compare, compare);

            var elements = parent(createTestElements(list.dataSource));
            var flipView = elements.querySelector(".flipViewExample");

            var order = [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0];

            function assertFlipView(i) {
                return new WinJS.Promise(function (complete) {
                    setTimeout(function () {

                        switch (rand(4)) {
                            case 0: spliceRandom(list); break;
                            case 1: moveRandom(list); break;
                            case 2: setAtRandom(list); break;
                            case 3: pushAndPopRandom(list, order, i); break;
                            default: throw "NYI";
                        }
                        complete();
                    }, i * 100);
                });
            }
            WinJS.UI.processAll().
                then(function () {
                    return join(range(0, 20).map(assertFlipView));
                }).
                then(post).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyFlipView(flipView, list), "checking the correctness of the flipView after all Mutations are over");
                }).
                then(null, errorHandler).
                then(elements.cleanup).
                then(resetSeed).
                then(complete);
        }
    }

    LiveUnit.registerTestClass("Tests.FlipViewIntegrationTestingWithBindingList");
}(this));
