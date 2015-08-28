// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/WinJS.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
/// <reference path="../TestLib/Helper.ListView.ts" />
/// <reference path="../TestLib/Helper.ItemsManager.ts" />




module Tests {
    "use strict";

    var List = WinJS.Binding.List;
    var join = WinJS.Promise.join;

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

    function asyncSequence(workFunctions) {
        return workFunctions.reduce(function (p, work) {
            return WinJS.Promise.as(p).then(function () {
                return WinJS.Promise.as(work()).then(function () { return WinJS.Promise.timeout(); });
            });
        }, WinJS.Promise.as());
    }

    var seed = 0;
    function rand(nMax) {
        seed = (seed + 0.81282849124) * 2375.238208308;
        seed -= Math.floor(seed);

        return Math.floor(seed * nMax);
    }
    function resetSeed() {
        seed = 0;
    }
    function elementsAt(listItem, obj?) {
        var elements = [];
        if (obj) {
            for (var i in obj) {
                elements.push(listItem[i]);
            }
        }
        else {
            for (i in listItem) {
                elements.push(listItem[i]);
            }
        }
        return elements;
    }

    function walkDom(element, f) {
        f(element);
        if (element.children) {
            for (var i = 0, len = element.children.length; i < len; i++) {
                walkDom(element.children[i], f);
            }
        }
    }

    function verifyListView(listView, list, obj?) {
        var length = listViewLength(listView);
        for (var i = 0; i < length; i++) {
            var listViewElement = listView.winControl.elementFromIndex(i);
            var listViewElements = [];
            walkDom(listViewElement, function (el) {
                if (!el.children.length && el.textContent) {
                    listViewElements.push(el.textContent);
                }
            });
            var elementsAtList = elementsAt(list.getAt(i), obj);
            for (var j = 0; j < listViewElements.length; j++) {
                if (listViewElements[j] != elementsAtList[j]) {
                    return false;
                }
            }
            if (elementsAtList.length !== listViewElements.length) {
                return false;
            }

        }
        return length === list.length;
    }

    function valid(str) {
        for (var i = 0, len = str.length; i < len && len === 1; i++) {
            if (str.charAt(i) === '\r' || str.charAt(i) === '\n' || str.charAt(i) === ' ') {
                return false;
            }
        }
        return str.length !== 0;
    }
    function clear(arr) {
        var validArray = [];
        for (var i = 0; i < arr.length; i++) {
            if (valid(arr[i])) {
                validArray.push(arr[i]);
            }
        }
        return validArray;
    }
    function listViewLength(listView) {
        var count = 0;
        while (listView.winControl.elementFromIndex(count++));
        return (count === 0) ? 0 : count - 1;
    }
    function parent(element) {
        document.body.appendChild(element);
        element.cleanup = function () {
            WinJS.Utilities.disposeSubTree(element);
            document.body.removeChild(element);
        };
        return element;
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
            shift = rand(2) ? false : true;
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
    function createDataSource(dataSource, groupDataSource) {
        var holder: any = document.createElement("div");
        holder.msParentSelectorScope = true;
        holder.className = "dataSource";
        holder.dataSource = dataSource;
        holder.groupDataSource = groupDataSource;
        return holder;
    }
    function createTemplate() {
        var holder: any = document.createElement("div");
        holder.msParentSelectorScope = true;
        holder.id = "testTemplateWithListView";
        holder.innerHTML = "<div class='sampleTemplate' data-win-control='WinJS.Binding.Template' data-win-options='{enableRecycling:true}'>" +
        "<div class='sampleTitle item' data-win-bind='textContent:title'></div>" +
        "<div data-win-bind='textContent:detail'></div>" +
        " </div>";
        return holder;
    }
    function createGroupedListView() {
        var holder: any = document.createElement("div");
        holder.msParentSelectorScope = true;
        holder.cssText = "height:100%;width:100%;overflow:scroll";
        var listView = document.createElement("div");
        listView.className = "listViewExample";
        listView.setAttribute("data-win-control", "WinJS.UI.ListView ");
        listView.setAttribute("data-win-options", "{itemDataSource : select('.dataSource').dataSource , groupDataSource: select('.dataSource').groupDataSource, layout:{type:WinJS.UI.GridLayout}, itemTemplate: select('.sampleTemplate'), selectionMode:'single'} ");
        listView.style.height = "20000px";
        listView.style.width = "500px";
        holder.appendChild(listView);
        return holder;
    }
    function createListView() {
        var holder: any = document.createElement("div");
        holder.msParentSelectorScope = true;
        holder.cssText = "height:100%;width:100%;overflow:scroll";
        var listView = document.createElement("div");
        listView.className = "listViewExample";
        listView.setAttribute("data-win-control", "WinJS.UI.ListView ");
        listView.setAttribute("data-win-options", "{itemDataSource : select('.dataSource').dataSource , layout:{type:WinJS.UI.ListLayout}, itemTemplate: select('.sampleTemplate'), selectionMode:'single'} ");
        listView.style.height = "2000px";
        listView.style.width = "1000px";
        holder.appendChild(listView);
        return holder;
    }
    function createTestElements(listView, dataSource, groupDataSource?) {
        var holder: any = document.createElement("div");
        holder.appendChild(createDataSource(dataSource, groupDataSource));
        holder.appendChild(createTemplate());
        holder.appendChild(listView);
        return holder;
    }
    function getCount(listViewContent, search) {
        var index = listViewContent.indexOf(search);
        var count = 0;
        while (index >= 0 && index < listViewContent.length) {
            count++;
            index = listViewContent.indexOf(search, index + 1);
        }
        return count;
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

    export class ListViewIntegrationTestingWithBindingList {

        setUp() {
            WinJS.Application.start();
            Helper.initUnhandledErrors();
        }

        tearDown() {
            WinJS.Application.stop();
            Helper.cleanupUnhandledErrors();
        }
        
        testReversingListViewWithListBinding(complete) {
            //BugID:  629543
            var sampleDataSource = range(0, 20).map(function (i) { return { title: i, detail: "Javascript Toolkit_" + i }; });
            var list = new WinJS.Binding.List(sampleDataSource);

            var elements = parent(createTestElements(createListView(), list.dataSource));
            var listView = elements.querySelector(".listViewExample");

            WinJS.UI.processAll().
                then(Helper.ListView.waitForReady(listView)).
                then(function () {
                    list.reverse();
                    // listView.winControl.forceLayout();
                }).
                then(Helper.ListView.waitForReady(listView, 1000)).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyListView(listView, list), "checking the correctness of reversing a list");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        testSortingListViewWithListBinding(complete) {
            //BugID:  629543
            var sampleDataSource = []
            for (var i = 20; i > 0; i--) {
                var t = i;
                var d = "Javascript Toolkit_" + i;
                sampleDataSource.push({ title: t, detail: d });
            }

            var list = new WinJS.Binding.List(sampleDataSource);
            var elements = parent(createTestElements(createListView(), list.dataSource));
            var listView = elements.querySelector(".listViewExample");

            WinJS.UI.processAll().
                then(Helper.ListView.waitForReady(listView)).
                then(function () {
                    list.sort(function (l, r) { return l.title - r.title; });
                    // listView.winControl.forceLayout();
                }).
                then(Helper.ListView.waitForReady(listView, 1000)).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyListView(listView, list), "checking the correctness of sorting a list");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        testListViewWithEmptyFiltered(complete) {
            //BugID:  629543
            var sampleDataSource = [];

            var sorted = new WinJS.Binding.List(sampleDataSource);
            var list = sorted.createFiltered(function (num) { return num.title % 2 === 0 });
            var elements = parent(createTestElements(createListView(), list.dataSource));
            var listView = elements.querySelector(".listViewExample");


            WinJS.UI.processAll().
                then(Helper.ListView.waitForReady(listView)).
                then(function () {
                    list.push({ title: 1, detail: "first element" });
                    listView.winControl.forceLayout();
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyListView(listView, list), "verfying the listView filter empty insertion");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        testListViewWithOneElementAndThenDeletedAndThenAdded(complete) {
            //BugID:  629543
            var sampleDataSource = [{ title: 3, detail: "hello world" }];

            var sorted = new WinJS.Binding.List(sampleDataSource);
            var list = sorted.createFiltered(function (num) { return num.title % 2 === 0 });
            var elements = parent(createTestElements(createListView(), list.dataSource));
            var listView = elements.querySelector(".listViewExample");

            WinJS.UI.processAll().
                then(Helper.ListView.waitForReady(listView)).
                then(function () {
                    list.pop();
                }).
                then(Helper.ListView.waitForReady(listView)).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyListView(listView, list), "checking the correctness of popping the last element");
                    list.push({ title: 2, detail: "hello world2" });
                    listView.winControl.forceLayout();
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyListView(listView, list), "checking the correctness of pushing the first element");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        testListViewWithBindingEnabledInSortedList(complete) {
            //BugID:  629543
            var sampleDataSource = [];
            for (var i = 0; i < 20; i++) {
                var d = "Corsica_" + i;
                var t = i;
                sampleDataSource.push({ title: t, detail: d });
            }
            var list = new WinJS.Binding.List(sampleDataSource, { binding: true });
            var objToCompare = { title: 1, detail: "temp" };
            var elements = parent(createTestElements(createListView(), list.dataSource));
            var listView = elements.querySelector(".listViewExample");

            function assertListView(i) {
                return function () {
                    list.getAt(i).detail = list.getAt(i).detail + '_' + i;
                }
            }

            WinJS.UI.processAll().
                then(function () {
                    return asyncSequence(range(10, list.length).map(assertListView));
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyListView(listView, list, objToCompare), "checking the correctness of the listView after all Mutations are over");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        testBindingWithFiltered(complete) {
            //BugID:  629543
            var sampleDataSource = [];
            for (var i = 0; i < 20; i++) {
                var d = "Corsica_" + i;
                var t = i;
                sampleDataSource.push({ title: t, detail: d });
            }
            var objToCompare = { title: 1, detail: 1 };

            var sort = new WinJS.Binding.List(sampleDataSource, { binding: true });
            var list = sort.createFiltered(function (num) { return (num.title % 2 === 0); });
            var elements = parent(createTestElements(createListView(), list.dataSource));
            var listView = elements.querySelector(".listViewExample");

            function assertListView(i) {
                return function () {
                    if (list.getAt(i)) {
                        list.getAt(i).title = list.getAt(i).title + i + (i % 3);
                        list.notifyMutated(i);
                    }
                };
            }
            WinJS.UI.processAll().
                then(function () {
                    return asyncSequence(range(0, list.length).map(assertListView));
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyListView(listView, list, objToCompare), "checking the correctness of the listView after all Mutations are over");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        testBindingWithSorted(complete) {
            //BugID:  629543
            var sampleDataSource = [];

            var objToCompare = { title: 1, detail: 1 };
            for (var i = 0; i < 20; i++) {
                var d = "Corsica_" + i;
                var t = i;
                sampleDataSource.push({ title: t, detail: d });
            }

            var sort = new WinJS.Binding.List(sampleDataSource, { binding: true });
            var list = sort.createSorted(function (l, r) { return r.title - l.title; });
            var elements = parent(createTestElements(createListView(), list.dataSource));
            var listView = elements.querySelector(".listViewExample");

            function assertListView(i) {
                return function () {
                    list.getAt(i).title = list.getAt(i).title + i * 10;
                    list.notifyMutated(i);
                }
            }
            WinJS.UI.processAll().
                then(function () {
                    return asyncSequence(range(0, list.length).map(assertListView));
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyListView(listView, list, objToCompare), "checking the correctness of the listView after all Mutations are over");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        testGroupSorted(complete) {
            //BugID:  629543
            var sampleDataSource = range(0, 20).map(function (i) { return { title: i, detail: "Corsica_" + i }; });

            var sorted = new WinJS.Binding.List(sampleDataSource, { binding: true });
            var compare = function (num) { return (num.title % 2 === 0) ? "even" : "odd"; };
            var list = sorted.createGrouped(compare, compare);
            var elements = parent(createTestElements(createGroupedListView(), list.dataSource, list.groups.dataSource));
            var listView = elements.querySelector(".listViewExample");

            var waitForInitPost = function () {
                return WinJS.Promise.timeout(300);
            };
            // There has to be a better way to test this than waiting for 1s between edits...
            var itemUpdatePost = function (item) {
                return WinJS.Promise.timeout(1000).then(function () { return item; });
            };

            function assertListView(i) {
                return function () {
                    switch (rand(4)) {
                        case 0: spliceRandom(list); break;
                        case 1: moveRandom(list); break;
                        case 2: setAtRandom(list); break;
                        case 3: pushAndPopRandom(list, order, i); break;
                        default: throw "NYI";
                    }
                }
            }

            var order = [0, 1, 0, 0, 1, 1, 1, 0, 0, 0];
            WinJS.UI.processAll().
                then(waitForInitPost).
                then(function () {
                    return asyncSequence(range(0, 50).map(assertListView));
                }).
                then(itemUpdatePost).
                then(function () {
                    LiveUnit.Assert.areEqual(1, getCount(listView.textContent, "even"), "should be 1 even group");
                    LiveUnit.Assert.areEqual(1, getCount(listView.textContent, "odd"), "should be 1 odd group");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        // Issue #135
        xtestGroupSortedWithBinding(complete) {
            //BugID:  629543
            var sampleDataSource = [];

            var objToCompare = { title: 1, detail: 1 };

            function assertListView(i) {
                return function () {
                    list.getAt(i).title++;
                    list.notifyMutated(i);
                };
            }

            for (var i = 0; i < 20; i++) {
                var d = "Corsica_" + i;
                var t = i;
                sampleDataSource.push({ title: t, detail: d });
            }

            var sorted = new WinJS.Binding.List(sampleDataSource, { binding: true });
            var compare = function (num) { return (num.title % 2 === 0) ? "even" : "odd"; };
            var list = sorted.createGrouped(compare, compare);
            var elements = parent(createTestElements(createGroupedListView(), list.dataSource, list.groups.dataSource));
            var listView = elements.querySelector(".listViewExample");

            WinJS.UI.processAll().
                then(function () {
                    return asyncSequence(range(0, list.length).map(assertListView));
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyListView(listView, list, objToCompare), "checking the correctness of the listView after all Mutations are over");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        testListViewWithSortedProjectionSpecialCases(complete) {
            //BugID:  629543
            var sampleDataSource = [];
            for (var i = 0; i < 10; i++) {
                sampleDataSource.push({ title: i, detail: "hello world " + i });
            }

            var sorted = new WinJS.Binding.List(sampleDataSource);
            var list = sorted.createFiltered(function (num) { return num.title % 2 === 0 });

            var elements = parent(createTestElements(createListView(), list.dataSource));
            var listView = elements.querySelector(".listViewExample");

            function assertListView(i) {
                return function () {
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
                };
            }

            WinJS.UI.processAll().
                then(function () {
                    return asyncSequence(range(10, 16).map(assertListView));
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyListView(listView, list), "checking the correctness of the listView after all Mutations are over");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        testListViewWithListMutations(complete) {
            //BugID:  629543
            var sampleDataSource = [];
            for (var i = 0; i < 20; i++) {
                var t = "Corsica_" + i;
                var d = "Javascript Toolkit_" + i;
                sampleDataSource.push({ title: t, detail: d });
            }

            var list = new WinJS.Binding.List(sampleDataSource);
            var elements = parent(createTestElements(createListView(), list.dataSource));
            var listView = elements.querySelector(".listViewExample");

            var order = [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0];
            function assertListView(i) {
                return function () {
                    switch (rand(4)) {
                        case 0: spliceRandom(list); break;
                        case 1: moveRandom(list); break;
                        case 2: setAtRandom(list); break;
                        case 3: pushAndPopRandom(list, order, i); break;
                        default: throw "NYI";
                    }
                };
            }

            WinJS.UI.processAll().
                then(Helper.ListView.waitForReady(listView)).
                then(function () {
                    return asyncSequence(range(0, 20).map(assertListView));
                }).
                then(Helper.ListView.waitForReady(listView)).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyListView(listView, list), "checking the correctness of the listView after all Mutations are over");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        testListViewWithSortedListMutations(complete) {
            //BugID:  629543
            var sampleDataSource = [];

            for (var i = 0; i < 20; i++) {
                var t = "Corsica_" + i;
                var d = "Javascript Toolkit_" + i;
                sampleDataSource.push({ title: t, detail: d });
            }
            var sorted = new WinJS.Binding.List(sampleDataSource);
            var list = sorted.createSorted(function (l, r) { return r.title - l.title; });

            var elements = parent(createTestElements(createListView(), list.dataSource));
            var listView = elements.querySelector(".listViewExample");

            var order = [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0];
            function assertListView(i) {
                return function () {
                    switch (rand(4)) {
                        case 0: spliceRandom(list); break;
                        case 1: moveRandom(list); break;
                        case 2: setAtRandom(list); break;
                        case 3: pushAndPopRandom(list, order, i); break;
                        default: throw "NYI";
                    }
                };
            }

            WinJS.UI.processAll().
                then(Helper.ListView.waitForReady(listView)).
                then(function () {
                    return asyncSequence(range(0, 20).map(assertListView));
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyListView(listView, list), "checking the correctness of the listView after all Mutations are over");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        testListViewWithFilteredListMutation(complete) {
            //BugID:  629543
            var sampleDataSource = [];
            for (var i = 0; i < 20; i++) {
                var d = "Corsica_" + i;
                var t = i;
                sampleDataSource.push({ title: t, detail: d });
            }

            var sorted = new WinJS.Binding.List(sampleDataSource);
            var list = sorted.createFiltered(function (num) { return num.title % 2 === 0 });
            var elements = parent(createTestElements(createListView(), list.dataSource));
            var listView = elements.querySelector(".listViewExample");

            var order = [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0];
            function assertListView(i) {
                return function () {
                    switch (rand(4)) {
                        case 0: spliceRandom(list); break;
                        case 1: moveRandom(list); break;
                        case 2: setAtRandomSpecial(list); break;
                        case 3: pushAndPopRandom(list, order, i); break;
                        default: throw "NYI";
                    }
                }
            }

            WinJS.UI.processAll().
                then(function () {
                    return asyncSequence(range(0, 30).map(assertListView));
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function () {
                    LiveUnit.Assert.isTrue(verifyListView(listView, list), "checking the correctness of the listView after all Mutations are over");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        testListViewWithSpecialGroupSortedCases(complete) {
            //BugID:  629543
            var list = new WinJS.Binding.List(range(0, 20).map(function (i) { return { title: i, detail: "Corsica_" + i }; }));
            var groupKey = function (item) { return item.title % 2 === 0 ? "even" : "odd"; };
            var grouped = list.createGrouped(groupKey, groupKey);
            var elements = parent(createTestElements(createGroupedListView(), grouped.dataSource, grouped.groups.dataSource));
            var listView = elements.querySelector(".listViewExample");

            WinJS.UI.processAll().
                then(Helper.ListView.waitForReady(listView)).
                then(function () {
                    LiveUnit.Assert.areEqual(1, getCount(listView.textContent, "even"), "should be 1 even group");
                    LiveUnit.Assert.areEqual(1, getCount(listView.textContent, "odd"), "should be 1 odd group");
                    LiveUnit.Assert.areEqual(list.length, getCount(listView.textContent, "Corsica_"));
                    var odd: any = grouped.groups.getItem(1);
                    grouped.splice(odd.firstItemIndexHint, grouped.length - odd.firstItemIndexHint);
                    LiveUnit.Assert.areEqual(1, grouped.groups.length, "should now only be an even group");
                    LiveUnit.Assert.areEqual("even", grouped.groups.getAt(0));
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function () {
                    LiveUnit.Assert.areEqual(1, getCount(listView.textContent, "even"), "should be 1 even group");
                    LiveUnit.Assert.areEqual(0, getCount(listView.textContent, "odd"), "should be 0 odd groups");
                    LiveUnit.Assert.areEqual(list.length, getCount(listView.textContent, "Corsica_"));
                    return grouped.shift();
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function (item) {
                    LiveUnit.Assert.areEqual(1, getCount(listView.textContent, "even"), "should be 1 even group");
                    LiveUnit.Assert.areEqual(0, getCount(listView.textContent, "odd"), "should be 0 odd groups");
                    LiveUnit.Assert.areEqual(list.length, getCount(listView.textContent, "Corsica_"));
                    LiveUnit.Assert.areEqual(0, getCount(listView.textContent, item.detail), "removed item should not be in list view");
                    return grouped.pop();
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function (item) {
                    LiveUnit.Assert.areEqual(1, getCount(listView.textContent, "even"), "should be 1 even group");
                    LiveUnit.Assert.areEqual(0, getCount(listView.textContent, "odd"), "should be 0 odd groups");
                    LiveUnit.Assert.areEqual(list.length, getCount(listView.textContent, "Corsica_"));
                    LiveUnit.Assert.areEqual(0, getCount(listView.textContent, item.detail), "removed item should not be in list view");
                    var newItem = { title: 13, detail: "Added_13" };
                    grouped.push(newItem);
                    LiveUnit.Assert.areEqual(2, grouped.groups.length, "should now only be an even group");
                    LiveUnit.Assert.areEqual("even", grouped.groups.getAt(0));
                    LiveUnit.Assert.areEqual("odd", grouped.groups.getAt(1));
                    return newItem;
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function (item) {
                    LiveUnit.Assert.areEqual(1, getCount(listView.textContent, "even"), "should be 1 even group");
                    LiveUnit.Assert.areEqual(1, getCount(listView.textContent, "odd"), "should be 1 odd group");
                    LiveUnit.Assert.areEqual(list.length - 1, getCount(listView.textContent, "Corsica_"));
                    LiveUnit.Assert.areEqual(1, getCount(listView.textContent, item.detail), "added item should be in list view");
                    return grouped.shift();
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function (item) {
                    LiveUnit.Assert.areEqual(1, getCount(listView.textContent, "even"), "should be 1 even group");
                    LiveUnit.Assert.areEqual(1, getCount(listView.textContent, "odd"), "should be 1 odd group");
                    LiveUnit.Assert.areEqual(list.length - 1, getCount(listView.textContent, "Corsica_"));
                    LiveUnit.Assert.areEqual(1, getCount(listView.textContent, "Added_"));
                    LiveUnit.Assert.areEqual(0, getCount(listView.textContent, item.detail), "removed item should not be in list view");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }

        testListViewUsingGroupSortedWithMutations(complete) {
            //BugID:  629543
            var sampleDataSource = [];
            for (var i = 0; i < 20; i++) {
                var d = "Corsica_" + i;
                var t = i;
                sampleDataSource.push({ title: t, detail: d });
            }

            var sorted = new WinJS.Binding.List(sampleDataSource);
            var compare = function (num) { return (num.title % 2 === 0) ? "even" : "odd"; };
            var list = sorted.createGrouped(compare, compare);
            var elements = parent(createTestElements(createGroupedListView(), list.dataSource, list.groups.dataSource));
            var listView = elements.querySelector(".listViewExample");

            var order = [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0];

            function assertListView(i) {
                return function () {
                    switch (rand(4)) {
                        case 0: spliceRandom(list); break;
                        case 1: moveRandom(list); break;
                        case 2: setAtRandoms(); break;
                        case 3: pushAndPopRandom(list, order, i); break;
                        default: throw "NYI";
                    }
                };
            }
            WinJS.UI.processAll().
                then(Helper.ListView.waitForReady(listView)).
                then(function () {
                    listView.winControl.itemDataSource.beginEdits();
                    listView.winControl.groupDataSource.beginEdits();
                    return asyncSequence(range(0, 30).map(assertListView));
                }).
                then(function () {
                    listView.winControl.itemDataSource.endEdits();
                    listView.winControl.groupDataSource.endEdits();
                }).
                then(Helper.ListView.waitForReady(listView, -1)).
                then(function () {
                    var evenCount = getCount(listView.textContent, "even");
                    var oddCount = getCount(listView.textContent, "odd");
                    LiveUnit.Assert.areEqual(1, oddCount, "number of odd groups should be only 1");
                    LiveUnit.Assert.areEqual(1, evenCount, "number of even groups should be only 1");
                    LiveUnit.Assert.isTrue(verifyListView(listView, list), "checking the correctness of the listView after all Mutations are over");
                }).
                then(elements.cleanup).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);

            function setAtRandoms() {
                var target = rand(list.length);
                var oldElement = list.getAt(target);
                var newElement = {
                    title: list.getAt(target).title + 2,
                    detail: oldElement.title + " additional(" + target + ")"
                };
                list.setAt(target, newElement);
                list.notifyMutated(target);
            }

        }
        testAffectedRange(complete) {

            var rangeTester = {
                expectedRange: function (start, end) {
                    this.start = start;
                    this.end = end;
                    return new WinJS.Promise(function (complete) {
                        this.completePromise = complete;
                    }.bind(this));
                },
                verify: function (range) {
                    LiveUnit.Assert.areEqual(this.start, range.start);
                    LiveUnit.Assert.areEqual(this.end, range.end);
                    var that = this;
                    WinJS.Utilities._setImmediate(function () {
                        that.completePromise();
                    });
                }
            }

            var sampleDataSource: { title: any; detail?: string; group?: any }[] = range(0, 100).map(function (i) { return { title: i, detail: "Javascript Toolkit_" + i }; });
            var list = new WinJS.Binding.List(sampleDataSource);
            var dataSource = list.dataSource;
            var notificationHandler = { affectedRange: rangeTester.verify.bind(rangeTester) };
            var binding = dataSource.createListBinding(<any>notificationHandler);

            /* move from 0 to 10 -> insert at 5 */
            LiveUnit.LoggingCore.logComment("Test: move from 0 to 10 -> insert at 5");

            // Move from Index 0 to index 10
            list.move(0, 10); // [start = 0, end = 11;)
            // Insert an item at index 5
            list.splice(5, 0, {
                title: "N0",
                group: 0
            }); // [start = 0, end = 12)
            var testPromise = rangeTester.expectedRange(0, 12).then(function () {
                /* change at 98 -> remove from 50 */
                LiveUnit.LoggingCore.logComment("Test: change at 98 -> remove from 50");

                // Change Item at index 98.
                list.setAt(98, {
                    title: "N0",
                    group: 0
                }); // [start = 98, end = 99)

                // Remove item at index 50
                list.splice(50, 1); // [start = 50, end = 98)
                return rangeTester.expectedRange(50, 98);
            }).then(function () {
                    /* insert -> move -> insert -> change -> remove -> remove -> remove -> remove -> move -> change -> insert -> insert -> insert -> insert */
                    LiveUnit.LoggingCore.logComment("Test: batch of 'insert -> move -> insert -> change -> remove -> remove -> remove -> remove -> move -> change -> insert -> insert -> insert -> insert' operations");

                    // Insert item at index 89
                    list.splice(89, 0, {
                        title: "N0",
                        group: 0
                    }); // [start = 89, end = 90)

                    // Move item from index 90 to index 20
                    list.move(90, 20); // [start = 20, end = 90)

                    // Insert item at index 10
                    list.splice(10, 0, {
                        title: "N0",
                        group: 0
                    }); // [start = 10, end = 91)

                    // Change item at index 9
                    list.setAt(9, {
                        title: "N0",
                        group: 0
                    }); // [start = 9, end = 91)

                    // Remove 2 items from index 11
                    list.splice(11, 1) // [start = 9, end = 90)
                list.splice(11, 1) // [start = 9, end = 89)

                // Remove 2 items from index 6
                list.splice(6, 2) // [start = 6, end = 87)

                // Move item at index 7 to index 87
                list.move(7, 22) // [start = 6, end = 88)

                // Change item at index 66
                list.setAt(66, {
                        title: "N0",
                        group: 0
                    }); // [start = 6, end = 88)

                    // Insert item at index 7
                    list.splice(7, 0, {
                        title: "N0",
                        group: 0
                    }) // [start = 6, end = 89)

                // Insert item at index 6
                list.splice(6, 0, {
                        title: "N0",
                        group: 0
                    }) // [start = 6, end = 90)

                // Insert item at index 5
                list.splice(5, 0, {
                        title: "N0",
                        group: 0
                    }) // [start = 5, end = 91)

                // Insert item at index 90
                list.splice(90, 0, {
                        title: "N0",
                        group: 0
                    }) // [start = 5, end = 92)
                return rangeTester.expectedRange(5, 92);
                }).then(function () {
                    /* remove at index 33 */
                    LiveUnit.LoggingCore.logComment("Test: single remove at index 33");

                    list.splice(33, 1); // [start = 33, end = 33)
                    return rangeTester.expectedRange(33, 33);
                }).then(function () {
                    /* remove from the end */
                    LiveUnit.LoggingCore.logComment("Test: single remove from the end");
                    var end, start = end = list.length - 1;
                    list.splice(list.length - 1, 1); // [start = list.length - 1, end = list.length - 1)
                    return rangeTester.expectedRange(start, end);

                }).then(function () {
                    /* remove at index 0 */

                    LiveUnit.LoggingCore.logComment("Test: single remove from index 0");
                    list.splice(0, 1); // [start = 0, end = 0)
                    return rangeTester.expectedRange(0, 0);

                }).then(function () {
                    /* insert at 0 */

                    LiveUnit.LoggingCore.logComment("Test: single insert at index 0");
                    list.splice(0, 0, {
                        title: "N0",
                        group: 0
                    });// [start = 0, end = 1)
                    return rangeTester.expectedRange(0, 1);
                }).then(function () {
                    /* insert at end */

                    LiveUnit.LoggingCore.logComment("Test: single insert at the end");
                    var start = list.length;
                    var end = list.length + 1;
                    list.splice(list.length, 0, {
                        title: "N0",
                        group: 0
                    });// [start = list.length, end = list.length + 1)
                    return rangeTester.expectedRange(start, end);
                }).then(function () {
                    /* insert at index 44*/

                    LiveUnit.LoggingCore.logComment("Test: single insert at index 44");
                    list.splice(44, 0, {
                        title: "N0",
                        group: 0
                    });// [start = 44, end = 45)
                    return rangeTester.expectedRange(44, 45);
                }).then(function () {
                    /* change at index 60 */

                    LiveUnit.LoggingCore.logComment("Test: change at index 60");
                    list.setAt(60, {
                        title: "N0",
                        group: 0
                    }); // [start = 60, end = 61)
                    return rangeTester.expectedRange(60, 61);
                }).then(function () {
                    /* change at index 0 */

                    LiveUnit.LoggingCore.logComment("Test: change at index 0");
                    list.setAt(0, {
                        title: "N0",
                        group: 0
                    }); // [start = 0, end = 1)
                    return rangeTester.expectedRange(0, 1);
                }).then(function () {
                    /* change last index */

                    LiveUnit.LoggingCore.logComment("Test: change at last index");
                    var start = list.length - 1;
                    var end = list.length;
                    list.setAt(list.length - 1, {
                        title: "N0",
                        group: 0
                    }); // [start = list.length - 1, end = list.length)
                    return rangeTester.expectedRange(start, end);
                }).then(function () {
                    /* Move from first index to last index */

                    LiveUnit.LoggingCore.logComment("Test: move item from first index to last index");
                    var start = 0;
                    var end = list.length;
                    list.move(0, list.length - 1);// [start = 0, end = list.length)
                    return rangeTester.expectedRange(start, end);
                }).then(function () {
                    /* Move from last index to first index */

                    LiveUnit.LoggingCore.logComment("Test: move item from last index to first index");
                    list.move(list.length - 1, 0); // [start = 0, end = list.length)
                    return rangeTester.expectedRange(0, list.length);
                }).then(function () {
                    /* Move from last index to somewhere inside of the range. */
                    LiveUnit.LoggingCore.logComment("Test: move an item from last index to the middle of the current range");

                    // establish a range from 0 to 11;
                    list.move(0, 10); // [start = 0, end = 11)

                    // perform the test.
                    list.move(15, 5); // [start = 0, end = 16)
                    return rangeTester.expectedRange(0, 16);
                }).
                then(resetSeed).
                then(Helper.validateUnhandledErrorsOnIdle).
                done(complete);
        }
    }
    var disabledTestRegistry = {
        testListViewWithFilteredListMutation: Helper.BrowserCombos.allButIE10,
        testListViewWithSortedProjectionSpecialCases: [
            Helper.Browsers.chrome,
            Helper.Browsers.android,
            Helper.Browsers.safari,
			Helper.Browsers.firefox
        ]
    };
    Helper.disableTests(ListViewIntegrationTestingWithBindingList, disabledTestRegistry);

}
LiveUnit.registerTestClass("Tests.ListViewIntegrationTestingWithBindingList");
