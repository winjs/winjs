 // Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />


module Tests {
    "use strict";

        var List = <typeof WinJS.Binding.PrivateList>WinJS.Binding.List;

        var post = function post (v) {
            return WinJS.Utilities.Scheduler.schedulePromiseNormal().
                then(function () { return v; });
        };

        var errorHandler = function errorHandler (msg) {
            try {
                LiveUnit.Assert.fail('There was an unhandled error in your test: ' + msg);
            } catch (ex) { }
        };

        var assertSequenceEquals = function assertSequenceEquals (a, b) {
            LiveUnit.Assert.areEqual(a.length, b.length);
            var i, len;
            for (i = 0, len = a.length; i < len; i++) {
                LiveUnit.Assert.isTrue(a[i] === b[i], "Element at index '" + i + "' expected to be the same");
            }
        };

        // @TODO, currently assertSameAsList doesn't corectly handle sparse lists.
        //

        var ListListener = WinJS.Class.define(
            function ListListener(list, valueOf) {
                this._valueOf = valueOf || function (v) { return v; };
                this._notificationCounts = {
                    itemchanged: 0,
                    iteminserted: 0,
                    itemmoved: 0,
                    itemremoved: 0,
                    length: 0,
                    reload: 0
                };
                this._list = list;
                this._list.addEventListener("itemchanged", this._listItemChanged.bind(this));
                this._list.addEventListener("iteminserted", this._listItemInserted.bind(this));
                this._list.addEventListener("itemmoved", this._listItemMoved.bind(this));
                this._list.addEventListener("itemremoved", this._listItemRemoved.bind(this));
                this._list.addEventListener("reload", this._listReload.bind(this));
                this._initialize();

                this._list.bind("length", this._listLengthChanged.bind(this));
                this.assertLengthChangedCount(1);
            }, {
                _data: null,
                _keys: null,
                _lengthChangeCount: 0,
                _notificationCounts: null,

                _initialize: function () {
                    var data = [];
                    var keys = [];
                    var i, len;
                    for (i = 0, len = this._list.length; i < len; i++) {
                        var itemData, itemKey;
                        var item = this._list.getItem(i);
                        if (item) {
                            itemData = this._list.getAt(i);
                            itemKey = this._list._getKey(i);
                            LiveUnit.Assert.areEqual(itemKey, item.key);
                            LiveUnit.Assert.areEqual(itemKey, this._list.getItemFromKey(itemKey).key);
                            LiveUnit.Assert.isTrue(itemData === item.data);
                            LiveUnit.Assert.isTrue(itemData === this._list.getItemFromKey(itemKey).data);
                        }
                        data.push(itemData);
                        keys.push(itemKey);
                    }
                    this._data = data;
                    this._keys = keys;
                },
                _listLengthChanged: function (newValue) {
                    this.notificationCounts.length++;
                    this._lengthChangeCount++;
                    this._length = newValue;
                    LiveUnit.Assert.areEqual(this._data.length, this._length, "length notification should come after data has been updated");
                },
                _listItemChanged: function (event) {
                    this.notificationCounts.itemchanged++;
                    var key = event.detail.key;
                    var index = event.detail.index;
                    var oldValue = event.detail.oldValue;
                    var newValue = event.detail.newValue;
                    LiveUnit.Assert.isTrue(this._data[index] === oldValue, "The value we knew about for this index should be the same as the oldValue input to itemchanged");
                    if (this._keys[index] === undefined) {
                        // Sparse slots are indicated by having undefined keys
                        LiveUnit.Assert.fail("Filling sparse slots should look like a remove/add not a change");
                    }
                    LiveUnit.Assert.areEqual(this._keys[index], key, "The key we knew about for this index should be the same as the key input to itemchanged");
                    this._keys[index] = key;
                    this._data[index] = newValue;
                },
                _listItemInserted: function (event) {
                    this.notificationCounts.iteminserted++;
                    var key = event.detail.key;
                    var index = event.detail.index;
                    var value = event.detail.value;
                    // sparse slots are indicated by undefined keys
                    if (key !== undefined) {
                        LiveUnit.Assert.areEqual(-1, this._keys.indexOf(key), "The key for the new item should not already be in the collection in iteminserted");
                    }
                    if (index < this._data.length) {
                        this._data.splice(index, 0, value);
                        this._keys.splice(index, 0, key);
                    } else {
                        this._data[index] = value;
                        this._keys[index] = key;
                    }
                },
                _listItemMoved: function (event) {
                    this.notificationCounts.itemmoved++;
                    var key = event.detail.key;
                    var value = event.detail.value;
                    var oldIndex = event.detail.oldIndex;
                    var newIndex = event.detail.newIndex;
                    this._data.splice(oldIndex, 1);
                    this._keys.splice(oldIndex, 1);
                    this._data.splice(newIndex, 0, value);
                    this._keys.splice(newIndex, 0, key);
                },
                _listItemRemoved: function (event) {
                    this.notificationCounts.itemremoved++;
                    var key = event.detail.key;
                    var index = event.detail.index;
                    var value = event.detail.value;
                    // Sparse slots are indicated by having undefined keys
                    if (key !== undefined) {
                        LiveUnit.Assert.areEqual(this._keys.indexOf(key), index, "The known index of the key should be the same as the specified index for itemremoved");
                    }
                    LiveUnit.Assert.isTrue(this._data[index] === value, "The value we knew about for this index should be the same as the value to be removed in itemremoved");
                    this._data.splice(index, 1);
                    this._keys.splice(index, 1);
                },
                _listReload: function () {
                    this.notificationCounts.reload++;
                    this._initialize();
                },

                notificationCounts: {
                    get: function () { return this._notificationCounts; }
                },
                keys: {
                    get: function () { return this._keys; }
                },
                data: {
                    get: function () { return this._data; }
                },

                assertLengthChangedCount: function (expectedCount) {
                    LiveUnit.Assert.areEqual(expectedCount, this._lengthChangeCount, "Unexpected number of notifications for length changed");
                },
                assertSameAsArray: function (array) {
                    LiveUnit.Assert.areEqual(array.length, this.data.length);
                    var i, len;
                    for (i = 0, len = this.data.length; i < len; i++) {
                        LiveUnit.Assert.isTrue(this._valueOf(array[i]) === this._valueOf(this.data[i]), "Element '" + i + "' in ListListener [" + this.data.map(this._valueOf).join(",") + "] should be the same as the element in the array [" + array.map(this._valueOf).join(",") + "]");
                    }
                    this.assertSameAsList();
                },
                assertSameAsList: function () {
                    LiveUnit.Assert.areEqual(this.keys.length, this.data.length);
                    LiveUnit.Assert.areEqual(this._list.length, this.data.length);

                    var valueOf = this._valueOf;
                    var i, len;
                    for (i = 0, len = this.data.length; i < len; i++) {
                        var data = this.data[i];
                        var key = this.keys[i];
                        var item = this._list.getItem(i);
                        if (item) {
                            LiveUnit.Assert.areEqual(key, this._list._getKey(i));
                            LiveUnit.Assert.areEqual(key, item.key);
                            LiveUnit.Assert.areEqual(key, this._list.getItemFromKey(key).key);
                            LiveUnit.Assert.isTrue(valueOf(data) === valueOf(this._list.getAt(i)));
                            LiveUnit.Assert.isTrue(valueOf(data) === valueOf(item.data));
                            LiveUnit.Assert.isTrue(valueOf(data) === valueOf(this._list.getItemFromKey(key).data));
                        } else {
                            LiveUnit.Assert.areEqual(undefined, key);
                            LiveUnit.Assert.areEqual(key, this._list._getKey(i));
                            LiveUnit.Assert.areEqual(valueOf(undefined), valueOf(data));
                            LiveUnit.Assert.areEqual(valueOf(data), valueOf(this._list.getAt(i)));
                        }
                    }
                }
            }
            );

        function verifyListContent (list, arr, checked = false) {
            var listArray = list._getArray();
            LiveUnit.Assert.isTrue(listArray instanceof Array);
            for (var i = 0; i < list.length; i++) {
                if (checked) {

                    if (!list.getAt(i) !== !arr[i]) {
                        return false;
                    }
                    if (!listArray[i] !== !arr[i]) {
                        return false;
                    }
                }
                else {
                    if (list.getAt(i) !== arr[i]) {
                        return false;
                    }
                    if (listArray[i] !== arr[i]) {
                        return false;
                    }
                }
            }
            return list.length === arr.length;
        }

        function verifyBindableList (list, arr) {
            if (list.length !== arr.length) {
                return false;
            }
            for (var i = 0; i < arr.length; i++) {
                var obj = arr[i];
                var keys = Object.keys(obj);
                for (var j = 0; j < keys.length; j++) {
                    var elem = keys[j];
                    if (obj[elem] !== list.getAt(i)[elem]) {
                        return false;
                    }
                }
            }
            return true;
        }
        function checkArrayContent (arr1, arr2) {
            if (arr1.length !== arr2.length) {
                return false;
            }
            for (var i = 0; i < arr1.length; i++) {
                if (arr1[i] !== arr2[i]) {
                    return false;
                }
            }
            return true;
        }
        function createAnArrayOfObjects (n) {
            var arr = [];
            for (var i = 0; i < n ; i++) {
                arr[i] = createAnObject(i);
            }
            return arr;
        }
        function createAnObject (i) {
            var arr;
            if (i % 2 === 0) {
                arr = { a: i };
            }
            else {
                arr = { a: i, b: { c: i * 2 } };
            }
            return arr;
        }

    function verifySortedArr(sorted, arr) {

        for (var i = 0; i < arr.length; i++) {
            if (arr[i] !== sorted.getAt(i).a) {
                return false;
            }
        }
        return true;
    }
    function verifySorted(list, asc = false) {
        for (var i = 0; i < list.length - 1; i++) {
            if (asc) {
                if (list.getAt(i) > list.getAt(i + 1)) {
                    return false;
                }
            }
            else {
                if (list.getAt(i) < list.getAt(i + 1))
                    return false;
            }
        }
        return true;
    }

    function specialPrime(num) {
        num = Math.abs(num);
        if (num === 0 || num === 1) {
            return false;
        }
        for (var i = 2; i <= Math.sqrt(num); i++) {
            if (num % i === 0) {
                return false;
            }
        }
        return true;
    }

    function testWithDifferentOptions(testFunction) {
        var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];
        for (var i = 0; i < options.length; i++) {
            testFunction(options[i]);
        }
    }
        export class ListTest {

            testBasic() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                LiveUnit.Assert.areEqual(3, list.length);
                LiveUnit.Assert.areEqual(1, list.getAt(0));
                LiveUnit.Assert.areEqual(2, list.getAt(1));
                LiveUnit.Assert.areEqual(3, list.getAt(2));
                listener.assertSameAsArray([1, 2, 3]);
            }

            testListWithFalsyValue() {
                var list = new List([0]);
                LiveUnit.Assert.areEqual(0, list.getAt(0));
            }

            testPush() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(1);
                listener.assertSameAsArray([1]);
                list.push(2);
                listener.assertSameAsArray([1, 2]);
                list.push(3, 4);
                listener.assertSameAsArray([1, 2, 3, 4]);
                list.push();
                listener.assertSameAsArray([1, 2, 3, 4]);
                LiveUnit.Assert.areEqual(4, list.length);
            }

            testPop() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                LiveUnit.Assert.areEqual(3, list.pop());
                listener.assertSameAsArray([1, 2]);
                LiveUnit.Assert.areEqual(2, list.pop());
                listener.assertSameAsArray([1]);
                LiveUnit.Assert.areEqual(1, list.pop());
                listener.assertSameAsArray([]);
                LiveUnit.Assert.areEqual(0, list.length);
            }

            testUnshift() {
                var list = new List();
                var listener = new ListListener(list);
                list.unshift(1);
                listener.assertSameAsArray([1]);
                list.unshift(2);
                listener.assertSameAsArray([2, 1]);
                list.unshift(3, 4);
                listener.assertSameAsArray([3, 4, 2, 1]);
                list.unshift();
                listener.assertSameAsArray([3, 4, 2, 1]);
                LiveUnit.Assert.areEqual(4, list.length);
            }

            testShift() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                LiveUnit.Assert.areEqual(1, list.shift());
                listener.assertSameAsArray([2, 3]);
                LiveUnit.Assert.areEqual(2, list.shift());
                listener.assertSameAsArray([3]);
                LiveUnit.Assert.areEqual(3, list.shift());
                listener.assertSameAsArray([]);
                LiveUnit.Assert.areEqual(0, list.length);
            }

            testReverse() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                list.reverse();
                listener.assertSameAsArray([3, 2, 1]);
                list.reverse();
                listener.assertSameAsArray([1, 2, 3]);
                list.push(4);
                listener.assertSameAsArray([1, 2, 3, 4]);
                list.reverse();
                listener.assertSameAsArray([4, 3, 2, 1]);
            }

            testSort() {
                var list = new List<number>();
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                list.sort();
                listener.assertSameAsArray([1, 2, 3]);
                list.sort(function (l, r) { return r - l; });
                listener.assertSameAsArray([3, 2, 1]);
                list.push(5);
                listener.assertSameAsArray([3, 2, 1, 5]);
                list.sort(function (l, r) { return l - r; });
                listener.assertSameAsArray([1, 2, 3, 5]);
                list.sort(function (l, r) { return r - l; });
                listener.assertSameAsArray([5, 3, 2, 1]);
                var l = list.sort();
                LiveUnit.Assert.areEqual(l, list);
                listener.assertSameAsArray([1, 2, 3, 5]);
            }

            testSplice() {
                var list = new List();
                var listener = new ListListener(list);
                list.splice(0, 0, 1);
                listener.assertSameAsArray([1]);
                list.splice(0, 0, 2, 3, 4);
                listener.assertSameAsArray([2, 3, 4, 1]);
                list.splice(1, 0, 5, 6);
                listener.assertSameAsArray([2, 5, 6, 3, 4, 1]);
                list.splice(1, 2, 7, 8);
                listener.assertSameAsArray([2, 7, 8, 3, 4, 1]);
                list.splice(10, 0, 9, 10);
                listener.assertSameAsArray([2, 7, 8, 3, 4, 1, 9, 10]);
            }

            testConcat() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                var result = list.concat([4, 5]);
                assertSequenceEquals([1, 2, 3, 4, 5], result);
                assertSequenceEquals([1, 2, 3], list.concat());
                listener.assertSameAsArray([1, 2, 3]);
                list.pop();
                list.pop();
                list.pop();
                listener.assertSameAsArray([]);
                var result2 = list.concat([6, 7]);
                assertSequenceEquals([6, 7], result2);
                assertSequenceEquals([], list.concat());
            }

            testJoin() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                LiveUnit.Assert.areEqual("1,2,3", list.join(","));
                LiveUnit.Assert.areEqual("1, 2, 3", list.join(", "));
                LiveUnit.Assert.areEqual("1,2,3", list.join());
                LiveUnit.Assert.areEqual("11213", list.join("1"));
                LiveUnit.Assert.areEqual("1---2---3", list.join("---"));
                list.length = 0;
                listener.assertSameAsArray([]);
                LiveUnit.Assert.areEqual("", list.join(","));
                LiveUnit.Assert.areEqual("", list.join());
                LiveUnit.Assert.areEqual("", list.join("1"));
                LiveUnit.Assert.areEqual("", list.join("---"));
            }

            testSlice() {
                var list = new List();
                var listener = new ListListener(list);
                assertSequenceEquals([], list.slice(-1));
                assertSequenceEquals([], list.slice(0));
                assertSequenceEquals([], list.slice(1));
                list.push(1, 2);
                listener.assertSameAsArray([1, 2]);
                assertSequenceEquals([2], list.slice(-1));
                assertSequenceEquals([1, 2], list.slice(0));
                assertSequenceEquals([2], list.slice(1));
                list.push(3);
                listener.assertSameAsArray([1, 2, 3]);
                assertSequenceEquals([3], list.slice(-1));
                assertSequenceEquals([1, 2, 3], list.slice(0));
                assertSequenceEquals([2, 3], list.slice(1));
                assertSequenceEquals([], list.slice(-1, 2));
                assertSequenceEquals([2], list.slice(-2, -1));
                assertSequenceEquals([], list.slice(-2, -2));
                assertSequenceEquals([], list.slice(-2, -3));
                assertSequenceEquals([], list.slice(-6, -8));
                assertSequenceEquals([1, 2], list.slice(0, 2));
                assertSequenceEquals([2], list.slice(1, 2));
            }

            testIndexOf() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                LiveUnit.Assert.areEqual(1, list.indexOf(2));
                LiveUnit.Assert.areEqual(-1, list.indexOf(5));
                LiveUnit.Assert.areEqual(-1, list.indexOf(2, 2));
                LiveUnit.Assert.areEqual(-1, list.indexOf(2, -1));
                LiveUnit.Assert.areEqual(1, list.indexOf(2, -2));
                list.push(2);
                LiveUnit.Assert.areEqual(1, list.indexOf(2));
                LiveUnit.Assert.areEqual(-1, list.indexOf(5));
                LiveUnit.Assert.areEqual(3, list.indexOf(2, 2));
            }

            testIndexOfKeyWhereRequestedKeyIsNextKeyToBeAssigned() {
                var list = new List([0, 1, 2, 3, 4]);
                LiveUnit.Assert.areEqual(-1, list.indexOfKey("5"));
                LiveUnit.Assert.areEqual(-1, list.indexOfKey("6")); //key that does not exist
            }

            testLastIndexOf() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                LiveUnit.Assert.areEqual(1, list.lastIndexOf(2));
                LiveUnit.Assert.areEqual(-1, list.lastIndexOf(5));
                LiveUnit.Assert.areEqual(-1, list.lastIndexOf(2, 0));
                LiveUnit.Assert.areEqual(1, list.lastIndexOf(2, -1));
                LiveUnit.Assert.areEqual(1, list.lastIndexOf(2, -2));
                LiveUnit.Assert.areEqual(-1, list.lastIndexOf(2, -3));
                list.push(2);
                LiveUnit.Assert.areEqual(3, list.lastIndexOf(2));
                LiveUnit.Assert.areEqual(-1, list.lastIndexOf(5));
                LiveUnit.Assert.areEqual(1, list.lastIndexOf(2, 2));
            }

            testForEach() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                var a = [1, 2, 3]
                listener.assertSameAsArray(a);
                var pos = 0;
                list.forEach(function (item, index) {
                    LiveUnit.Assert.areEqual(pos, index);
                    LiveUnit.Assert.areEqual(a[index], item);
                    LiveUnit.Assert.areEqual(a[index], list.getAt(index));
                    pos++;
                });
                LiveUnit.Assert.areEqual(pos, a.length);
                list.setAt(3, 10);
                a = [1, 2, 3, 10];
                // With a sparse array we don't get called for all the empty slots
                var count = 0;
                list.forEach(function (item, index) {
                    count++;
                    LiveUnit.Assert.areEqual(a[index], item);
                    LiveUnit.Assert.areEqual(a[index], list.getAt(index));
                });
                LiveUnit.Assert.areEqual(count, 4);
            }

            // @TODO, test that the thisObject parameter is used correctly
            // @TODO, test that the callback arguments are passed correctly
            testEvery() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(1, 2);
                listener.assertSameAsArray([1, 2]);
                LiveUnit.Assert.isTrue(list.every(function (item) { return typeof item === "number"; }));
                list.push(3);
                listener.assertSameAsArray([1, 2, 3]);
                LiveUnit.Assert.isTrue(list.every(function (item) { return typeof item === "number"; }));
                list.setAt(3, 7);
                listener.assertSameAsArray([1, 2, 3, 7]);
                var count = 0;
                LiveUnit.Assert.isTrue(list.every(function (item) { count++; return typeof item === "number"; }));
                LiveUnit.Assert.areEqual(4, count);
                list.length = 0;
                listener.assertSameAsArray([]);
                LiveUnit.Assert.isTrue(list.every(function (item) { return typeof item === "number"; }));
                list.push("hello");
                listener.assertSameAsArray(["hello"]);
                LiveUnit.Assert.isFalse(list.every(function (item) { return typeof item === "number"; }));
                list.push(7);
                listener.assertSameAsArray(["hello", 7]);
                LiveUnit.Assert.isFalse(list.every(function (item) { return typeof item === "number"; }));
            }

            // @TODO, test map
            testMap() {
                var list = new List<number>();
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                var result = list.map(function (item) { return item * 2; });
                assertSequenceEquals([2, 4, 6], result);
            }

            // @TODO, test that the thisObject parameter is used correctly
            // @TODO, test that the callback arguments are passed correctly
            testSome() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(1, 2);
                listener.assertSameAsArray([1, 2]);
                LiveUnit.Assert.isTrue(list.some(function (item) { return typeof item === "number"; }));
                list.push(3);
                listener.assertSameAsArray([1, 2, 3]);
                LiveUnit.Assert.isTrue(list.some(function (item) { return typeof item === "number"; }));
                list.pop();
                list.pop();
                list.pop();
                listener.assertSameAsArray([]);
                LiveUnit.Assert.isFalse(list.some(function (item) { return typeof item === "number"; }));
                list.push("hello");
                listener.assertSameAsArray(["hello"]);
                LiveUnit.Assert.isFalse(list.some(function (item) { return typeof item === "number"; }));
                list.setAt(1, 7);
                listener.assertSameAsArray(["hello", 7]);
                var count = 0;
                LiveUnit.Assert.isTrue(list.some(function (item) { count++; return typeof item === "number"; }));
                LiveUnit.Assert.areEqual(2, count);
            }

            testReduce() {
                var list = new List();
                var listener = new ListListener(list);
                list.push("Hello ", "my ", "friend ");
                listener.assertSameAsArray(["Hello ", "my ", "friend "]);
                LiveUnit.Assert.areEqual("Hello my friend ", list.reduce(function (n, m) { return n + m; }, ""));
            }

            testReduceRight() {
                var list = new List();
                var listener = new ListListener(list);
                list.push("Hello ", "my ", "friend ");
                listener.assertSameAsArray(["Hello ", "my ", "friend "]);
                LiveUnit.Assert.areEqual("friend my Hello ", list.reduceRight(function (n, m) { return n + m; }, ""));
            }

            testLength() {
                var list = new List();
                var listener = new ListListener(list);
                // You can set the length property to truncate an array at any time. When you extend an array by
                // changing its length property, the number of actual elements does not increase; for example,
                // if you set length to 3 when it is currently 2, the array still contains only 2 elements.
                list.length = 12;
                LiveUnit.Assert.areEqual(0, list.length);
                var count = 0;
                list.forEach(function () { count++; });
                LiveUnit.Assert.areEqual(0, count);
                list.length = 0;
                LiveUnit.Assert.areEqual(0, list.length);
                // Note that the ListListener doesn't work perfectly against sparse arrays and the reason is that the
                // List doesn't communicate things like length change, it communicates element addition/modification/removal
                // which should be enough information to be faithful except when there are trailing empty slots in the array
                listener.assertSameAsArray([]);
                list.push(1, 2, 3);
                LiveUnit.Assert.areEqual(3, list.length);
                listener.assertSameAsArray([1, 2, 3]);
                list.length = 10;
                LiveUnit.Assert.areEqual(3, list.length);
                list.length = 1;
                LiveUnit.Assert.areEqual(1, list.length);
                listener.assertSameAsArray([1]);
            }

            testSet() {
                var list = new List();
                var listener = new ListListener(list);
                list.setAt(0, 1);
                listener.assertSameAsArray([1]);
                list.setAt(1, 2);
                listener.assertSameAsArray([1, 2]);
                list.setAt(0, 3);
                listener.assertSameAsArray([3, 2]);
                list.setAt(2, 4);
                listener.assertSameAsArray([3, 2, 4]);
                list.setAt(3, 5);
                listener.assertSameAsArray([3, 2, 4, 5]);
                list.setAt(2, 6);
                listener.assertSameAsArray([3, 2, 6, 5]);
            }

            testMove() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                list.move(0, 1);
                listener.assertSameAsArray([2, 1, 3]);
            }

            testInitializeWithData() {
                var list = new List([1, 2, 3]);
                var listener = new ListListener(list);
                listener.assertSameAsArray([1, 2, 3]);
                list.push(4);
                listener.assertSameAsArray([1, 2, 3, 4]);
                list.setAt(0, 5);
                listener.assertSameAsArray([5, 2, 3, 4]);
            }
            testListBaseGetKey() {
                var options = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [0, 1, 2, 3, 4];
                    var list = new List(arr, options[i]);

                    LiveUnit.Assert.areEqual("0", list._getKey(0), "making sure we are getting the correct element");
                    LiveUnit.Assert.areEqual("1", list._getKey(1), "making sure we are getting the correct element");
                    LiveUnit.Assert.areEqual("2", list._getKey(2), "making sure we are getting the correct element");
                    LiveUnit.Assert.areEqual("3", list._getKey(3), "making sure we are getting the correct element");
                    LiveUnit.Assert.areEqual("4", list._getKey(4), "making sure we are getting the correct element");
                    LiveUnit.Assert.areEqual(undefined, list._getKey(5), "making sure we are getting the correct element");


                    list.move(0, 3);  //[ 1, 2, 3, 0, 4]
                    list.move(1, 3);  //[ 1, 3, 0, 2, 4]
                    list.move(4, 0);  //[ 4, 1, 3, 0, 2]

                    LiveUnit.Assert.areEqual("4", list._getKey(0), "making sure we are getting the correct element after move");
                    LiveUnit.Assert.areEqual("1", list._getKey(1), "making sure we are getting the correct element after move");
                    LiveUnit.Assert.areEqual("3", list._getKey(2), "making sure we are getting the correct element after move");
                    LiveUnit.Assert.areEqual("0", list._getKey(3), "making sure we are getting the correct element after move");
                    LiveUnit.Assert.areEqual("2", list._getKey(4), "making sure we are getting the correct element after move");


                    list.length = 10;
                    list.push(10);
                    list.move(0, 4);  //[1, 3, 0, 2, 4, 10]
                    LiveUnit.Assert.areEqual("1", list._getKey(0), "making sure we are getting the correct element after move");
                    LiveUnit.Assert.areEqual("4", list._getKey(4), "making sure we are getting the correct element after move");

                }
            }

            testListBaseGetFromKey() {
                var options = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [1, 2, undefined, 3, 4, 5];
                    var list = new List(arr, options[i]);

                    var check = function () {
                        LiveUnit.Assert.areEqual(1, list._getFromKey("0"), "making sure we are getting the correct element");
                        LiveUnit.Assert.areEqual(2, list._getFromKey("1"), "making sure we are getting the correct element");
                        LiveUnit.Assert.areEqual(undefined, list._getFromKey("2"), "making sure we are getting the correct element");
                        LiveUnit.Assert.areEqual(3, list._getFromKey("3"), "making sure we are getting the correct element");
                        LiveUnit.Assert.areEqual(4, list._getFromKey("4"), "making sure we are getting the correct element");
                        LiveUnit.Assert.areEqual(5, list._getFromKey("5"), "making sure we are getting the correct element");

                    }
                    check();
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr), "making sure that the list content did not change");

                    list.sort(function (l, r) { return r - l; });
                    check();

                }
            }
            testSparseArrayIsNotSupported() {
                var arr = [-1, 20, "string", , , 3, 10, 5, 1];
                var options:any = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];

                var expected = [-1, 20, "string", 3, 10, 5, 1];
                for (var i = 0; i < options.length; i++) {
                    try {
                        var list = new List(arr, options[i]);
                        LiveUnit.Assert.areEqual(7, list.length, "making sure that sparseness is not supported");
                        LiveUnit.Assert.isTrue(verifyListContent(list, expected));
                    } catch (exception) {
                        LiveUnit.Assert.isTrue(options[i].proxy, "making sure exception is thrown when proxy is enabled");
                    }
                }

            }
            testListBaseforEach() {
                var options = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [-1, 20, "string", 3, 10, 5, 1];
                    var list = new List(arr, options[i]);
                    var listener = new ListListener(list);
                    var result = [];
                    var j = 0;
                    list.forEach(function (elem) { result[j++] = elem; });
                    //listener.assertSameAsArray(arr);
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                    j = 0;
                    for (var index = 0; index < arr.length; index++) {
                        if (arr[index]) {
                            LiveUnit.Assert.areEqual(arr[index], result[j++], "checking the correctness of the array");
                        }
                    }
                }
            }
            testListBaseSome() {
                var options = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = ["1", "2", "3", "4", 1, "5"];
                    var list = new List(arr, options[i]);
                    var listener = new ListListener(list);
                    LiveUnit.Assert.isTrue(list.some(function (elem) { return typeof elem === "number"; }));
                    LiveUnit.Assert.isTrue(!list.some(function (elem) { return typeof elem === "object"; }));
                    listener.assertSameAsArray(arr);
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                }
            }
            testListBaseMap() {
                var options = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = ["1", "2", "3", "4", "5"];
                    var list = new List(arr, options[i]);
                    var listener = new ListListener(list);
                    var result = list.map(function (elem) { return parseInt(elem, 10); });

                    for (var i = 1; i < 5; i++) {
                        LiveUnit.Assert.areEqual(i, result[i - 1], "check the correctness of the array content");
                    }
                    listener.assertSameAsArray(arr);
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                    LiveUnit.Assert.isTrue(!verifyListContent(list, result));
                }
            }
            testListBaseReduce() {

                var options = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [58, 52, 64, 2, 16, 23, 64, 27, 20, 11];
                    var list = new List(arr, options[i]);
                    var listener = new ListListener(list);

                    var reduceToSum = function(p, v) { return p + v };
                    LiveUnit.Assert.areEqual(arr.reduce(reduceToSum), list.reduce(reduceToSum));
                    listener.assertSameAsArray(arr);

                    var list2 = new List(["a", "b", "c", "d"]);
                    LiveUnit.Assert.areEqual(list2.join(), list2.reduce(function (p, v) { return p + "," + v; }));
                }
            }
            testListBaseReduceRight() {
                var options = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [58, 52, 64, 2, 16, 23, 64, 27, 20, 11];
                    var list = new List(arr, options[i]);
                    var listener = new ListListener(list);
                    var reduceToSum = function (p, v) { return p + v };
                    LiveUnit.Assert.areEqual(arr.reduceRight(reduceToSum, 2), list.reduceRight(reduceToSum, 2));
                    LiveUnit.Assert.areEqual(arr.reduceRight(reduceToSum), list.reduceRight(reduceToSum));
                    listener.assertSameAsArray(arr);

                    var arr2 = ["a", "b", "c", "d"];
                    var list2 = new List(arr2);
                    LiveUnit.Assert.areEqual(arr2.reverse().join(), list2.reduceRight(function (p, v) { return p + "," + v; }));
                }
            }
            testListBaseEvery() {
                var options = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = ["1", "2", "3", "4", 1, "5"];
                    var list = new List(arr, options[i]);
                    var listener = new ListListener(list);
                    LiveUnit.Assert.isTrue(!list.every(function (elem) { return typeof elem === "number"; }));
                    LiveUnit.Assert.isTrue(!list.every(function (elem) { return typeof elem === "object"; }));

                    listener.assertSameAsArray(arr);

                    var arr = [false, "", undefined, 0, NaN];
                    var list = new List(arr, options[i]);
                    LiveUnit.Assert.isTrue(list.every(function (elem) { return !elem; }));

                }
            }
            testListBaseJoin() {
                var options = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [-1, 20, "string", 3, 10, 5, 1];
                    var list = new List(arr, options[i]);
                    var listener = new ListListener(list);

                    LiveUnit.Assert.areEqual(arr.join(), list.join(), "array join returns the same value as list join");
                    LiveUnit.Assert.areEqual(arr.join("#"), list.join("#"), "array join returns the same value as list join");
                    listener.assertSameAsArray(arr);
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                }
            }
            testListBaseSlice() {
                var options = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [0, 1, 2, 3, 4, 5, 6, 7, 9];
                    var list = new List(arr, options[i]);
                    var listener = new ListListener(list);

                    LiveUnit.Assert.isTrue(checkArrayContent(list.slice(0), arr), "slicing all the elements");
                    LiveUnit.Assert.isTrue(checkArrayContent(list.slice(0, 1), [0]), "slicing the first element");

                    LiveUnit.Assert.isTrue(checkArrayContent(list.slice(7, 10), [7, 9]), "slicing elements from the end");

                    LiveUnit.Assert.isTrue(checkArrayContent(list.slice(0, 100), arr), "slicing all the elements");
                    list.slice(-3);

                    LiveUnit.Assert.isTrue(checkArrayContent(list.slice(-2), [7, 9]), "slicing elements from the end");

                    LiveUnit.Assert.isTrue(checkArrayContent(list.slice(3, 2), []), "slicing with the end index less than the start index");
                    listener.assertSameAsArray(arr);
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                }
            }

            testListGetItemFromKey() {

                var options = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [0, 1, 2, 3, 4];
                    var list = new List(arr, options[i]);

                    var check = function check () {
                        LiveUnit.Assert.areEqual(0, list.getItemFromKey("0").data, "making sure we are getting the correct element");
                        LiveUnit.Assert.areEqual(1, list.getItemFromKey("1").data, "making sure we are getting the correct element");
                        LiveUnit.Assert.areEqual(2, list.getItemFromKey("2").data, "making sure we are getting the correct element");
                        LiveUnit.Assert.areEqual(3, list.getItemFromKey("3").data, "making sure we are getting the correct element");
                        LiveUnit.Assert.areEqual(4, list.getItemFromKey("4").data, "making sure we are getting the correct element");
                        LiveUnit.Assert.areEqual(undefined, list.getItemFromKey("5"), "making sure we are getting the correct element");
                    }
                    check();
                    list.move(0, 3);  //[ 1, 2, 3, 0, 4]
                    list.move(1, 3);  //[ 1, 3, 0, 2, 4]
                    list.move(4, 0);  //[ 4, 1, 3, 0, 2]

                    check();
                    list.length = 10;
                    list.push(10);
                    list.move(0, 4);  //[ 1, 3, 0, 2, 4]

                    LiveUnit.Assert.areEqual(undefined, list.getItemFromKey("9"), "making sure we are getting the correct element after move");
                    LiveUnit.Assert.areEqual(undefined, list.getItemFromKey("8"), "making sure we are getting the correct element after move");
                    check();
                }
            }

            testListSpliceFromKey() {
                var options:any = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
                    var list = new List(arr, options[i]);

                    var check = function check (s, n) {
                        for (var i = s; i < n; i++) {
                            LiveUnit.Assert.areEqual(i, list.getItemFromKey(i.toString()).data, "check the correctness");
                        }
                    }
                    check(0, 10);
                    var key = list._getKey(0);
                    var keyOf8 = list._getKey(8);

                    list.move(0, 3);  //[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
                    list.move(1, 3);  //[1, 3, 0, 2, 4, 5, 6, 7, 8, 9]
                    list.move(4, 0);  //[4, 1, 3, 0, 2, 5, 6, 7, 8, 9]
                    check(0, 10);

                    var temp = list._spliceFromKey(key, 3);
                    LiveUnit.Assert.isTrue(checkArrayContent(temp, [0, 2, 5]));

                    var temp = list._spliceFromKey(keyOf8, 10);
                    LiveUnit.Assert.isTrue(checkArrayContent(temp, [8, 9]));


                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                    }
                }
            }

            testIndexOfDifferentScenarios() {

                var options:any = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {

                    var list = new List([], options[i]);

                    LiveUnit.Assert.areEqual(-1, list.indexOf(0, -1), "non existing item");
                    LiveUnit.Assert.areEqual(-1, list.indexOf(0), "non existing item");
                    var arr = [-1, -2, 100, 0, 9, -1, 7, 6, 5, 4];
                    list = new List(arr, options[i]);
                    LiveUnit.Assert.areEqual(0, list.indexOf(-1, -1 * list.length), "search for existing item with -ve index");
                    LiveUnit.Assert.areEqual(1, list.indexOf(-2, 1), "search for existing item");
                    LiveUnit.Assert.areEqual(-1, list.indexOf(-2, 100), "search for existing item with wrong starting index");
                    LiveUnit.Assert.areEqual(-1, list.indexOf(-200), "search for non existing item ");

                    //search in scrambled array key list
                    list.sort(function (l, r) { return l - r });
                    LiveUnit.Assert.areEqual(3, list.indexOf(0), "search for second item ");
                    LiveUnit.Assert.areEqual(list.length - 1, list.indexOf(100), "search for last item ");

                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                    }

                    var emptySlotList = new List(arr);
                    var l = emptySlotList.length;
                    emptySlotList.splice(99, 0, 200);
                    LiveUnit.Assert.areEqual(l, emptySlotList.indexOf(200), "search for last element of the list");
                    LiveUnit.Assert.areEqual(-1, emptySlotList.indexOf(undefined), "search for last element of the list");
                    LiveUnit.Assert.areEqual(200, emptySlotList.getAt(10), "make sure undefined existes");
                    LiveUnit.Assert.areEqual(undefined, emptySlotList.getAt(11), "make sure undefined existes");
                }
            }
            testLastIndexOfDifferentScenarios() {
                var options:any = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {

                    var list = new List([], options[i]);

                    LiveUnit.Assert.areEqual(-1, list.lastIndexOf(0, -1), "non existing item");
                    LiveUnit.Assert.areEqual(-1, list.lastIndexOf(0), "non existing item");
                    var arr = [-1, -2, 100, 0, 9, 5, 7, 6, 5, 4];
                    list = new List(arr, options[i]);
                    LiveUnit.Assert.areEqual(0, list.lastIndexOf(-1, list.length), "search for existing item with -ve index");
                    LiveUnit.Assert.areEqual(1, list.lastIndexOf(-2, 1), "search for existing item");
                    LiveUnit.Assert.areEqual(2, list.lastIndexOf(100), "search for existing item with wrong starting index");
                    LiveUnit.Assert.areEqual(5, list.indexOf(5), "search for existing item with wrong starting index");
                    LiveUnit.Assert.areEqual(8, list.lastIndexOf(5), "search for existing item with wrong starting index");
                    LiveUnit.Assert.areEqual(-1, list.lastIndexOf(-200), "search for non existing item ");

                    //search in scrambled array key list
                    list.sort(function (l, r) { return l - r });
                    LiveUnit.Assert.areEqual(2, list.lastIndexOf(0), "search for second item ");
                    LiveUnit.Assert.areEqual(list.length - 1, list.lastIndexOf(100), "search for last item ");

                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                    }

                    var emptySlotList = new List(arr);
                    var l = emptySlotList.length;
                    emptySlotList.splice(99, 0, 200);
                    LiveUnit.Assert.areEqual(l, emptySlotList.lastIndexOf(200), "search for last element of the list");
                    LiveUnit.Assert.areEqual(-1, emptySlotList.lastIndexOf(undefined), "search for last element of the list");
                    LiveUnit.Assert.areEqual(200, emptySlotList.getAt(10), "make sure undefined existes");
                    LiveUnit.Assert.areEqual(undefined, emptySlotList.getAt(11), "make sure undefined existes");
                }
            }

            testSettingTheLength() {
                var list = new List([10, 20, 30, 40]);

                LiveUnit.Assert.isTrue(verifyListContent(list, [10, 20, 30, 40]));
                list.splice(2, 1);
                LiveUnit.Assert.isTrue(verifyListContent(list, [10, 20, 40]));

                list.splice(2, 0, 100);
                LiveUnit.Assert.isTrue(verifyListContent(list, [10, 20, 100, 40]));

                list.length = 3;

                LiveUnit.Assert.isTrue(verifyListContent(list, [10, 20, 100]));

            }

            testSameReferenceObtained() {
                var list = new List([0, 1, 2, 3]);
                LiveUnit.Assert.isTrue(verifyListContent(list, [0, 1, 2, 3]));
                var hit = 0;
                if (list.getItem(1) === list.getItem(1)) {
                    hit = 1;
                }
                LiveUnit.Assert.areEqual(1, hit, "the obtained references are incorrect");
            }
            testLazyPopulate() {
                var list = new List([1, 2], { proxy: true });
                var x = list.getItem(1);
                var y = list.getItem(1);
                var hit = 0;

                if (x === y) {
                    hit = 1;
                }
                LiveUnit.Assert.areEqual(1, hit, "the obtained references are incorrect with lazyPopulate");
            }
            testGetAtInDifferentScenarios() {
                var list = new List([1, 2, 3]);
                list.length = 10;
                LiveUnit.Assert.areEqual(3, list.length, "list expansion is not correct");

                LiveUnit.Assert.areEqual(1, list.getAt(0), "getAt(0) returned wrong value");
                LiveUnit.Assert.areEqual(undefined, list.getAt(5), "getAt(5) returned wrong value");
                LiveUnit.Assert.areEqual(undefined, list.getAt(-1), "getAt(-1) returned wrong value");
                LiveUnit.Assert.areEqual(undefined, list.getAt(100), "getAt(100) returned wrong value");

                var listBindable = new List([1, 2, 3], { binding: true });

                listBindable.length = 10;
                LiveUnit.Assert.areEqual(3, listBindable.length, "list expansion is not correct with binding");

                LiveUnit.Assert.areEqual(1, listBindable.getAt(0), "getAt(0) returned wrong value  with binding");
                LiveUnit.Assert.areEqual(undefined, listBindable.getAt(5), "getAt(5) returned wrong value  with binding");
                LiveUnit.Assert.areEqual(undefined, listBindable.getAt(-1), "getAt(-1) returned wrong value  with binding");
                LiveUnit.Assert.areEqual(undefined, listBindable.getAt(100), "getAt(100) returned wrong value  with binding");

            }

            testGetItemInDifferentScenarios() {
                var list = new List([1, 2, 3]);
                list.length = 10;
                LiveUnit.Assert.areEqual(3, list.length, "list expansion is not correct");

                LiveUnit.Assert.areEqual(1, list.getItem(0).data, "getItem(0) returned wrong value");
                LiveUnit.Assert.areEqual(undefined, list.getItem(5), "getItem(5) returned wrong value");
                LiveUnit.Assert.areEqual(undefined, list.getItem(-1), "getItem(-1) returned wrong value");
                LiveUnit.Assert.areEqual(undefined, list.getItem(100), "getItem(100) returned wrong value");

                var listBindable = new List([1, 2, 3]);
                listBindable.length = 10;
                LiveUnit.Assert.areEqual(3, listBindable.length, "list expansion is not correct");

                LiveUnit.Assert.areEqual(1, listBindable.getItem(0).data, "getItem(0) returned wrong value with binding");
                LiveUnit.Assert.areEqual(undefined, listBindable.getItem(5), "getItem(5) returned wrong value with binding");
                LiveUnit.Assert.areEqual(undefined, listBindable.getItem(-1), "getItem(-1) returned wrong value with binding");
                LiveUnit.Assert.areEqual(undefined, listBindable.getItem(100), "getItem(100) returned wrong value with binding");
            }
            testShiftDifferentScenarios() {
                var options:any = [undefined, { binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [-1, 0, 1, 2, 3];
                    var list = new List(options[i]);

                    LiveUnit.Assert.isTrue(verifyListContent(list, []));
                    LiveUnit.Assert.areEqual(undefined, list.shift(), "Making sure that no element is shifted");

                    list = new List(arr, options[i]);
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                    for (var j = 0; j < arr.length; j++) {
                        LiveUnit.Assert.areEqual(arr[j], list.shift(), "making sure shift is working correctly");
                        LiveUnit.Assert.areEqual(arr.length - j - 1, list.length);
                        LiveUnit.Assert.areEqual(5, arr.length);
                    }
                }
            }
            testUnshiftDifferentScenarios() {

                var options = [undefined, { binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [];
                    var list = new List(arr, options[i]);
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));


                    LiveUnit.Assert.isTrue(verifyListContent(list, []));
                    LiveUnit.Assert.areEqual(0, list.unshift(), "Making sure that no element is unshifted");
                    LiveUnit.Assert.areEqual(1, list.unshift(0), "Making sure that one element is unshifted");
                    LiveUnit.Assert.areEqual(2, list.unshift(1), "Making sure that one element is unshifted");
                    LiveUnit.Assert.areEqual(7, list.unshift(2, 3, 4, 5, 6), "Making sure that more than one element is unshifted");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [2, 3, 4, 5, 6, 1, 0]));
                    LiveUnit.Assert.areEqual(13, list.unshift("", null, NaN, undefined, false, 0), "unshifting falsy values");

                    LiveUnit.Assert.areEqual(0, arr.length);

                }
            }
            testUnshiftDifferentScenariosWithProxy() {

                var options = [{ proxy: true }, { proxy: true, binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var arr = [];
                    var list = new List(arr, options[i]);
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));


                    LiveUnit.Assert.isTrue(verifyListContent(list, []));
                    LiveUnit.Assert.areEqual(0, list.unshift(), "Making sure that no element is unshifted");
                    LiveUnit.Assert.areEqual(1, list.unshift(0), "Making sure that one element is unshifted");
                    LiveUnit.Assert.areEqual(2, list.unshift(1), "Making sure that one element is unshifted");
                    LiveUnit.Assert.areEqual(7, list.unshift(2, 3, 4, 5, 6), "Making sure that more than one element is unshifted");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [2, 3, 4, 5, 6, 1, 0]));
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                    LiveUnit.Assert.areEqual(13, list.unshift("", null, NaN, undefined, false, 0), "unshifting falsy values");

                    LiveUnit.Assert.areEqual(13, arr.length);
                }
            }
            testPopDifferentScenarios() {
                var options:any = [undefined, { binding: true }, { proxy: true }, { binding: true, proxy: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [-1, 0, 1, 2];
                    var temp = [-1, 0, 1, 2];
                    var list = new List(arr, options[i]);
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                    for (var j = temp.length - 1; j >= 0; j--) {
                        var elem = list.pop();
                        LiveUnit.Assert.areEqual(temp[j], elem, "making sure of correct pop");
                        LiveUnit.Assert.areEqual(j, list.length);

                        if (options[i] && options[i].proxy) {
                            LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                        }
                    }
                }
            }
            testPopAfterSorting() {

                var arr = [10, 4, 9, 100, -1, 20, 0];
                var temp = [-1, 0, 4, 9, 10, 20, 100];

                var sortedArr = new List(arr);
                sortedArr.sort(function (l, r) { return l - r; });
                LiveUnit.Assert.isTrue(verifyListContent(sortedArr, temp));

                for (var j = temp.length - 1; j >= 0; j--) {
                    var elem = sortedArr.pop();
                    LiveUnit.Assert.areEqual(temp[j], elem, "making sure of correct pop in scrambled key array");
                    LiveUnit.Assert.areEqual(j, sortedArr.length);
                }
            }
            testDeleteAnElementBeforeBeingAddedToKeys() {

                var list = new List([1, 2], { proxy: true });
                list.splice(0, 1);
                LiveUnit.Assert.areEqual(1, list.length);
                LiveUnit.Assert.areEqual(2, list.getAt(0));
            }
            testSetLengthToNegativeValue() {
                var hitCatch = false;
                var list = new List([1, 2], { proxy: true });
                try {
                    list.length = -1;
                } catch (e) {
                    LiveUnit.Assert.areEqual("List length must be assigned a finite positive number", e.message);
                    hitCatch = true;
                }
                LiveUnit.Assert.isTrue(hitCatch);
                LiveUnit.Assert.areEqual(2, list.length, "wrong value for length due to setting it to negative value");
                LiveUnit.Assert.areEqual(1, list.getAt(0), "array is messed after setting the length to negative value");
                LiveUnit.Assert.areEqual(2, list.getAt(1), "array is messed after setting the length to negative value");
            }
            testGetItemFromKeyBeforeSettingKeys() {
                var list = new List([1, 2], { proxy: true });
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2]));
                var y = list.getItemFromKey("1");
                LiveUnit.Assert.areEqual(2, y.data);
            }
            testRemoveElementBeforeSettingKeys() {
                //removing an element when the keys are not set and getting the next key element
                var list = new List([1, 2], { proxy: true });
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2]));
                list.splice(0, 1);
                LiveUnit.Assert.isTrue(verifyListContent(list, [2]));
                var y = list.getItemFromKey("1");
                LiveUnit.Assert.areEqual(2, y.data);
            }

            testIndexOfWithNonExistingKey() {
                var list = new List();
                var k = list.indexOfKey("2");
                LiveUnit.Assert.areEqual(-1, k, "wrong value of index returned for non existing key");
            }

            testInvalidGetterScenarios() {

                var list = new List([10, 20, 30, 40]);
                list.splice(2, 1);
                LiveUnit.Assert.isTrue(verifyListContent(list, [10, 20, 40]));
                list.splice(2, 0, 100);
                LiveUnit.Assert.isTrue(verifyListContent(list, [10, 20, 100, 40]));

                var t = list.getItemFromKey("2");
                LiveUnit.Assert.isTrue(!t);

                t = list.getItemFromKey("-1");
                LiveUnit.Assert.isTrue(!t);

                t = list.getItemFromKey("100");
                LiveUnit.Assert.isTrue(!t);

                t = list.getItem(-1);
                LiveUnit.Assert.isTrue(!t);

            }

            testReverseWithoutProxy() {
                var arr = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
                var list = new List(arr);
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                list.reverse();

                LiveUnit.Assert.isTrue(verifyListContent(list, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1]));
                LiveUnit.Assert.areEqual(-1, arr[0]);
                LiveUnit.Assert.areEqual(9, arr[arr.length - 1]);

            }
            testReverseEmptyList() {
                var list = new List();
                LiveUnit.Assert.isTrue(verifyListContent(list, []));
                list.reverse();
                LiveUnit.Assert.isTrue(verifyListContent(list, []));
            }
            testReverseWithProxy() {
                var arr = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
                var list = new List(arr, { proxy: true });
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                list.reverse();
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                LiveUnit.Assert.isTrue(verifyListContent(list, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1]));

            }
            testReverseWithSparseArrayNoProxy() {
                var arr = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
                var list = new List(arr);

                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                list.length = 15;
                list.reverse();

                LiveUnit.Assert.isTrue(verifyListContent(list, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1]));
                LiveUnit.Assert.areEqual(-1, arr[0]);
                LiveUnit.Assert.areEqual(9, arr[arr.length - 1]);

            }
            testReverseWithSparseArrayAndProxy() {
                var arr = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
                var list = new List(arr, { proxy: true });
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                list.length = 15;
                list.reverse();
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                LiveUnit.Assert.isTrue(verifyListContent(list, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1]));

            }
            testFalsyValues() {
                var arr = ["", false, NaN, 0, null];
                var list = new List(arr);
                LiveUnit.Assert.isTrue(verifyListContent(list, arr, true));
            }
            testIndexOfFunctions() {
                var list = new List([10, 20, 30, 40]);
                LiveUnit.Assert.isTrue(verifyListContent(list, [10, 20, 30, 40]));
                list.splice(2, 1);
                list.splice(2, 0, 100);
                var k = list.indexOfKey("5"); //result in 2
                LiveUnit.Assert.areEqual(2, k, "invalid value returned from indexOfKey");
                var l = list.indexOf(100); //result in 2
                LiveUnit.Assert.areEqual(2, l, "invalid value returned from indexOfKey");

            }
            testShiftSpecialCaseSimpleScenario() {
                var list = new List();
                var x = list.shift();
                LiveUnit.Assert.areEqual(undefined, list.shift(), "making sure that shift returns undefined");
            }
            testLastIndexOfSpecialCaseSimpleScenario() {
                var arr = [1, 2, 3];
                var list = new List(arr);
                LiveUnit.Assert.areEqual(1, list.lastIndexOf(2, 1), "making sure lastIndexOf works as ES5 arrays");
            }
            testGetItemFromKeySimpleScenario() {
                var arr = [1, 2, 3, 4];
                var list = new List(arr);
                LiveUnit.Assert.areEqual(undefined, list.getItemFromKey("5"), "making sure that getItemFromKey is working fine");
            }
            testNonExistingKeys() {
                var list = new List();

                var k = list.indexOfKey("2"); //should be -1
                LiveUnit.Assert.areEqual(-1, k, "invalid key should return -1");

                var k2 = list.indexOf(2); //should be -1
                LiveUnit.Assert.areEqual(-1, k2, "invalid key should return -1");

                var k3 = list.indexOf(2, -1); //should be -1
                LiveUnit.Assert.areEqual(-1, k3, "invalid key should return -1");

            }
            testSortEmptyList() {
                var list = new List<number>();
                LiveUnit.Assert.isTrue(verifyListContent(list, []));
                list.sort(function (l, r) { return r - l; });
                LiveUnit.Assert.isTrue(verifyListContent(list, []));

            }
            testSortArrayOfIntegersWithoutProxy() {
                var arr = [2, 3, 4, 1, -1, 0, 5, 10, 11, 9];
                var list = new List(arr);
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                list.sort(function (l, r) { return l - r });

                LiveUnit.Assert.isTrue(!verifyListContent(list, arr));
                LiveUnit.Assert.isTrue(verifyListContent(list, [-1, 0, 1, 2, 3, 4, 5, 9, 10, 11]));

                list.sort(function (l, r) { return r - l; });
                LiveUnit.Assert.isTrue(!verifyListContent(list, arr));
                LiveUnit.Assert.isTrue(verifyListContent(list, [11, 10, 9, 5, 4, 3, 2, 1, 0, -1]));

            }
            testSortArrayOfIntegersWithProxy() {
                var arr = [2, 3, 4, 1, -1, 0, 5, 10, 11, 9];
                var list = new List(arr, { proxy: true });
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                list.sort(function (l, r) { return l - r });

                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                LiveUnit.Assert.isTrue(verifyListContent(list, [-1, 0, 1, 2, 3, 4, 5, 9, 10, 11]));

                list.sort(function (l, r) { return r - l; });
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                LiveUnit.Assert.isTrue(verifyListContent(list, [11, 10, 9, 5, 4, 3, 2, 1, 0, -1]));

            }
            testSortArrayOfIntegersWithoutProxyWithBinding() {
                var arr = [2, 3, 4, 1, -1, 0, 5, 10, 11, 9];
                var list = new List(arr, { binding: true });
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                list.sort(function (l, r) { return l - r });

                LiveUnit.Assert.isTrue(!verifyListContent(list, arr));
                LiveUnit.Assert.isTrue(verifyListContent(list, [-1, 0, 1, 2, 3, 4, 5, 9, 10, 11]));

                list.sort(function (l, r) { return r - l; });
                LiveUnit.Assert.isTrue(!verifyListContent(list, arr));
                LiveUnit.Assert.isTrue(verifyListContent(list, [11, 10, 9, 5, 4, 3, 2, 1, 0, -1]));

            }
            testSortArrayOfIntegersWithProxyWithBinding() {
                var arr = [2, 3, 4, 1, -1, 0, 5, 10, 11, 9];
                var list = new List(arr, { proxy: true, binding: true });
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                list.sort(function (l, r) { return l - r });

                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                LiveUnit.Assert.isTrue(verifyListContent(list, [-1, 0, 1, 2, 3, 4, 5, 9, 10, 11]));

                list.sort(function (l, r) { return r - l; });
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                LiveUnit.Assert.isTrue(verifyListContent(list, [11, 10, 9, 5, 4, 3, 2, 1, 0, -1]));

            }
            testSortArrayOfObjects() {
                var arr = createAnArrayOfObjects(11);
                arr[4].a = -1;
                var list = new List(arr);

                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                list.sort(function (l, r) { return l.a - r.a });

                LiveUnit.Assert.isTrue(!verifyListContent(list, arr));
                LiveUnit.Assert.areEqual(-1, list.getAt(0).a, "sorting failed");
                LiveUnit.Assert.areEqual(10, list.getAt(list.length - 1).a, "sorting failed");


                list.sort(function (l, r) { return r.a - l.a });


                LiveUnit.Assert.isTrue(!verifyListContent(list, arr));
                LiveUnit.Assert.areEqual(10, list.getAt(0).a, "sorting failed");
                LiveUnit.Assert.areEqual(-1, list.getAt(list.length - 1).a, "sorting failed");

            }
            testSetAtDifferentScenarios() {
                var arr = [1, 2, 3];
                var list = new List(arr);

                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                list.setAt(0, 4);
                LiveUnit.Assert.areEqual(4, list.getAt(0), "Value is not set correctly at element 0");
                LiveUnit.Assert.isTrue(verifyListContent(list, [4, 2, 3]));
            }

            testSetAtDifferentScenariosWithProxy() {
                var arr = [1, 2, 3];
                var list = new List(arr, { proxy: true });

                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                list.setAt(0, 4);
                LiveUnit.Assert.areEqual(4, list.getAt(0), "Value is not set correctly at element 0");
                LiveUnit.Assert.isTrue(verifyListContent(list, [4, 2, 3]));
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
            }
            testSetAtWithAnArrayOfObjectsAndBinding() {
                var arr = [{ a: "zero" }, { a: "one" }, { a: "two" }, { a: "three" }, { a: "four" }];
                var list = new List(arr, { binding: true });
                list.setAt(0, { a: "newElement" });
                LiveUnit.Assert.areEqual("newElement", list.getAt(0).a, "set with binding is not working correctly");

                list.setAt(5, { a: "newElementAt5" });
                LiveUnit.Assert.areEqual("newElementAt5", list.getAt(5).a, "set with binding is not working correctly");
                LiveUnit.Assert.areEqual(undefined, arr[5], "set with binding is not working correctly");
            }
            testSetAtWithAnArrayOfObjectsAndBindingAndProxy() {
                var arr = [{ a: "zero" }, { a: "one" }, { a: "two" }, { a: "three" }, { a: "four" }];
                var list = new List(arr, { binding: true, proxy: true });
                list.setAt(0, { a: "newElement" });
                LiveUnit.Assert.areEqual("newElement", list.getAt(0).a, "set with binding is not working correctly");
                LiveUnit.Assert.areEqual("newElement", list.getAt(0).a, "set with binding is not working correctly");

                list.setAt(5, { a: "newElementAt5" });
                LiveUnit.Assert.areEqual("newElementAt5", list.getAt(5).a, "set with binding is not working correctly");
                LiveUnit.Assert.areEqual("newElementAt5", arr[5].a, "set with binding is not working correctly");
            }
            testRemoveElementsUsingSpliceDifferentScenarios() {

                var options = [undefined, { binding: true }]
                for (var j = 0; j < options.length; j++) {
                    var arr = [1, 2, 3, 4];
                    arr[4] = 5;
                    var list = new List(arr);
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                    LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5]));
                    LiveUnit.Assert.areEqual(1, arr[0]);
                    LiveUnit.Assert.areEqual(4, arr[3]);

                    list.splice(0, 1);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [2, 3, 4, 5]), "deleting the first element");
                    LiveUnit.Assert.areEqual(1, arr[0]);
                    LiveUnit.Assert.areEqual(4, arr[3]);

                    list.splice(3, 1);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [2, 3, 4]), "deleting the third element");
                    LiveUnit.Assert.areEqual(1, arr[0]);
                    LiveUnit.Assert.areEqual(4, arr[3]);

                    list.splice(-1, 1);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [2, 3]), "deleting non existing element");
                    LiveUnit.Assert.areEqual(1, arr[0]);

                    list.splice(list.length * 2, 1);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [2, 3]), "deleting non existing element");

                    list.splice(0, 2);
                    LiveUnit.Assert.isTrue(verifyListContent(list, []), "deleting all the elements of the array");
                    LiveUnit.Assert.areEqual(1, arr[0]);
                    LiveUnit.Assert.areEqual(4, arr[3]);

                    var arr = [1, 2, 3, 4];
                    list = new List(arr);
                    list.splice(4, 2);
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr), "deleting non existing content");

                    list.splice(0, 100);
                    LiveUnit.Assert.isTrue(verifyListContent(list, []), "deleting elements more than the length of the arra");
                    LiveUnit.Assert.areEqual(1, arr[0]);
                    LiveUnit.Assert.areEqual(4, arr[3]);
                }
            }
            testDeleteUsingSpliceDifferentScenariosWithProxy() {
                var options = [{ proxy: true }, { proxy: true, binding: true }];

                for (var j = 0; j < options.length; j++) {

                    var arr = [1, 2, 3, 4];
                    arr[4] = 5;
                    var list = new List(arr, options[j]);

                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                    LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5]));
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                    list.splice(0, 1);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [2, 3, 4, 5]), "deleting the first element");
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                    list.splice(3, 1);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [2, 3, 4]), "deleting the third element");
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                    list.splice(-1, 1);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [2, 3]), "deleting non existing element");
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                    list.splice(list.length * 2, 1);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [2, 3]), "deleting non existing element");
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                    list.splice(0, 2);
                    LiveUnit.Assert.isTrue(verifyListContent(list, []), "deleting all the elements of the array");
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                    var arr = [1, 2, 3, 4];
                    list = new List(arr, options[j]);
                    list.splice(4, 2);
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr), "deleting non existing content");
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                    list.splice(0, 100);
                    LiveUnit.Assert.isTrue(verifyListContent(list, []), "deleting elements more than the length of the array");
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                }
            }

            testAddingElementsUsingSplice() {

                var options = [undefined, { binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [];
                    var list = new List(arr, options[i]);
                    list.splice(0, 0, 1, 2, 3, 4, 5);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5]), "adding elements more than the length of the array");
                    LiveUnit.Assert.areEqual(0, arr.length, "making sure that the array length is not changed");

                    list.splice(0, 0, 10);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [10, 1, 2, 3, 4, 5]), "adding an element to the begining of the array");
                    LiveUnit.Assert.areEqual(0, arr.length, "making sure that the array length is not changed");

                    list.splice(list.length - 1, 0, 100, 200);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [10, 1, 2, 3, 4, 100, 200, 5]), "adding an element at the last position of the array");
                    LiveUnit.Assert.areEqual(0, arr.length, "making sure that the array length is not changed");

                    list.splice(list.length * 10, 0, -1, 0);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [10, 1, 2, 3, 4, 100, 200, 5, -1, 0]), "adding an element to a non existing element of the array");
                    LiveUnit.Assert.areEqual(0, arr.length, "making sure that the array length is not changed");

                    list.splice(-100, 0, "first");
                    LiveUnit.Assert.isTrue(verifyListContent(list, ["first", 10, 1, 2, 3, 4, 100, 200, 5, -1, 0]), "adding an element to a non existing element of the array");
                    LiveUnit.Assert.areEqual(0, arr.length, "making sure that the array length is not changed");

                    list.splice(0, 0, undefined);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [undefined, "first", 10, 1, 2, 3, 4, 100, 200, 5, -1, 0]), "adding an undefined element to the beginign of the array");
                    LiveUnit.Assert.areEqual(0, arr.length, "making sure that the array length is not changed");

                    list.splice(0, 0, false, "", null, NaN);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [false, "", null, NaN, undefined, "first", 10, 1, 2, 3, 4, 100, 200, 5, -1, 0], true), "adding falsy elements to the beginign of the array");
                    LiveUnit.Assert.areEqual(0, arr.length, "making sure that the array length is not changed");

                }
            }
            testAddingElementsUsingSpliceWithProxy() {
                var options = [{ proxy: true }, { proxy: true, binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var arr = [];
                    var list = new List(arr, options[i]);
                    list.splice(0, 0, 1, 2, 3, 4, 5);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5]), "adding elements more than the length of the array");
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr), "adding elements more than the length of the array");

                    list.splice(0, 0, 10);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [10, 1, 2, 3, 4, 5]), "adding an element to the begining of the array");
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr), "adding elements more than the length of the array");

                    list.splice(list.length - 1, 0, 100, 200);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [10, 1, 2, 3, 4, 100, 200, 5]), "adding an element at the last position of the array");
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr), "adding elements more than the length of the array");

                    list.splice(list.length * 10, 0, -1, 0);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [10, 1, 2, 3, 4, 100, 200, 5, -1, 0]), "adding an element to a non existing element of the array");
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr), "adding elements more than the length of the array");

                    list.splice(-100, 0, "first");
                    LiveUnit.Assert.isTrue(verifyListContent(list, ["first", 10, 1, 2, 3, 4, 100, 200, 5, -1, 0]), "adding an element to a non existing element of the array");
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr), "adding elements more than the length of the array");

                    list.splice(0, 0, undefined);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [undefined, "first", 10, 1, 2, 3, 4, 100, 200, 5, -1, 0]), "adding an undefined element to the beginign of the array");
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr), "adding elements more than the length of the array");

                    list.splice(0, 0, false, "", null, NaN);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [false, "", null, NaN, undefined, "first", 10, 1, 2, 3, 4, 100, 200, 5, -1, 0], true), "adding falsy elements to the beginign of the array");
                    LiveUnit.Assert.isTrue(verifyListContent(list, arr, true), "adding elements more than the length of the array");
                }
            }
            testMove1() {
                var list = new List();
                list.push(1);
                list.push(2);
                list.push(3);
                list.push(4);
                list.push(5);
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5]));

                list.move(0, 10);
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5]));
                var x = list.indexOf(1);  //expected list.length - 1
                LiveUnit.Assert.areEqual(0, x, "element should have moved to the end of the list");
            }
            testMoveWithProxy() {
                var arr = [1, 2, 3, 4];
                var list = new List(arr, { proxy: true });
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                list.move(0, 10);
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4]));
                var x = list.indexOf(1);
                LiveUnit.Assert.areEqual(0, x, "element should have moved to the end of the list");
            }
            testMove3() {
                var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                var list = new List(arr, { proxy: true });
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                list.splice(3, 1);
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 5, 6, 7, 8, 9]));

                list.move(0, 3);
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                LiveUnit.Assert.isTrue(verifyListContent(list, [2, 3, 5, 1, 6, 7, 8, 9]));

                var x = list.indexOf(1);  //expected === 3
                LiveUnit.Assert.areEqual(3, x, "incorrect value due to the move function")
            }
            testMoveNonExistingToNonExisting() {
                var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                var list = new List(arr, { proxy: true });
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                list.move(-1, 100);
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                list.move(100, 2);
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
            }

            testMoveObjects() {
                var arr = createAnArrayOfObjects(10);
                var list = new List(arr, { proxy: true });
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                list.move(0, 5);
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                LiveUnit.Assert.areEqual(1, list.getAt(0).a, "Wrong element at index 0");
                LiveUnit.Assert.areEqual(0, list.getAt(5).a, "Wrong element at index 0");

            }
            testMoveObjectsWithoutProxy() {
                var arr = createAnArrayOfObjects(10);
                var list = new List(arr);
                LiveUnit.Assert.isTrue(verifyListContent(list, arr));

                list.move(0, 5);

                LiveUnit.Assert.areEqual(1, list.getAt(0).a, "Wrong element at index 0");
                LiveUnit.Assert.areEqual(0, list.getAt(5).a, "Wrong element at index 0");

            }

            testGetAtWithBindingAndProxy() {
                var arr = [{ a: "zero" }, { a: "one" }, { a: "two" }, { a: "three" }, { a: "four" }];
                var list = new List(arr, { binding: true, proxy: true });

                LiveUnit.Assert.isTrue(verifyBindableList(list, arr));
                list.getAt(0).a = "updated";
                LiveUnit.Assert.isTrue(verifyBindableList(list, arr));

                LiveUnit.Assert.areEqual("updated", list.getAt(0).a, "binding is not working correctly");

                list.push({ a: "five" });
                LiveUnit.Assert.areEqual(6, arr.length, "length of the array should change");
                LiveUnit.Assert.areEqual(6, list.length, "length of the list should change");
                list.getAt(5).a = "newElement";
                LiveUnit.Assert.areEqual("newElement", list.getAt(5).a, "element should have changed");
                LiveUnit.Assert.areEqual("newElement", arr[5].a, "element should have changed");
            }
            testGetAtWithBindingAndNoProxy() {

                var arr = [{ a: "zero" }, { a: "one" }, { a: "two" }, { a: "three" }, { a: "four" }];
                var list = new List(arr, { binding: true });

                LiveUnit.Assert.isTrue(verifyBindableList(list, arr));
                list.getAt(0).a = "updated";

                LiveUnit.Assert.areEqual("updated", list.getAt(0).a, "binding is not working correctly");
                LiveUnit.Assert.areEqual("updated", arr[0].a, "binding is not working correctly");

                list.push({ a: "five" });
                LiveUnit.Assert.areEqual(5, arr.length, "length of the array should not change");
                LiveUnit.Assert.areEqual(6, list.length, "length of the list should change");

                list.getAt(5).a = "newElement";
                LiveUnit.Assert.areEqual("newElement", list.getAt(5).a, "element should have changed");
                LiveUnit.Assert.areEqual(undefined, arr[5], "element should not exist in the array");
            }

            testGroupingGroups() {
                var list = new WinJS.Binding.List<number>();
                for (var i = 0; i < 100; i++) {
                    list.push(i);
                }
                var tensGroupKey = function (item) { return "" + ((item / 10) | 0); };
                var tens = list.createGrouped(tensGroupKey, tensGroupKey);
                var lowHighGroupKey = function (item) { return item < 5 ? "low" : "high"; };
                var lowHigh = tens.groups.createGrouped(lowHighGroupKey, lowHighGroupKey);

                // We should make sure to clone all the relevant properties all along...
                var item = lowHigh.getItem(0);
                LiveUnit.Assert.isNotNull(item.groupSize);
                LiveUnit.Assert.isNotNull(item.firstItemIndexHint);
                LiveUnit.Assert.isNotNull(item.firstItemKey);
            }

        };

        export class ListProxy {

            testSparse() {
                var data = [1, , 2];
                var exception;
                try {
                    var list = new List(data, { proxy: true });
                } catch (e) {
                    exception = e;
                }
                LiveUnit.Assert.isNotNull(exception);
            }

            testBasic() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                LiveUnit.Assert.areEqual(3, list.length);
                LiveUnit.Assert.areEqual(1, list.getAt(0));
                LiveUnit.Assert.areEqual(2, list.getAt(1));
                LiveUnit.Assert.areEqual(3, list.getAt(2));
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
            }

            testPush() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1);
                listener.assertSameAsArray([1]);
                listener.assertSameAsArray(data);
                list.push(2);
                listener.assertSameAsArray([1, 2]);
                listener.assertSameAsArray(data);
                list.push(3, 4);
                listener.assertSameAsArray([1, 2, 3, 4]);
                listener.assertSameAsArray(data);
                list.push();
                listener.assertSameAsArray([1, 2, 3, 4]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.areEqual(4, list.length);
            }

            testPop() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                LiveUnit.Assert.areEqual(3, list.pop());
                listener.assertSameAsArray([1, 2]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.areEqual(2, list.pop());
                listener.assertSameAsArray([1]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.areEqual(1, list.pop());
                listener.assertSameAsArray([]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.areEqual(0, list.length);
            }

            testUnshift() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.unshift(1);
                listener.assertSameAsArray([1]);
                listener.assertSameAsArray(data);
                list.unshift(2);
                listener.assertSameAsArray([2, 1]);
                listener.assertSameAsArray(data);
                list.unshift(3, 4);
                listener.assertSameAsArray([3, 4, 2, 1]);
                listener.assertSameAsArray(data);
                list.unshift();
                listener.assertSameAsArray([3, 4, 2, 1]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.areEqual(4, list.length);
            }

            testShift() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                LiveUnit.Assert.areEqual(1, list.shift());
                listener.assertSameAsArray([2, 3]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.areEqual(2, list.shift());
                listener.assertSameAsArray([3]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.areEqual(3, list.shift());
                listener.assertSameAsArray([]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.areEqual(0, list.length);
            }

            testReverse() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                list.reverse();
                listener.assertSameAsArray([3, 2, 1]);
                listener.assertSameAsArray(data);
                list.reverse();
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                list.push(4);
                listener.assertSameAsArray([1, 2, 3, 4]);
                listener.assertSameAsArray(data);
                list.reverse();
                listener.assertSameAsArray([4, 3, 2, 1]);
                listener.assertSameAsArray(data);
            }

            testSort() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                list.sort();
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                list.sort(function (l, r) { return r - l; });
                listener.assertSameAsArray([3, 2, 1]);
                listener.assertSameAsArray(data);
                list.push(5);
                listener.assertSameAsArray([3, 2, 1, 5]);
                listener.assertSameAsArray(data);
                list.sort(function (l, r) { return l - r; });
                listener.assertSameAsArray([1, 2, 3, 5]);
                listener.assertSameAsArray(data);
                list.sort(function (l, r) { return r - l; });
                listener.assertSameAsArray([5, 3, 2, 1]);
                listener.assertSameAsArray(data);
                list.sort();
                listener.assertSameAsArray([1, 2, 3, 5]);
                listener.assertSameAsArray(data);
            }

            testSplice() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.splice(0, 0, 1);
                listener.assertSameAsArray([1]);
                listener.assertSameAsArray(data);
                list.splice(0, 0, 2, 3, 4);
                listener.assertSameAsArray([2, 3, 4, 1]);
                listener.assertSameAsArray(data);
                list.splice(1, 0, 5, 6);
                listener.assertSameAsArray([2, 5, 6, 3, 4, 1]);
                listener.assertSameAsArray(data);
                list.splice(1, 2, 7, 8);
                listener.assertSameAsArray([2, 7, 8, 3, 4, 1]);
                listener.assertSameAsArray(data);
                list.splice(10, 0, 9, 10);
                listener.assertSameAsArray([2, 7, 8, 3, 4, 1, 9, 10]);
                listener.assertSameAsArray(data);
            }

            testConcat() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                var result = list.concat([4, 5]);
                assertSequenceEquals([1, 2, 3, 4, 5], result);
                assertSequenceEquals([1, 2, 3], list.concat());
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                list.pop();
                list.pop();
                list.pop();
                listener.assertSameAsArray([]);
                listener.assertSameAsArray(data);
                var result2 = list.concat([6, 7]);
                assertSequenceEquals([6, 7], result2);
                assertSequenceEquals([], list.concat());
            }

            testJoin() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.areEqual("1,2,3", list.join(","));
                LiveUnit.Assert.areEqual("1, 2, 3", list.join(", "));
                LiveUnit.Assert.areEqual("1,2,3", list.join());
                LiveUnit.Assert.areEqual("11213", list.join("1"));
                LiveUnit.Assert.areEqual("1---2---3", list.join("---"));
                list.length = 0;
                listener.assertSameAsArray([]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.areEqual("", list.join(","));
                LiveUnit.Assert.areEqual("", list.join());
                LiveUnit.Assert.areEqual("", list.join("1"));
                LiveUnit.Assert.areEqual("", list.join("---"));
            }

            testSlice() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                assertSequenceEquals([], list.slice(-1));
                assertSequenceEquals([], list.slice(0));
                assertSequenceEquals([], list.slice(1));
                list.push(1, 2);
                listener.assertSameAsArray([1, 2]);
                listener.assertSameAsArray(data);
                assertSequenceEquals([2], list.slice(-1));
                assertSequenceEquals([1, 2], list.slice(0));
                assertSequenceEquals([2], list.slice(1));
                list.push(3);
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                assertSequenceEquals([3], list.slice(-1));
                assertSequenceEquals([1, 2, 3], list.slice(0));
                assertSequenceEquals([2, 3], list.slice(1));
                assertSequenceEquals([], list.slice(-1, 2));
                assertSequenceEquals([2], list.slice(-2, -1));
                assertSequenceEquals([], list.slice(-2, -2));
                assertSequenceEquals([], list.slice(-2, -3));
                assertSequenceEquals([], list.slice(-6, -8));
                assertSequenceEquals([1, 2], list.slice(0, 2));
                assertSequenceEquals([2], list.slice(1, 2));
            }

            testIndexOf() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.areEqual(1, list.indexOf(2));
                LiveUnit.Assert.areEqual(-1, list.indexOf(5));
                LiveUnit.Assert.areEqual(-1, list.indexOf(2, 2));
                LiveUnit.Assert.areEqual(-1, list.indexOf(2, -1));
                LiveUnit.Assert.areEqual(1, list.indexOf(2, -2));
                list.push(2);
                LiveUnit.Assert.areEqual(1, list.indexOf(2));
                LiveUnit.Assert.areEqual(-1, list.indexOf(5));
                LiveUnit.Assert.areEqual(3, list.indexOf(2, 2));
            }

            testLastIndexOf() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.areEqual(1, list.lastIndexOf(2));
                LiveUnit.Assert.areEqual(-1, list.lastIndexOf(5));
                LiveUnit.Assert.areEqual(-1, list.lastIndexOf(2, 0));
                LiveUnit.Assert.areEqual(1, list.lastIndexOf(2, -1));
                LiveUnit.Assert.areEqual(1, list.lastIndexOf(2, -2));
                LiveUnit.Assert.areEqual(-1, list.lastIndexOf(2, -3));
                list.push(2);
                LiveUnit.Assert.areEqual(3, list.lastIndexOf(2));
                LiveUnit.Assert.areEqual(-1, list.lastIndexOf(5));
                LiveUnit.Assert.areEqual(1, list.lastIndexOf(2, 2));
            }

            testFilterNotify(complete) {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                var filtered = list.createFiltered(function (item) { return typeof item === "number"; });
                var filteredListener = new ListListener(filtered);

                WinJS.Promise.wrap().then(function () {
                    list.push(1, 2, 3);
                    listener.assertSameAsArray([1, 2, 3]);
                    listener.assertSameAsArray(data);
                    filteredListener.assertSameAsArray([1, 2, 3]);
                }).then(post).then(function () {
                    listener.assertLengthChangedCount(2);
                    filteredListener.assertLengthChangedCount(2);
                    list.push("hello");
                    listener.assertSameAsArray([1, 2, 3, "hello"]);
                    listener.assertSameAsArray(data);
                    filteredListener.assertSameAsArray([1, 2, 3]);
                }).then(post).then(function () {
                    listener.assertLengthChangedCount(3);
                    filteredListener.assertLengthChangedCount(2);
                    list.push(4);
                    listener.assertSameAsArray([1, 2, 3, "hello", 4]);
                    listener.assertSameAsArray(data);
                    filteredListener.assertSameAsArray([1, 2, 3, 4]);
                }).then(post).then(function () {
                    listener.assertLengthChangedCount(4);
                    filteredListener.assertLengthChangedCount(3);
                    list.unshift("begin");
                    listener.assertSameAsArray(["begin", 1, 2, 3, "hello", 4]);
                    listener.assertSameAsArray(data);
                    filteredListener.assertSameAsArray([1, 2, 3, 4]);
                }).then(post).then(function () {
                    listener.assertLengthChangedCount(5);
                    filteredListener.assertLengthChangedCount(3);
                    list.unshift(0);
                    listener.assertSameAsArray([0, "begin", 1, 2, 3, "hello", 4]);
                    listener.assertSameAsArray(data);
                    filteredListener.assertSameAsArray([0, 1, 2, 3, 4]);
                }).then(post).then(function () {
                    listener.assertLengthChangedCount(6);
                    filteredListener.assertLengthChangedCount(4);
                    list.splice(2, 0, 0.5);
                    listener.assertSameAsArray([0, "begin", 0.5, 1, 2, 3, "hello", 4]);
                    listener.assertSameAsArray(data);
                    filteredListener.assertSameAsArray([0, 0.5, 1, 2, 3, 4]);
                    list.length = 3;
                    listener.assertSameAsArray([0, "begin", 0.5]);
                    listener.assertSameAsArray(data);
                    filteredListener.assertSameAsArray([0, 0.5]);
                }).then(post).then(function () {
                    listener.assertLengthChangedCount(7);
                    filteredListener.assertLengthChangedCount(5);
                    list.setAt(3, 56);
                    listener.assertSameAsArray([0, "begin", 0.5, 56]);
                    listener.assertSameAsArray(data);
                    filteredListener.assertSameAsArray([0, 0.5, 56]);
                }).then(post).then(null, errorHandler).then(complete);
            }

            testFilter() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                var filtered = list.createFiltered(function (item) { return typeof item === "number"; });
                var filteredListener = new ListListener(filtered);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([1, 2, 3]);
                list.push("hello");
                listener.assertSameAsArray([1, 2, 3, "hello"]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([1, 2, 3]);
                list.push(4);
                listener.assertSameAsArray([1, 2, 3, "hello", 4]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([1, 2, 3, 4]);
                list.unshift("begin");
                listener.assertSameAsArray(["begin", 1, 2, 3, "hello", 4]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([1, 2, 3, 4]);
                list.unshift(0);
                listener.assertSameAsArray([0, "begin", 1, 2, 3, "hello", 4]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([0, 1, 2, 3, 4]);
                list.splice(2, 0, 0.5);
                listener.assertSameAsArray([0, "begin", 0.5, 1, 2, 3, "hello", 4]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([0, 0.5, 1, 2, 3, 4]);
                list.length = 3;
                listener.assertSameAsArray([0, "begin", 0.5]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([0, 0.5]);
                list.setAt(3, 56);
                listener.assertSameAsArray([0, "begin", 0.5, 56]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([0, 0.5, 56]);
            }

            testFilter2() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                var filtered = list.createFiltered(function (item) { return item.toString().length === 1; });
                var filteredListener = new ListListener(filtered);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([1, 2, 3]);
                list.push("hello");
                listener.assertSameAsArray([1, 2, 3, "hello"]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([1, 2, 3]);
                list.push(4);
                listener.assertSameAsArray([1, 2, 3, "hello", 4]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([1, 2, 3, 4]);
                list.unshift("begin");
                listener.assertSameAsArray(["begin", 1, 2, 3, "hello", 4]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([1, 2, 3, 4]);
                list.unshift(0);
                listener.assertSameAsArray([0, "begin", 1, 2, 3, "hello", 4]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([0, 1, 2, 3, 4]);
                list.splice(2, 0, 0.5);
                listener.assertSameAsArray([0, "begin", 0.5, 1, 2, 3, "hello", 4]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([0, 1, 2, 3, 4]);
                list.length = 3;
                listener.assertSameAsArray([0, "begin", 0.5]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([0]);
                list.setAt(3, 56);
                listener.assertSameAsArray([0, "begin", 0.5, 56]);
                listener.assertSameAsArray(data);
                filteredListener.assertSameAsArray([0]);
            }

            testForEach() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                var a = [1, 2, 3]
                listener.assertSameAsArray(a);
                listener.assertSameAsArray(data);
                var pos = 0;
                list.forEach(function (item, index) {
                    LiveUnit.Assert.areEqual(pos, index);
                    LiveUnit.Assert.areEqual(a[index], item);
                    LiveUnit.Assert.areEqual(a[index], list.getAt(index));
                    pos++;
                });
                LiveUnit.Assert.areEqual(pos, a.length);
            }

            // @TODO, test that the thisObject parameter is used correctly
            // @TODO, test that the callback arguments are passed correctly
            testEvery() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1, 2);
                listener.assertSameAsArray([1, 2]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.isTrue(list.every(function (item) { return typeof item === "number"; }));
                list.push(3);
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.isTrue(list.every(function (item) { return typeof item === "number"; }));
                list.setAt(3, 7);
                listener.assertSameAsArray([1, 2, 3, 7]);
                listener.assertSameAsArray(data);
                var count = 0;
                LiveUnit.Assert.isTrue(list.every(function (item) { count++; return typeof item === "number"; }));
                LiveUnit.Assert.areEqual(4, count);
                list.length = 0;
                listener.assertSameAsArray([]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.isTrue(list.every(function (item) { return typeof item === "number"; }));
                list.push("hello");
                listener.assertSameAsArray(["hello"]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.isFalse(list.every(function (item) { return typeof item === "number"; }));
                list.push(7);
                listener.assertSameAsArray(["hello", 7]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.isFalse(list.every(function (item) { return typeof item === "number"; }));
            }

            testMap() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                var result = list.map(function (item) { return item * 2; });
                assertSequenceEquals([2, 4, 6], result);
            }

            // @TODO, test that the thisObject parameter is used correctly
            // @TODO, test that the callback arguments are passed correctly
            testSome() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1, 2);
                listener.assertSameAsArray([1, 2]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.isTrue(list.some(function (item) { return typeof item === "number"; }));
                list.push(3);
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.isTrue(list.some(function (item) { return typeof item === "number"; }));
                list.pop();
                list.pop();
                list.pop();
                listener.assertSameAsArray([]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.isFalse(list.some(function (item) { return typeof item === "number"; }));
                list.push("hello");
                listener.assertSameAsArray(["hello"]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.isFalse(list.some(function (item) { return typeof item === "number"; }));
                list.setAt(1, 7);
                listener.assertSameAsArray(["hello", 7]);
                listener.assertSameAsArray(data);
                var count = 0;
                LiveUnit.Assert.isTrue(list.some(function (item) { count++; return typeof item === "number"; }));
                LiveUnit.Assert.areEqual(2, count);
            }

            testReduce() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push("Hello ", "my ", "friend ");
                listener.assertSameAsArray(["Hello ", "my ", "friend "]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.areEqual("Hello my friend ", list.reduce(function (n, m) { return n + m; }, ""));
            }

            testReduceRight() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push("Hello ", "my ", "friend ");
                listener.assertSameAsArray(["Hello ", "my ", "friend "]);
                listener.assertSameAsArray(data);
                LiveUnit.Assert.areEqual("friend my Hello ", list.reduceRight(function (n, m) { return n + m; }, ""));
            }

            testGrouped() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                var grouped = list.createGrouped(
                    function (num) {
                        return (num % 2 === 0) ? "even" : "odd";
                    },
                    function (num) {
                        return (num % 2 === 0) ? "even" : "odd";
                    }
                );
                var groupedListener = new ListListener(grouped);
                var groupsListener = new ListListener(grouped.groups);
                list.push(1, 2, 3, 4);
                listener.assertSameAsArray([1, 2, 3, 4]);
                listener.assertSameAsArray(data);
                groupedListener.assertSameAsArray([2, 4, 1, 3]);
                groupsListener.assertSameAsArray(["even", "odd"]);
                list.splice(2, 0, 5);
                listener.assertSameAsArray([1, 2, 5, 3, 4]);
                listener.assertSameAsArray(data);
                groupedListener.assertSameAsArray([2, 4, 1, 5, 3]);
                groupsListener.assertSameAsArray(["even", "odd"]);
                list.splice(1, 1);
                list.splice(3, 1);
                listener.assertSameAsArray([1, 5, 3]);
                listener.assertSameAsArray(data);
                groupedListener.assertSameAsArray([1, 5, 3]);
                groupsListener.assertSameAsArray(["odd"]);
                list.push(2);
                listener.assertSameAsArray([1, 5, 3, 2]);
                listener.assertSameAsArray(data);
                groupedListener.assertSameAsArray([2, 1, 5, 3]);
                groupsListener.assertSameAsArray(["even", "odd"]);
            }

            testLength() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                // You can set the length property to truncate an array at any time. When you extend an array by
                // changing its length property, the number of actual elements does not increase; for example,
                // if you set length to 3 when it is currently 2, the array still contains only 2 elements.
                list.length = 12;
                LiveUnit.Assert.areEqual(0, list.length);
                LiveUnit.Assert.areEqual(0, data.length);
                var count = 0;
                list.forEach(function () { count++; });
                LiveUnit.Assert.areEqual(0, count);
                list.length = 0;
                LiveUnit.Assert.areEqual(0, list.length);
                // Note that the ListListener doesn't work perfectly against sparse arrays and the reason is that the
                // List doesn't communicate things like length change, it communicates element addition/modification/removal
                // which should be enough information to be faithful except when there are trailing empty slots in the array
                listener.assertSameAsArray([]);
                listener.assertSameAsArray(data);
                list.push(1, 2, 3);
                LiveUnit.Assert.areEqual(3, list.length);
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                list.length = 10;
                LiveUnit.Assert.areEqual(3, list.length);
                list.length = 1;
                LiveUnit.Assert.areEqual(1, list.length);
                listener.assertSameAsArray([1]);
                listener.assertSameAsArray(data);
            }

            testSet() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.setAt(0, 1);
                listener.assertSameAsArray([1]);
                listener.assertSameAsArray(data);
                list.setAt(1, 2);
                listener.assertSameAsArray([1, 2]);
                listener.assertSameAsArray(data);
                list.setAt(0, 3);
                listener.assertSameAsArray([3, 2]);
                listener.assertSameAsArray(data);
                list.setAt(2, 4);
                listener.assertSameAsArray([3, 2, 4]);
                listener.assertSameAsArray(data);
                list.setAt(3, 5);
                listener.assertSameAsArray([3, 2, 4, 5]);
                listener.assertSameAsArray(data);
                list.setAt(2, 6);
                listener.assertSameAsArray([3, 2, 6, 5]);
                listener.assertSameAsArray(data);
            }

            testMove() {
                var data = [];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                list.move(0, 1);
                listener.assertSameAsArray([2, 1, 3]);
                listener.assertSameAsArray(data);
            }

            testInitializeWithData() {
                var data = [1, 2, 3];
                var list = new List(data, { proxy: true });
                var listener = new ListListener(list);
                listener.assertSameAsArray([1, 2, 3]);
                listener.assertSameAsArray(data);
                list.push(4);
                listener.assertSameAsArray([1, 2, 3, 4]);
                listener.assertSameAsArray(data);
                list.setAt(0, 5);
                listener.assertSameAsArray([5, 2, 3, 4]);
                listener.assertSameAsArray(data);
            }

            testIndexOfKeyOnEmptyList() {
                var list = new List();
                LiveUnit.Assert.areEqual(-1, list.indexOf("2"));
            }
            testListBaseFilter = function () {

                var options = [undefined, { binding: true }, { proxy: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [1, "string1", 2, "string2", 3, 4, 5, "string3"];

                    var list = new List<any>(arr, options[i]);
                    var even = list.filter(function (n) { return n % 2 === 0 });
                    var odd = list.filter(function (n) { return n % 2 === 1});
                    var string = list.filter(function (n) { return typeof n === "string"; });
                    var undefinedArr = list.filter(function (n) { return n === undefined });

                    LiveUnit.Assert.isTrue(checkArrayContent(even, [2, 4]));
                    LiveUnit.Assert.isTrue(checkArrayContent(odd, [1, 3, 5]));
                    LiveUnit.Assert.isTrue(checkArrayContent(string, ["string1", "string2", "string3"]));
                    LiveUnit.Assert.areEqual(0, undefinedArr.length);

                    LiveUnit.Assert.isTrue(verifyListContent(list, arr));
                    LiveUnit.Assert.areEqual(8, list.length);

                    var falsyArr = [1, 2, NaN, 3, "", undefined, false, 3];
                    var falsyList = new List(falsyArr, options[i]);
                    var falsy = falsyList.filter(function (l) { return !l; });

                    LiveUnit.Assert.areEqual(4, falsy.length, "making sure that the length of the falsy array is correct");
                    LiveUnit.Assert.areEqual(8, falsyList.length, "making sure that the length of the falsy list is correct");
                }
            }
        };

        export class ListProjections {

            testPopFromEmptyGrouped() {
                var list = new List<number>();
                var listener = new ListListener(list);
                var grouped = list.createGrouped(
                    function (num) {
                        return (num % 2 === 0) ? "even" : "odd";
                    },
                    function (num) {
                        return (num % 2 === 0) ? "even" : "odd";
                    },
                    // reverse sort the groups
                    function (l, r) {
                        return l < r ? 1 : l === r ? 0 : -1;
                    }
                );
                var groupedListener = new ListListener(grouped);
                var groupsListener = new ListListener(grouped.groups);
                list.pop();
            }

            testDispose() {
                var list = new List<number>();
                var listener = new ListListener(list);
                var sorted = list.createSorted(function (l, r) { return l - r; });
                var sortedListener = new ListListener(sorted);
                var reverse = list.createSorted(function (l, r) { return r - l; });
                var reverseListener = new ListListener(reverse);
                list.push(1, 3, 4, 2, 6, 5);
                listener.assertSameAsArray([1, 3, 4, 2, 6, 5]);
                sortedListener.assertSameAsArray([1, 2, 3, 4, 5, 6]);
                reverseListener.assertSameAsArray([6, 5, 4, 3, 2, 1]);
                list.splice(3, 0, 7);
                sortedListener.assertSameAsArray([1, 2, 3, 4, 5, 6, 7]);
                reverseListener.assertSameAsArray([7, 6, 5, 4, 3, 2, 1]);
                var reloadCount = sortedListener.notificationCounts.reload;
                sorted.dispose();
                sortedListener.assertSameAsArray([]);
                LiveUnit.Assert.areEqual(reloadCount + 1, sortedListener.notificationCounts.reload);
                list.splice(3, 0, 8);
                sortedListener.assertSameAsArray([]);
                reverseListener.assertSameAsArray([8, 7, 6, 5, 4, 3, 2, 1]);
            }

            testSorted() {
                var list = new List<number>();
                var listener = new ListListener(list);
                var sorted = list.createSorted(function (l, r) { return l - r; });
                var sortedListener = new ListListener(sorted);
                var reverse = list.createSorted(function (l, r) { return r - l; });
                var reverseListener = new ListListener(reverse);
                list.push(1, 3, 4, 2, 6, 5);
                listener.assertSameAsArray([1, 3, 4, 2, 6, 5]);
                sortedListener.assertSameAsArray([1, 2, 3, 4, 5, 6]);
                reverseListener.assertSameAsArray([6, 5, 4, 3, 2, 1]);
                list.splice(3, 0, 7);
                sortedListener.assertSameAsArray([1, 2, 3, 4, 5, 6, 7]);
                reverseListener.assertSameAsArray([7, 6, 5, 4, 3, 2, 1]);
            }

            testSortedSimple() {
                var list = new List<number>();
                var listener = new ListListener(list);
                var sorted = list.createSorted(function (l, r) { return l - r; });
                var sortedListener = new ListListener(sorted);
                list.push(1, 3, 2);
                listener.assertSameAsArray([1, 3, 2]);
                sortedListener.assertSameAsArray([1, 2, 3]);
            }

            testSortedAtCreation() {
                var list = new List<number>([1, 3, 4, 2, 6, 5]);
                var listener = new ListListener(list);
                var sorted = list.createSorted(function (l, r) { return l - r; });
                var sortedListener = new ListListener(sorted);
                var reverse = list.createSorted(function (l, r) { return r - l; });
                var reverseListener = new ListListener(reverse);
                listener.assertSameAsArray([1, 3, 4, 2, 6, 5]);
                sortedListener.assertSameAsArray([1, 2, 3, 4, 5, 6]);
                reverseListener.assertSameAsArray([6, 5, 4, 3, 2, 1]);
            }

            testSortedRemove() {
                var list = new List<number>();
                var listener = new ListListener(list);
                var sorted = list.createSorted(function (l, r) { return l - r; });
                var sortedListener = new ListListener(sorted);
                list.push(1, 3, 2);
                listener.assertSameAsArray([1, 3, 2]);
                sortedListener.assertSameAsArray([1, 2, 3]);
                // note that here we're editing through the projection and seeing it
                // reflected in the underlying list
                sorted.splice(1, 1);
                listener.assertSameAsArray([1, 3]);
                sortedListener.assertSameAsArray([1, 3]);
                list.splice(0, 1);
                listener.assertSameAsArray([3]);
                sortedListener.assertSameAsArray([3]);
            }

            testGrouped() {
                var list = new List<number>();
                var listener = new ListListener(list);
                var grouped = list.createGrouped(
                    function (num) {
                        return (num % 2 === 0) ? "even" : "odd";
                    },
                    function (num) {
                        return (num % 2 === 0) ? "even" : "odd";
                    }
                );
                var groupedListener = new ListListener(grouped);
                var groupsListener = new ListListener(grouped.groups);
                list.push(1, 2, 3, 4);
                listener.assertSameAsArray([1, 2, 3, 4]);
                groupedListener.assertSameAsArray([2, 4, 1, 3]);
                groupsListener.assertSameAsArray(["even", "odd"]);
                list.splice(2, 0, 5);
                listener.assertSameAsArray([1, 2, 5, 3, 4]);
                groupedListener.assertSameAsArray([2, 4, 1, 5, 3]);
                groupsListener.assertSameAsArray(["even", "odd"]);
                list.splice(1, 1);
                list.splice(3, 1);
                listener.assertSameAsArray([1, 5, 3]);
                groupedListener.assertSameAsArray([1, 5, 3]);
                groupsListener.assertSameAsArray(["odd"]);
                list.push(2);
                listener.assertSameAsArray([1, 5, 3, 2]);
                groupedListener.assertSameAsArray([2, 1, 5, 3]);
                groupsListener.assertSameAsArray(["even", "odd"]);
            }

            testGroupSorted() {
                var list = new List<number>();
                var listener = new ListListener(list);
                var grouped = list.createGrouped(
                    function (num) {
                        return (num % 2 === 0) ? "even" : "odd";
                    },
                    function (num) {
                        return (num % 2 === 0) ? "even" : "odd";
                    },
                // reverse sort the groups
                    function (l, r) {
                        return l < r ? 1 : l === r ? 0 : -1;
                    }
                );
                var groupedListener = new ListListener(grouped);
                var groupsListener = new ListListener(grouped.groups);
                list.push(1, 2, 3, 4);
                listener.assertSameAsArray([1, 2, 3, 4]);
                groupedListener.assertSameAsArray([1, 3, 2, 4]);
                groupsListener.assertSameAsArray(["odd", "even"]);
                list.splice(2, 0, 5);
                listener.assertSameAsArray([1, 2, 5, 3, 4]);
                groupedListener.assertSameAsArray([1, 5, 3, 2, 4]);
                groupsListener.assertSameAsArray(["odd", "even"]);
                list.splice(1, 1);
                list.splice(3, 1);
                listener.assertSameAsArray([1, 5, 3]);
                groupedListener.assertSameAsArray([1, 5, 3]);
                groupsListener.assertSameAsArray(["odd"]);
                list.push(2);
                listener.assertSameAsArray([1, 5, 3, 2]);
                groupedListener.assertSameAsArray([1, 5, 3, 2]);
                groupsListener.assertSameAsArray(["odd", "even"]);
            }

            testFilter() {
                var list = new List();
                var listener = new ListListener(list);
                var filtered = list.createFiltered(function (item) { return typeof item === "number"; });
                var filteredListener = new ListListener(filtered);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                filteredListener.assertSameAsArray([1, 2, 3]);
                list.push("hello");
                listener.assertSameAsArray([1, 2, 3, "hello"]);
                filteredListener.assertSameAsArray([1, 2, 3]);
                list.push(4);
                listener.assertSameAsArray([1, 2, 3, "hello", 4]);
                filteredListener.assertSameAsArray([1, 2, 3, 4]);
                list.unshift("begin");
                listener.assertSameAsArray(["begin", 1, 2, 3, "hello", 4]);
                filteredListener.assertSameAsArray([1, 2, 3, 4]);
                list.unshift(0);
                listener.assertSameAsArray([0, "begin", 1, 2, 3, "hello", 4]);
                filteredListener.assertSameAsArray([0, 1, 2, 3, 4]);
                list.splice(2, 0, 0.5);
                listener.assertSameAsArray([0, "begin", 0.5, 1, 2, 3, "hello", 4]);
                filteredListener.assertSameAsArray([0, 0.5, 1, 2, 3, 4]);
                list.length = 3;
                listener.assertSameAsArray([0, "begin", 0.5]);
                filteredListener.assertSameAsArray([0, 0.5]);
                list.setAt(3, 56);
                listener.assertSameAsArray([0, "begin", 0.5, 56]);
                filteredListener.assertSameAsArray([0, 0.5, 56]);
            }

            testFilter2() {
                var list = new List();
                var listener = new ListListener(list);
                var filtered = list.createFiltered(function (item) { return item.toString().length === 1; });
                var filteredListener = new ListListener(filtered);
                list.push(1, 2, 3);
                listener.assertSameAsArray([1, 2, 3]);
                filteredListener.assertSameAsArray([1, 2, 3]);
                list.push("hello");
                listener.assertSameAsArray([1, 2, 3, "hello"]);
                filteredListener.assertSameAsArray([1, 2, 3]);
                list.push(4);
                listener.assertSameAsArray([1, 2, 3, "hello", 4]);
                filteredListener.assertSameAsArray([1, 2, 3, 4]);
                list.unshift("begin");
                listener.assertSameAsArray(["begin", 1, 2, 3, "hello", 4]);
                filteredListener.assertSameAsArray([1, 2, 3, 4]);
                list.unshift(0);
                listener.assertSameAsArray([0, "begin", 1, 2, 3, "hello", 4]);
                filteredListener.assertSameAsArray([0, 1, 2, 3, 4]);
                list.splice(2, 0, 0.5);
                listener.assertSameAsArray([0, "begin", 0.5, 1, 2, 3, "hello", 4]);
                filteredListener.assertSameAsArray([0, 1, 2, 3, 4]);
                list.length = 3;
                listener.assertSameAsArray([0, "begin", 0.5]);
                filteredListener.assertSameAsArray([0]);
                list.setAt(3, 56);
                listener.assertSameAsArray([0, "begin", 0.5, 56]);
                filteredListener.assertSameAsArray([0]);
                list.splice(0, 1);
                listener.assertSameAsArray(["begin", 0.5, 56]);
                filteredListener.assertSameAsArray([]);
            }

            testBindingIntegrationFilter(complete) {
                var list = new List<any>(null, { binding: true });
                list.push({ a: 1 });
                var item = list.getItem(0);
                item.data.bind("a", function () {
                    list._notifyMutatedFromKey(item.key);
                });

                var filtered = list.createFiltered(function (o) { return typeof o.a === "number"; });
                LiveUnit.Assert.areEqual(1, list.length);
                LiveUnit.Assert.areEqual(1, filtered.length);

                list.getAt(0).a = "some string";
                WinJS.Utilities.Scheduler.schedulePromiseNormal()
                    .then(function () {
                        LiveUnit.Assert.areEqual(1, list.length);
                        LiveUnit.Assert.areEqual(0, filtered.length);

                        list.getAt(0).a = 12;
                    })
                    .then(post)
                    .then(function () {
                        LiveUnit.Assert.areEqual(1, list.length);
                        LiveUnit.Assert.areEqual(1, filtered.length);

                        filtered.getAt(0).a = "another string";
                    })
                    .then(post)
                    .then(function () {
                        LiveUnit.Assert.areEqual(1, list.length);
                        LiveUnit.Assert.areEqual(0, filtered.length);
                    })
                    .then(null, errorHandler)
                    .then(complete);
            }

            testManualBindingIntegrationFilter(complete) {
                var list = new List<{a:any}>();
                var filtered = list.createFiltered(function (o) { return typeof o.a === "number"; });
                var listListener = new ListListener(list);
                var filteredListener = new ListListener(filtered);
                list.push({ a: 1 });

                WinJS.Promise.wrap().
                    then(post).then(function () {
                        listListener.assertLengthChangedCount(2);
                        filteredListener.assertLengthChangedCount(2);
                        LiveUnit.Assert.areEqual(1, list.length);
                        LiveUnit.Assert.areEqual(1, filtered.length);
                    }).then(post).then(function () {
                        list.getAt(0).a = "some string";
                        list.notifyMutated(0);
                        LiveUnit.Assert.areEqual(1, list.length);
                        LiveUnit.Assert.areEqual(0, filtered.length);
                    }).then(post).then(function () {
                        listListener.assertLengthChangedCount(2);
                        filteredListener.assertLengthChangedCount(3);

                        list.getAt(0).a = 12;
                        list.notifyMutated(0);
                        LiveUnit.Assert.areEqual(1, list.length);
                        LiveUnit.Assert.areEqual(1, filtered.length);
                    }).then(post).then(function () {
                        listListener.assertLengthChangedCount(2);
                        filteredListener.assertLengthChangedCount(4);

                        filtered.getAt(0).a = "another string";
                        filtered.notifyMutated(0);
                        LiveUnit.Assert.areEqual(1, list.length);
                        LiveUnit.Assert.areEqual(0, filtered.length);
                    }).then(null, errorHandler).then(complete);
            }

            testChangedFilter() {
                var list = new List<{a:any}>();
                list.push({ a: 1 });

                var filtered = list.createFiltered(function (o) { return typeof o.a === "number"; });
                LiveUnit.Assert.areEqual(1, list.length);
                LiveUnit.Assert.areEqual(1, filtered.length);

                list.setAt(0, { a: "some string" });
                LiveUnit.Assert.areEqual(1, list.length);
                LiveUnit.Assert.areEqual(0, filtered.length);

                list.setAt(0, { a: 12 });
                list.notifyMutated(0);
                LiveUnit.Assert.areEqual(1, list.length);
                LiveUnit.Assert.areEqual(1, filtered.length);

                filtered.setAt(0, { a: "another string" });
                list.notifyMutated(0);
                LiveUnit.Assert.areEqual(1, list.length);
                LiveUnit.Assert.areEqual(0, filtered.length);
            }

            testMovedFilter() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(0, 1, 2);
                var filtered = list.createFiltered(function (o) { return typeof o === "number"; });
                var filteredListener = new ListListener(filtered);
                listener.assertSameAsArray([0, 1, 2]);
                filteredListener.assertSameAsArray([0, 1, 2]);
                list.move(0, 1);
                listener.assertSameAsArray([1, 0, 2]);
                filteredListener.assertSameAsArray([1, 0, 2]);
            }

            // This is a bit of a problem for grouping because we don't know what the old
            //  group key was. Maybe grouping just shouldn't support mutation, or at least
            //  not mutation that changes the group of something?
            //
            testManualBindingIntegrationGrouped() {
                var list = new List<{a:any}>();
                list.push({ a: 1 });

                var grouped = list.createGrouped(
                    function (o) {
                        return typeof o.a;
                    },
                    function (o) {
                        return typeof o.a;
                    }
                );
                var groupsListener = new ListListener(grouped.groups);
                groupsListener.assertSameAsArray(["number"]);

                list.getAt(0).a = "some string";
                list.notifyMutated(0);
                groupsListener.assertSameAsArray(["string"]);

                list.getAt(0).a = 12;
                list.notifyMutated(0);
                groupsListener.assertSameAsArray(["number"]);

                grouped.getAt(0).a = "another string";
                list.notifyMutated(0);
                groupsListener.assertSameAsArray(["string"]);
            }

            testChangedGrouped() {
                var list = new List<{a:any}>();
                list.push({ a: 1 });

                var grouped = list.createGrouped(
                    function (o) {
                        return typeof o.a;
                    },
                    function (o) {
                        return typeof o.a;
                    }
                );
                var groupsListener = new ListListener(grouped.groups);
                groupsListener.assertSameAsArray(["number"]);

                list.setAt(0, { a: "some string" });
                groupsListener.assertSameAsArray(["string"]);

                list.setAt(0, { a: 12 });
                groupsListener.assertSameAsArray(["number"]);

                grouped.setAt(0, { a: "another string" });
                groupsListener.assertSameAsArray(["string"]);
            }

            testChangedGroupedWithoutChangingGroups() {
                var list = new List<{a:any}>();
                list.push({ a: 1 });

                var grouped = list.createGrouped(
                    function (o) {
                        return "one";
                    },
                    function (o) {
                        return o.a;
                    }
                );
                var groupsListener = new ListListener(grouped.groups);
                groupsListener.assertSameAsArray([1]);

                list.setAt(0, { a: "some string" });
                groupsListener.assertSameAsArray(["some string"]);

                list.setAt(0, { a: 12 });
                groupsListener.assertSameAsArray([12]);

                grouped.setAt(0, { a: "another string" });
                groupsListener.assertSameAsArray(["another string"]);
            }

            testMovedGrouped() {
                var list = new List();
                var listener = new ListListener(list);
                list.push(0, 1, 2);
                var grouped = list.createGrouped(
                    function (o) {
                        return typeof o;
                    },
                    function (o) {
                        return typeof o;
                    }
                );
                var groupedListener = new ListListener(grouped);
                var groupsListener = new ListListener(grouped.groups);
                groupsListener.assertSameAsArray(["number"]);
                groupedListener.assertSameAsArray([0, 1, 2]);
                listener.assertSameAsArray([0, 1, 2]);
                list.move(0, 1);
                listener.assertSameAsArray([1, 0, 2]);
                groupedListener.assertSameAsArray([1, 0, 2]);
                groupsListener.assertSameAsArray(["number"]);
            }

            testManualBindingIntegrationSorted() {
                var list = new List<{a:number}>();
                list.push({ a: 1 }, { a: 2 });

                var sorted = list.createSorted(function (l, r) { return r.a - l.a; });
                LiveUnit.Assert.areEqual(2, sorted.getAt(0).a);
                LiveUnit.Assert.isTrue(list.getAt(1) === sorted.getAt(0));
                LiveUnit.Assert.areEqual(1, sorted.getAt(1).a);
                LiveUnit.Assert.isTrue(list.getAt(0) === sorted.getAt(1));

                list.getAt(0).a = 3;
                list.notifyMutated(0);
                LiveUnit.Assert.areEqual(3, sorted.getAt(0).a);
                LiveUnit.Assert.isTrue(list.getAt(0) === sorted.getAt(0));
                LiveUnit.Assert.areEqual(2, sorted.getAt(1).a);
                LiveUnit.Assert.isTrue(list.getAt(1) === sorted.getAt(1));

                sorted.getAt(0).a = 0;
                sorted.notifyMutated(0);
                LiveUnit.Assert.areEqual(2, sorted.getAt(0).a);
                LiveUnit.Assert.isTrue(list.getAt(1) === sorted.getAt(0));
                LiveUnit.Assert.areEqual(0, sorted.getAt(1).a);
                LiveUnit.Assert.isTrue(list.getAt(0) === sorted.getAt(1));
            }

            testChangedSorted() {
                var list = new List<number>();
                var listener = new ListListener(list);
                list.push(2, 1, 3);
                var sorted = list.createSorted(function (l, r) { return r - l; });
                var sortedListener = new ListListener(sorted);
                listener.assertSameAsArray([2, 1, 3]);
                sortedListener.assertSameAsArray([3, 2, 1]);
                list.setAt(0, 7);
                listener.assertSameAsArray([7, 1, 3]);
                sortedListener.assertSameAsArray([7, 3, 1]);
                sorted.setAt(0, 8);
                listener.assertSameAsArray([8, 1, 3]);
                sortedListener.assertSameAsArray([8, 3, 1]);
                sorted.setAt(0, 2);
                listener.assertSameAsArray([2, 1, 3]);
                sortedListener.assertSameAsArray([3, 2, 1]);
            }

            testMovedSorted() {
                var list = new List<number>();
                var listener = new ListListener(list);
                list.push(0, 1, 2);
                var sorted = list.createSorted(function (l, r) { return r - l; });
                var sortedListener = new ListListener(sorted);
                listener.assertSameAsArray([0, 1, 2]);
                sortedListener.assertSameAsArray([2, 1, 0]);
                list.move(0, 1);
                listener.assertSameAsArray([1, 0, 2]);
                sortedListener.assertSameAsArray([2, 1, 0]);
            }

            testBindingWithSortedProjection() {

                var data = [{ a: 1, b: 2 }, { a: 2, b: 3 }, { a: -1, b: 3 }, { a: 0, b: 4 }];
                var list = new List(data, { binding: true });
                var sorted = list.createSorted(function (l, r) { return l.a - r.a; });

                function verifySorted(arr) {

                    for (var i = 0; i < arr.length; i++) {
                        if (arr[i] !== sorted.getAt(i).a) {
                            return false;
                        }
                    }
                    return true;
                }
                LiveUnit.Assert.isTrue(verifySorted([-1, 0, 1, 2]), "sorting is not correct");
                sorted.getAt(0).a = 4;
                sorted.notifyMutated(0);

                LiveUnit.Assert.isTrue(verifySorted([0, 1, 2, 4]), "sorting is not correct");
                sorted.push({ a: 0, b: 3 });
                LiveUnit.Assert.isTrue(verifySorted([0, 0, 1, 2, 4]), "sorting is not correct");
                LiveUnit.Assert.areEqual(4, sorted.getAt(0).b, "incorrect placement of an element");
            }
            testPushInFilteredList() {
                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List<number>(data);
                var listener = new ListListener(list);

                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var eListener = new ListListener(evenFiltered);
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var oListener = new ListListener(oddFiltered);

                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var peListener = new ListListener(positiveEvenFiltered);

                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var neListener = new ListListener(negativeEvenFiltered);

                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var poListener = new ListListener(positiveOddFiltered);

                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });
                var noListener = new ListListener(negativeOddFiltered);

                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6]);
                neListener.assertSameAsArray([-2, -4]);
                peListener.assertSameAsArray([2, 4, 6]);
                oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-1, -3, -5]);


                negativeOddFiltered.push(0, -20, 21, 20, -21);
                noListener.assertSameAsArray([-1, -3, -5, -21]);
            }
            testListFilter() {
                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });

                LiveUnit.Assert.areEqual(12, list.length, "list lenght is not correct");
                LiveUnit.Assert.areEqual(6, evenFiltered.length, "list lenght is not correct");
                LiveUnit.Assert.areEqual(6, oddFiltered.length, "list lenght is not correct");

                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });

                var listener = new ListListener(list);
                var eListener = new ListListener(evenFiltered);
                var oListener = new ListListener(oddFiltered);
                var peListener = new ListListener(positiveEvenFiltered);
                var neListener = new ListListener(negativeEvenFiltered);
                var poListener = new ListListener(positiveOddFiltered);
                var noListener = new ListListener(negativeOddFiltered);

                LiveUnit.Assert.areEqual(3, positiveEvenFiltered.length, "positive even Filtered list lenght is not correct");
                LiveUnit.Assert.areEqual(2, negativeEvenFiltered.length, "negative even Filtered list lenght is not correct");
                LiveUnit.Assert.areEqual(3, positiveOddFiltered.length, "positive odd Filtered list lenght is not correct");
                LiveUnit.Assert.areEqual(3, negativeOddFiltered.length, "negative odd Filtered list lenght is not correct");

                listener.assertSameAsArray(data);
                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6]);
                peListener.assertSameAsArray([2, 4, 6]);
                neListener.assertSameAsArray([-2, -4]);
                oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-1, -3, -5]);
                list.push(0, -100, 100, 101, -101);

                LiveUnit.Assert.areEqual(17, list.length, "list lenght is not correct after pushing new elements");
                LiveUnit.Assert.areEqual(9, evenFiltered.length, "list lenght is not correct after pushing new elements");
                LiveUnit.Assert.areEqual(8, oddFiltered.length, "list lenght is not correct after pushing new elements");
                LiveUnit.Assert.areEqual(4, positiveEvenFiltered.length, "positive even Filtered list lenght is not correct after pushing new elements");
                LiveUnit.Assert.areEqual(3, negativeEvenFiltered.length, "negative even Filtered list lenght is not correct after pushing new elements");
                LiveUnit.Assert.areEqual(4, positiveOddFiltered.length, "positive odd Filtered list lenght is not correct after pushing new elements");
                LiveUnit.Assert.areEqual(4, negativeOddFiltered.length, "negative odd Filtered list lenght is not correct after pushing new elements");

                listener.assertSameAsArray([-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6, 0, -100, 100, 101, -101]);
                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6, 0, -100, 100]);
                peListener.assertSameAsArray([2, 4, 6, 100]);
                neListener.assertSameAsArray([-2, -4, -100]);
                oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5, 101, -101]);
                poListener.assertSameAsArray([1, 3, 5, 101]);
                noListener.assertSameAsArray([-1, -3, -5, -101]);
                list.setAt(0, 0);

                LiveUnit.Assert.areEqual(17, list.length, "list lenght is not correct after setting the value of existing elements");
                LiveUnit.Assert.areEqual(10, evenFiltered.length, "list lenght is not correct after setting the value of existing elements");
                LiveUnit.Assert.areEqual(7, oddFiltered.length, "list lenght is not correct after setting the value of existing elements");
                LiveUnit.Assert.areEqual(4, positiveEvenFiltered.length, "positive even Filtered list lenght is not correct after setting the value of existing elements");
                LiveUnit.Assert.areEqual(3, negativeEvenFiltered.length, "negative even Filtered list lenght is not correct after setting the value of existing elements");
                LiveUnit.Assert.areEqual(4, positiveOddFiltered.length, "positive odd Filtered list lenght is not correct after setting the value of existing elements");
                LiveUnit.Assert.areEqual(3, negativeOddFiltered.length, "negative odd Filtered list lenght is not correct after setting the value of existing elements");

                listener.assertSameAsArray([0, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6, 0, -100, 100, 101, -101]);
                eListener.assertSameAsArray([0, -2, -4, 0, 2, 4, 6, 0, -100, 100]);
                peListener.assertSameAsArray([2, 4, 6, 100]);
                neListener.assertSameAsArray([-2, -4, -100]);
                oListener.assertSameAsArray([-3, -5, 1, 3, 5, 101, -101]);
                poListener.assertSameAsArray([1, 3, 5, 101]);
                noListener.assertSameAsArray([-3, -5, -101]);

                var result = [0, -2, 4, -4, -5, 0, 1, 2, 3, 4, 5, 6, 0, -100, 100, 101, -101];
                negativeOddFiltered.setAt(0, 4);
                listener.assertSameAsArray(result);
                eListener.assertSameAsArray([0, -2, 4, -4, 0, 2, 4, 6, 0, -100, 100]);
                peListener.assertSameAsArray([4, 2, 4, 6, 100]);
                neListener.assertSameAsArray([-2, -4, -100]);
                oListener.assertSameAsArray([-5, 1, 3, 5, 101, -101]);
                poListener.assertSameAsArray([1, 3, 5, 101]);
                noListener.assertSameAsArray([-5, -101]);

                negativeOddFiltered.push(0, -20, 21, 20, -21);//negativeOddFiltered, [-5, -101, 0, -20, 21, 20, -21]
                result.push(0, -20, 21, 20, -21);
                listener.assertSameAsArray(result);

                positiveOddFiltered.push(22, 0, -23, 23, -22);
                result.push(22, 0, -23, 23, -22);
                listener.assertSameAsArray(result);

                negativeEvenFiltered.push(24, 0, -24, -25, 25);
                result.push(24, 0, -24, -25, 25);
                listener.assertSameAsArray(result);

                positiveEvenFiltered.push(-26, 27, 0, -27, 27);
                result.push(-26, 27, 0, -27, 27);
                listener.assertSameAsArray(result);

                eListener.assertSameAsArray([0, -2, 4, -4, 0, 2, 4, 6, 0, -100, 100, 0, -20, 20, 22, 0, -22, 24, 0, -24, -26, 0]);
                peListener.assertSameAsArray([4, 2, 4, 6, 100, 20, 22, 24]);
                neListener.assertSameAsArray([-2, -4, -100, -20, -22, -24, -26]);
                oListener.assertSameAsArray([-5, 1, 3, 5, 101, -101, 21, -21, -23, 23, -25, 25, 27, -27, 27]);
                poListener.assertSameAsArray([1, 3, 5, 101, 21, 23, 25, 27, 27]);
                noListener.assertSameAsArray([-5, -101, -21, -23, -25, -27]);

            }
            testListFilterSetAt() {
                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });
                var listener = new ListListener(list);
                var eListener = new ListListener(evenFiltered);
                var oListener = new ListListener(oddFiltered);
                var peListener = new ListListener(positiveEvenFiltered);
                var neListener = new ListListener(negativeEvenFiltered);
                var poListener = new ListListener(positiveOddFiltered);
                var noListener = new ListListener(negativeOddFiltered);

                listener.assertSameAsArray(data);
                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6]);
                peListener.assertSameAsArray([2, 4, 6]);
                neListener.assertSameAsArray([-2, -4]);
                oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-1, -3, -5]);

                negativeOddFiltered.setAt(0, 5);                // [5, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6]
                positiveOddFiltered.setAt(0, 101);              // [101, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6]
                oddFiltered.setAt(oddFiltered.length - 1, 201); // [101, -2, -3, -4, -5, 0, 1, 2, 3, 4, 201, 6]
                evenFiltered.setAt(2, 2);                       // [101, -2, -3, -4, -5, 2, 1, 2, 3, 4, 201, 6]
                positiveEvenFiltered.setAt(0, -2);              // [101, -2, -3, -4, -5, -2, 1, 2, 3, 4, 201, 6]
                negativeEvenFiltered.setAt(1, 3);               // [101, -2, -3, 3, -5, -2, 1, 2, 3, 4, 201, 6]

                var result = [101, -2, -3, 3, -5, -2, 1, 2, 3, 4, 201, 6];
                listener.assertSameAsArray(result);
                eListener.assertSameAsArray([-2, -2, 2, 4, 6]);
                peListener.assertSameAsArray([2, 4, 6]);
                neListener.assertSameAsArray([-2, -2]);
                oListener.assertSameAsArray([101, -3, 3, -5, 1, 3, 201]);
                poListener.assertSameAsArray([101, 3, 1, 3, 201]);
                noListener.assertSameAsArray([-3, -5]);
            }
            testSpliceDifferentScenariosFilteredProjection() {
                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });

                var listener = new ListListener(list);
                var eListener = new ListListener(evenFiltered);
                var oListener = new ListListener(oddFiltered);
                var peListener = new ListListener(positiveEvenFiltered);
                var neListener = new ListListener(negativeEvenFiltered);
                var poListener = new ListListener(positiveOddFiltered);
                var noListener = new ListListener(negativeOddFiltered);

                listener.assertSameAsArray(data);

                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6]);
                neListener.assertSameAsArray([-2, -4]);
                peListener.assertSameAsArray([2, 4, 6]);
                oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-1, -3, -5]);

                list.splice(0, 1);

                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6]);
                neListener.assertSameAsArray([-2, -4]);
                peListener.assertSameAsArray([2, 4, 6]);
                oListener.assertSameAsArray([-3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-3, -5]);

                evenFiltered.splice(0, 1);
                positiveEvenFiltered.splice(0, 1);
                negativeEvenFiltered.splice(0, 0, -10);
                oddFiltered.splice(2, 1);
                positiveOddFiltered.splice(10, 0, 11);

                listener.assertSameAsArray([-3, -10, -4, -5, 0, 3, 4, 5, 11, 6]);
                eListener.assertSameAsArray([-10, -4, 0, 4, 6]);
                neListener.assertSameAsArray([-10, -4]);
                peListener.assertSameAsArray([4, 6]);
                oListener.assertSameAsArray([-3, -5, 3, 5, 11]);
                poListener.assertSameAsArray([3, 5, 11]);
                noListener.assertSameAsArray([-3, -5]);

            }
            testFilteredListInvalidScenarios() {
                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });
                var listener = new ListListener(list);
                var eListener = new ListListener(evenFiltered);
                var oListener = new ListListener(oddFiltered);
                var peListener = new ListListener(positiveEvenFiltered);
                var neListener = new ListListener(negativeEvenFiltered);
                var poListener = new ListListener(positiveOddFiltered);
                var noListener = new ListListener(negativeOddFiltered);

                LiveUnit.Assert.areEqual(-1, negativeOddFiltered.indexOf(4), "testing Invalid value");
                LiveUnit.Assert.areEqual(-1, positiveEvenFiltered.indexOf(-4), "testing Invalid value");
                LiveUnit.Assert.areEqual(-1, negativeEvenFiltered.indexOf(4), "testing Invalid value");
                LiveUnit.Assert.areEqual(-1, positiveOddFiltered.indexOf(-5), "testing Invalid value");
                LiveUnit.Assert.areEqual(-1, evenFiltered.indexOf(5), "testing Invalid value");
                LiveUnit.Assert.areEqual(-1, oddFiltered.indexOf(4), "testing Invalid value");
                LiveUnit.Assert.areEqual(-1, list.indexOf(10), "testing Invalid value");


                LiveUnit.Assert.areEqual(undefined, negativeOddFiltered.getItem(list.length), "testing Invalid value");
                LiveUnit.Assert.areEqual(undefined, positiveEvenFiltered.getItem(-4), "testing Invalid value");
                LiveUnit.Assert.areEqual(undefined, negativeEvenFiltered.getItem(list.length), "testing Invalid value");
                LiveUnit.Assert.areEqual(undefined, positiveOddFiltered.getItem(-5), "testing Invalid value");
                LiveUnit.Assert.areEqual(undefined, evenFiltered.getItem(list.length), "testing Invalid value");
                LiveUnit.Assert.areEqual(undefined, oddFiltered.getItem(list.length), "testing Invalid value");
                LiveUnit.Assert.areEqual(undefined, list.getItem(list.length), "testing Invalid value");
            }

            testFilterIndexOfKey() {
                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });
                var listener = new ListListener(list);
                var eListener = new ListListener(evenFiltered);
                var oListener = new ListListener(oddFiltered);
                var peListener = new ListListener(positiveEvenFiltered);
                var neListener = new ListListener(negativeEvenFiltered);
                var poListener = new ListListener(positiveOddFiltered);
                var noListener = new ListListener(negativeOddFiltered);

                listener.assertSameAsArray(data);
                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6]);
                neListener.assertSameAsArray([-2, -4]);
                peListener.assertSameAsArray([2, 4, 6]);
                oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-1, -3, -5]);

                for (var i = 0; i < list.length; i++) {

                    LiveUnit.Assert.areEqual(i, list.indexOfKey(i.toString()), "wrong index of key");
                }
                var obj = [evenFiltered, oddFiltered, positiveEvenFiltered, negativeEvenFiltered, positiveOddFiltered, negativeOddFiltered];
                for (var i = 0; i < obj.length; i++) {
                    var count = 0;
                    for (var j = 0; j < list.length; j++) {
                        var flag = ((obj[i].indexOfKey(j.toString()) !== undefined) && (obj[i].indexOfKey(j.toString()) !== -1));
                        if (flag) {
                            LiveUnit.Assert.areEqual(list.getItemFromKey(j.toString()), obj[i].getItemFromKey(j.toString()), "wrong index of key");
                            count++;
                        }
                        else {
                            LiveUnit.Assert.areEqual(-1, obj[i].indexOf(list.getItemFromKey(j.toString()).data), "element is not there");
                        }

                    }
                    LiveUnit.Assert.areEqual(count, obj[i].length, "All keys are not tested correctly");
                }
            }
            testFilteredListGetItem() {
                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });

                var listener = new ListListener(list);
                var eListener = new ListListener(evenFiltered);
                var oListener = new ListListener(oddFiltered);
                var peListener = new ListListener(positiveEvenFiltered);
                var neListener = new ListListener(negativeEvenFiltered);
                var poListener = new ListListener(positiveOddFiltered);
                var noListener = new ListListener(negativeOddFiltered);
                listener.assertSameAsArray(data);
                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6]);
                neListener.assertSameAsArray([-2, -4]);
                peListener.assertSameAsArray([2, 4, 6]);
                oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-1, -3, -5]);

                var obj:any[] = [list, evenFiltered, oddFiltered, positiveEvenFiltered, negativeEvenFiltered, positiveOddFiltered, negativeOddFiltered];
                for (var i = 0; i < obj.length; i++) {
                    for (var j = 0; j < obj[i].length; j++) {
                        LiveUnit.Assert.areEqual(obj[i].getAt(j), obj[i].getItem(j).data, "testing getItem");
                    }
                }

            }
            testListFilterDispose() {
                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });


                var listener = new ListListener(list);
                var eListener = new ListListener(evenFiltered);
                var oListener = new ListListener(oddFiltered);
                var peListener = new ListListener(positiveEvenFiltered);
                var neListener = new ListListener(negativeEvenFiltered);
                var poListener = new ListListener(positiveOddFiltered);
                var noListener = new ListListener(negativeOddFiltered);
                listener.assertSameAsArray(data);
                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6]);
                neListener.assertSameAsArray([-2, -4]);
                peListener.assertSameAsArray([2, 4, 6]);
                oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-1, -3, -5]);

                var oReloadCount = oListener.notificationCounts.reload;
                var poReloadCount = poListener.notificationCounts.reload;
                var noReloadCount = noListener.notificationCounts.reload;
                oddFiltered.dispose();
                LiveUnit.Assert.areEqual(oReloadCount + 1, oListener.notificationCounts.reload);
                LiveUnit.Assert.areEqual(poReloadCount + 1, poListener.notificationCounts.reload);
                LiveUnit.Assert.areEqual(noReloadCount + 1, noListener.notificationCounts.reload);
                oListener.assertSameAsArray([]);
                poListener.assertSameAsArray([]);
                noListener.assertSameAsArray([]);
                list.push(1);
                oListener.assertSameAsArray([]);
                poListener.assertSameAsArray([]);
                noListener.assertSameAsArray([]);
            }

            testListFilterWithProxy() {
                var options = [undefined, { proxy: true }];
                var data = [-2, -4, 0, 2, 4, 6, -1, -3, -5, 1, 3, 5];

                for (var i = 0; i < options.length; i++) {
                    var list = new List(data, options[i]);
                    var listener = new ListListener(list);
                    var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                    var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                    var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                    var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                    var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                    var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });

                    var listener = new ListListener(list);
                    var eListener = new ListListener(evenFiltered);
                    var oListener = new ListListener(oddFiltered);
                    var peListener = new ListListener(positiveEvenFiltered);
                    var neListener = new ListListener(negativeEvenFiltered);
                    var poListener = new ListListener(positiveOddFiltered);
                    var noListener = new ListListener(negativeOddFiltered);
                    listener.assertSameAsArray(data);

                    list.push(0);
                    evenFiltered.push(4);
                    oddFiltered.push(1);
                    positiveEvenFiltered.push(2);
                    negativeEvenFiltered.push(-2);

                    eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6, 0, 4, 2, -2]);
                    neListener.assertSameAsArray([-2, -4, -2]);
                    peListener.assertSameAsArray([2, 4, 6, 4, 2]);
                    oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5, 1]);
                    poListener.assertSameAsArray([1, 3, 5, 1]);
                    noListener.assertSameAsArray([-1, -3, -5]);
                }
            }

            testFilterWithMutationOfFilterProperty() {
                var list = new List<{value:string}>();
                var sorted = list.createSorted(function (l, r) {
                    return l.value.localeCompare(r.value);
                });
                var filtered = sorted.createFiltered(function (item) {
                    return item.value[0] === "b";
                });

                var filteredListener = new ListListener(filtered, function (v) { return v.value; });

                list.push({ value: "a" });
                list.push({ value: "b55" });
                list.push({ value: "c" });

                filteredListener.assertSameAsArray([{ value: "b55" }]);

                var item = list.getAt(0);
                item.value = "b0";
                list.notifyMutated(0);
                list.push({ value: "b99" });
                list.push({ value: "b44" });

                filteredListener.assertSameAsArray([{ value: "b0" }, { value: "b44" }, { value: "b55" }, { value: "b99" }]);

                list.splice(0, 1);

                filteredListener.assertSameAsArray([{ value: "b44" }, { value: "b55" }, { value: "b99" }]);

                list.unshift({ value: "b22" });

                filteredListener.assertSameAsArray([{ value: "b22" }, { value: "b44" }, { value: "b55" }, { value: "b99" }]);
            }

            testMoveElementsToEndOfListInFilteredProjection() {
                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });

                var listener = new ListListener(list);
                var eListener = new ListListener(evenFiltered);
                var oListener = new ListListener(oddFiltered);
                var peListener = new ListListener(positiveEvenFiltered);
                var neListener = new ListListener(negativeEvenFiltered);
                var poListener = new ListListener(positiveOddFiltered);
                var noListener = new ListListener(negativeOddFiltered);
                listener.assertSameAsArray(data);
                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6]);
                neListener.assertSameAsArray([-2, -4]);
                peListener.assertSameAsArray([2, 4, 6]);
                oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-1, -3, -5]);

                negativeOddFiltered.move(0, 2);

                oListener.assertSameAsArray([-3, -5, -1, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-3, -5, -1]);
            }
            testMoveElementFilteredProjection() {

                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });
                var listener = new ListListener(list);
                var eListener = new ListListener(evenFiltered);
                var oListener = new ListListener(oddFiltered);
                var peListener = new ListListener(positiveEvenFiltered);
                var neListener = new ListListener(negativeEvenFiltered);
                var poListener = new ListListener(positiveOddFiltered);
                var noListener = new ListListener(negativeOddFiltered);
                listener.assertSameAsArray(data);
                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6]);
                neListener.assertSameAsArray([-2, -4]);
                peListener.assertSameAsArray([2, 4, 6]);
                oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-1, -3, -5]);


                list.move(0, list.length - 1);
                oListener.assertSameAsArray([-3, -5, 1, 3, 5, -1]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-3, -5, -1]);

            }
            testMoveElementstoBeginingInFilteredProjection() {

                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });
                var listener = new ListListener(list);
                var eListener = new ListListener(evenFiltered);
                var oListener = new ListListener(oddFiltered);
                var peListener = new ListListener(positiveEvenFiltered);
                var neListener = new ListListener(negativeEvenFiltered);
                var poListener = new ListListener(positiveOddFiltered);
                var noListener = new ListListener(negativeOddFiltered);

                listener.assertSameAsArray(data);
                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6]);
                neListener.assertSameAsArray([-2, -4]);
                peListener.assertSameAsArray([2, 4, 6]);
                oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-1, -3, -5]);

                negativeOddFiltered.move(2, 0);
                listener.assertSameAsArray([-5, -1, -2, -3, -4, 0, 1, 2, 3, 4, 5, 6]);
                oListener.assertSameAsArray([-5, -1, -3, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-5, -1, -3]);

                oddFiltered.move(1, 4);
                listener.assertSameAsArray([-5, -2, -3, -4, 0, 1, 2, 3, -1, 4, 5, 6]);
                oListener.assertSameAsArray([-5, -3, 1, 3, -1, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-5, -3, -1]);

                oddFiltered.move(2, 5);
                listener.assertSameAsArray([-5, -2, -3, -4, 0, 2, 3, -1, 4, 5, 1, 6]);
                oListener.assertSameAsArray([-5, -3, 3, -1, 5, 1]);
                poListener.assertSameAsArray([3, 5, 1]);
                noListener.assertSameAsArray([-5, -3, -1]);
            }
            testListFilterMutationScenarios() {

                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });

                var listener = new ListListener(list);
                var eListener = new ListListener(evenFiltered);
                var oListener = new ListListener(oddFiltered);
                var peListener = new ListListener(positiveEvenFiltered);
                var neListener = new ListListener(negativeEvenFiltered);
                var poListener = new ListListener(positiveOddFiltered);
                var noListener = new ListListener(negativeOddFiltered);

                listener.assertSameAsArray(data);
                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6]);
                neListener.assertSameAsArray([-2, -4]);
                peListener.assertSameAsArray([2, 4, 6]);
                oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-1, -3, -5]);


                list.move(0, list.length - 1);
                list.move(0, list.length - 2);
                list.unshift(21, 22, -21, -22);

                listener.assertSameAsArray([21, 22, -21, -22, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6, -2, -1]);
                eListener.assertSameAsArray([22, -22, -4, 0, 2, 4, 6, -2]);
                neListener.assertSameAsArray([-22, -4, -2]);
                peListener.assertSameAsArray([22, 2, 4, 6]);
                oListener.assertSameAsArray([21, -21, -3, -5, 1, 3, 5, -1]);
                poListener.assertSameAsArray([21, 1, 3, 5]);
                noListener.assertSameAsArray([-21, -3, -5, -1]);

                //test different mutations -pop - splice
                var increment = function (value, index) { list.setAt(index, list.getAt(index) + 1); }
                list.forEach(increment);

                listener.assertSameAsArray([22, 23, -20, -21, -2, -3, -4, 1, 2, 3, 4, 5, 6, 7, -1, 0]);
                eListener.assertSameAsArray([22, -20, -2, -4, 2, 4, 6, 0]);
                neListener.assertSameAsArray([-20, -2, -4]);
                peListener.assertSameAsArray([22, 2, 4, 6]);
                oListener.assertSameAsArray([23, -21, -3, 1, 3, 5, 7, -1]);
                poListener.assertSameAsArray([23, 1, 3, 5, 7]);
                noListener.assertSameAsArray([-21, -3, -1]);
                var reverse = function(value, index) { oddFiltered.setAt(index, -value); }
                oddFiltered.forEach(reverse);

                listener.assertSameAsArray([22, -23, -20, 21, -2, 3, -4, -1, 2, -3, 4, -5, 6, -7, 1, 0]);
                eListener.assertSameAsArray([22, -20, -2, -4, 2, 4, 6, 0]);
                peListener.assertSameAsArray([22, 2, 4, 6]);
                neListener.assertSameAsArray([-20, -2, -4]);
                oListener.assertSameAsArray([-23, 21, 3, -1, -3, -5, -7, 1]);
                noListener.assertSameAsArray([-23, -1, -3, -5, -7]);
                poListener.assertSameAsArray([21, 3, 1]);

            }
            testListFilterSplice() {

                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var result = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);


                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });
                var listener = new ListListener(list);
                var eListener = new ListListener(evenFiltered);
                var oListener = new ListListener(oddFiltered);
                var peListener = new ListListener(positiveEvenFiltered);
                var neListener = new ListListener(negativeEvenFiltered);
                var poListener = new ListListener(positiveOddFiltered);
                var noListener = new ListListener(negativeOddFiltered);
                listener.assertSameAsArray(data);
                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6]);
                neListener.assertSameAsArray([-2, -4]);
                peListener.assertSameAsArray([2, 4, 6]);
                oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-1, -3, -5]);

                list.splice(2, 0, 7);
                result.splice(2, 0, 7);


                listener.assertSameAsArray(result);//[-1, -2, 7, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6]
                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6]);
                neListener.assertSameAsArray([-2, -4]);
                peListener.assertSameAsArray([2, 4, 6]);
                oListener.assertSameAsArray([-1, 7, -3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([7, 1, 3, 5]);
                noListener.assertSameAsArray([-1, -3, -5]);

            }
            testListFilteredPop() {
                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });

                var listener = new ListListener(list);
                var eListener = new ListListener(evenFiltered);
                var oListener = new ListListener(oddFiltered);
                var peListener = new ListListener(positiveEvenFiltered);
                var neListener = new ListListener(negativeEvenFiltered);
                var poListener = new ListListener(positiveOddFiltered);
                var noListener = new ListListener(negativeOddFiltered);

                list.push(0);
                data.push(0);

                listener.assertSameAsArray(data);
                eListener.assertSameAsArray([-2, -4, 0, 2, 4, 6, 0]);
                neListener.assertSameAsArray([-2, -4]);
                peListener.assertSameAsArray([2, 4, 6]);
                oListener.assertSameAsArray([-1, -3, -5, 1, 3, 5]);
                poListener.assertSameAsArray([1, 3, 5]);
                noListener.assertSameAsArray([-1, -3, -5]);

                LiveUnit.Assert.areEqual(6, positiveEvenFiltered.pop(), "pop from pisitve Even filter");
                LiveUnit.Assert.areEqual(-4, negativeEvenFiltered.pop(), "pop from pisitve Even filter");
                LiveUnit.Assert.areEqual(5, oddFiltered.pop(), "pop from pisitve Even filter");
                LiveUnit.Assert.areEqual(3, positiveOddFiltered.pop(), "pop from pisitve Even filter");
            }

            testSortedListProjection() {

                var options = [undefined, { proxy: true }, { binding: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var data = [1, 2, 3, 0, -1, -4, 10, 12, 7, 56];
                    var list = new List(data, options[i]);
                    var asc = list.createSorted(function (l, r) { return l - r; });
                    LiveUnit.Assert.isTrue(verifyListContent(asc, [-4, -1, 0, 1, 2, 3, 7, 10, 12, 56]));
                }
            }
            testBindingWithSortedProjection2() {
                var data = [{ a: 1, b: 2 }, { a: 2, b: 3 }, { a: -1, b: 3 }, { a: 0, b: 4 }];
                var list = new List(data, { binding: true });
                var sorted = list.createSorted(function (l, r) { return l.a - r.a; });

                LiveUnit.Assert.isTrue(verifySortedArr(sorted, [-1, 0, 1, 2]), "sorting is not correct");
                sorted.getAt(0).a = 4;
                sorted.notifyMutated(0);

                LiveUnit.Assert.isTrue(verifySortedArr(sorted, [0, 1, 2, 4]), "sorting is not correct");
                // This element is expected to be inserted to the right of the other 0.
                sorted.push({ a: 0, b: 3 });
                list.push({ a: 5, b: 3 });

                LiveUnit.Assert.isTrue(verifySortedArr(sorted, [0, 0, 1, 2, 4, 5]), "sorting is not correct");
                LiveUnit.Assert.areEqual(4, sorted.getAt(0).b, "incorrect placement of an element");
                LiveUnit.Assert.areEqual(3, sorted.getAt(1).b, "incorrect placement of an element");
            }
            
            testSortedListWithProxy() {
                var data:any = [{ a: 1, b: 2 }, { a: 2, b: 3 }, { a: -1, b: 3 }, { a: 0, b: 4 }];
                var list = new List<any>(data, { proxy: true });
                var sorted = list.createSorted(function (l, r) { return l.a - r.a; });

                LiveUnit.Assert.isTrue(verifySortedArr(sorted, [-1, 0, 1, 2]), "sorting is not correct");
                sorted.getAt(0).a = 4;
                sorted.notifyMutated(0);
                data.getAt = function (i) { return data[i]; }
                LiveUnit.Assert.isTrue(verifySortedArr(sorted, [0, 1, 2, 4]), "sorting is not correct");
                sorted.push({ a: 0, b: 3 });
                list.push({ a: 5, b: 3 });

                LiveUnit.Assert.isTrue(verifySortedArr(sorted, [0, 0, 1, 2, 4, 5]), "sorting is not correct");
                LiveUnit.Assert.isTrue(verifySortedArr(data, [1, 2, 4, 0, 0, 5]), "sorting is not correct");
            }

            //should add more testig for push and pop after fixing the bug
            testBaseMutatorFunctionInSortedProjection = function () {
                var options:any = [undefined, { proxy: true }, { binding: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var data = [-2, -1, 3, 4, 0, 10, 2];
                    var list = new List(data, options[i]);
                    var ascSorted = list.createSorted(function (l, r) { return l - r; });
                    var descSorted = list.createSorted(function (l, r) { return r - l; });

                    var aSortedListener = new ListListener(ascSorted);
                    var dSortedListener = new ListListener(descSorted);

                    LiveUnit.Assert.isTrue(verifyListContent(ascSorted, [-2, -1, 0, 2, 3, 4, 10]));
                    LiveUnit.Assert.isTrue(verifyListContent(descSorted, [10, 4, 3, 2, 0, -1, -2]));
                    aSortedListener.assertSameAsArray([-2, -1, 0, 2, 3, 4, 10]);
                    dSortedListener.assertSameAsArray([10, 4, 3, 2, 0, -1, -2]);

                    descSorted.push(ascSorted.pop());
                    LiveUnit.Assert.isTrue(verifyListContent(ascSorted, [-2, -1, 0, 2, 3, 4, 10]));
                    LiveUnit.Assert.isTrue(verifyListContent(descSorted, [10, 4, 3, 2, 0, -1, -2]));
                    aSortedListener.assertSameAsArray([-2, -1, 0, 2, 3, 4, 10]);
                    dSortedListener.assertSameAsArray([10, 4, 3, 2, 0, -1, -2]);

                    LiveUnit.Assert.areEqual(10, ascSorted.pop(), "correct pop check");
                    LiveUnit.Assert.isTrue(verifyListContent(ascSorted, [-2, -1, 0, 2, 3, 4]));
                    LiveUnit.Assert.isTrue(verifyListContent(descSorted, [4, 3, 2, 0, -1, -2]));
                    aSortedListener.assertSameAsArray([-2, -1, 0, 2, 3, 4]);
                    dSortedListener.assertSameAsArray([4, 3, 2, 0, -1, -2]);

                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.isTrue(checkArrayContent(data, [-2, -1, 3, 4, 0, 2]));
                    }
                }
            }
            testBaseMutatorMutationFunctionsInSortedProjection() {
                var options:any = [undefined, { proxy: true }, { binding: true }, { proxy: true, binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var data = [-2, -1, 3, 4, 0, 10, 2];
                    var list = new List(data, options[i]);
                    var ascSorted = list.createSorted(function (l, r) { return l - r; });
                    var descSorted = list.createSorted(function (l, r) { return r - l; });
                    var aSortedListener = new ListListener(ascSorted);
                    var dSortedListener = new ListListener(descSorted);

                    LiveUnit.Assert.isTrue(verifyListContent(ascSorted, [-2, -1, 0, 2, 3, 4, 10]));
                    LiveUnit.Assert.isTrue(verifyListContent(descSorted, [10, 4, 3, 2, 0, -1, -2]));
                    aSortedListener.assertSameAsArray([-2, -1, 0, 2, 3, 4, 10])
                    dSortedListener.assertSameAsArray([10, 4, 3, 2, 0, -1, -2]);

                    var size = ascSorted.unshift(-4, -3, -2, 12);
                    LiveUnit.Assert.areEqual(11, size, "checking unshift in ascending array");

                    size = descSorted.unshift(5, 33, -32, 22);
                    LiveUnit.Assert.areEqual(15, size, "checking unshift in descending array");

                    aSortedListener.assertSameAsArray([-32, -4, -3, -2, -2, -1, 0, 2, 3, 4, 5, 10, 12, 22, 33])
                    dSortedListener.assertSameAsArray([33, 22, 12, 10, 5, 4, 3, 2, 0, -1, -2, -2, -3, -4, -32]);
                    LiveUnit.Assert.isTrue(verifyListContent(ascSorted, [-32, -4, -3, -2, -2, -1, 0, 2, 3, 4, 5, 10, 12, 22, 33]));
                    LiveUnit.Assert.isTrue(verifyListContent(descSorted, [33, 22, 12, 10, 5, 4, 3, 2, 0, -1, -2, -2, -3, -4, -32]));

                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.areEqual(list.length, data.length, "checking the length of the main array and the main list");
                    }
                    LiveUnit.Assert.areEqual(-32, ascSorted.shift(), "testing shifting in ascending sorting");
                    LiveUnit.Assert.areEqual(33, descSorted.shift(), "testing shifting in descending sorting");

                    LiveUnit.Assert.areEqual(13, descSorted.length, "checking length after unshifting");
                    LiveUnit.Assert.areEqual(13, ascSorted.length, "checking length after unshifting");

                    for (var j = 0; j < 13; j++) {
                        var elem = ascSorted.getAt(0);
                        LiveUnit.Assert.areEqual(elem, ascSorted.shift(), "testing shifting in ascending sorting");
                    }
                    LiveUnit.Assert.areEqual(0, descSorted.length, "checking length after unshifting");
                    LiveUnit.Assert.areEqual(0, ascSorted.length, "checking length after unshifting");
                }
            }
            testDisposeInSortedProjection() {
                var options:any = [undefined, { proxy: true }, { binding: true }, { proxy: true, binding: true }];

                for (var i = 0; i < options.length; i++) {

                    var data = [4, 3, 2, 5, -1, 0, 10];
                    var list = new List(data, options[i]);
                    var listener = new ListListener(list);

                    var ascSorted = list.createSorted(function (l, r) { return l - r; });
                    var descSorted = list.createSorted(function (l, r) { return r - l; });
                    var aSortedListener = new ListListener(ascSorted);
                    var dSortedListener = new ListListener(descSorted);

                    aSortedListener.assertSameAsArray([-1, 0, 2, 3, 4, 5, 10]);
                    dSortedListener.assertSameAsArray([10, 5, 4, 3, 2, 0, -1])
                    LiveUnit.Assert.isTrue(verifyListContent(ascSorted, [-1, 0, 2, 3, 4, 5, 10]), "verifying correct list asc order");
                    LiveUnit.Assert.isTrue(verifyListContent(descSorted, [10, 5, 4, 3, 2, 0, -1]), "verifying correct list desc order");

                    var reloadCount = aSortedListener.notificationCounts.reload;
                    ascSorted.dispose();
                    LiveUnit.Assert.areEqual(reloadCount + 1, aSortedListener.notificationCounts.reload);
                    aSortedListener.assertSameAsArray([]);
                    list.push(-100);
                    aSortedListener.assertSameAsArray([]);
                    LiveUnit.Assert.areEqual(-100, descSorted.getAt(descSorted.length - 1), "error! cannot get the correct element");
                    LiveUnit.Assert.areEqual(8, list.length, "making sure length is correct");
                    LiveUnit.Assert.areEqual(0, ascSorted.length);

                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data, true), "making sure that the list proxy is working correctly");
                    }
                }
            }
            testGetItemFromSortedProjection() {
                var options = [undefined, { proxy: true }, { binding: true }, { proxy: true, binding: true }];

                for (var i = 0; i < options.length; i++) {

                    var data = [4, 3, 2, 5, -1, 0, 10];
                    var asc = function (l, r) { return l - r; };
                    var desc = function (l, r) { return r - l; };
                    var ascSortedArray = data.concat().sort(asc);
                    var descSortedArray = data.concat().sort(desc);
                    var list = new List(data, options[i]);
                    var listener = new ListListener(list);

                    var ascSorted = list.createSorted(asc);
                    var descSorted = list.createSorted(desc)
                    var aSortedListener = new ListListener(ascSorted);
                    var dSortedListener = new ListListener(descSorted);

                    for (var i = 0; i < ascSorted.length; i++) {
                        LiveUnit.Assert.areEqual(ascSortedArray[i], ascSorted.getItem(i).data, "making sure of correct content");
                    }
                    for (var i = 0; i < descSorted.length; i++) {
                        LiveUnit.Assert.areEqual(descSortedArray[i], descSorted.getItem(i).data, "making sure of correct content");
                    }
                }
            }

            testStableSortAndInsertInSortedProjection() {
                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [{ a: 1, b: 2 }, { a: 1, b: 3 }, { a: 0, b: 4 }, { a: -1, b: -1 }, { a: 2, b: 3 }];
                    var list = new List(data, options[i]);
                    var sortedArr = list.createSorted(function (l, r) { return l.a - r.a; });

                    var listener = new ListListener(list);
                    var aSortedListener = new ListListener(sortedArr);

                    LiveUnit.Assert.isTrue(verifySortedArr(sortedArr, [-1, 0, 1, 1, 2]), "sorting is not correct");
                    LiveUnit.Assert.isTrue(sortedArr.getAt(2).a === sortedArr.getAt(3).a && sortedArr.getAt(2).b < sortedArr.getAt(3).b);
                    //Expected: [{ a: -1, b: -1 }, { a: 0, b: 4 }, { a: 1, b: 2 }, { a: 1, b: 3 }, { a: 2, b: 3 }];
                    sortedArr.push({ a: 1, b: 10 });
                    //Expected: [{ a: -1, b: -1 }, { a: 0, b: 4 }, { a: 1, b: 2 }, { a: 1, b: 3 }, { a: 1, b: 10 }, { a: 2, b: 3 }];
                    LiveUnit.Assert.isTrue(sortedArr.getAt(4).a === 1 && sortedArr.getAt(4).b === 10);

                    sortedArr.getAt(0).a = 1;
                    sortedArr.notifyMutated(0);
                    //Expected: [{ a: 0, b: 4 }, { a: 1, b: 2 }, { a: 1, b: 3 }, { a: 1, b: -1 }, { a: 1, b: 10 }, { a: 2, b: 3 }];
                    LiveUnit.Assert.isTrue(sortedArr.getAt(1).a === sortedArr.getAt(2).a && sortedArr.getAt(1).b < sortedArr.getAt(2).b);
                    LiveUnit.Assert.isTrue(sortedArr.getAt(2).a === sortedArr.getAt(3).a && sortedArr.getAt(2).b > sortedArr.getAt(3).b);
                }
            }
            testStableSortAndInsertInSortedProjectionUsingMainList() {
                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [{ a: 1, b: 2 }, { a: 1, b: 3 }, { a: 0, b: 4 }, { a: -1, b: -1 }, { a: 2, b: 3 }];
                    var list = new List(data, options[i]);
                    var sortedArr = list.createSorted(function (l, r) { return l.a - r.a; });

                    var listener = new ListListener(list);
                    var aSortedListener = new ListListener(sortedArr);

                    LiveUnit.Assert.isTrue(verifySortedArr(sortedArr, [-1, 0, 1, 1, 2]), "sorting is not correct");
                    LiveUnit.Assert.isTrue(sortedArr.getAt(2).a === sortedArr.getAt(3).a && sortedArr.getAt(2).b < sortedArr.getAt(3).b);
                    //Expected: [{ a: -1, b: -1 }, { a: 0, b: 4 }, { a: 1, b: 2 }, { a: 1, b: 3 }, { a: 2, b: 3 }];
                    sortedArr.push({ a: 1, b: 10 });
                    //Expected: [{ a: -1, b: -1 }, { a: 0, b: 4 }, { a: 1, b: 2 }, { a: 1, b: 3 }, { a: 1, b: 10 }, { a: 2, b: 3 }];
                    LiveUnit.Assert.isTrue(sortedArr.getAt(4).a === 1 && sortedArr.getAt(4).b === 10);

                    list.getAt(3).a = 1;
                    list.notifyMutated(3);
                    //Expected: [{ a: 0, b: 4 }, { a: 1, b: 2 }, { a: 1, b: 3 }, { a: 1, b: -1 }, { a: 1, b: 10 }, { a: 2, b: 3 }];
                    LiveUnit.Assert.isTrue(sortedArr.getAt(1).a === sortedArr.getAt(2).a && sortedArr.getAt(1).b < sortedArr.getAt(2).b);
                    LiveUnit.Assert.isTrue(sortedArr.getAt(2).a === sortedArr.getAt(3).a && sortedArr.getAt(2).b > sortedArr.getAt(3).b);
                }
            }
            testMoveInSortedProjection() {
                var options:any = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [-1, 0, 1, 2, 3, -2, 10];
                    var list = new List(data, options[i]);

                    var ascSorted = list.createSorted(function (l, r) { return l - r; });
                    var descSorted = list.createSorted(function (l, r) { return r - l; });

                    var aSortedListener = new ListListener(ascSorted);
                    var dSortedListener = new ListListener(descSorted);
                    var listener = new ListListener(list);

                    list.move(0, 3);


                    listener.assertSameAsArray([0, 1, 2, -1, 3, -2, 10]);
                    aSortedListener.assertSameAsArray([-2, -1, 0, 1, 2, 3, 10]);
                    dSortedListener.assertSameAsArray([10, 3, 2, 1, 0, -1, -2]);

                    LiveUnit.Assert.isTrue(verifyListContent(list, [0, 1, 2, -1, 3, -2, 10]), "moving an element in the main list");
                    LiveUnit.Assert.isTrue(verifyListContent(ascSorted, [-2, -1, 0, 1, 2, 3, 10]), "testing splice in ascending list");
                    LiveUnit.Assert.isTrue(verifyListContent(descSorted, [10, 3, 2, 1, 0, -1, -2]), "testing splice in ascending list");

                    ascSorted.move(0, 1);
                    var arr = [ascSorted, descSorted];
                    for (var ind = 0; ind < arr.length; ind++) {
                        var sortedArr = arr[ind];
                        var param;
                        for (var from = 0; from < sortedArr.length; from++) {
                            for (var to = 0; to < sortedArr.length; to++) {
                                sortedArr.move(from, to);
                                if (ind === 0) {
                                    param = "asc";
                                }
                                LiveUnit.Assert.isTrue(verifySorted(ascSorted, param), "making sure that the array is still sorted");
                            }
                        }
                    }
                    aSortedListener.assertSameAsArray([-2, -1, 0, 1, 2, 3, 10]);
                    dSortedListener.assertSameAsArray([10, 3, 2, 1, 0, -1, -2]);
                    list.move(0, 100);
                    LiveUnit.Assert.isTrue(verifySorted(ascSorted, true), "making sure that the array is still sorted");
                    LiveUnit.Assert.isTrue(verifySorted(descSorted), "making sure that the array is still sorted");
                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "testing splice in ascending list");
                    }

                }
            }
            testBaseMutatorMutationFunctionsInSortedProjection2() {
                var options:any = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {

                    var data = [-1, 0, 1, 2, 3, -2, 10];
                    var list = new List(data, options[i]);
                    var ascSorted = list.createSorted(function (l, r) { return l - r; });
                    var descSorted = list.createSorted(function (l, r) { return r - l; });

                    var listener = new ListListener(list);
                    var aSortedListener = new ListListener(ascSorted);
                    var dSortedListener = new ListListener(descSorted);

                    ascSorted.splice(100, 0, 12);
                    LiveUnit.Assert.isTrue(verifyListContent(ascSorted, [-2, -1, 0, 1, 2, 3, 10, 12]), "testing splice in ascending list");
                    LiveUnit.Assert.isTrue(verifyListContent(descSorted, [12, 10, 3, 2, 1, 0, -1, -2]), "testing splice in ascending list");

                    ascSorted.splice(0, 1);
                    LiveUnit.Assert.isTrue(verifyListContent(ascSorted, [-1, 0, 1, 2, 3, 10, 12]), "testing splice in ascending list");
                    LiveUnit.Assert.isTrue(verifyListContent(descSorted, [12, 10, 3, 2, 1, 0, -1]), "testing splice in ascending list");

                    ascSorted.splice(4, 0, -5);
                    LiveUnit.Assert.isTrue(verifyListContent(ascSorted, [-5, -1, 0, 1, 2, 3, 10, 12]), "testing splice in ascending list");
                    LiveUnit.Assert.isTrue(verifyListContent(descSorted, [12, 10, 3, 2, 1, 0, -1, -5]), "testing splice in ascending list");

                    descSorted.splice(5, 0, 8);
                    LiveUnit.Assert.isTrue(verifyListContent(ascSorted, [-5, -1, 0, 1, 2, 3, 8, 10, 12]), "testing splice in ascending list");
                    LiveUnit.Assert.isTrue(verifyListContent(descSorted, [12, 10, 8, 3, 2, 1, 0, -1, -5]), "testing splice in ascending list");

                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "testing splice in ascending list");
                    }
                }
            }

            //setAt
            testProjectionFunctionsInSortedProjection() {
                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [-1, 0, 1, 2, 3, -2, 10];
                    data.sort(function (l, r) { return l - r; });
                    var list = new List(data, options[i]);

                    var ascSorted = list.createSorted(function (l, r) { return l - r; });
                    var descSorted = list.createSorted(function (l, r) { return r - l; });

                    var listener = new ListListener(list);
                    var aSortedListener = new ListListener(ascSorted);
                    var dSortedListener = new ListListener(descSorted);

                    var arr = [-1, 0, 1, 2, 3, -2, 10];
                    arr.sort(function (l, r) { return l - r });
                    for (var j = 0; j < arr.length; j++) {
                        LiveUnit.Assert.areEqual(j, ascSorted.indexOf(arr[j]), "making sure indexOf elements are set correctly");
                    }

                    arr.sort(function (l, r) { return r - l; });
                    for (var j = 0; j < arr.length; j++) {
                        LiveUnit.Assert.areEqual(j, descSorted.indexOf(arr[j]), "making sure indexOf elements are set correctly");
                    }
                    LiveUnit.Assert.areEqual(-1, descSorted.indexOf(100), "checking for non existing element");
                    LiveUnit.Assert.areEqual(-1, ascSorted.indexOf(-100), "checking for non existing element");

                    for (j = 0; j < ascSorted.length / 2; j++) {
                        var key1 = (<any>ascSorted)._getKey(ascSorted.length - j - 1);
                        var key2 = (<any>ascSorted)._getKey(j);
                        var ind1 = ascSorted.indexOfKey(key1);
                        var ind2 = ascSorted.indexOfKey(key2);
                        var elem = ascSorted.getAt(ind1);
                        ascSorted.setAt(ind1, ascSorted.getItemFromKey(key2).data);
                        ascSorted.setAt(ind2, elem);
                        LiveUnit.Assert.isTrue(verifySorted(ascSorted, true));
                        LiveUnit.Assert.isTrue(verifySorted(descSorted));
                    }
                }
            }

            testIndexOfKeyInSortedProjection() {
                var options:any = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {


                    var list = new List<number>(options[i]);
                    list.push(-1, 0, 1, 2, 3, -2, 10);

                    var ascSorted = list.createSorted(function (l, r) { return l - r; });
                    var descSorted = list.createSorted(function (l, r) { return r - l; });

                    var listener = new ListListener(list);
                    var aSortedListener = new ListListener(ascSorted);
                    var dSortedListener = new ListListener(descSorted);

                    var arr = [-1, 0, 1, 2, 3, -2, 10];
                    arr.sort(function (l, r) { return l - r });
                    for (var j = 0; j < arr.length; j++) {
                        LiveUnit.Assert.areEqual(j, ascSorted.indexOf(arr[j]), "making sure indexOf elements are set correctly");
                    }

                    arr.sort(function (l, r) { return r - l; });
                    for (var j = 0; j < arr.length; j++) {
                        LiveUnit.Assert.areEqual(j, descSorted.indexOf(arr[j]), "making sure indexOf elements are set correctly");
                    }

                    LiveUnit.Assert.areEqual(1, ascSorted.indexOfKey("1"), "checking indexOfKey");
                    LiveUnit.Assert.areEqual(descSorted.length - 1 - 1, descSorted.indexOfKey("1"), "checking indexOfKey");

                    LiveUnit.Assert.areEqual(2, ascSorted.indexOfKey("2"), "checking indexOfKey");
                    LiveUnit.Assert.areEqual(descSorted.length - 1 - 2, descSorted.indexOfKey("2"), "checking indexOfKey");

                    LiveUnit.Assert.areEqual(3, ascSorted.indexOfKey("3"), "checking indexOfKey");
                    LiveUnit.Assert.areEqual(descSorted.length - 1 - 3, descSorted.indexOfKey("3"), "checking indexOfKey");

                    LiveUnit.Assert.areEqual(4, ascSorted.indexOfKey("4"), "checking indexOfKey");
                    LiveUnit.Assert.areEqual(descSorted.length - 1 - 4, descSorted.indexOfKey("4"), "checking indexOfKey");

                    LiveUnit.Assert.areEqual(5, ascSorted.indexOfKey("5"), "checking indexOfKey");
                    LiveUnit.Assert.areEqual(descSorted.length - 1 - 5, descSorted.indexOfKey("5"), "checking indexOfKey");

                    LiveUnit.Assert.areEqual(0, ascSorted.indexOfKey("6"), "checking indexOfKey");
                    LiveUnit.Assert.areEqual(descSorted.length - 1 - 0, descSorted.indexOfKey("6"), "checking indexOfKey");

                    LiveUnit.Assert.areEqual(6, ascSorted.indexOfKey("7"), "checking indexOfKey");
                    LiveUnit.Assert.areEqual(descSorted.length - 1 - 6, descSorted.indexOfKey("7"), "checking indexOfKey");

                }
            }

            testNotifyMutatedInSortedProjection() {

                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var data = [{ a: -1 }, { a: 0 }, { a: 1 }, { a: 2 }, { a: 3 }, { a: -4 }, { a: 10 }];
                    var list = new List(data, options[i]);

                    var ascSorted = list.createSorted(function (l, r) { return l.a - r.a; });
                    var descSorted = list.createSorted(function (l, r) { return r.a - l.a; });

                    var aSortedListener = new ListListener(ascSorted);
                    var dSortedListener = new ListListener(descSorted);

                    LiveUnit.Assert.isTrue(verifySortedArr(ascSorted, [-4, -1, 0, 1, 2, 3, 10]), "making sure that array is sorted ascendingly");
                    LiveUnit.Assert.isTrue(verifySortedArr(descSorted, [10, 3, 2, 1, 0, -1, -4]), "making sure that array is sorted descendingly");

                    list.getAt(0).a = -5;

                    LiveUnit.Assert.isTrue(verifySortedArr(ascSorted, [-4, -5, 0, 1, 2, 3, 10]), "making sure that array is sorted ascendingly");
                    LiveUnit.Assert.isTrue(verifySortedArr(descSorted, [10, 3, 2, 1, 0, -5, -4]), "making sure that array is sorted descendingly");

                    list.notifyMutated(0);
                    LiveUnit.Assert.isTrue(verifySortedArr(ascSorted, [-5, -4, 0, 1, 2, 3, 10]), "making sure that array is sorted ascendingly");
                    LiveUnit.Assert.isTrue(verifySortedArr(descSorted, [10, 3, 2, 1, 0, -4, -5]), "making sure that array is sorted descendingly");
                }
            }
            
            testBaseFunctionsInSortedProjection() {

                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];
                for (var i = 0; i < options.length; i++) {
                    var arr = [-1, 8, 0, 4, 10, 22, 26, 27, -10];
                    var asc = arr.concat();
                    var desc = arr.concat();
                    var ascSorter = function (l, r) { return l - r; };
                    var descSorter = function (l, r) { return r - l; }

                    var list = new List(arr, options[i]);
                    var ascSorted = list.createSorted(ascSorter);
                    var descSorted = list.createSorted(descSorter);
                    asc.sort(ascSorter);
                    desc.sort(descSorter);

                    var listener = new ListListener(list);
                    var aListener = new ListListener(ascSorted);
                    var dListener = new ListListener(descSorted);

                    LiveUnit.Assert.areEqual(asc.join(), ascSorted.join(), "ascending sorting join");
                    LiveUnit.Assert.areEqual(desc.join(), descSorted.join(), "ascending sorting join");

                    var checkLastOrIndexOf = function checkLastOrIndexOf (arr, list, nonExisting, indexOf = false) {
                        for (var i = 0; i < arr.length; i++) {
                            if (indexOf) {
                                if (i !== list.indexOf(arr[i])) {
                                    return false;
                                }
                            }
                            else {
                                if (i !== list.lastIndexOf(arr[i])) {
                                    return false;
                                }
                            }
                        }
                        if (indexOf) {
                            return ((list.indexOf(nonExisting) === -1) && (list.indexOf(nonExisting) === -1));
                        }
                        else {
                            return ((list.lastIndexOf(nonExisting) === -1) && (list.lastIndexOf(nonExisting) === -1));
                        }
                    };
                    var even = function even (num) { return Math.abs(num) % 2 === 0; };
                    var odd = function odd (num) { return Math.abs(num) % 2 === 1; };


                    LiveUnit.Assert.isTrue(checkLastOrIndexOf(asc, ascSorted, 100, true), "checking index of ascending");
                    LiveUnit.Assert.isTrue(checkLastOrIndexOf(desc, descSorted, 100, true), "checking index of descending");
                    LiveUnit.Assert.isTrue(checkLastOrIndexOf(asc, ascSorted, 200), "checking last index of ascending");
                    LiveUnit.Assert.isTrue(checkLastOrIndexOf(desc, descSorted, 200), "checking last index of descending");

                    LiveUnit.Assert.areEqual(true, ascSorted.some(even));
                    LiveUnit.Assert.areEqual(true, descSorted.some(even));
                    LiveUnit.Assert.areEqual(false, ascSorted.some(specialPrime));
                    LiveUnit.Assert.areEqual(false, descSorted.some(specialPrime));
                    LiveUnit.Assert.areEqual(0, ascSorted.filter(specialPrime).length, "testing filter in ascendingly sorted projection");
                    LiveUnit.Assert.areEqual(0, descSorted.filter(specialPrime).length, "testing filter in descendingly sorted projection");
                    LiveUnit.Assert.areEqual(7, ascSorted.filter(even).length, "testing filter in ascendingly sorted projection");
                    LiveUnit.Assert.areEqual(7, descSorted.filter(even).length, "testing filter in descendingly sorted projection");

                    var addFunction = function addFunction (n, m) { return n + m; };
                    LiveUnit.Assert.areEqual(arr.reduce(addFunction), ascSorted.reduce(addFunction), "checking reduce in sorted projection")
                    LiveUnit.Assert.areEqual(arr.reduceRight(addFunction, 10), descSorted.reduceRight(addFunction, 10), "checking reduceRight in sorted projection")

                }
            }
            testBaseListFunctionsInFilteredProjections() {

                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                    var list = new List(data, options[i]);

                    var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                    var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                    var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                    var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                    var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                    var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });

                    var even = function (num) { return Math.abs(num) % 2 === 0; };
                    var odd = function (num) { return Math.abs(num) % 2 === 1; };
                    var negative = function (num) { return num < 0; };
                    var positive = function (num) { return num > 0; }

                    var evenArr = data.filter(even);
                    var oddArr = data.filter(odd);
                    var peArr = evenArr.filter(positive);
                    var neArr = evenArr.filter(negative);
                    var poArr = oddArr.filter(positive);
                    var noArr = oddArr.filter(negative);

                    LiveUnit.Assert.areEqual(evenArr.join(), evenFiltered.join(), "check join for filteredProjections");
                    LiveUnit.Assert.areEqual(peArr.join(), positiveEvenFiltered.join(), "check join for filteredProjections");
                    LiveUnit.Assert.areEqual(poArr.join(), positiveOddFiltered.join(), "check join for filteredProjections");
                    LiveUnit.Assert.areEqual(noArr.join(), negativeOddFiltered.join(), "check join for filteredProjections");

                    var addFunction = function addFunction (n, m) { return n + m; };
                    LiveUnit.Assert.areEqual(oddArr.reduce(addFunction), oddFiltered.reduce(addFunction), "check reduce for filteredProjections");

                    var checkLastOrIndexOf = function checkLastOrIndexOf (arr, list, nonExisting, indexOf?) {
                        for (var i = 0; i < arr.length; i++) {
                            if (indexOf) {
                                if (i !== list.indexOf(arr[i])) {
                                    return false;
                                }
                            }
                            else {
                                if (i !== list.lastIndexOf(arr[i])) {
                                    return false;
                                }
                            }
                        }
                        if (indexOf) {
                            return ((list.indexOf(nonExisting) === -1) && (list.indexOf(nonExisting) === -1));
                        }
                        else {
                            return ((list.lastIndexOf(nonExisting) === -1) && (list.lastIndexOf(nonExisting) === -1));
                        }
                    };
                    LiveUnit.Assert.isTrue(checkLastOrIndexOf(poArr, positiveOddFiltered, 1000, true), "checking indexOf in Filtered Arrays");
                    LiveUnit.Assert.isTrue(checkLastOrIndexOf(neArr, negativeEvenFiltered, 1000), "check lastIndexOf in filtered arrays");
                }
            }

            testGroupedGroupsMainFunctionality() {
                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [7, 2, -1, 0, 1, -3, 101, 253, -11];
                    var list = new List<any>(data, options[i]);

                    var listener = new ListListener(list);
                    var grouped = list.createGrouped(
                    function (num) {
                        return (specialPrime(num)) ? "prime" : "nonPrime";
                    },
                    function (num) {
                        return (specialPrime(num)) ? { a: "prime" } : { a: "nonPrime" };
                    }
                    );

                    var groupedListener = new ListListener(grouped);
                    var groupsListener = new ListListener(grouped.groups);

                    groupedListener.assertSameAsArray([-1, 0, 1, 253, 7, 2, -3, 101, -11]);

                    LiveUnit.Assert.areEqual("nonPrime", groupsListener.data[0].a, "checking the first group");
                    LiveUnit.Assert.areEqual("prime", groupsListener.data[1].a, "checking the second group ");
                    LiveUnit.Assert.areEqual(2, grouped.groups.length, "checking the second group ");

                    LiveUnit.Assert.areEqual("nonPrime", grouped.groups.getItem(0).data.a, "check getItem");
                    LiveUnit.Assert.areEqual("nonPrime", grouped.groups.getItem(0).key, "check getItem");
                    LiveUnit.Assert.areEqual("prime", grouped.groups.getItem(1).data.a, "check getItem");
                    LiveUnit.Assert.areEqual("prime", grouped.groups.getItem(1).key, "check getItem");
                    LiveUnit.Assert.areEqual(undefined, grouped.groups.getItem(2), "check getItem");

                    LiveUnit.Assert.areEqual("nonPrime", grouped.groups.getItemFromKey("nonPrime").data.a, "check getItemFromKey");
                    LiveUnit.Assert.areEqual("prime", grouped.groups.getItemFromKey("prime").data.a, "check getItemFromKey");
                    LiveUnit.Assert.areEqual(undefined, grouped.groups.getItemFromKey("nonExisting"), "check non existing key using getItemFromKey");

                    LiveUnit.Assert.areEqual(1, grouped.groups.indexOfKey("prime"), "getting the correct index from key");
                    LiveUnit.Assert.areEqual(0, grouped.groups.indexOfKey("nonPrime"), "getting the correct index from key");
                    LiveUnit.Assert.areEqual(-1, grouped.groups.indexOfKey("non_Existing_Key"), "getting the index from non existing key");

                    LiveUnit.Assert.areEqual("nonPrime", grouped.groups.getAt(0).a, "checking getAt");
                    LiveUnit.Assert.areEqual("prime", grouped.groups.getAt(1).a, "checking getAt");
                    LiveUnit.Assert.areEqual(undefined, grouped.groups.getAt(2), "checking non existing item using getAt");
                    LiveUnit.Assert.areEqual(undefined, grouped.groups.getAt(-1), "checking non existing item using getAt");
                }
            }
            //push
            testGroupSortedPushFunctionality() {
                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [7, 2, 253, -1, 0, 1, -3, 101, -11];
                    var list = new List(data, options[i]);

                    var listener = new ListListener(list);
                    var grouped = list.createGrouped(
                    function (num) { return (specialPrime(num)) ? "prime" : "nonPrime"; },
                    function (num) { return (specialPrime(num)) ? { a: "prime" } : { a: "nonPrime" }; }
                    );

                    var groupedListener = new ListListener(grouped);
                    var groupsListener = new ListListener(grouped.groups);

                    groupedListener.assertSameAsArray([253, -1, 0, 1, 7, 2, -3, 101, -11]);
                    LiveUnit.Assert.areEqual(grouped.length, grouped.push(), "pushing nothing");
                    grouped.push(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [253, -1, 0, 1, 1, 4, 6, 8, 9, 10, 7, 2, -3, 101, -11, 2, 3, 5, 7]), "verifying list content");
                }
            }
            //Stil Missing: unshift, move, getItemFromKey, spliceFromKey, notifyMutated, baseFunctionality
            testGroupSortedSetAt() {
                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [7, 2, 253, -1, 0, 1, -3, 101, -11];
                    var list = new List(data, options[i]);

                    var listener = new ListListener(list);
                    var grouped = list.createGrouped(
                    function (num) { return (specialPrime(num)) ? "prime" : "nonPrime"; },
                    function (num) { return (specialPrime(num)) ? { a: "prime" } : { a: "nonPrime" }; }
                    );

                    var groupedListener = new ListListener(grouped);
                    var groupsListener = new ListListener(grouped.groups);

                    groupedListener.assertSameAsArray([253, -1, 0, 1, 7, 2, -3, 101, -11]);
                    grouped.setAt(0, 5);
                    groupedListener.assertSameAsArray([-1, 0, 1, 7, 2, 5, -3, 101, -11]);
                    grouped.setAt(grouped.length - 1, 10);
                    groupedListener.assertSameAsArray([-1, 0, 1, 10, 7, 2, 5, -3, 101]);
                    grouped.setAt(4, -20);
                    groupedListener.assertSameAsArray([-20, -1, 0, 1, 10, 2, 5, -3, 101]);
                }
            }
            testShiftGroupSorted() {
                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [7, 2, 253, -1, 0, 1, -3, 101, -11];
                    var list = new List<any>(data, options[i]);

                    var listener = new ListListener(list);
                    var grouped = list.createGrouped(
                    function (num) { return (specialPrime(num)) ? "prime" : "nonPrime"; },
                    function (num) { return (specialPrime(num)) ? { a: "prime" } : { a: "nonPrime" }; }
                    );

                    var groupedListener = new ListListener(grouped);
                    var groupsListener = new ListListener(grouped.groups);

                    groupedListener.assertSameAsArray([253, -1, 0, 1, 7, 2, -3, 101, -11]);
                    LiveUnit.Assert.areEqual("nonPrime", grouped.groups.getAt(0).a, "making sure that the first item changed");
                    LiveUnit.Assert.areEqual(253, grouped.shift(), "testing shift");
                    LiveUnit.Assert.areEqual(-1, grouped.shift(), "testing shift");
                    LiveUnit.Assert.areEqual(0, grouped.shift(), "testing shift");
                    LiveUnit.Assert.areEqual(1, grouped.shift(), "testing shift");

                    groupedListener.assertSameAsArray([7, 2, -3, 101, -11]);
                    LiveUnit.Assert.areEqual(1, grouped.groups.length, "making sure that only one group is remaining");
                    LiveUnit.Assert.areEqual("prime", grouped.groups.getAt(0).a, "making sure that the first item changed");
                    LiveUnit.Assert.areEqual(undefined, grouped.groups.getAt(1), "making sure that only one group exists");
                }
            }
            testSpliceGroupSorted() {
                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [7, 2, 253, -1, 0, 1, -3, 101, -11];
                    var list = new List<any>(data, options[i]);

                    var listener = new ListListener(list);
                    var grouped = list.createGrouped(
                    function (num) { return (specialPrime(num)) ? "prime" : "nonPrime"; },
                    function (num) { return (specialPrime(num)) ? { a: "prime" } : { a: "nonPrime" }; }
                    );

                    var groupedListener = new ListListener(grouped);
                    var groupsListener = new ListListener(grouped.groups);

                    groupedListener.assertSameAsArray([253, -1, 0, 1, 7, 2, -3, 101, -11]);
                    LiveUnit.Assert.areEqual("nonPrime", grouped.groups.getAt(0).a, "making sure that the first item changed");
                    grouped.splice(0, 4);

                    groupedListener.assertSameAsArray([7, 2, -3, 101, -11]);
                    LiveUnit.Assert.areEqual(1, grouped.groups.length, "making sure that only one group is remaining");
                    LiveUnit.Assert.areEqual("prime", grouped.groups.getAt(0).a, "making sure that the first item changed");
                    LiveUnit.Assert.areEqual(undefined, grouped.groups.getAt(1), "making sure that only one group exists");

                    grouped.splice(10, 0, 1);
                    LiveUnit.Assert.areEqual(2, grouped.groups.length, "making sure that only one group is remaining");
                    LiveUnit.Assert.areEqual("nonPrime", grouped.groups.getAt(0).a, "making sure that the first item changed");
                    LiveUnit.Assert.areEqual("prime", grouped.groups.getAt(1).a, "making sure that the second group is added");
                    groupedListener.assertSameAsArray([1, 7, 2, -3, 101, -11]);


                    grouped.splice(0, 0, 8);
                    LiveUnit.Assert.areEqual(2, grouped.groups.length, "making sure that only one group is remaining");
                    LiveUnit.Assert.areEqual("nonPrime", grouped.groups.getAt(0).a, "making sure that the first item changed");
                    LiveUnit.Assert.areEqual("prime", grouped.groups.getAt(1).a, "making sure that the second group is added");
                    groupedListener.assertSameAsArray([8, 1, 7, 2, -3, 101, -11]);
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [8, 1, 7, 2, -3, 101, -11]));

                    grouped.splice(0, grouped.length);
                    LiveUnit.Assert.areEqual(0, grouped.groups.length, "making sure that no groups are remaining");
                    LiveUnit.Assert.areEqual(undefined, grouped.groups.getAt(0), "making sure that no groups are remaining");
                    LiveUnit.Assert.areEqual(undefined, grouped.groups.getAt(1), "making sure that that no groups are remaining");
                    groupedListener.assertSameAsArray([]);


                    grouped.splice(0, 0, 1);
                    LiveUnit.Assert.areEqual(1, grouped.groups.length, "making sure that no groups are remaining");
                    LiveUnit.Assert.areEqual("nonPrime", grouped.groups.getAt(0).a, "making sure that one group is created");
                    LiveUnit.Assert.areEqual(undefined, grouped.groups.getAt(1), "making sure that that no second group exists");
                    groupedListener.assertSameAsArray([1]);
                    LiveUnit.Assert.areEqual(list.length, 1);
                    LiveUnit.Assert.areEqual(list.getAt(0), 1);

                    grouped.splice(0, 0, 2);
                    grouped.splice(0, 0, 3);
                    grouped.splice(0, 0, 4);
                    LiveUnit.Assert.areEqual(2, grouped.groups.length, "making sure that no groups are remaining");
                    LiveUnit.Assert.areEqual("nonPrime", grouped.groups.getAt(0).a, "making sure that first group is created");
                    LiveUnit.Assert.areEqual("prime", grouped.groups.getAt(1).a, "making sure that that the second group is created");
                    groupedListener.assertSameAsArray([4, 1, 2, 3]);
                    LiveUnit.Assert.areEqual(list.length, 4);
                    var expected = [2, 3, 4, 1];
                    list.forEach(function (item, index) {
                        LiveUnit.Assert.areEqual(expected[index], item);
                    });
                }
            }

            testGroupSortedPopFunctionality() {
                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [7, 2, 253, -1, 0, 1, -3, 101, -11];
                    var list = new List(data, options[i]);

                    var listener = new ListListener(list);
                    var grouped = list.createGrouped(
                    function (num) { return (specialPrime(num)) ? "prime" : "nonPrime"; },
                    function (num) { return (specialPrime(num)) ? { a: "prime" } : { a: "nonPrime" }; }
                    );

                    var groupedListener = new ListListener(grouped);
                    var groupsListener = new ListListener(grouped.groups);

                    groupedListener.assertSameAsArray([253, -1, 0, 1, 7, 2, -3, 101, -11]);
                    LiveUnit.Assert.areEqual(-11, grouped.pop(), "test pop");
                    LiveUnit.Assert.areEqual(101, grouped.pop(), "test pop");
                    LiveUnit.Assert.areEqual(-3, grouped.pop(), "test pop");
                    LiveUnit.Assert.areEqual(2, grouped.pop(), "test pop");
                    groupedListener.assertSameAsArray([253, -1, 0, 1, 7]);
                }
            }
            testUnShiftInGroupSortedList() {
                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [7, 2, 253, -1, 0, 1, -3, 101, -11];
                    var list = new List(data, options[i]);

                    var listener = new ListListener(list);
                    var grouped = list.createGrouped(
                    function (num) { return (specialPrime(num)) ? "prime" : "nonPrime"; },
                    function (num) { return (specialPrime(num)) ? { a: "prime" } : { a: "nonPrime" }; }
                    );
                    var groupedListener = new ListListener(grouped);
                    var groupsListener = new ListListener(grouped.groups);
                    groupedListener.assertSameAsArray([253, -1, 0, 1, 7, 2, -3, 101, -11]);

                    LiveUnit.Assert.areEqual(16, grouped.unshift(5, 6, 8, 9, 13, 15, 21), "unshifting a bunch of elements");
                    LiveUnit.Assert.areEqual(16, grouped.unshift(), "unshifting no element");
                    groupedListener.assertSameAsArray([6, 8, 9, 15, 21, 253, -1, 0, 1, 7, 2, 5, 13, -3, 101, -11]);

                    list.length = 0;
                    LiveUnit.Assert.areEqual(0, grouped.groups.length, "no groups are there");
                    LiveUnit.Assert.areEqual(0, grouped.length, "no elements are there");
                    LiveUnit.Assert.areEqual(0, grouped.unshift(), "unshifting no element");
                    LiveUnit.Assert.areEqual(1, grouped.unshift(5), "unshifting one element");

                    LiveUnit.Assert.areEqual(2, grouped.unshift(2), "shifting one element");
                    LiveUnit.Assert.areEqual(1, grouped.groups.length, "shifting one element");
                    groupedListener.assertSameAsArray([2, 5]);
                    LiveUnit.Assert.areEqual(3, grouped.unshift(6), "shifting one element");
                    LiveUnit.Assert.areEqual(2, grouped.groups.length, "shifting one element");
                    groupedListener.assertSameAsArray([6, 2, 5]);

                }
            }
            testMoveInGroupSortedList() {
                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [7, 2, 253, -1, 0, 1, -3, 101, -11];
                    var list = new List(data, options[i]);

                    var listener = new ListListener(list);
                    var grouped = list.createGrouped(
                    function (num) { return (specialPrime(num)) ? "prime" : "nonPrime"; },
                    function (num) { return (specialPrime(num)) ? { a: "prime" } : { a: "nonPrime" }; }
                    );

                    var groupedListener = new ListListener(grouped);
                    var groupsListener = new ListListener(grouped.groups);
                    groupedListener.assertSameAsArray([253, -1, 0, 1, 7, 2, -3, 101, -11]);

                    grouped.move(0, 1);
                    groupedListener.assertSameAsArray([-1, 253, 0, 1, 7, 2, -3, 101, -11]);
                    grouped.splice(1, 0, -4);
                    groupedListener.assertSameAsArray([-1, -4, 253, 0, 1, 7, 2, -3, 101, -11]);

                    grouped.move(0, 1);
                    groupedListener.assertSameAsArray([-4, -1, 253, 0, 1, 7, 2, -3, 101, -11]);
                    grouped.splice(1, 0, 17);
                    groupedListener.assertSameAsArray([-4, -1, 253, 0, 1, 7, 2, 17, -3, 101, -11]);

                    grouped.move(5, 1);
                    groupedListener.assertSameAsArray([-4, -1, 253, 0, 1, 2, 17, 7, -3, 101, -11]);

                    grouped.move(grouped.length - 1, grouped.length - 2);
                    groupedListener.assertSameAsArray([-4, -1, 253, 0, 1, 2, 17, 7, -3, -11, 101]);
                }
            }
            testGetItemFromKeyGroupSortedList() {
                var options = [undefined, { binding: true }];

                for (var i = 0; i < options.length; i++) {

                    //var data = [7, 2, 253, -1, 0, 1, -3, 101, -11];
                    var data = [253, -1, 0, 1, 7, 2, -3, 101, -11];
                    var list = new List(data, options[i]);

                    var listener = new ListListener(list);
                    var grouped = list.createGrouped(
                    function (num) { return (specialPrime(num)) ? "prime" : "nonPrime"; },
                    function (num) { return (specialPrime(num)) ? { a: "prime" } : { a: "nonPrime" }; }
                    );

                    var groupedListener = new ListListener(grouped);
                    var groupsListener = new ListListener(grouped.groups);

                    groupedListener.assertSameAsArray([253, -1, 0, 1, 7, 2, -3, 101, -11]);

                    var shuffleList = function () {
                        for (var i = 1; i < grouped.length; i++) {
                            grouped.move(0, i);
                        }
                    }

                    var checkCorrectness = function () {
                        for (var ind = 0; ind < list.length; ind++) {
                            LiveUnit.Assert.areEqual(data[ind], grouped.getItemFromKey(ind + '').data, "checking getItemFromKey");
                        }
                    }
                    checkCorrectness();
                    shuffleList();

                    checkCorrectness();
                }
            }
            testBaseFunctionsInSortedProjectionScenarios() {
                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [7, 2, 253, -1, 0, 1, -3, 101, -11];
                    var list = new List(data, options[i]);

                    var listener = new ListListener(list);
                    var grouped = list.createGrouped(
                    function (num) { return (specialPrime(num)) ? "prime" : "nonPrime"; },
                    function (num) { return (specialPrime(num)) ? { a: "prime" } : { a: "nonPrime" }; }
                    );

                    var groupedListener = new ListListener(grouped);
                    var groupsListener = new ListListener(grouped.groups);

                    groupedListener.assertSameAsArray([253, -1, 0, 1, 7, 2, -3, 101, -11]);
                }
            }
            testGroupListPushThroughList() {
                var options = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [7, 2, 253, -1, 0, 1, -3, 101, -11];
                    var list = new List(data, options[i]);

                    var listener = new ListListener(list);
                    var grouped = list.createGrouped(
                    function (num) { return (specialPrime(num)) ? "prime" : "nonPrime"; },
                    function (num) { return (specialPrime(num)) ? { a: "prime" } : { a: "nonPrime" }; }
                    );

                    var groupedListener = new ListListener(grouped);
                    var groupsListener = new ListListener(grouped.groups);

                    groupedListener.assertSameAsArray([253, -1, 0, 1, 7, 2, -3, 101, -11]);
                    list.push(17);
                    list.push(4);

                    groupedListener.assertSameAsArray([253, -1, 0, 1, 4, 7, 2, -3, 101, -11, 17]);
                }
            }
            testGroupListPopThroughList() {
                var options:any = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [7, 2, 253, -1, 0, 1, -3, 101, -11];
                    var list = new List(data, options[i]);

                    var listener = new ListListener(list);
                    var grouped = list.createGrouped(
                    function (num) { return (specialPrime(num)) ? "prime" : "nonPrime"; },
                    function (num) { return (specialPrime(num)) ? { a: "prime" } : { a: "nonPrime" }; }
                    );
                    var groupedListener = new ListListener(grouped);
                    var groupsListener = new ListListener(grouped.groups);
                    var result = [253, -1, 0, 1, 7, 2, -3, 101, -11];

                    groupedListener.assertSameAsArray(result);
                    LiveUnit.Assert.areEqual(-11, list.pop(), "testing pop");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [253, -1, 0, 1, 7, 2, -3, 101]));

                    LiveUnit.Assert.areEqual(101, list.pop(), "testing pop");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [253, -1, 0, 1, 7, 2, -3]));

                    LiveUnit.Assert.areEqual(-3, list.pop(), "testing pop");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [253, -1, 0, 1, 7, 2]));

                    LiveUnit.Assert.areEqual(1, list.pop(), "testing pop");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [253, -1, 0, 7, 2]));

                    LiveUnit.Assert.areEqual(0, list.pop(), "testing pop");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [253, -1, 7, 2]));

                    LiveUnit.Assert.areEqual(-1, list.pop(), "testing pop");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [253, 7, 2]));

                    LiveUnit.Assert.areEqual(253, list.pop(), "testing pop");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [7, 2]));

                    LiveUnit.Assert.areEqual(2, list.pop(), "testing pop");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [7]));

                    LiveUnit.Assert.areEqual(7, list.pop(), "testing pop");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, []));

                    LiveUnit.Assert.areEqual(0, grouped.length, "checking the length of groupedList");
                    LiveUnit.Assert.areEqual(0, list.length, "checking the length of List");

                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "making sure that proxy is working fine");
                    }
                }
            }
            testGroupedProjectionShiftMethodUsingMainList() {
                var options:any = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [7, 2, 253, -1, 0, 1, -3, 101, -11];
                    var list = new List(data, options[i]);

                    var listener = new ListListener(list);
                    var grouped = list.createGrouped(
                    function (num) { return (specialPrime(num)) ? "prime" : "nonPrime"; },
                    function (num) { return (specialPrime(num)) ? { a: "prime" } : { a: "nonPrime" }; }
                    );
                    var groupedListener = new ListListener(grouped);
                    var groupsListener = new ListListener(grouped.groups);
                    var result = [253, -1, 0, 1, 7, 2, -3, 101, -11];

                    groupedListener.assertSameAsArray(result);

                    LiveUnit.Assert.areEqual(7, list.shift(), "testing shift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [253, -1, 0, 1, 2, -3, 101, -11]));

                    LiveUnit.Assert.areEqual(2, list.shift(), "testing shift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [253, -1, 0, 1, -3, 101, -11]));

                    LiveUnit.Assert.areEqual(253, list.shift(), "testing shift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [-1, 0, 1, -3, 101, -11]));

                    LiveUnit.Assert.areEqual(-1, list.shift(), "testing shift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [0, 1, -3, 101, -11]));

                    LiveUnit.Assert.areEqual(0, list.shift(), "testing shift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [1, -3, 101, -11]));

                    LiveUnit.Assert.areEqual(1, list.shift(), "testing shift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [-3, 101, -11]));

                    LiveUnit.Assert.areEqual(-3, list.shift(), "testing shift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [101, -11]));

                    LiveUnit.Assert.areEqual(101, list.shift(), "testing shift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [-11]));

                    LiveUnit.Assert.areEqual(-11, list.shift(), "testing shift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, []));

                    LiveUnit.Assert.areEqual(0, grouped.length, "Testing grouped length");
                    LiveUnit.Assert.areEqual(0, list.length, "Testing list length");

                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "making sure that proxy is working fine");
                    }
                }
            }

            testGroupedProjectionUnShiftMethodUsingMainList() {
                var options:any = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [];
                    var list = new List(data, options[i]);

                    var listener = new ListListener(list);
                    var grouped = list.createGrouped(
                    function (num) { return (specialPrime(num)) ? "prime" : "nonPrime"; },
                    function (num) { return (specialPrime(num)) ? { a: "prime" } : { a: "nonPrime" }; }
                    );
                    var groupedListener = new ListListener(grouped);
                    var groupsListener = new ListListener(grouped.groups);
                    LiveUnit.Assert.areEqual(0, grouped.groups.length, "making sure the number of groups is zero");
                    LiveUnit.Assert.areEqual(0, grouped.length, "making sure that no elements are added to the list");


                    LiveUnit.Assert.areEqual(1, list.unshift(-11), "testing unshift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [-11]));

                    LiveUnit.Assert.areEqual(1, grouped.groups.length, "making sure the number of groups is one");

                    LiveUnit.Assert.areEqual(2, list.unshift(101), "testing unshift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [101, -11]));
                    LiveUnit.Assert.areEqual(1, grouped.groups.length, "making sure the number of groups is one");

                    LiveUnit.Assert.areEqual(3, list.unshift(-3), "testing unshift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [-3, 101, -11]));
                    LiveUnit.Assert.areEqual(1, grouped.groups.length, "making sure the number of groups is one");

                    LiveUnit.Assert.areEqual(4, list.unshift(1), "testing unshift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [1, -3, 101, -11]));
                    LiveUnit.Assert.areEqual(2, grouped.groups.length, "making sure the number of groups is two");

                    LiveUnit.Assert.areEqual(5, list.unshift(0), "testing unshift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [0, 1, -3, 101, -11]));
                    LiveUnit.Assert.areEqual(2, grouped.groups.length, "making sure the number of groups is two");

                    LiveUnit.Assert.areEqual(6, list.unshift(-1), "testing unshift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [-1, 0, 1, -3, 101, -11]));
                    LiveUnit.Assert.areEqual(2, grouped.groups.length, "making sure the number of groups is two");

                    LiveUnit.Assert.areEqual(7, list.unshift(253), "testing unshift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [253, -1, 0, 1, -3, 101, -11]));
                    LiveUnit.Assert.areEqual(2, grouped.groups.length, "making sure the number of groups is two");

                    LiveUnit.Assert.areEqual(8, list.unshift(2), "testing unshift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [253, -1, 0, 1, 2, -3, 101, -11]));
                    LiveUnit.Assert.areEqual(2, grouped.groups.length, "making sure the number of groups is two");

                    LiveUnit.Assert.areEqual(9, list.unshift(7), "testing unshift");
                    LiveUnit.Assert.isTrue(verifyListContent(grouped, [253, -1, 0, 1, 7, 2, -3, 101, -11]));
                    LiveUnit.Assert.areEqual(2, grouped.groups.length, "making sure the number of groups is two");

                    LiveUnit.Assert.areEqual(9, grouped.length, "Testing grouped length");
                    LiveUnit.Assert.areEqual(9, list.length, "Testing list length");

                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "making sure that proxy is working fine");
                    }
                }
            }
            testPushOnSortedListUsingMainList() {
                var options:any = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [-1, 10, 9, -2, 4, 3, 2];

                    var list = new List(data, options[i]);
                    var listener = new ListListener(list);

                    var sorted = list.createSorted(function (l, r) { return l - r; });
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-2, -1, 2, 3, 4, 9, 10]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-1, 10, 9, -2, 4, 3, 2]), "verifying list content");

                    list.push(-5);
                    list.push(-4);
                    list.push(11);
                    list.push(5);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-1, 10, 9, -2, 4, 3, 2, -5, -4, 11, 5]), "verifying list content");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-5, -4, -2, -1, 2, 3, 4, 5, 9, 10, 11]), "making sure of sortedList");

                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "making sure that proxy is working fine");
                    }
                }
            }
            testPopOnSortedListUsingMainList() {
                var options:any = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [-1, 10, 9, -2, 4, 3, 2];

                    var list = new List(data, options[i]);
                    var listener = new ListListener(list);

                    var sorted = list.createSorted(function (l, r) { return l - r; });

                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-2, -1, 2, 3, 4, 9, 10]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-1, 10, 9, -2, 4, 3, 2]), "verifying list content");

                    LiveUnit.Assert.areEqual(2, list.pop(), "checking the value of the poped element");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-2, -1, 3, 4, 9, 10]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-1, 10, 9, -2, 4, 3]), "verifying list content");

                    LiveUnit.Assert.areEqual(3, list.pop(), "checking the value of the poped element");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-2, -1, 4, 9, 10]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-1, 10, 9, -2, 4]), "verifying list content");

                    LiveUnit.Assert.areEqual(4, list.pop(), "checking the value of the poped element");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-2, -1, 9, 10]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-1, 10, 9, -2]), "verifying list content");

                    LiveUnit.Assert.areEqual(-2, list.pop(), "checking the value of the poped element");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-1, 9, 10]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-1, 10, 9]), "verifying list content");

                    LiveUnit.Assert.areEqual(9, list.pop(), "checking the value of the poped element");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-1, 10]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-1, 10]), "verifying list content");

                    LiveUnit.Assert.areEqual(10, list.pop(), "checking the value of the poped element");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-1]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-1]), "verifying list content");

                    LiveUnit.Assert.areEqual(-1, list.pop(), "checking the value of the poped element");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, []), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, []), "verifying list content");

                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "making sure that proxy is working fine");
                    }
                    else {
                        LiveUnit.Assert.areEqual(7, data.length, "making sure that the original array is not affected");
                    }
                }
            }
            testUnshiftOnSortedListUsingMainList() {
                var options:any = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [-1, 10, 9, -2, 4, 3, 2];

                    var list = new List(data, options[i]);
                    var listener = new ListListener(list);

                    var sorted = list.createSorted(function (l, r) { return l - r; });
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-2, -1, 2, 3, 4, 9, 10]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-1, 10, 9, -2, 4, 3, 2]), "verifying list content");

                    list.unshift(-5);
                    list.unshift(-4);
                    list.unshift(11);
                    list.unshift(5);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [5, 11, -4, -5, -1, 10, 9, -2, 4, 3, 2]), "verifying list content");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-5, -4, -2, -1, 2, 3, 4, 5, 9, 10, 11]), "making sure of sortedList");

                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "making sure that proxy is working fine");
                    }
                }
            }
            testShiftOnSortedListUsingMainList() {
                var options:any = [undefined, { proxy: true }, { proxy: true, binding: true }, { binding: true }];

                for (var i = 0; i < options.length; i++) {
                    var data = [-1, 10, 9, -2, 4, 3, 2];

                    var list = new List(data, options[i]);
                    var listener = new ListListener(list);

                    var sorted = list.createSorted(function (l, r) { return l - r; });

                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-2, -1, 2, 3, 4, 9, 10]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-1, 10, 9, -2, 4, 3, 2]), "verifying list content");

                    LiveUnit.Assert.areEqual(-1, list.shift(), "checking the value of the shifted element");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-2, 2, 3, 4, 9, 10]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [10, 9, -2, 4, 3, 2]), "verifying list content");

                    LiveUnit.Assert.areEqual(10, list.shift(), "checking the value of the shifted element");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-2, 2, 3, 4, 9]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [9, -2, 4, 3, 2]), "verifying list content");

                    LiveUnit.Assert.areEqual(9, list.shift(), "checking the value of the shifted element");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-2, 2, 3, 4]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-2, 4, 3, 2]), "verifying list content");

                    LiveUnit.Assert.areEqual(-2, list.shift(), "checking the value of the shifted element");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [2, 3, 4]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [4, 3, 2]), "verifying list content");

                    LiveUnit.Assert.areEqual(4, list.shift(), "checking the value of the shifted element");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [2, 3]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [3, 2]), "verifying list content");

                    LiveUnit.Assert.areEqual(3, list.shift(), "checking the value of the shifted element");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [2]), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, [2]), "verifying list content");

                    LiveUnit.Assert.areEqual(2, list.shift(), "checking the value of the shifted element");
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, []), "making sure of sortedList");
                    LiveUnit.Assert.isTrue(verifyListContent(list, []), "verifying list content");

                    if (options[i] && options[i].proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "making sure that proxy is working fine");
                    }
                    else {
                        LiveUnit.Assert.areEqual(7, data.length, "making sure that the original array is not affected");
                    }
                }
            }
            testCreatingFilteredListOfSortedList() {

                function testScenario(options) {
                    var data = [-1, 10, -4, -10, 9, -2, 4, 3, 2];

                    var list = new List(data, options);
                    var listener = new ListListener(list);

                    var sorted = list.createSorted(function (l, r) { return l - r; });

                    var sortedNegativeNumber = sorted.createFiltered(function (num) { return num < 0 });

                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-10, -4, -2, -1, 2, 3, 4, 9, 10]));
                    LiveUnit.Assert.isTrue(verifyListContent(sortedNegativeNumber, [-10, -4, -2, -1]));

                    sortedNegativeNumber.push(5);
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-10, -4, -2, -1, 2, 3, 4, 5, 9, 10]));
                    LiveUnit.Assert.isTrue(verifyListContent(sortedNegativeNumber, [-10, -4, -2, -1]));

                    sortedNegativeNumber.push(-4);
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-10, -4, -4, -2, -1, 2, 3, 4, 5, 9, 10]));
                    LiveUnit.Assert.isTrue(verifyListContent(sortedNegativeNumber, [-10, -4, -4, -2, -1]));

                    var sortedNegativeLessThanMinusTwo = sortedNegativeNumber.createFiltered(function (num) { return num < -2; });
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-10, -4, -4, -2, -1, 2, 3, 4, 5, 9, 10]));
                    LiveUnit.Assert.isTrue(verifyListContent(sortedNegativeNumber, [-10, -4, -4, -2, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(sortedNegativeLessThanMinusTwo, [-10, -4, -4]));

                    var sortedDescending = sortedNegativeLessThanMinusTwo.createSorted(function (l, r) { return r - l; });
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-10, -4, -4, -2, -1, 2, 3, 4, 5, 9, 10]));
                    LiveUnit.Assert.isTrue(verifyListContent(sortedNegativeNumber, [-10, -4, -4, -2, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(sortedNegativeLessThanMinusTwo, [-10, -4, -4]));
                    LiveUnit.Assert.isTrue(verifyListContent(sortedDescending, [-4, -4, -10]));

                    list.push(23);
                    list.push(-5);
                    list.push(-2.5);
                    list.push(0);

                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-10, -5, -4, -4, -2.5, -2, -1, 0, 2, 3, 4, 5, 9, 10, 23]));
                    LiveUnit.Assert.isTrue(verifyListContent(sortedNegativeNumber, [-10, -5, -4, -4, -2.5, -2, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(sortedNegativeLessThanMinusTwo, [-10, -5, -4, -4, -2.5]));
                    LiveUnit.Assert.isTrue(verifyListContent(sortedDescending, [-2.5, -4, -4, -5, -10]));

                    sortedDescending.push(11);
                    sortedDescending.push(-1);
                    sortedDescending.push(-8);
                    sortedDescending.push(-25);
                    sortedDescending.push(25);

                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [-25, -10, -8, -5, -4, -4, -2.5, -2, -1, -1, 0, 2, 3, 4, 5, 9, 10, 11, 23, 25]));
                    LiveUnit.Assert.isTrue(verifyListContent(sortedNegativeNumber, [-25, -10, -8, -5, -4, -4, -2.5, -2, -1, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(sortedNegativeLessThanMinusTwo, [-25, -10, -8, -5, -4, -4, -2.5]));
                    LiveUnit.Assert.isTrue(verifyListContent(sortedDescending, [-2.5, -4, -4, -5, -8, -10, -25]));

                    if (options && options.proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data));
                    }
                    else {
                        LiveUnit.Assert.areEqual(9, data.length, "checking the array length ");
                    }
                }
                testWithDifferentOptions(testScenario);

            }

            

            testDifferentMutationsOnFiltersOfGroups() {

                function testScenario(options) {
                    var data = [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "one", "two", "three", "four"];
                    var list = new List(data, options);

                    var mainGroupSelector = function (num) {
                        if (typeof num === "string") {
                            return "string";
                        }
                        return (Math.abs(num) % 2 === 0) ? "even" : "odd";
                    };
                    var groupedList = list.createGrouped(mainGroupSelector, mainGroupSelector);

                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "one", "two", "three", "four"]));
                    var groupSelector = function (num) {
                        if (typeof num === "string") {
                            return "string";
                        }
                        if (num >= 0) {
                            return (num % 2 === 0) ? "positiveEven" : "positiveOdd";
                        }
                        else if (num < 0) {
                            return (Math.abs(num) % 2 === 0) ? "negativeEven" : "negativeOdd";
                        }
                    };

                    var sorter = function (a, b) {
                        var arr = { "string": -1, "positiveEven": 0, "negativeEven": 1, "positiveOdd": 2, "negativeOdd": 3 };
                        return arr[a] - arr[b];
                    };

                    var groupOfGroup = groupedList.createGrouped(groupSelector, groupSelector, sorter);
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, ["one", "two", "three", "four", 0, 2, 4, -4, -2, 1, 3, 5, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "one", "two", "three", "four"]));
                    LiveUnit.Assert.areEqual(5, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(3, groupedList.groups.length, "checking the length of the group of group");

                    list.move(10, 13);
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "two", "three", "four", "one"]));

                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, ["two", "three", "four", "one", 0, 2, 4, -4, -2, 1, 3, 5, -3, -1])); //Bug Here
                    LiveUnit.Assert.areEqual(5, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(3, groupedList.groups.length, "checking the length of the group of group");

                    if (options && options.proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "checking the list content");
                    }
                }
                testWithDifferentOptions(testScenario);
            }
            testCreateFiltersOutOfGroupedSortedProjection() {

                function testScenario(options) {
                    var data = [1, 2, 3, 4, 5, 6, 7, 8, 15, 12];
                    var list = new List(data, options);

                    var groupedList = list.createGrouped(
                                        function (num) { return (num % 2 === 0) ? "even" : "odd"; },
                                        function (num) { return (num % 2 === 0) ? "even" : "odd"; }
                                        );
                    var filtered = groupedList.createFiltered(function (num) { return !specialPrime(num); });
                    var sorted = filtered.createSorted(function (l, r) { return l - r });

                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [2, 4, 6, 8, 12, 1, 3, 5, 7, 15]));
                    LiveUnit.Assert.isTrue(verifyListContent(filtered, [4, 6, 8, 12, 1, 15]));
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [1, 4, 6, 8, 12, 15]));

                    sorted.push(17);

                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [2, 4, 6, 8, 12, 1, 3, 5, 7, 15, 17]));
                    LiveUnit.Assert.isTrue(verifyListContent(filtered, [4, 6, 8, 12, 1, 15]));
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [1, 4, 6, 8, 12, 15]));

                    list.push(19);
                    LiveUnit.Assert.isTrue(verifyListContent(filtered, [4, 6, 8, 12, 1, 15]));
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [1, 4, 6, 8, 12, 15]));

                    list.push(10);

                    LiveUnit.Assert.isTrue(verifyListContent(filtered, [4, 6, 8, 12, 10, 1, 15]));
                    LiveUnit.Assert.isTrue(verifyListContent(sorted, [1, 4, 6, 8, 10, 12, 15]));

                    if (options && options.proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "checking that the proxy content is correct");
                    }

                }
                testWithDifferentOptions(testScenario);
            }

            testGroupsOfGroups() {
                function testScenario(options) {
                    var data = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
                    var list = new List(data, options);

                    var groupedList = list.createGrouped(
                                        function (num) { return (Math.abs(num) % 2 === 0) ? "even" : "odd"; },
                                        function (num) { return (Math.abs(num) === 0) ? "even" : "odd"; }
                                        );
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5]));
                    var groupSelector = function (num) {
                        if (num >= 0) {
                            return (num % 2 === 0) ? "positiveEven" : "positiveOdd";
                        }
                        else if (num < 0) {
                            return (Math.abs(num) % 2 === 0) ? "negativeEven" : "negativeOdd";
                        }
                    };

                    var sorter = function (a, b) {
                        var arr = { "positiveEven": 0, "negativeEven": 1, "positiveOdd": 2, "negativeOdd": 3 };
                        return arr[a] - arr[b];
                    };

                    var groupOfGroup = groupedList.createGrouped(groupSelector, groupSelector, sorter);
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, [0, 2, 4, -4, -2, 1, 3, 5, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5]));
                    LiveUnit.Assert.areEqual(4, groupOfGroup.groups.length, "checking the length of the group of group");

                    list.pop();
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, [0, 2, 4, -4, -2, 1, 3, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3]));

                    groupOfGroup.move(0, 1);
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, [2, 0, 4, -4, -2, 1, 3, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 2, 0, 4, -3, -1, 1, 3]));

                    groupOfGroup.splice(3, 2);
                    LiveUnit.Assert.areEqual(7, list.length, "validating list length")
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [2, 0, 4, -3, -1, 1, 3]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, [2, 0, 4, 1, 3, -3, -1]));
                    LiveUnit.Assert.areEqual(3, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(2, groupedList.groups.length, "checking the length of the group of group");

                    groupOfGroup.splice(0, 3);
                    LiveUnit.Assert.areEqual(4, list.length, "validating list length")
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-3, -1, 1, 3]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, [1, 3, -3, -1]));
                    LiveUnit.Assert.areEqual(2, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(1, groupedList.groups.length, "checking the length of the group of group");

                    groupOfGroup.splice(0, 4);


                    LiveUnit.Assert.areEqual(0, list.length, "validating list length")
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, []));
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, []));
                    LiveUnit.Assert.areEqual(0, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(0, groupedList.groups.length, "checking the length of the group of group");

                    if (options && options.proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "checking the list content");
                    }
                }
                testWithDifferentOptions(testScenario);
            }

            testGroupsOfGroupsMutationThroughMainList() {
                function testScenario(options) {
                    var data = [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5];
                    var list = new List(data, options);

                    var groupedList = list.createGrouped(
                                        function (num) {
                                            return (Math.abs(num) % 2 === 0) ? "even" : "odd";
                                        },
                                        function (num) {
                                            return (Math.abs(num) === 0) ? "even" : "odd";
                                        }
                                        );
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5]));
                    var groupSelector = function (num) {
                        if (num >= 0) {
                            return (num % 2 === 0) ? "positiveEven" : "positiveOdd";
                        }
                        else if (num < 0) {
                            return (Math.abs(num) % 2 === 0) ? "negativeEven" : "negativeOdd";
                        }
                    };

                    var sorter = function (a, b) {
                        var arr = { "positiveEven": 0, "negativeEven": 1, "positiveOdd": 2, "negativeOdd": 3 };
                        return arr[a] - arr[b];
                    };

                    var groupOfGroup = groupedList.createGrouped(groupSelector, groupSelector, sorter);
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, [0, 2, 4, -4, -2, 1, 3, 5, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5]));
                    LiveUnit.Assert.areEqual(4, groupOfGroup.groups.length, "checking the length of the group of group");

                    list.pop();
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, [0, 2, 4, -4, -2, 1, 3, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3]));

                    list.pop();
                    list.pop();
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, [0, 2, 4, -4, -2, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1]));
                    LiveUnit.Assert.areEqual(3, groupOfGroup.groups.length, "checking the group length");
                    LiveUnit.Assert.areEqual(2, groupedList.groups.length, "checking the group length");

                    list.pop();
                    list.pop();
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-4, -2, 0, 2, 4]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, [0, 2, 4, -4, -2]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4]));
                    LiveUnit.Assert.areEqual(2, groupOfGroup.groups.length, "checking the group length");
                    LiveUnit.Assert.areEqual(1, groupedList.groups.length, "checking the group length");

                    list.pop();
                    list.pop();
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, [0, -4, -2]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0]));
                    LiveUnit.Assert.areEqual(2, groupOfGroup.groups.length, "checking the group length");
                    LiveUnit.Assert.areEqual(1, groupedList.groups.length, "checking the group length");

                    list.pop();
                    list.pop();
                    list.pop();
                    LiveUnit.Assert.areEqual(0, list.length, "validating list length")
                    LiveUnit.Assert.areEqual(0, groupOfGroup.length, "validating groupOfGroup length")
                    LiveUnit.Assert.areEqual(0, groupedList.length, "validating groupedList length")
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, []));
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, []));
                    LiveUnit.Assert.areEqual(0, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(0, groupedList.groups.length, "checking the length of the group of group");

                    if (options && options.proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "checking the list content");
                    }
                }
                testWithDifferentOptions(testScenario);
            }

            testMoveMutationsOnGroupsOfGroups() {
                //Neeed to add more move functions
                function testScenario(options) {
                    var data = [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "one", "two", "three", "four"];
                    var list = new List(data, options);

                    var mainGroupSelector = function (num) {
                        if (typeof num === "string") {
                            return "string";
                        }
                        return (Math.abs(num) % 2 === 0) ? "even" : "odd";
                    };
                    var groupedList = list.createGrouped(mainGroupSelector, mainGroupSelector);

                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "one", "two", "three", "four"]));
                    var groupSelector = function (num) {
                        if (typeof num === "string") {
                            return "string";
                        }
                        if (num >= 0) {
                            return (num % 2 === 0) ? "positiveEven" : "positiveOdd";
                        }
                        else if (num < 0) {
                            return (Math.abs(num) % 2 === 0) ? "negativeEven" : "negativeOdd";
                        }
                    };

                    var sorter = function (a, b) {
                        var arr = { "string": -1, "positiveEven": 0, "negativeEven": 1, "positiveOdd": 2, "negativeOdd": 3 };
                        return arr[a] - arr[b];
                    };

                    var groupOfGroup = groupedList.createGrouped(groupSelector, groupSelector, sorter);
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, ["one", "two", "three", "four", 0, 2, 4, -4, -2, 1, 3, 5, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "one", "two", "three", "four"]));
                    LiveUnit.Assert.areEqual(5, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(3, groupedList.groups.length, "checking the length of the group of group");

                    list.move(10, 13);
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "two", "three", "four", "one"]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, ["two", "three", "four", "one", 0, 2, 4, -4, -2, 1, 3, 5, -3, -1]));
                    LiveUnit.Assert.areEqual(5, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(3, groupedList.groups.length, "checking the length of the group of group");

                    if (options && options.proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "checking the list content");
                    }
                }
                testWithDifferentOptions(testScenario);
            }

            testUnshiftMutationsOnGroupsOfGroups() {
                function testScenario(options) {
                    var data = [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5];
                    var list = new List<any>(data, options);

                    var mainGroupSelector = function (num) {
                        if (typeof num === "string") {
                            return "string";
                        }
                        return (Math.abs(num) % 2 === 0) ? "even" : "odd";
                    };
                    var groupedList = list.createGrouped(mainGroupSelector, mainGroupSelector);

                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5]));
                    var groupSelector = function (num) {
                        if (typeof num === "string") {
                            return "string";
                        }
                        if (num >= 0) {
                            return (num % 2 === 0) ? "positiveEven" : "positiveOdd";
                        }
                        else if (num < 0) {
                            return (Math.abs(num) % 2 === 0) ? "negativeEven" : "negativeOdd";
                        }
                    };

                    var sorter = function (a, b) {
                        var arr = { "string": -1, "positiveEven": 0, "negativeEven": 1, "positiveOdd": 2, "negativeOdd": 3 };
                        return arr[a] - arr[b];
                    };

                    var groupOfGroup = groupedList.createGrouped(groupSelector, groupSelector, sorter);
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, [0, 2, 4, -4, -2, 1, 3, 5, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5]));
                    LiveUnit.Assert.areEqual(4, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(2, groupedList.groups.length, "checking the length of the group of group");

                    list.unshift("five", "four", "three");
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, ["five", "four", "three", 0, 2, 4, -4, -2, 1, 3, 5, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "five", "four", "three"]));
                    LiveUnit.Assert.areEqual(5, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(3, groupedList.groups.length, "checking the length of the group of group");

                    if (options && options.proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "checking the list content");
                    }
                }
                testWithDifferentOptions(testScenario);
            }

            testShiftMutationsOnGroupsOfGroups() {

                function testScenario(options) {
                    var data = [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "one", "two", "three"];
                    var list = new List(data, options);

                    var mainGroupSelector = function (num) {
                        if (typeof num === "string") {
                            return "string";
                        }
                        return (Math.abs(num) % 2 === 0) ? "even" : "odd";
                    };
                    var groupedList = list.createGrouped(mainGroupSelector, mainGroupSelector);

                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "one", "two", "three"]));
                    var groupSelector = function (num) {
                        if (typeof num === "string") {
                            return "string";
                        }
                        if (num >= 0) {
                            return (num % 2 === 0) ? "positiveEven" : "positiveOdd";
                        }
                        else if (num < 0) {
                            return (Math.abs(num) % 2 === 0) ? "negativeEven" : "negativeOdd";
                        }
                    };

                    var sorter = function (a, b) {
                        var arr = { "string": -1, "positiveEven": 0, "negativeEven": 1, "positiveOdd": 2, "negativeOdd": 3 };
                        return arr[a] - arr[b];
                    };

                    var groupOfGroup = groupedList.createGrouped(groupSelector, groupSelector, sorter);
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, ["one", "two", "three", 0, 2, 4, -4, -2, 1, 3, 5, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "one", "two", "three"]));
                    LiveUnit.Assert.areEqual(5, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(3, groupedList.groups.length, "checking the length of the group of group");

                    list.shift();
                    list.shift();

                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, ["one", "two", "three", 0, 2, 4, 1, 3, 5, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [0, 2, 4, -3, -1, 1, 3, 5, "one", "two", "three"]));
                    LiveUnit.Assert.areEqual(4, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(3, groupedList.groups.length, "checking the length of the group of group");

                    list.shift();
                    list.shift();
                    list.shift();
                    list.shift();
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, ["one", "two", "three", 1, 3, 5, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-1, 1, 3, 5, "one", "two", "three"]));
                    LiveUnit.Assert.areEqual(3, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(2, groupedList.groups.length, "checking the length of the group of group");

                    list.shift();
                    list.shift();
                    list.shift();
                    list.shift();
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, ["one", "two", "three"]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, ["one", "two", "three"]));
                    LiveUnit.Assert.areEqual(1, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(1, groupedList.groups.length, "checking the length of the group of group");

                    list.shift();
                    list.shift();
                    list.shift();
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, []));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, []));
                    LiveUnit.Assert.areEqual(0, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(0, groupedList.groups.length, "checking the length of the group of group");

                    if (options && options.proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "checking the list content");
                    }
                }
                testWithDifferentOptions(testScenario);
            }
            testSetAtOnGroupsOfGroups() {
                function testScenario(options) {
                    var data = [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "one", "two", "three"];
                    var list = new List(data, options);

                    var mainGroupSelector = function (num) {
                        if (typeof num === "string") {
                            return "string";
                        }
                        return (Math.abs(num) % 2 === 0) ? "even" : "odd";
                    };
                    var groupedList = list.createGrouped(mainGroupSelector, mainGroupSelector);

                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "one", "two", "three"]));
                    var groupSelector = function (num) {
                        if (typeof num === "string") {
                            return "string";
                        }
                        if (num >= 0) {
                            return (num % 2 === 0) ? "positiveEven" : "positiveOdd";
                        }
                        else if (num < 0) {
                            return (Math.abs(num) % 2 === 0) ? "negativeEven" : "negativeOdd";
                        }
                    };

                    var sorter = function (a, b) {
                        var arr = { "string": -1, "positiveEven": 0, "negativeEven": 1, "positiveOdd": 2, "negativeOdd": 3 };
                        return arr[a] - arr[b];
                    };

                    var groupOfGroup = groupedList.createGrouped(groupSelector, groupSelector, sorter);
                    var filter = groupOfGroup.createFiltered(function (e) { return typeof e === "string"; });

                    LiveUnit.Assert.isTrue(verifyListContent(filter, ["one", "two", "three"]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, ["one", "two", "three", 0, 2, 4, -4, -2, 1, 3, 5, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, "one", "two", "three"]));
                    LiveUnit.Assert.areEqual(5, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(3, groupedList.groups.length, "checking the length of the group of group");

                    filter.setAt(0, 1);
                    LiveUnit.Assert.isTrue(verifyListContent(filter, ["two", "three"]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, ["two", "three", 0, 2, 4, -4, -2, 1, 3, 5, 1, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 0, 2, 4, -3, -1, 1, 3, 5, 1, "two", "three"]));
                    LiveUnit.Assert.areEqual(5, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(3, groupedList.groups.length, "checking the length of the group of group");

                    groupedList.setAt(0, -groupedList.getAt(0));
                    groupedList.setAt(1, -groupedList.getAt(1));
                    groupedList.setAt(2, "zero");
                    LiveUnit.Assert.isTrue(verifyListContent(filter, ["zero", "two", "three"]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, ["zero", "two", "three", 4, 2, 2, 4, 1, 3, 5, 1, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [4, 2, 2, 4, -3, -1, 1, 3, 5, 1, "zero", "two", "three"]));
                    LiveUnit.Assert.areEqual(4, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(3, groupedList.groups.length, "checking the length of the group of group");

                    groupedList.setAt(0, -groupedList.getAt(0));
                    groupedList.setAt(1, -groupedList.getAt(1));
                    LiveUnit.Assert.isTrue(verifyListContent(filter, ["zero", "two", "three"]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupOfGroup, ["zero", "two", "three", 2, 4, -4, -2, 1, 3, 5, 1, -3, -1]));
                    LiveUnit.Assert.isTrue(verifyListContent(groupedList, [-4, -2, 2, 4, -3, -1, 1, 3, 5, 1, "zero", "two", "three"]));
                    LiveUnit.Assert.areEqual(5, groupOfGroup.groups.length, "checking the length of the group of group");
                    LiveUnit.Assert.areEqual(3, groupedList.groups.length, "checking the length of the group of group");

                    if (options && options.proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data), "checking the list content");
                    }
                }
                testWithDifferentOptions(testScenario);
            }

            testListFilterWithProxyEmptyArray() {

                function testScenario(options) {
                    var data = [];
                    var list = new List(data, options);
                    var listener = new ListListener(list);
                    var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                    var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                    var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                    var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                    var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                    var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });

                    evenFiltered.push(0);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [0]));
                    if (options && options.proxy) {
                        LiveUnit.Assert.isTrue(verifyListContent(list, data));
                    }
                }
                testWithDifferentOptions(testScenario);
            }
            testBindingInListWithMultipleProjectionsLayer(complete) {
                var data = [{ index: 3, content: { groupKey: "three" } }, { index: 1, content: { groupKey: "one" } }, { index: 4, content: { groupKey: "four" } },
                    { index: 2, content: { groupKey: "two" } }, { index: 5, content: { groupKey: "five" } }, { index: 6, content: { groupKey: "six" } }];

                var list = new List<any>(data, { binding: true });
                var hit = 0;
                var sorted = list.createSorted(function (l, r) { return l.index - r.index; });
                var sortedListener = new ListListener(sorted);

                var compareFunction = function (obj) { return (typeof obj.content.groupKey === "string") ? "string" : "nonString"; };
                var group = sorted.createGrouped(compareFunction, compareFunction);

                LiveUnit.Assert.isTrue(verifyIndex(sorted, [1, 2, 3, 4, 5, 6]));
                LiveUnit.Assert.isTrue(verifyIndex(group, [1, 2, 3, 4, 5, 6]));
                LiveUnit.Assert.areEqual(1, group.groups.length);

                for (var i = 0; i < list.length; i++) {
                    list.getAt(i).content.bind("groupKey", onChange);
                }
                function onChange() {
                    hit++;
                }
                function verifyIndex(list, arr) {
                    for (var i = 0; i < list.length; i++) {
                        if (arr[i] !== list.getAt(i).index) {
                            return false;
                        }
                    }
                    return arr.length === list.length;
                }
                hit = 0;
                sorted.getAt(3).content.groupKey = 12;
                WinJS.Utilities.Scheduler.schedulePromiseNormal()
                    .then(function () {
                        sortedListener.assertLengthChangedCount(1);
                        sorted.notifyMutated(3);
                        LiveUnit.Assert.isTrue(verifyIndex(sorted, [1, 2, 3, 4, 5, 6]));
                        LiveUnit.Assert.areEqual(2, group.groups.length);
                        LiveUnit.Assert.isTrue(verifyIndex(group, [4, 1, 2, 3, 5, 6]));
                        LiveUnit.Assert.areEqual(1, hit, "making sure that the binding is working fine");
                    })
                    .then(function () {
                        sortedListener.assertLengthChangedCount(1);
                    })
                    .then(null, errorHandler)
                    .then(complete);
            }
            testBindingInListCallingAllListeners(complete) {

                var data = [{ index: 3, content: { groupKey: "three" } }, { index: 1, content: { groupKey: "one" } }, { index: 4, content: { groupKey: "four" } },
                    { index: 2, content: { groupKey: "two" } }, { index: 5, content: { groupKey: "five" } }, { index: 6, content: { groupKey: "six" } }];

                var list = new List<any>(data, { binding: true });
                var hit = 0;
                var sorted = list.createSorted(function (l, r) { return l.index - r.index; });

                var compareFunction = function (obj) { return (typeof obj.content.groupKey === "string") ? "string" : "nonString"; };
                var group = sorted.createGrouped(compareFunction, compareFunction);

                LiveUnit.Assert.isTrue(verifyIndex(sorted, [1, 2, 3, 4, 5, 6]));
                LiveUnit.Assert.isTrue(verifyIndex(group, [1, 2, 3, 4, 5, 6]));
                LiveUnit.Assert.areEqual(1, group.groups.length);
                var i;
                for (i = 0; i < list.length; i++) {
                    list.getAt(i).content.bind("groupKey", onChange);
                }
                function onChange() {
                    hit++;
                }
                function verifyIndex(list, arr) {
                    for (var i = 0; i < list.length; i++) {
                        if (arr[i] !== list.getAt(i).index) {
                            return false;
                        }
                    }
                    return arr.length === list.length;
                }
                var p = [];
                hit = 0;
                for (i = 0; i < sorted.length; i++) {
                    p[i] = sorted.getAt(i).content.updateProperty("groupKey", i);
                }
                WinJS.Promise.join(p)
                    .then(function () {
                        LiveUnit.Assert.isTrue(verifyIndex(sorted, [1, 2, 3, 4, 5, 6]));
                        LiveUnit.Assert.areEqual(1, group.groups.length);
                        LiveUnit.Assert.areEqual(6, hit, "making sure that the binding is working fine");
                    })
                    .then(null, errorHandler)
                    .then(complete);
            }
            testBindingInListCallingAllListenersAndUpdatingAll(complete) {
                var data = [{ index: 3, content: { groupKey: "three" } }, { index: 1, content: { groupKey: "one" } }, { index: 4, content: { groupKey: "four" } },
                    { index: 2, content: { groupKey: "two" } }, { index: 5, content: { groupKey: "five" } }, { index: 6, content: { groupKey: "six" } }];

                var list = new List<any>(data, { binding: true });
                var hit = 0;
                var sorted = list.createSorted(function (l, r) { return l.index - r.index; });

                var compareFunction = function (obj) { return (typeof obj.content.groupKey === "string") ? "string" : "nonString"; };
                var group = sorted.createGrouped(compareFunction, compareFunction);

                LiveUnit.Assert.isTrue(verifyIndex(sorted, [1, 2, 3, 4, 5, 6]));
                LiveUnit.Assert.isTrue(verifyIndex(group, [1, 2, 3, 4, 5, 6]));
                LiveUnit.Assert.areEqual(1, group.groups.length);
                var i;
                for (i = 0; i < list.length; i++) {
                    list.getAt(i).content.bind("groupKey", onChange);
                }
                function onChange() {
                    hit++;
                }
                function verifyIndex(list, arr) {
                    for (var i = 0; i < list.length; i++) {
                        if (arr[i] !== list.getAt(i).index) {
                            return false;
                        }
                    }
                    return arr.length === list.length;
                }
                var p = [];
                hit = 0;
                for (i = 0; i < sorted.length; i++) {
                    p[i] = sorted.getAt(i).content.updateProperty("groupKey", i);
                    sorted.notifyMutated(i);
                }
                WinJS.Promise.join(p).then(function () {

                    LiveUnit.Assert.isTrue(verifyIndex(sorted, [1, 2, 3, 4, 5, 6]));
                    LiveUnit.Assert.areEqual(1, group.groups.length);
                    LiveUnit.Assert.areEqual(6, hit, "making sure that the binding is working fine");
                    complete();

                });
            }

            testFilteredPop() {

                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });


                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });

                list.push(0);
                data.push(0);
                LiveUnit.Assert.isTrue(verifyListContent(list, data));
                LiveUnit.Assert.isTrue(verifyListContent(evenFiltered, [-2, -4, 0, 2, 4, 6, 0]));
                LiveUnit.Assert.isTrue(verifyListContent(positiveEvenFiltered, [2, 4, 6]));
                LiveUnit.Assert.isTrue(verifyListContent(negativeEvenFiltered, [-2, -4]));
                LiveUnit.Assert.isTrue(verifyListContent(oddFiltered, [-1, -3, -5, 1, 3, 5]));
                LiveUnit.Assert.isTrue(verifyListContent(positiveOddFiltered, [1, 3, 5]));
                LiveUnit.Assert.isTrue(verifyListContent(negativeOddFiltered, [-1, -3, -5]));

                LiveUnit.Assert.areEqual(6, positiveEvenFiltered.pop(), "pop from pisitve Even filter");
                LiveUnit.Assert.areEqual(-4, negativeEvenFiltered.pop(), "pop from pisitve Even filter");
                LiveUnit.Assert.areEqual(5, oddFiltered.pop(), "pop from pisitve Even filter");
                LiveUnit.Assert.areEqual(3, positiveOddFiltered.pop(), "pop from pisitve Even filter");
            }
            testBindingWithObjectContainingDifferentTypes(complete) {

                var data = [{ data: [1, 2, 3, 4] }, { data: new Date() }, { data: 1 }, { data: 3 }];
                var list = new List<any>(data, { binding: true });

                var listener = new ListListener(list);
                for (var i = 0; i < list.length; i++) {
                    list.getAt(i).bind("data", onChange);
                }

                function onChange() {
                    hit++;
                }
                var hit = 0;
                list.getAt(0).data = [3, 4, 5];
                list.getAt(1).data = 10;
                list.getAt(2).data = 1;
                list.getAt(3).data = 2;
                WinJS.Utilities.Scheduler.schedulePromiseNormal()
                    .then(function () {
                        LiveUnit.Assert.areEqual(3, hit);
                    })
                    .then(null, errorHandler)
                    .then(complete);
            }
            testSetLengthOfFiltered() {
                var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                var list = new List(arr);
                var filtered = list.createFiltered(function (num) { return (num % 2) === 1; });
                LiveUnit.Assert.areEqual(10, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(5, filtered.length, "testing filtered.length");

                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
                LiveUnit.Assert.isTrue(verifyListContent(filtered, [1, 3, 5, 7, 9]));

                list.length = 7;
                LiveUnit.Assert.areEqual(7, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(4, filtered.length, "testing filtered.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7]));
                LiveUnit.Assert.isTrue(verifyListContent(filtered, [1, 3, 5, 7]));

                filtered.length = 2;
                LiveUnit.Assert.areEqual(5, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(2, filtered.length, "testing filtered.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 6]));
                LiveUnit.Assert.isTrue(verifyListContent(filtered, [1, 3]));

            }
            testSetLengthOfSortedProjection() {
                var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                var list = new List(arr);
                var sorted = list.createSorted(function (l, r) { return r - l; });
                LiveUnit.Assert.areEqual(10, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(10, sorted.length, "testing sorted.length");

                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
                LiveUnit.Assert.isTrue(verifyListContent(sorted, [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]));

                list.length = 7;
                LiveUnit.Assert.areEqual(7, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(7, sorted.length, "testing sorted.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7]));
                LiveUnit.Assert.isTrue(verifyListContent(sorted, [7, 6, 5, 4, 3, 2, 1]));

                sorted.length = 2;
                LiveUnit.Assert.areEqual(2, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(2, sorted.length, "testing sorted.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [6, 7]));
                LiveUnit.Assert.isTrue(verifyListContent(sorted, [7, 6]));

            }
            testSetLengthOfGroupSortedProjection() {
                var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                var list = new List(arr);
                function grouping(num) { return (num % 2 === 0) ? "even" : "odd"; };
                var grouped = list.createGrouped(grouping, grouping);

                LiveUnit.Assert.areEqual(2, grouped.groups.length, "checking the number of groups");
                LiveUnit.Assert.areEqual(10, grouped.length, "checking grouped.length");
                LiveUnit.Assert.areEqual(10, list.length, "checking list.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
                LiveUnit.Assert.isTrue(verifyListContent(grouped, [2, 4, 6, 8, 10, 1, 3, 5, 7, 9, ]));

                list.length = 5;
                LiveUnit.Assert.areEqual(2, grouped.groups.length, "checking the number of groups");
                LiveUnit.Assert.areEqual(5, grouped.length, "checking grouped.length");
                LiveUnit.Assert.areEqual(5, list.length, "checking list.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5]));
                LiveUnit.Assert.isTrue(verifyListContent(grouped, [2, 4, 1, 3, 5]));

                grouped.length = 2;
                LiveUnit.Assert.areEqual(1, grouped.groups.length, "checking the number of groups");
                LiveUnit.Assert.areEqual(2, grouped.length, "checking grouped.length");
                LiveUnit.Assert.areEqual(2, list.length, "checking list.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [2, 4]));
                LiveUnit.Assert.isTrue(verifyListContent(grouped, [2, 4]));

            }
            testSetLengthOfFilteredToZero() {
                var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                var list = new List(arr);
                var filtered = list.createFiltered(function (num) { return (num % 2 === 1); });
                LiveUnit.Assert.areEqual(10, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(5, filtered.length, "testing filtered.length");

                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
                LiveUnit.Assert.isTrue(verifyListContent(filtered, [1, 3, 5, 7, 9]));

                list.length = 7;
                LiveUnit.Assert.areEqual(7, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(4, filtered.length, "testing filtered.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7]));
                LiveUnit.Assert.isTrue(verifyListContent(filtered, [1, 3, 5, 7]));

                filtered.length = 0;
                LiveUnit.Assert.areEqual(3, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(0, filtered.length, "testing filtered.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [2, 4, 6]));
                LiveUnit.Assert.isTrue(verifyListContent(filtered, []));

            }
            testSetLengthOfSortedProjectionToZero() {
                var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                var list = new List(arr);
                var sorted = list.createSorted(function (l, r) { return r - l; });
                LiveUnit.Assert.areEqual(10, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(10, sorted.length, "testing sorted.length");

                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
                LiveUnit.Assert.isTrue(verifyListContent(sorted, [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]));

                list.length = 7;
                LiveUnit.Assert.areEqual(7, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(7, sorted.length, "testing sorted.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7]));
                LiveUnit.Assert.isTrue(verifyListContent(sorted, [7, 6, 5, 4, 3, 2, 1]));

                sorted.length = 0;
                LiveUnit.Assert.areEqual(0, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(0, sorted.length, "testing sorted.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, []));
                LiveUnit.Assert.isTrue(verifyListContent(sorted, []));

            }
            testSetLengthOfGroupSortedProjectionToZero() {
                var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                var list = new List(arr);
                function grouping(num) { return (num % 2 === 0) ? "even" : "odd"; };
                var grouped = list.createGrouped(grouping, grouping);

                LiveUnit.Assert.areEqual(2, grouped.groups.length, "checking the number of groups");
                LiveUnit.Assert.areEqual(10, grouped.length, "checking grouped.length");
                LiveUnit.Assert.areEqual(10, list.length, "checking list.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
                LiveUnit.Assert.isTrue(verifyListContent(grouped, [2, 4, 6, 8, 10, 1, 3, 5, 7, 9, ]));

                list.length = 5;
                LiveUnit.Assert.areEqual(2, grouped.groups.length, "checking the number of groups");
                LiveUnit.Assert.areEqual(5, grouped.length, "checking grouped.length");
                LiveUnit.Assert.areEqual(5, list.length, "checking list.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5]));
                LiveUnit.Assert.isTrue(verifyListContent(grouped, [2, 4, 1, 3, 5]));

                grouped.length = 0;
                LiveUnit.Assert.areEqual(0, grouped.groups.length, "checking the number of groups");
                LiveUnit.Assert.areEqual(0, grouped.length, "checking grouped.length");
                LiveUnit.Assert.areEqual(0, list.length, "checking list.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, []));
                LiveUnit.Assert.isTrue(verifyListContent(grouped, []));

            }
            testSetLengthOfFilteredToNegative() {
                var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                var list = new List(arr);
                var filtered = list.createFiltered(function (num) { return (num % 2 === 1); });
                LiveUnit.Assert.areEqual(10, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(5, filtered.length, "testing filtered.length");

                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
                LiveUnit.Assert.isTrue(verifyListContent(filtered, [1, 3, 5, 7, 9]));

                list.length = 7;
                LiveUnit.Assert.areEqual(7, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(4, filtered.length, "testing filtered.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7]));
                LiveUnit.Assert.isTrue(verifyListContent(filtered, [1, 3, 5, 7]));

                var hitCatch = false;
                try {
                    filtered.length = -1;
                } catch (e) {
                    hitCatch = true;
                }

                LiveUnit.Assert.isTrue(hitCatch);
                LiveUnit.Assert.areEqual(7, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(4, filtered.length, "testing filtered.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7]));
                LiveUnit.Assert.isTrue(verifyListContent(filtered, [1, 3, 5, 7]));

            }
            testSetLengthOfSortedProjectionToNegative() {
                var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                var list = new List(arr);
                var sorted = list.createSorted(function (l, r) { return r - l; });
                LiveUnit.Assert.areEqual(10, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(10, sorted.length, "testing sorted.length");

                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
                LiveUnit.Assert.isTrue(verifyListContent(sorted, [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]));

                list.length = 7;
                LiveUnit.Assert.areEqual(7, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(7, sorted.length, "testing sorted.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7]));
                LiveUnit.Assert.isTrue(verifyListContent(sorted, [7, 6, 5, 4, 3, 2, 1]));

                var hitCatch = false;
                try {
                    sorted.length = -1;
                } catch (e) {
                    hitCatch = true;
                }

                LiveUnit.Assert.isTrue(hitCatch);
                LiveUnit.Assert.areEqual(7, list.length, "testing list.length");
                LiveUnit.Assert.areEqual(7, sorted.length, "testing sorted.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7]));
                LiveUnit.Assert.isTrue(verifyListContent(sorted, [7, 6, 5, 4, 3, 2, 1]));
            }
            testSetLengthOfGroupSortedProjectionToNegative() {
                var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                var list = new List(arr);
                function grouping(num) { return (num % 2 === 0) ? "even" : "odd"; };
                var grouped = list.createGrouped(grouping, grouping);

                LiveUnit.Assert.areEqual(2, grouped.groups.length, "checking the number of groups");
                LiveUnit.Assert.areEqual(10, grouped.length, "checking grouped.length");
                LiveUnit.Assert.areEqual(10, list.length, "checking list.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
                LiveUnit.Assert.isTrue(verifyListContent(grouped, [2, 4, 6, 8, 10, 1, 3, 5, 7, 9, ]));

                list.length = 5;
                LiveUnit.Assert.areEqual(2, grouped.groups.length, "checking the number of groups");
                LiveUnit.Assert.areEqual(5, grouped.length, "checking grouped.length");
                LiveUnit.Assert.areEqual(5, list.length, "checking list.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5]));
                LiveUnit.Assert.isTrue(verifyListContent(grouped, [2, 4, 1, 3, 5]));

                var hitCatch = false;
                try {
                    grouped.length = -1;
                } catch (e) {
                    hitCatch = true;
                }

                LiveUnit.Assert.isTrue(hitCatch);
                LiveUnit.Assert.areEqual(2, grouped.groups.length, "checking the number of groups");
                LiveUnit.Assert.areEqual(5, grouped.length, "checking grouped.length");
                LiveUnit.Assert.areEqual(5, list.length, "checking list.length");
                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 2, 3, 4, 5]));
                LiveUnit.Assert.isTrue(verifyListContent(grouped, [2, 4, 1, 3, 5]));

            }
            testSpliceAtGroupSortedInsertInWrongGroup() {
                var list = new List([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                var compare = function (num) { return (num % 2 === 0) ? "even" : "odd"; };
                var sorter = function (l, r) { return l.length - r.length; }
                var grouped = list.createGrouped(compare, compare, sorter);
                grouped.splice(0, 0, 4);

                LiveUnit.Assert.isTrue(verifyListContent(list, [1, 3, 5, 7, 9, 4, 2, 4, 6, 8], true));
            }

            testMoveElementsInFilteredProjection() {
                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });

                LiveUnit.Assert.isTrue(verifyListContent(list, data));
                LiveUnit.Assert.isTrue(verifyListContent(evenFiltered, [-2, -4, 0, 2, 4, 6]));
                LiveUnit.Assert.isTrue(verifyListContent(positiveEvenFiltered, [2, 4, 6]));
                LiveUnit.Assert.isTrue(verifyListContent(negativeEvenFiltered, [-2, -4]));
                LiveUnit.Assert.isTrue(verifyListContent(oddFiltered, [-1, -3, -5, 1, 3, 5]));
                LiveUnit.Assert.isTrue(verifyListContent(positiveOddFiltered, [1, 3, 5]));
                LiveUnit.Assert.isTrue(verifyListContent(negativeOddFiltered, [-1, -3, -5]));

                negativeOddFiltered.move(0, negativeOddFiltered.length - 1);

                LiveUnit.Assert.isTrue(verifyListContent(negativeOddFiltered, [-3, -5, -1]));
                LiveUnit.Assert.isTrue(verifyListContent(oddFiltered, [-3, -5, -1, 1, 3, 5]));
                LiveUnit.Assert.isTrue(verifyListContent(positiveOddFiltered, [1, 3, 5]));
            }

            testMoveElementsInFilteredProjectionUsingTheMainList() {
                var data = [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4, 5, 6];
                var list = new List(data);
                var listener = new ListListener(list);
                var evenFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 0; });
                var oddFiltered = list.createFiltered(function (item) { return Math.abs(item) % 2 === 1; });
                var positiveEvenFiltered = evenFiltered.createFiltered(function (item) { return item > 0; });
                var negativeEvenFiltered = evenFiltered.createFiltered(function (item) { return item < 0; });
                var positiveOddFiltered = oddFiltered.createFiltered(function (item) { return item > 0; });
                var negativeOddFiltered = oddFiltered.createFiltered(function (item) { return item < 0; });

                LiveUnit.Assert.isTrue(verifyListContent(list, data));
                LiveUnit.Assert.isTrue(verifyListContent(evenFiltered, [-2, -4, 0, 2, 4, 6]));
                LiveUnit.Assert.isTrue(verifyListContent(positiveEvenFiltered, [2, 4, 6]));
                LiveUnit.Assert.isTrue(verifyListContent(negativeEvenFiltered, [-2, -4]));
                LiveUnit.Assert.isTrue(verifyListContent(oddFiltered, [-1, -3, -5, 1, 3, 5]));
                LiveUnit.Assert.isTrue(verifyListContent(positiveOddFiltered, [1, 3, 5]));
                LiveUnit.Assert.isTrue(verifyListContent(negativeOddFiltered, [-1, -3, -5]));

                list.move(0, list.length - 1);

                LiveUnit.Assert.isTrue(verifyListContent(negativeOddFiltered, [-3, -5, -1]));
                LiveUnit.Assert.isTrue(verifyListContent(oddFiltered, [-3, -5, 1, 3, 5, -1]));
                LiveUnit.Assert.isTrue(verifyListContent(positiveOddFiltered, [1, 3, 5]));
            }

            testMutatingGroupedItems() {
                var fruits = [];
                fruits.push({ group: { key: "1" }, title: "Banana" });
                fruits.push({ group: { key: "2" }, title: "Peach" });
                fruits.push({ group: { key: "1" }, title: "Blueberry" });
                fruits.push({ group: { key: "2" }, title: "Plum" });

                function groupKeySelector(item) {
                    return item.group.key;
                }

                function groupDataSelector(item) {
                    return {
                        title: item.group.key,
                    }
                }

                var list = new WinJS.Binding.List(fruits);
                var groupedItems = list.createGrouped(groupKeySelector, groupDataSelector);

                LiveUnit.Assert.areEqual("Banana,Blueberry,Peach,Plum", groupedItems.map(function (item) { return item.title; }).join());

                groupedItems.getAt(0).group.key = "2";
                groupedItems.notifyMutated(0);

                LiveUnit.Assert.areEqual("Blueberry,Banana,Peach,Plum", groupedItems.map(function (item) { return item.title; }).join());
            }
            testBindingAsWithBindingList() {
                var obj = {
                    str: 'string',
                    integer: 1,
                    myList: new WinJS.Binding.List()

                };
                var observable = WinJS.Binding.as(obj);
                observable.myList.push(10);
                LiveUnit.Assert.areEqual(10, observable.myList.getAt(0), "testing the first element of the list in observable");
                
            }
            testBindingWithClassDefine() {
                var someClass = WinJS.Class.define(
                                function () {
                                    this._list = new WinJS.Binding.List();
                                    this._variable = 0;
                                },
                                {
                                    list: {
                                        get: function () { return this._list; },
                                        set : function (l) {this._list = l;}
                                    },
                                    variable: {
                                        get: function () { return this._variable; },
                                        set: function (v) {
                                            this._variable = v;
                                        }
                                    }
                                }
                            );
                var obj = new someClass();
                obj.list.push(10);
                LiveUnit.Assert.areEqual(10, obj.list.getAt(0), "checking the binding list in class define");
                LiveUnit.Assert.areEqual(0, obj.variable, "making sure that the other variable is still correct");

                var l = new List([3, 4, 5]);
                obj.list = l;
                obj.variable = 10;
                LiveUnit.Assert.areEqual(3, obj.list.getAt(0), "checking the binding list after setting the whole list");
                LiveUnit.Assert.areEqual(3, obj.list.length, "checking the length of the list after setting the whole list");
                LiveUnit.Assert.areEqual(10, obj.variable, "making sure that the other variable is still correct");

            }
        };

      
}

LiveUnit.registerTestClass("Tests.ListTest");
LiveUnit.registerTestClass("Tests.ListProxy");
LiveUnit.registerTestClass("Tests.ListProjections");