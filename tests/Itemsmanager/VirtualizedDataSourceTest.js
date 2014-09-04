// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="../TestLib/TestDataSource.ts" />
/// <reference path="../TestLib/UnitTestsCommon.ts" />
/// <reference path="vds-tracing.js" />

var VirtualizedDataSourceTests = function () {
    "use strict";

    var previousTracingOptions;

    this.setUp = function () {
        previousTracingOptions = VDSLogging.options;
        VDSLogging.options = {
            log: function (message) { LiveUnit.Assert.fail(message); },
            include: /createListBinding|_retainItem|_releaseItem|release/,
            handleTracking: true,
            logVDS: true,
            stackTraceLimit: 0 // set this to 100 to get good stack traces if you run into a failure.
        };
        VDSLogging.on();
    }

    this.tearDown = function () {
        VDSLogging.off();
        VDSLogging.options = previousTracingOptions;
    }

    var Promise = WinJS.Promise;

    function errorHandler(msg) {
        try {
            LiveUnit.Assert.fail('There was an unhandled error in your test: ' + msg);
        } catch (ex) { }
    }

    var SimpleDataAdapter = WinJS.Class.define(function (data) {
        this._data = data || [];

    }, {
        compareByIdentity: true,

        getCount: function () {
            return Promise.wrap(this._data.length);
        },

        invalidateAll: function () {
            return this._notificationHandler.invalidateAll();
        },

        itemsFromIndex: function (requestIndex, countBefore, countAfter) {
            var data = this._data;
            var length = data.length;

            if (requestIndex >= length) {
                return Promise.wrap(new WinJS.ErrorFromName(WinJS.UI.FetchError.doesNotExist));
            }
            if (requestIndex < 0) {
                return Promise.wrap(new WinJS.ErrorFromName(WinJS.UI.FetchError.doesNotExist));
            }

            countBefore = Math.max(0, Math.min(requestIndex, countBefore));
            countAfter = Math.max(0, Math.min((length - requestIndex) - 1, countAfter));

            var response = {
                items: data.slice(requestIndex - countBefore, requestIndex + countAfter + 1),
                offset: countBefore,
                totalCount: length,
                absoluteIndex: requestIndex,
                atStart: countBefore === requestIndex
            };
            return Promise.wrap(response);
        },

        itemsFromKey: function (requestKey, countBefore, countAfter) {
            var data = this._data;
            for (var i = 0, len = data.length; i < len; i++) {
                if (requestKey === data[i].key) {
                    return this.itemsFromIndex(i, countBefore, countAfter);
                }
            }
            return Promise.wrap(new WinJS.ErrorFromName(WinJS.UI.FetchError.doesNotExist));
        },

        pop: function () {
            var data = this._data;

            var element = data.pop();
            var index = data.length;
            this._notificationHandler.removed(element, index);
            return element;
        },

        push: function (element) {
            var data = this._data;

            data.push(element);

            var index = data.length - 1;
            this._notificationHandler.inserted(element, index > 0 ? data[index - 1].key : null, null, index);
        },

        removeAt: function (index) {
            var data = this._data;
            var element = data.splice(index, 1)[0];

            this._notificationHandler.removed(element, index);
            return element;
        },

        setNotificationHandler: function (notificationHandler) {
            // We need this to be able to trigger refresh
            this._notificationHandler = notificationHandler;
        }

    });

    var SimpleDataSource = WinJS.Class.derive(WinJS.UI.VirtualizedDataSource, function (data) {
        this.adapter = new SimpleDataAdapter(data);
        this._baseDataSourceConstructor(this.adapter);
    }, {
        /* empty */
    });

    // Regression test for Win8:769372
    //
    this.testInvalidateAllOnEmptyThenInsert = function (complete) {

        var sds = new SimpleDataSource();

        var countChangedCount = 0;
        var insertedCount = 0;

        var expectedOldCount, expectedNewCount;

        var lb = sds.createListBinding({
            countChanged: function (newCount, oldCount) {
                LiveUnit.Assert.areEqual(expectedOldCount, oldCount);
                LiveUnit.Assert.areEqual(expectedNewCount, newCount);
                countChangedCount++;
            },
            inserted: function (itemPromise, previousHandle, nextHandle) {
                insertedCount++;
            }
        });

        expectedOldCount = "unknown";
        expectedNewCount = 0;

        sds.adapter.invalidateAll()

        Promise.timeout(100)
            .then(function () {
                // transition from 'unknown' -> 0
                LiveUnit.Assert.areEqual(1, countChangedCount);
                LiveUnit.Assert.areEqual(0, insertedCount);

                expectedOldCount = 0;
                expectedNewCount = 1;

                sds.adapter.push({ key: "key1", data: "some data!" });

                return Promise.timeout(100);
            })
            .then(function () {
                // transition from 0 -> 1
                LiveUnit.Assert.areEqual(2, countChangedCount);
                LiveUnit.Assert.areEqual(1, insertedCount);
            })
            .then(null, errorHandler)
            .then(function () {
                lb.release();
            })
            .then(complete);

    }

    this.testInsertOnEmptyList = function (complete) {

        var sds = new SimpleDataSource();

        var countChangedCount = 0;
        var insertedCount = 0;

        var lb = sds.createListBinding({
            countChanged: function (newCount, oldCount) {
                countChangedCount++;
            },
            inserted: function (itemPromise, previousHandle, nextHandle) {
                insertedCount++;
            }
        });

        LiveUnit.Assert.areEqual(0, countChangedCount);
        LiveUnit.Assert.areEqual(0, insertedCount);

        sds.adapter.push({ key: "key1", data: "some data!" });

        return Promise.timeout(100)
            .then(function () {
                // because it is still in an 'unknown' state we don't get a
                //  countChanged for the insertion
                LiveUnit.Assert.areEqual(0, countChangedCount);
                LiveUnit.Assert.areEqual(1, insertedCount);
            })
            .then(null, errorHandler)
            .then(function () {
                lb.release();
            })
            .then(complete);

    }

    this.xtestInsertOnEmptyListAfterCallingGetCount = function (complete) {

        var sds = new SimpleDataSource();

        var countChangedCount = 0;
        var insertedCount = 0;

        var expectedOldCount, expectedNewCount;

        var lb = sds.createListBinding({
            countChanged: function (newCount, oldCount) {
                LiveUnit.Assert.areEqual(expectedOldCount, oldCount);
                LiveUnit.Assert.areEqual(expectedNewCount, newCount);
                countChangedCount++;
            },
            inserted: function (itemPromise, previousHandle, nextHandle) {
                insertedCount++;
            }
        });


        LiveUnit.Assert.areEqual(0, countChangedCount);
        LiveUnit.Assert.areEqual(0, insertedCount);

        expectedOldCount = "unknown";
        expectedNewCount = 0;

        sds.getCount().then(function (c) {

            // transition from 'unknown' -> 1
            LiveUnit.Assert.areEqual(1, countChangedCount);
            LiveUnit.Assert.areEqual(0, insertedCount);

            expectedOldCount = 0;
            expectedNewCount = 1;

            sds.adapter.push({ key: "key1", data: "some data!" });

            return Promise.timeout(100);
        })
            .then(function () {
                // transition from 0 -> 1
                LiveUnit.Assert.areEqual(2, countChangedCount);
                LiveUnit.Assert.areEqual(1, insertedCount);
            })
            .then(null, errorHandler)
            .then(function () {
                lb.release();
            })
            .then(complete);

    }

    // Regression test for Win8:630529
    //
    this.testRemoveCurrentListBindingElement = function (complete) {

        var sds = new SimpleDataSource();

        var lb = sds.createListBinding();

        sds.adapter.push({ key: "key1", data: "data1" });
        sds.adapter.push({ key: "key2", data: "data2" });
        sds.adapter.push({ key: "key3", data: "data3" });
        sds.adapter.push({ key: "key4", data: "data4" });

        return Promise.timeout(100)
            .then(function () {
                return lb.first();
            })
            .then(function (item) {
                LiveUnit.Assert.areEqual("key1", item.key);
                LiveUnit.Assert.areEqual("data1", item.data);
                return lb.next();
            })
            .then(function (item) {
                LiveUnit.Assert.areEqual("key2", item.key);
                LiveUnit.Assert.areEqual("data2", item.data);
                var removed = sds.adapter.removeAt(1);
                LiveUnit.Assert.areEqual("key2", removed.key);
                LiveUnit.Assert.areEqual("data2", removed.data);
                return Promise.timeout(100);
            })
            .then(function () {
                return lb.current();
            })
            .then(function (item) {
                LiveUnit.Assert.areEqual("key3", item.key);
                LiveUnit.Assert.areEqual("data3", item.data);
                return lb.previous();
            })
            .then(function (item) {
                LiveUnit.Assert.areEqual("key1", item.key);
                LiveUnit.Assert.areEqual("data1", item.data);
                return lb.first();
            })
            .then(function (item) {
                LiveUnit.Assert.areEqual("key1", item.key);
                LiveUnit.Assert.areEqual("data1", item.data);
            })
            .then(null, errorHandler)
            .then(function () {
                lb.release();
            })
            .then(complete);

    };

    this.testDoubleRelease = function (complete) {

        VDSLogging.options.log = function (message) {
            throw new WinJS.ErrorFromName("VDSLogging.ASSERT", message);
        };

        var sds = new SimpleDataSource();

        var countChangedCount = 0;
        var insertedCount = 0;

        var lb = sds.createListBinding({
            countChanged: function (newCount, oldCount) {
                countChangedCount++;
            },
            inserted: function (itemPromise, previousHandle, nextHandle) {
                insertedCount++;
            }
        });

        LiveUnit.Assert.areEqual(0, countChangedCount);
        LiveUnit.Assert.areEqual(0, insertedCount);

        sds.adapter.push({ key: "key1", data: "some data!" });

        var first = lb.first();
        first.retain();

        return Promise.timeout(100)
            .then(function () {
                // because it is still in an 'unknown' state we don't get a
                //  countChanged for the insertion
                LiveUnit.Assert.areEqual(0, countChangedCount);
                LiveUnit.Assert.areEqual(1, insertedCount);
                first.release();
                try {
                    first.release();
                    LiveUnit.Assert.fail("Should not get here");
                } catch (e) {
                    LiveUnit.Assert.areEqual("VDSLogging.ASSERT", e.name);
                }
            })
            .then(null, errorHandler)
            .then(function () {
                lb.release();
            })
            .then(complete);

    };

    // Regression test for Win8:847191
    //
    this.testInsertsOnNonEmptyListBeforeFirstRequest = function (complete) {
        var range = function (min, max) {
            var a = [];
            for (; min < max; min++) {
                a.push(min);
            }
            return a;
        };

        var ds = new SimpleDataSource(range(1, 101).map(function (el) { return { key: "" + el, data: el } }));

        var insertedCount = 0;
        var indexChangedCount = 0;

        var binding = ds.createListBinding({
            inserted: function (itemPromise) {
                itemPromise.retain();
                insertedCount++;
            },
            indexChanged: function (handle, newIndex, oldIndex) {
                indexChangedCount++;
            }
        });

        ds.adapter._notificationHandler.beginNotifications();
        range(200, 300).forEach(function (el) {
            ds.adapter.push({ key: "" + el, data: el });
        });
        ds.adapter._notificationHandler.endNotifications();
        ds.getCount()
            .then(function (c) {
                LiveUnit.Assert.areEqual(0, indexChangedCount);
                LiveUnit.Assert.areEqual(0, insertedCount);
                LiveUnit.Assert.areEqual(200, c);
            })
            .then(null, errorHandler)
            .then(complete);
    };

    // Regression test for WinBlue:22439
    //
    this.testInsertsWithNoIndexAndAKeyThatIsNotBeingTracked = function (complete) {
        VDSLogging.options.log = function (message) {
            throw new WinJS.ErrorFromName("VDSLoggin.g.ASSERT", message);
        };

        var sds = new SimpleDataSource();

        var countChangedCount = 0;
        var insertedCount = 0;
        var newCountValue = 0;

        var lb = sds.createListBinding({
            countChanged: function (newCount, oldCount) {
                countChangedCount++;
                newCountValue = newCount;
            },
            inserted: function (itemPromise, previousHandle, nextHandle) {
                insertedCount++;
            }
        });

        LiveUnit.Assert.areEqual(0, countChangedCount);
        LiveUnit.Assert.areEqual(0, insertedCount);

        sds.adapter.push({ key: "key4", data: "data4" });
        sds.adapter.push({ key: "key5", data: "data5" });
        sds.adapter.push({ key: "key6", data: "data6" });

        return Promise.timeout(100)
            .then(function () {
                LiveUnit.Assert.areEqual(0, countChangedCount);
                LiveUnit.Assert.areEqual(1, insertedCount);
                return Promise.timeout(100);
            })
            .then(function () {
                var item1 = { key: "key2", data: "data2" };
                var item2 = { key: "key3", data: "data3" };
                sds.adapter._data.unshift(item2);
                sds.adapter._data.unshift(item1);

                // Notify an insert passing previousKey = key2, which VDS is currently not tracking. This will
                //  make it start a refresh, and we should eventually end up in a good state with a valid
                //  count = 5
                //
                sds.adapter._notificationHandler.inserted(item2, "key2", null);
                return Promise.timeout(100);
            })
            .then(function () {
                LiveUnit.Assert.areEqual(1, countChangedCount);
                LiveUnit.Assert.areEqual(newCountValue, 5);
                return Promise.timeout(100);
            })
            .then(null, errorHandler)
            .then(function () {
                lb.release();
            })
            .then(complete);
    };

    // Verifies that when the VDS cancels the data adapter's getCount promise and the data
    //  adapter eats the cancelation by returning 0, the VDS doesn't get stuck in a state
    //  in which it believes that the data source is empty.
    // Regression test for WinBlue#304358
    //
    this.testDataAdapterEatingCountCancelation = function (complete) {
        var EatingDataAdapter = WinJS.Class.derive(SimpleDataAdapter, function () {
            SimpleDataAdapter.apply(this, arguments);
        }, {
            getCount: function () {
                return Promise.timeout().then(function () {
                    return this._data.length;
                }, function (error) {
                    // Eats the cancelation and returns 0.
                    //
                    return 0;
                });
            }
        });
        var EatingDataSource = WinJS.Class.derive(WinJS.UI.VirtualizedDataSource, function (data) {
            this.adapter = new EatingDataAdapter(data);
            this._baseDataSourceConstructor(this.adapter);
        }, {
            /* empty */
        });

        var data = [
            { key: "key0", data: "Item 0" },
            { key: "key1", data: "Item 1" },
            { key: "key2", data: "Item 2" }
        ];

        var ds = new EatingDataSource(data);
        ds.getCount().cancel();
        ds.itemFromIndex(0).then(function (item) {
            LiveUnit.Assert.areEqual("Item 0", item.data);
            complete();
        });
    };
};

// Register the object as a test class by passing in the name
LiveUnit.registerTestClass("VirtualizedDataSourceTests");






