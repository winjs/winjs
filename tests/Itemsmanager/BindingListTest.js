// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="../TestLib/TestDataSource.ts" />
/// <reference path="../TestLib/UnitTestsCommon.ts" />
/// <reference path="../TestLib/ListViewHelpers.js" />

(function (global) {
    "use strict";

    // @TODO, need tests for release/retain

    // NOTE: because of auto-batching in BindingListDataSource you have two options for how to write tests:
    //
    //  1) explicit dataSource.beginEdits()/endEdits() calls around all edits
    //
    //  2) using promises and logger.assertEmptyAsync() to make sure you make assertions after the endEdits has occured
    //

    function errorHandler(msg) {
        try {
            LiveUnit.Assert.fail('There was an unhandled error in your test: ' + msg);
        } catch (ex) { }
    }

    function LoggingNotificationHandler(retain) {

        var expected = [];
        var log = null;

        // Used for developing tests / debugging
        this.startLogging = function () {
            log = [];
        }
        this.stopLogging = function () {
            var l = log;
            log = null;
            return l;
        }

        this.setExpected = function (list) {
            expected = list;
            return this;
        };
        this.appendExpected = function () {
            for (var i = 0; i < arguments.length; i++) {
                expected.push(arguments[i]);
            }
            return this;
        };
        this.appendExpectedN = function (entry, n) {
            n = n || 1;
            for (var i = 0; i < n; i++) {
                expected.push(entry);
            }
            return this;
        };

        this.assertEmpty = function (comment) {
            LiveUnit.Assert.areEqual(0, expected.length, "All expected notifications should be fired: " + comment);
        }
        this.assertEmptyAsync = function (comment) {
            var that = this;
            return WinJS.Utilities.Scheduler.schedulePromiseHigh(null, "BindingListTests.assertEmptyAsync").then(function () {
                        that.assertEmpty(comment);
            });
        };

        function assert(name) {
            var entry = expected.shift();
            if (entry) {
                LiveUnit.Assert.areEqual(entry, name, "Recieved event doesn't match expected event");
            }
            if (log) {
                log.push(name);
            }
        }

        this.beginNotifications = assert.bind(this, "beginNotifications");
        this.changed = assert.bind(this, "changed");
        this.endNotifications = assert.bind(this, "endNotifications");
        if (retain) {
            this.inserted = function (itemPromise) {
                itemPromise.retain();
                assert("inserted");
            }
        } else {
            this.inserted = assert.bind(this, "inserted");
        }
        this.indexChanged = assert.bind(this, "indexChanged");
        this.countChanged = assert.bind(this, "countChanged");
        this.moved = assert.bind(this, "moved");
        this.removed = assert.bind(this, "removed");
        this.reload = assert.bind(this, "reload");
    }

    function CountingNotificationHandler() {

        var count = 0;

        this.getCount = function () {
            return count;
        };
        this.clearCount = function () {
            count = 0;
        };

        function increment() {
            count++;
        }

        this.beginNotifications = increment;
        this.changed = increment;
        this.endNotifications = increment;
        this.inserted = function (itemPromise) {
            itemPromise.retain();
            increment();
        };
        this.indexChanged = increment;
        this.countChanged = increment;
        this.moved = increment;
        this.removed = increment;
        this.reload = increment;
    }

    function simpleItem(i) {
        return "Item" + i;
    }

    function listSortedAndFilteredToEvens (count, options) {
        // Creating a sorted even number list
        var list = new WinJS.Binding.List([], options);
        for (var i = 0; i < count; ++i) {
            list.push(simpleItem(i));
        }
        var sorted = list.createSorted(function (l, r){ return l - r;});
        return sorted.createFiltered(function (num){ return Math.abs(num) % 2 === 0;});
    }

    function listGroupedByOddAndEven(count) {
        var list = new WinJS.Binding.List();
        var compare = function (num){ return (num % 2 === 0) ? "even" : "odd"; };
        var sort = function (l, r){ return l.length - r.length; };
        for (var i = 0; i < count; ++i) {
            list.push(i);
        }
        return list.createGrouped(compare, compare, sort);
    }

    function sortedList(count){
        var list = new WinJS.Binding.List();
        for (var i = 0; i < count; ++i) {
            list.push(simpleItem(i));
        }
        return list.createSorted(function (l, r) { return (l - r); });

    }

    function oddListFilter(count) {
        var list = new WinJS.Binding.List();
        for (var i = 0; i < count; ++i) {
            list.push(simpleItem(i));
        }
        return list.createFiltered(function (num) { return (num % 2); });
    }

    global.BindingListTests = function () {

        this.testBindingListDecreasingTheLenghtNotifications = function (complete) {

            var logger = new LoggingNotificationHandler(true);
            var list = new WinJS.Binding.List();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            // Be explicit about setup so that these notifications don't
            // get mixed up with the ones we care about.
            dataSource.beginEdits();
            list.push(1, 2, 3, 4, 5, 6, 7, 8, 9);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "removed",
                "removed",
                "countChanged",
                "endNotifications"
            ]);
            list.length = list.length - 2;
            logger.assertEmptyAsync()
                .then(null, errorHandler)
                .then(complete);
        };

        this.testReloadNotificationsInListBinding = function () {

            var logger = new LoggingNotificationHandler(true);
            var list = new WinJS.Binding.List();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.beginEdits();
            list.push(1, 2, 3, -1, 0, 3);
            dataSource.endEdits();

            logger.setExpected([
                "reload"
            ]);
            list.sort(function (l, r) { return l - r; });
            logger.assertEmpty();

            logger.setExpected([
                "reload"
            ]);
            list.reverse();
            logger.assertEmpty();
        }

        this.testBindingListEditingNotifications = function (complete) {

            var logger = new LoggingNotificationHandler(true);
            var list = new WinJS.Binding.List();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            WinJS.Promise.as()
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "inserted",
                        "inserted",
                        "inserted",
                        "countChanged",
                        "endNotifications"
                    ]);
                    list.push(1, 2, 3);
                    return logger.assertEmptyAsync();
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "removed",
                        "countChanged",
                        "endNotifications"
                    ]);
                    list.pop();
                    return logger.assertEmptyAsync();
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "indexChanged",
                        "indexChanged",
                        "moved",
                        "endNotifications"
                    ]);
                    list.move(0, 1);
                    return logger.assertEmptyAsync();
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "removed"
                    ]).
                        appendExpectedN("indexChanged", list.length - 1).
                        appendExpected(
                            "countChanged",
                            "endNotifications"
                        );
                    list.shift();
                    return logger.assertEmptyAsync("checking correct shift");
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "inserted"
                    ]).
                        appendExpectedN("indexChanged", list.length).
                        appendExpected(
                            "countChanged",
                            "endNotifications"
                        );
                    list.unshift(300);
                    return logger.assertEmptyAsync("checking correct unshift");
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "changed",
                        "endNotifications"
                    ]);
                    list.setAt(0, 100);
                    return logger.assertEmptyAsync("checking correct modification");
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "inserted",
                        "countChanged",
                        "endNotifications"
                    ]);
                    list.splice(list.length, 0, 100);
                    return logger.assertEmptyAsync("checking correct splice");
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "removed",
                        "indexChanged",
                        "indexChanged",
                        "countChanged",
                        "endNotifications"
                    ]);
                    list.splice(list.length - 3, 1);
                    return logger.assertEmptyAsync("checking correct splice");
                })
                .then(null, errorHandler)
                .then(complete);
        }

        this.testBindingListEditingNotificationsWithExplicitBatching = function () {

            var logger = new LoggingNotificationHandler(true);
            var list = new WinJS.Binding.List();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            logger.setExpected([
                "beginNotifications"
            ]);
            dataSource.beginEdits();
            logger.assertEmpty();

            logger.setExpected([
                "inserted",
                "inserted",
                "inserted",
            ]);
            list.push(1, 2, 3);
            logger.assertEmpty();

            logger.setExpected([
                "removed",
            ]);
            list.pop();
            logger.assertEmpty();

            logger.setExpected([
                "countChanged",
                "endNotifications"
            ]);
            dataSource.endEdits();
            logger.assertEmpty();

            logger.setExpected([
                "beginNotifications"
            ]);
            dataSource.beginEdits();
            logger.assertEmpty();

            list.move(0, 1);
            logger.assertEmpty();

            // We get an index changed notifications for the two items that swapped and a moved
            //  notification for the one item which was explicitly moved.
            //
            logger.setExpected([
                "indexChanged",
                "indexChanged",
                "moved",
                "endNotifications"
            ]);
            dataSource.endEdits();
            logger.assertEmpty();

            logger.setExpected([
                "beginNotifications"
            ]);
            dataSource.beginEdits();
            logger.assertEmpty();

            logger.setExpected([
                "removed"
            ]);
            list.shift();
            logger.assertEmpty("checking correct shift");

            logger.setExpected([]).
            appendExpectedN("indexChanged", list.length - 1).
            appendExpected(
                "countChanged",
                "endNotifications"
            );
            dataSource.endEdits();
            logger.assertEmpty();
        }
    };

    global.BindingListFilteredProjectionTests = function () {

        this.testBindingListFiltersDecreasingTheLenghtNotifications = function () {

            var logger = new LoggingNotificationHandler(true);
            var list = oddListFilter();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.beginEdits();
            list.push(1, 2, 3, 4, 5, 6, 7, 8, 9);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "removed",
                "removed",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.length = list.length - 2;
            dataSource.endEdits();
            logger.assertEmpty("checking correct decreasing length of the list");
        }

        this.testBindingListFiltersDecreasingTheLenghtNotificationsAutoBatching = function (complete) {

            var logger = new LoggingNotificationHandler(true);
            var list = oddListFilter();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            list.push(1, 2, 3, 4, 5, 6, 7, 8, 9);

            WinJS.Promise.timeout()
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "removed",
                        "removed",
                        "countChanged",
                        "endNotifications"
                    ]);
                    list.length = list.length - 2;
                    return logger.assertEmptyAsync("checking correct decreasing length of the list");
                })
                .then(null, errorHandler)
                .then(complete);
        }

        this.testBindingListFiltersEditingNotifications = function (complete) {

            var logger = new LoggingNotificationHandler(true);
            var list = oddListFilter();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            WinJS.Promise.as()
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "inserted",
                        "inserted",
                        "countChanged",
                        "endNotifications"
                    ]);
                    list.push(1, 2, 3);
                    return logger.assertEmptyAsync("checking correct insertion");
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "removed",
                        "removed",
                        "countChanged",
                        "endNotifications"
                    ]);
                    list.pop();
                    list.pop();
                    list.pop();
                    list.pop();
                    return logger.assertEmptyAsync("checking correct pop");
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "inserted",
                        "inserted",
                        "countChanged",
                        "endNotifications"
                    ]);
                    list.push(1);
                    list.push(3);
                    return logger.assertEmptyAsync("checking correct push in empty list");
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "indexChanged",
                        "indexChanged",
                        "moved",
                        "endNotifications"
                    ]);
                    list.move(0, 1);
                    return logger.assertEmptyAsync("checking correct move");
                })
                .then(function () {
                    list.push(5, 7, 9, 10);
                    return logger.assertEmptyAsync();
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "removed"
                    ]).
                        appendExpectedN("indexChanged", list.length - 1).
                        appendExpected(
                            "countChanged",
                            "endNotifications"
                        );
                    list.shift();
                    return logger.assertEmptyAsync("checking correct shift");
                })
                .then(function () {
                    logger.setExpected([]);
                    list.unshift(300);
                    return logger.assertEmptyAsync("checking correct unshift element with false predicate");
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "inserted"
                    ]).
                        appendExpectedN("indexChanged", list.length).
                        appendExpected(
                            "countChanged",
                            "endNotifications"
                        );
                    list.unshift(17);
                    return logger.assertEmptyAsync("checking correct unshift element with true predicate");
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "removed"
                    ]).
                    appendExpectedN("indexChanged", list.length - 1).
                    appendExpected(
                        "countChanged",
                        "endNotifications"
                    );
                    list.setAt(0, 100);
                    return logger.assertEmptyAsync("checking correct setAt to false predicate");
                })
                .then(function () {
                    logger.setExpected([]);
                    list.splice(list.length, 0, 100);
                    return logger.assertEmptyAsync("checking correct splice at the end");
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "removed",
                        "indexChanged",
                        "indexChanged",
                        "countChanged",
                        "endNotifications"
                    ]);
                    list.splice(list.length - 3, 1);
                    return logger.assertEmptyAsync("checking correct splice to delete");
                })
                .then(function () {
                    logger.setExpected([
                        "beginNotifications",
                        "inserted",
                        "indexChanged",
                        "indexChanged",
                        "indexChanged",
                        "countChanged",
                        "endNotifications"
                    ]);
                    list.splice(list.length - 3, 0, 11);
                    return logger.assertEmptyAsync("checking correct splice to insert in the middle of the list");
                })
                .then(null, errorHandler)
                .then(complete);
        }

        this.testBindingListSortedDecreasingTheLenghtNotifications = function () {

            var logger = new LoggingNotificationHandler(true);
            var list = sortedList();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.beginEdits();
            list.push(9, 8, 7, 6, 5, 4, 3, 2, 1);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "removed",
                "removed",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.length = list.length - 2;
            dataSource.endEdits();
            logger.assertEmpty("checking correct decreasing length of the list");
        }

        this.testBindingListSortedProjectionUnshiftFunction = function () {

            var logger = new LoggingNotificationHandler(true);
            var list = sortedList();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "inserted",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(1, 2, 3);
            dataSource.endEdits();
            logger.assertEmpty("checking correct insertion");

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "indexChanged",
                "indexChanged",
                "indexChanged",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(0);
            dataSource.endEdits();
            logger.assertEmpty("checking correct insertion");

            logger.setExpected([
                "beginNotifications",
                "removed",
                "removed",
                "removed",
                "removed",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.pop();
            list.pop();
            list.pop();
            list.pop();
            dataSource.endEdits();
            logger.assertEmpty("checking correct pop");

            dataSource.beginEdits();
            list.push(1);
            dataSource.endEdits();
            logger.setExpected([
                "beginNotifications",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(3);
            dataSource.endEdits();
            logger.assertEmpty("checking correct push in empty list");

            logger.setExpected([]);
            dataSource.beginEdits();
            list.move(0, 1);
            dataSource.endEdits();
            logger.assertEmpty("checking correct move");

            dataSource.beginEdits();
            list.push(10, 8, 7, 5);
            dataSource.endEdits();
            logger.setExpected([
                "beginNotifications",
                "inserted"
            ]).
                appendExpectedN("indexChanged", list.length).
                appendExpected(
                    "countChanged",
                    "endNotifications"
                );
            dataSource.beginEdits();
            list.unshift(1);
            dataSource.endEdits();
            logger.assertEmpty("checking correct unshift element in the begining");

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "indexChanged",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.unshift(9);
            dataSource.endEdits();
            logger.assertEmpty("checking correct unshift element in the middle");

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.unshift(11);
            dataSource.endEdits();
            logger.assertEmpty("checking correct unshift element in the end");

            logger.setExpected([
                "beginNotifications",
                "removed",
                "inserted"
            ]).
                appendExpectedN("indexChanged", list.length - 1).
                appendExpected(
                    "endNotifications"
                );
            dataSource.beginEdits();
            list.setAt(0, 100);
            dataSource.endEdits();
            logger.assertEmpty("checking correct setAt to false predicate");
        }

        this.testBindingListSortedProjectionSetAtFunction = function () {
            var logger = new LoggingNotificationHandler(true);
            var list = sortedList();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "inserted",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(1, 2, 3);
            dataSource.endEdits();
            logger.assertEmpty("checking correct insertion");

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "indexChanged",
                "indexChanged",
                "indexChanged",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(0);
            dataSource.endEdits();
            logger.assertEmpty("checking correct insertion");

            dataSource.beginEdits();
            list.pop();
            list.pop();
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "removed",
                "removed",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.pop();
            list.pop();
            list.pop();
            dataSource.endEdits();
            logger.assertEmpty("checking correct pop");

            dataSource.beginEdits();
            list.push(1);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(3);
            dataSource.endEdits();
            logger.assertEmpty("checking correct push in empty list");

            logger.setExpected([]);
            dataSource.beginEdits();
            list.move(0, 1);
            dataSource.endEdits();
            logger.assertEmpty("checking correct move");

            dataSource.beginEdits();
            list.push(10, 8, 7, 5);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "removed",
                "inserted",
            ]).
                appendExpectedN("indexChanged", list.length - 1).
                appendExpected(
                    "endNotifications"
                );
            dataSource.beginEdits();
            list.setAt(0, 100);
            dataSource.endEdits();
            logger.assertEmpty("checking correct setAt to false predicate");

            logger.setExpected([]);
            dataSource.beginEdits();
            list.splice(list.length, 0, 100);
            dataSource.endEdits();
            logger.assertEmpty("checking correct splice at the end");

            logger.setExpected([
                "beginNotifications",
                "removed",
                "indexChanged",
                "indexChanged",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.splice(list.length - 3, 1);
            dataSource.endEdits();
            logger.assertEmpty("checking correct splice to delete");
        }

        this.testBindingListSortedProjectionMutationFunction = function () {

            var logger = new LoggingNotificationHandler(true);
            var list = sortedList();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "inserted",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(1, 2, 3);
            dataSource.endEdits();
            logger.assertEmpty("checking correct insertion");

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "indexChanged",
                "indexChanged",
                "indexChanged",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(0);
            dataSource.endEdits();
            logger.assertEmpty("checking correct insertion");

            dataSource.beginEdits();
            list.pop();
            list.pop();
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "removed",
                "removed",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.pop();
            list.pop();
            list.pop();
            dataSource.endEdits();
            logger.assertEmpty("checking correct pop");

            dataSource.beginEdits();
            list.push(1);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(3);
            dataSource.endEdits();
            logger.assertEmpty("checking correct push in empty list");

            dataSource.beginEdits();
            list.move(0, 1);
            list.push(10, 8, 7, 5);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.splice(list.length, 0, 100);
            dataSource.endEdits();
            logger.assertEmpty("checking correct splice at the end");
        }

        this.testBindingListSortedProjectionSplice = function () {
            var logger = new LoggingNotificationHandler(true);
            var list = sortedList();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "inserted",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(1, 2, 3);
            dataSource.endEdits();
            logger.assertEmpty("checking correct insertion");

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "indexChanged",
                "indexChanged",
                "indexChanged",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(0);
            dataSource.endEdits();
            logger.assertEmpty("checking correct insertion");

            dataSource.beginEdits();
            list.pop();
            list.pop();
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "removed",
                "removed",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.pop();
            list.pop();
            list.pop();
            dataSource.endEdits();
            logger.assertEmpty("checking correct pop");

            dataSource.beginEdits();
            list.push(1);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(3);
            dataSource.endEdits();
            logger.assertEmpty("checking correct push in empty list");

            dataSource.beginEdits();
            list.move(0, 1);
            list.push(10, 8, 7, 5);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.splice(list.length, 0, 100);
            dataSource.endEdits();
            logger.assertEmpty("checking correct splice at the end");

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "indexChanged",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.splice(list.length - 3, 0, 11);
            dataSource.endEdits();
            logger.assertEmpty("checking correct splice to insert in the middle of the list");

            logger.setExpected([
                "beginNotifications",
                "removed",
                "indexChanged",
                "indexChanged",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.splice(list.length - 3, 1);
            dataSource.endEdits();
            logger.assertEmpty("checking correct splice to delete");

            logger.setExpected([
                "beginNotifications",
                "inserted",
            ]).
                appendExpectedN("indexChanged", list.length).
                appendExpected(
                    "countChanged",
                    "endNotifications"
                );
            dataSource.beginEdits();
            list.splice(list.length - 3, 0, -2);
            dataSource.endEdits();
            logger.assertEmpty("checking correct splice to insert in the begining of the list");
        }

        this.testBindingListSortedWithShift = function () {
            var logger = new LoggingNotificationHandler(true);
            var list = sortedList();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "inserted",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(1, 2, 3);
            dataSource.endEdits();
            logger.assertEmpty("checking correct insertion");

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "indexChanged",
                "indexChanged",
                "indexChanged",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(0);
            dataSource.endEdits();
            logger.assertEmpty("checking correct insertion");

            dataSource.beginEdits();
            list.pop();
            list.pop();
            dataSource.endEdits();

            LiveUnit.Assert.areEqual(2, list.length);

            logger.setExpected([
                "beginNotifications",
                "removed",
                "removed",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.pop();
            list.pop();
            list.pop();
            dataSource.endEdits();
            logger.assertEmpty("checking correct pop");

            dataSource.beginEdits();
            list.push(1);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(3);
            dataSource.endEdits();
            logger.assertEmpty("checking correct push in empty list");

            dataSource.beginEdits();
            list.move(0, 1);
            list.push(10, 8, 7, 5);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "removed"
            ]).
                appendExpectedN("indexChanged", list.length - 1).
                appendExpected(
                    "countChanged",
                    "endNotifications"
                );
            dataSource.beginEdits();
            list.shift();
            dataSource.endEdits();
            logger.assertEmpty("checking correct shift");
        }

        this.testBindingListDecreasingTheLenghInGroupSorted = function () {
            var logger = new LoggingNotificationHandler(true);
            var list = listGroupedByOddAndEven();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.beginEdits();
            list.push(1, 2, 3, 4, 5, 6, 7, 8, 9);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "removed",
                "removed",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.length = list.length - 2;
            dataSource.endEdits();
            logger.assertEmpty("checking correct decreasing length in groupSorted");

        }

        this.testBindingListDataSourcePushInGroupSorted = function () {
            var logger = new LoggingNotificationHandler(true);
            var list = listGroupedByOddAndEven();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "inserted",
                "inserted",
                "indexChanged",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(1, 2, 3);
            dataSource.endEdits();
            logger.assertEmpty("checking correct push in groupSortedProjection");
        }

        this.testBindingListDataSourcePopInGroupSorted = function () {
            var logger = new LoggingNotificationHandler(true);
            var list = listGroupedByOddAndEven();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.beginEdits();
            list.push(1, 2, 3);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "removed",
                "removed",
                "removed",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.pop();
            list.pop();
            list.pop();
            list.pop();
            dataSource.endEdits();
            logger.assertEmpty("checking correct pop in groupSortedProjection");
        }

        this.testBindingListDataSourceMoveInGroupSorted = function () {
            var logger = new LoggingNotificationHandler(true);
            var list = listGroupedByOddAndEven();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.beginEdits();
            list.push(1, 2, 3, 4);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "indexChanged",
                "indexChanged",
                "moved",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.move(0, 1);
            dataSource.endEdits();
            logger.assertEmpty("checking correct move");

            dataSource.beginEdits();
            list.splice(0, 1);
            dataSource.endEdits();

            dataSource.beginEdits();
            list.move(0, 3);
            dataSource.endEdits();
        }

        this.testBindingListDataSourceShiftInGroupSorted = function () {
            var logger = new LoggingNotificationHandler(true);
            var list = listGroupedByOddAndEven();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.beginEdits();
            list.push(1, 2, 3, 4, 5, 8, 7, 10, 9);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "removed"
            ]).
                appendExpectedN("indexChanged", list.length - 1).
                appendExpected(
                    "countChanged",
                    "endNotifications"
                );
            dataSource.beginEdits();
            list.shift();
            dataSource.endEdits();
            logger.assertEmpty("checking correct shift in groupSorted");

        }

        this.testBindingListDataSourceUnShiftInGroupSorted = function () {
            var logger = new LoggingNotificationHandler(true);
            var list = listGroupedByOddAndEven();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.beginEdits();
            list.push(1, 2, 3, 4, 5, 8, 7, 10, 9);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "inserted"
            ]).
                appendExpectedN("indexChanged", list.length).
                appendExpected(
                    "countChanged",
                    "endNotifications"
                );
            dataSource.beginEdits();
            list.unshift(11);
            dataSource.endEdits();
            logger.assertEmpty("checking correct unshift in groupSorted");

            var numOfEvens = (function (list) {
                var count = 0;
                for (var i = 0; i < list.length; i++) {
                    if (list.getAt(i) % 2 === 0) {
                        count++;
                    }
                }
                return count;
            })(list);

            logger.setExpected([
                "beginNotifications",
                "inserted"
            ]).
                appendExpectedN("indexChanged", numOfEvens).
                appendExpected(
                    "countChanged",
                    "endNotifications"
                );
            dataSource.beginEdits();
            list.unshift(6);
            dataSource.endEdits();
            logger.assertEmpty("checking correct unshift in groupSorted");
        }

        this.testBindingListDataSourceSpliceInGroupSortedWithSpeicalStableInsert = function () {
            var logger = new LoggingNotificationHandler(true);
            var list = listGroupedByOddAndEven();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.beginEdits();
            list.push(1, 2, 3, 4, 5, 8, 7, 10, 9);
            dataSource.endEdits();

            //before splice: 1, 3, 5, 7, 9, 2, 4, 8, 10
            logger.setExpected([
                "beginNotifications",
                "removed"
            ]).
                appendExpectedN("indexChanged", list.length - 1).
                appendExpected(
                    "countChanged",
                    "endNotifications"
                );
            dataSource.beginEdits();
            list.splice(0, 1);
            dataSource.endEdits();
            logger.assertEmpty("testing splice to delete from the begining in groupSorted");

            var ind = 3;
            logger.setExpected([
                "beginNotifications",
                "inserted"
            ]).
                appendExpectedN("indexChanged", list.length - ind).
                appendExpected(
                    "countChanged",
                    "endNotifications"
                );

            dataSource.beginEdits();
            list.splice(ind, 0, 11);
            dataSource.endEdits();
            //before splice: 3, 5, 7, 9, 2, 4, 8, 10
            //After splice: 3, 5, 7, 11, 9, 2, 4, 8, 10
            logger.assertEmpty("checking the correct adding of an element using splice");

            logger.setExpected([
                "beginNotifications",
                "inserted"
            ]).
                appendExpectedN("indexChanged", 3).
                appendExpected(
                    "countChanged",
                    "endNotifications"
                );

            dataSource.beginEdits();
            list.splice(0, 0, 4);
            dataSource.endEdits();
            //before splice: 3, 5, 7, 11, 9, 2, 4, 8, 10
            //After splice: 3, 5, 7, 11, 9, 2, 4, 4, 8, 10
            logger.assertEmpty("checking deleting elements using splice");
        }

        this.testBindingListDataSourceSpliceInGroupSorted = function () {
            var logger = new LoggingNotificationHandler(true);
            var list = listGroupedByOddAndEven();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.beginEdits();
            list.push(1, 2, 3, 4, 5, 8, 7, 10, 9);
            dataSource.endEdits();

            //before splice: 1, 3, 5, 7, 9, 2, 4, 8, 10
            logger.setExpected([
                "beginNotifications",
                "removed"
            ]).
                appendExpectedN("indexChanged", list.length - 1).
                appendExpected(
                    "countChanged",
                    "endNotifications"
                );
            dataSource.beginEdits();
            list.splice(0, 1);
            dataSource.endEdits();
            logger.assertEmpty("testing splice to delete from the begining in groupSorted");

            var ind = 3;
            logger.setExpected([
                "beginNotifications",
                "inserted"
            ]).
                appendExpectedN("indexChanged", list.length - ind).
                appendExpected(
                    "countChanged",
                    "endNotifications"
                );

            dataSource.beginEdits();
            list.splice(ind, 0, 11);
            dataSource.endEdits();
            //before splice: 3, 5, 7, 9, 2, 4, 8, 10
            //After splice: 3, 5, 7, 11, 9, 2, 4, 8, 10
            logger.assertEmpty("checking the correct adding of an element using splice");

        }

        this.testBindingListDataSourceSetAtInGroupSorted = function () {
            var logger = new LoggingNotificationHandler(true);
            var list = listGroupedByOddAndEven();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.beginEdits();
            list.push(1, 2, 3, 4, 5, 8, 7, 10, 9);
            dataSource.endEdits();

            logger.setExpected([
                "beginNotifications",
                "removed",
                "inserted"
            ]).
                appendExpectedN("indexChanged", 4).
                appendExpected(
                    "endNotifications"
                );
            //before setAt: 1, 3, 5, 7, 9, 2, 4, 8, 10
            //After setAt: 3, 5, 7, 9, 6, 2, 4, 8, 10
            dataSource.beginEdits();
            list.setAt(0, 6);
            dataSource.endEdits();
            logger.assertEmpty("checking the correctness of setAt in GroupSorted");
        }

        this.testBindingListDataSourceFilterOfFilter = function () {
            var options = [undefined, { proxy: true }, { binding: true }, { proxy: true, binding: true }];
            for (var i = 0; i < options.length; i++) {
                var logger = new LoggingNotificationHandler(true);
                var list = listSortedAndFilteredToEvens(0, options[i]);
                var dataSource = list.dataSource;
                var listBinding = dataSource.createListBinding(logger);

                var sorted = list._list;
                dataSource.beginEdits();
                list.push(10, 8, 7, 12, 3, 4, -1, 0, -2, 11);
                dataSource.endEdits();
                // sorted list :[-2, -1, 0, 3, 4, 7, 8, 10, 11, 12]
                //Even sorted list: [-2, 0, 4, 8, 10, 12];

                logger.setExpected([
                    "beginNotifications",
                    "inserted",
                ]).
                    appendExpectedN("indexChanged", 4).
                    appendExpected(
                        "countChanged",
                        "endNotifications"
                    );
                dataSource.beginEdits();
                list.push(13, 15, 7, 2, 21);
                dataSource.endEdits();

                logger.setExpected([
                    "beginNotifications",
                    "removed",
                ]).
                    appendExpectedN("indexChanged", list.length - 1).
                    appendExpected(
                        "countChanged",
                        "endNotifications"
                    );
                dataSource.beginEdits();
                list.setAt(0, 1);
                dataSource.endEdits();
                //After setAt Even sorted list: [0, 2, 4, 8, 10, 12];
                logger.assertEmpty("checking the correctness of push in filter of filter");

                logger.setExpected([
                    "beginNotifications",
                    "removed",
                    "countChanged",
                    "endNotifications"
                ]);
                dataSource.beginEdits();
                list.pop();
                dataSource.endEdits();
                //After pop Even sorted list: [0, 2, 4, 8, 10];
                logger.assertEmpty("checking the correctness of push in filter of filter");
                LiveUnit.Assert.areEqual(5, list.length, "Checking the length after pop and setAt");

                // sorted list :[-1, 1, 2, 3, 4, 7, 8, 10]
                dataSource.beginEdits();
                sorted.pop();
                dataSource.endEdits();
                logger.assertEmpty("making sure that poping an even element does not affect the filter of filter");

                logger.setExpected([
                    "beginNotifications",
                    "inserted"
                ]).
                    appendExpectedN("indexChanged", list.length).
                    appendExpected(
                        "countChanged",
                        "endNotifications"
                    );
                dataSource.beginEdits();
                sorted.setAt(sorted.length - 1, -12);
                dataSource.endEdits();
                logger.assertEmpty("checking setAt from the main filter");
                //After setAt Even sorted list: [-12, 0, 2, 4, 8, 10];

                logger.setExpected([
                    "beginNotifications",
                    "removed",
                    "removed",
                    "countChanged",
                    "endNotifications"
                ]);

                dataSource.beginEdits();
                list.length = list.length - 2;
                dataSource.endEdits();
                //After changing the length: Even sorted list: [-12, 0, 2, 4];
                logger.assertEmpty("checking the correctness of notificatios after changing the length");

                logger.setExpected([
                    "beginNotifications",
                    "removed",
                ]).
                    appendExpectedN("indexChanged", list.length - 1).
                    appendExpected(
                        "countChanged",
                        "endNotifications"
                    );
                dataSource.beginEdits();
                list.shift();
                dataSource.endEdits();
                logger.assertEmpty("checking the correctness of notificatios after shifting an element");

                dataSource.beginEdits();
                list.unshift(13);
                dataSource.endEdits();

                logger.setExpected([
                    "beginNotifications",
                    "inserted",
                    "inserted",
                    "inserted"
                ]).
                    appendExpectedN("indexChanged", list.length + 1).
                    appendExpected(
                        "countChanged",
                        "endNotifications"
                    );
                dataSource.beginEdits();
                list.unshift(-52);
                list.unshift(52);
                list.unshift(50);
                dataSource.endEdits();
                logger.assertEmpty("checking the correctness of notificatios after unshifting invalid number");

                logger.setExpected([
                    "beginNotifications",
                    "removed",
                    "inserted",
                    "inserted"
                ]).
                    appendExpectedN("indexChanged", list.length).
                    appendExpected(
                        "countChanged",
                        "endNotifications"
                    );
                dataSource.beginEdits();
                list.splice(0, 1);
                list.splice(0, 0, 56);
                list.splice(0, 0, 43);
                sorted.splice(0, 0, 54);
                sorted.splice(0, 0, 53);
                dataSource.endEdits();
                logger.assertEmpty("checking the correctness of notificatios after splice");
            }
        }

        function verifyListContent(list, expected) {
            for (var i = 0, len = list.length; i < len; i++) {
                if (list.getAt(i) !== expected[i]) {
                    return false;
                }

            }
            return list.length === expected.length;
        }

        function scanFor(listBinding, value) {
            return function scan(item) {
                if (item.data === value) {
                    return item;
                }
                return listBinding.next().then(scan);
            }
        }

        this.testBindingListDataSourceMutationFunction = function (complete) {
            var logger = new LoggingNotificationHandler();
            var list = new WinJS.Binding.List();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            dataSource.insertAtEnd(null, 100);
            dataSource.endEdits();
            LiveUnit.Assert.isTrue(verifyListContent(list, [100]));
            logger.assertEmpty();

            dataSource.beginEdits();

            dataSource.insertAtEnd(null, 90);
            LiveUnit.Assert.isTrue(verifyListContent(list, [100, 90]));

            dataSource.insertAtStart(null, 80);
            LiveUnit.Assert.isTrue(verifyListContent(list, [80, 100, 90]));

            list.pop();
            list.pop();
            list.pop();

            dataSource.insertAtStart(null, 80);
            LiveUnit.Assert.isTrue(verifyListContent(list, [80]));

            dataSource.insertAtStart(null, 70);
            LiveUnit.Assert.isTrue(verifyListContent(list, [70, 80]));

            dataSource.beginEdits();

            listBinding.next()
                .then(scanFor(listBinding, 70))
                .then(function (item) {
                    dataSource.insertBefore(null, 60, item.key);
                    dataSource.insertAfter(null, 75, item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [60, 70, 75, 80]), "checking the correctness of insertAfter and before");

                    return listBinding.next();
                })
                .then(function (item) {
                    dataSource.moveToStart(item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [75, 60, 70, 80]), "checking the correctness of moveToStart");

                    return listBinding.previous();
                })
                .then(function (item) {
                    dataSource.moveToEnd(item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [75, 70, 80, 60]), "checking the correctness of moveToEnd");

                    dataSource.change(item.key, 100);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [75, 70, 80, 100]), "checking the correctness of change");

                    return listBinding.previous();
                })
                .then(function (item) {
                    dataSource.remove(item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [70, 80, 100]), "checking the correctness of remove");
                    dataSource.insertAtStart(null, 50);
                    dataSource.insertAtStart(null, 40);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [40, 50, 70, 80, 100]), "checking the correctness of insertion after multiple mutations");

                    return WinJS.Promise.join({
                        current: listBinding.current(),         // 70
                        next: listBinding.next(),               // 80
                        nextNext: listBinding.next()            // 100
                    });
                })
                .then(function (items) {
                    dataSource.moveBefore(items.next.key, items.current.key);
                    dataSource.moveAfter(items.nextNext.key, items.next.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [40, 50, 80, 100, 70]), "checking the correctness of list after multiple moves");

                    dataSource.moveBefore(items.current.key, items.current.key);  //move before with same keys should be a noop
                    dataSource.moveAfter(items.next.key, items.next.key); //move after with same keys should be a noop

                    LiveUnit.Assert.isTrue(verifyListContent(list, [40, 50, 80, 100, 70]), "checking the correctness of list after noop moves");
                    return WinJS.Promise.timeout();
                })
                .then(null, errorHandler)
                .then(complete);
        }
        this.testBindingListMoveBeforeAndAFterWithSameKey = function (complete) {
            var logger = new LoggingNotificationHandler();
            var list = new WinJS.Binding.List();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            dataSource.insertAtEnd(null, 100);
            dataSource.endEdits();
            LiveUnit.Assert.isTrue(verifyListContent(list, [100]));
            logger.assertEmpty();

            dataSource.beginEdits();

            dataSource.insertAtEnd(null, 90);
            LiveUnit.Assert.isTrue(verifyListContent(list, [100, 90]));

            dataSource.insertAtStart(null, 80);
            LiveUnit.Assert.isTrue(verifyListContent(list, [80, 100, 90]));

            dataSource.insertAtEnd(null, 110);
            LiveUnit.Assert.isTrue(verifyListContent(list, [80, 100, 90, 110]));

            listBinding.next()
                .then(scanFor(listBinding, 100))
                .then(function (item) {
                    dataSource.moveBefore(item.key, item.key);

                    LiveUnit.Assert.isTrue(verifyListContent(list, [80, 100, 90, 110]), "checking the correctness of moveBefore");

                    return listBinding.next();
                })
                .then(function (item) {
                    dataSource.moveAfter(item.key, item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [80, 100, 90, 110]), "checking the correctness of moveAfter");
                })
                .then(null, errorHandler)
                .then(complete);
        }
        this.testBindingFilteredListDataSourceMutationFunction = function (complete) {

            var logger = new LoggingNotificationHandler(true);
            var list = oddListFilter();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.beginEdits();
            dataSource.insertAtEnd(null, 100);
            dataSource.endEdits();
            LiveUnit.Assert.isTrue(verifyListContent(list, []));

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            dataSource.insertAtEnd(null, 101);
            dataSource.endEdits();
            LiveUnit.Assert.isTrue(verifyListContent(list, [101]));
            logger.assertEmpty();

            dataSource.insertAtEnd(null, 91);
            LiveUnit.Assert.isTrue(verifyListContent(list, [101, 91]));

            dataSource.insertAtStart(null, 80);
            LiveUnit.Assert.isTrue(verifyListContent(list, [101, 91]));

            dataSource.insertAtStart(null, 81);
            LiveUnit.Assert.isTrue(verifyListContent(list, [81, 101, 91]));

            list.pop();
            list.pop();
            list.pop();
            dataSource.insertAtStart(null, 80);
            LiveUnit.Assert.isTrue(verifyListContent(list, []));

            dataSource.insertAtStart(null, 81);
            dataSource.insertAtStart(null, 71);
            LiveUnit.Assert.isTrue(verifyListContent(list, [71, 81]));

            listBinding.next()
                .then(scanFor(listBinding, 71))
                .then(function (item) {
                    var key = item.key;
                    dataSource.insertBefore(null, 60, key);
                    dataSource.insertBefore(null, 61, key);
                    dataSource.insertAfter(null, 75, key);
                    dataSource.insertAfter(null, 70, key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [61, 71, 75, 81]), "checking the correctness of insertAfter and before");

                    return listBinding.next();
                })
                .then(function (item) {
                    dataSource.moveToStart(item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [75, 61, 71, 81]), "checking the correctness of moveToStart");

                    return listBinding.previous();
                })
                .then(function (item) {
                    dataSource.moveToEnd(item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [75, 71, 81, 61]), "checking the correctness of moveToEnd");

                    dataSource.change(item.key, 100);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [75, 71, 81]), "checking the correctness of change");
                    dataSource.insertAtEnd(item.key, 101);

                    return listBinding.previous();
                })
                .then(function (item) {
                    dataSource.remove(item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [71, 81, 101]), "checking the correctness of remove");
                    dataSource.insertAtStart(null, 51);
                    dataSource.insertAtStart(null, 41);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [41, 51, 71, 81, 101]), "checking the correctness of insertion after multiple mutations");

                    return WinJS.Promise.join({
                        current: listBinding.current(),         // 71
                        next: listBinding.next(),               // 81
                        nextNext: listBinding.next()            // 101
                    });
                })
                .then(function (items) {
                    dataSource.moveBefore(items.next.key, items.current.key);
                    dataSource.moveAfter(items.nextNext.key, items.next.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [41, 51, 81, 101, 71]), "checking the correctness of list after multiple moves");
                    return WinJS.Promise.timeout();
                })
                .then(null, errorHandler)
                .then(complete);
        }

        this.testBindingSortedListDataSourceMutationFunction = function (complete) {

            var logger = new LoggingNotificationHandler(true);
            var list = sortedList();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            dataSource.insertAtEnd(null, 101);
            dataSource.endEdits();
            LiveUnit.Assert.isTrue(verifyListContent(list, [101]));
            logger.assertEmpty();

            dataSource.insertAtEnd(null, 91);
            LiveUnit.Assert.isTrue(verifyListContent(list, [91, 101]));

            dataSource.insertAtStart(null, 80);
            LiveUnit.Assert.isTrue(verifyListContent(list, [80, 91, 101]));

            dataSource.insertAtStart(null, 81);
            LiveUnit.Assert.isTrue(verifyListContent(list, [80, 81, 91, 101]));

            listBinding.next()
                .then(scanFor(listBinding, 80))
                .then(function (item) {
                    var key = item.key;
                    dataSource.insertBefore(null, 60, key);
                    dataSource.insertAfter(null, 75, key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [60, 75, 80, 81, 91, 101]), "checking the correctness of insertAfter and before");

                    return listBinding.next();
                })
                .then(function (item) {
                    dataSource.moveToStart(item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [60, 75, 80, 81, 91, 101]), "checking the correctness of moveToStart");

                    return listBinding.previous();
                })
                .then(function (item) {
                    dataSource.moveToEnd(item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [60, 75, 80, 81, 91, 101]), "checking the correctness of moveToEnd");

                    dataSource.change(item.key, -100);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-100, 60, 75, 81, 91, 101]), "checking the correctness of change");

                    return listBinding.previous();
                })
                .then(function (item) {
                    dataSource.remove(item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-100, 60, 81, 91, 101]), "checking the correctness of remove");
                    dataSource.insertAtStart(null, 50);
                    dataSource.insertAtStart(null, 40);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-100, 40, 50, 60, 81, 91, 101]), "checking the correctness of insertion after multiple mutations");

                    return WinJS.Promise.join({
                        current: listBinding.current(),
                        next: listBinding.next(),
                        nextNext: listBinding.next()
                    });
                })
                .then(function (items) {
                    dataSource.moveBefore(items.next.key, items.current.key);
                    dataSource.moveAfter(items.nextNext.key, items.next.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [-100, 40, 50, 60, 81, 91, 101]), "checking the correctness of list after multiple moves");

                    dataSource.moveBefore(items.current.key, items.current.key);  //move before with same keys should be a noop
                    dataSource.moveAfter(items.next.key, items.next.key); //move after with same keys should be a noop

                    LiveUnit.Assert.isTrue(verifyListContent(list, [-100, 40, 50, 60, 81, 91, 101]), "checking the correctness of list after noop moves");
                    return WinJS.Promise.timeout();
                })
                .then(null, errorHandler)
                .then(complete);
        }

        this.testBindingListInGroupSorted = function () {

            var logger = new LoggingNotificationHandler(true);
            var list = listGroupedByOddAndEven();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.beginEdits();
            list.push(1, 2, 3, 4);
            dataSource.endEdits();
            //1, 3, 2, 4

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "inserted",
                "indexChanged",
                "indexChanged",
                "indexChanged",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.push(0);
            list.push(5);
            dataSource.endEdits();
            //1, 3, 5, 2, 4, 0
            LiveUnit.Assert.isTrue(verifyListContent(list, [1, 3, 5, 2, 4, 0]));
            logger.assertEmpty();

            logger.setExpected([
                "beginNotifications",
                "removed",
                "removed"
            ])
                .appendExpectedN("indexChanged", list.length - 2)
                .appendExpected(
                    "countChanged",
                    "endNotifications"
                );
            dataSource.beginEdits();
            list.splice(0, 2);
            dataSource.endEdits();
            //5, 2, 4, 0
            LiveUnit.Assert.isTrue(verifyListContent(list, [5, 2, 4, 0]));
            logger.assertEmpty();

            dataSource.beginEdits();
            list.pop();
            list.pop();
            list.pop();
            list.pop();
            list.push(1, 2, 3, 4, 5, 6);
            dataSource.endEdits();
            //1, 3, 5, 2, 4, 6
            LiveUnit.Assert.isTrue(verifyListContent(list, [1, 3, 5, 2, 4, 6]));

            logger.setExpected([
                "beginNotifications",
                "indexChanged",
                "indexChanged",
                "moved",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            list.move(0, 1);
            dataSource.endEdits();
            logger.assertEmpty();
        }

        this.testBindingGroupSortedListDataSourceMutationFunction = function () {
            var logger = new LoggingNotificationHandler(true);
            var list = listGroupedByOddAndEven();
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            logger.setExpected([
                "beginNotifications",
                "inserted",
                "countChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            dataSource.insertAtEnd(null, 101);
            dataSource.endEdits();
            LiveUnit.Assert.isTrue(verifyListContent(list, [101]));
            logger.assertEmpty();

            dataSource.insertAtEnd(null, 90);
            LiveUnit.Assert.isTrue(verifyListContent(list, [101, 90]));

            LiveUnit.Assert.areEqual("odd", list.groups.getAt(0), "checking the group content");
            LiveUnit.Assert.areEqual("even", list.groups.getAt(1), "checking the group content");

            dataSource.insertAtStart(null, 80);
            LiveUnit.Assert.isTrue(verifyListContent(list, [101, 80, 90]));

            dataSource.insertAtStart(null, 81);
            LiveUnit.Assert.isTrue(verifyListContent(list, [81, 101, 80, 90]));
        }

        this.testBindingGroupSortedListDataSourceMutationFunction2 = function (complete) {
            var logger = new LoggingNotificationHandler(true);
            var list = listGroupedByOddAndEven(5);
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.insertAtEnd(null, 101);
            LiveUnit.Assert.isTrue(verifyListContent(list, [1, 3, 101, 0, 2, 4]));

            dataSource.insertAtEnd(null, 90);
            LiveUnit.Assert.isTrue(verifyListContent(list, [1, 3, 101, 0, 2, 4, 90]));

            LiveUnit.Assert.areEqual("odd", list.groups.getAt(0), "checking the group content");
            LiveUnit.Assert.areEqual("even", list.groups.getAt(1), "checking the group content");

            listBinding.next()
                .then(scanFor(listBinding, 3))
                .then(function (item) {
                    var key = item.key;
                    dataSource.insertBefore(null, 60, key);
                    dataSource.insertAfter(null, 75, key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [1, 3, 75, 101, 0, 2, 60, 4, 90]), "checking the correctness of insertAfter and before");

                    return listBinding.next();
                })
                .then(function (item) {
                    dataSource.moveToStart(item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [75, 1, 3, 101, 0, 2, 60, 4, 90]), "checking the correctness of moveToStart");

                    return listBinding.previous();
                })
                .then(function (item) {
                    dataSource.moveToEnd(item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [75, 3, 101, 1, 0, 2, 60, 4, 90]), "checking the correctness of moveToEnd");

                    return listBinding.current();
                })
                .then(function (item) {
                    dataSource.change(item.key, 100);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [75, 101, 1, 0, 2, 60, 100, 4, 90]), "checking the correctness of change");
                })
                .then(null, errorHandler)
                .then(complete);
        }

        this.testBindingGroupSortedListDataSourceMutationFunction3 = function (complete) {
            var logger = new LoggingNotificationHandler(true);
            var list = listGroupedByOddAndEven(5);
            var dataSource = list.dataSource;
            var listBinding = dataSource.createListBinding(logger);

            dataSource.insertAtEnd(null, 101);
            LiveUnit.Assert.isTrue(verifyListContent(list, [1, 3, 101, 0, 2, 4]));

            dataSource.insertAtEnd(null, 90);
            LiveUnit.Assert.isTrue(verifyListContent(list, [1, 3, 101, 0, 2, 4, 90]));

            LiveUnit.Assert.areEqual("odd", list.groups.getAt(0), "checking the group content");
            LiveUnit.Assert.areEqual("even", list.groups.getAt(1), "checking the group content");

            listBinding.next()
                .then(scanFor(listBinding, 3))
                .then(function (item) {
                    var key = item.key;
                    dataSource.insertBefore(null, 60, key);
                    dataSource.insertAfter(null, 75, key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [1, 3, 75, 101, 0, 2, 60, 4, 90]), "checking the correctness of insertAfter and before");

                    return listBinding.next();
                })
                .then(function (item) {
                    dataSource.moveToStart(item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [75, 1, 3, 101, 0, 2, 60, 4, 90]), "checking the correctness of moveToStart");

                    return listBinding.previous();
                })
                .then(function (item) {
                    dataSource.moveToEnd(item.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [75, 3, 101, 1, 0, 2, 60, 4, 90]), "checking the correctness of moveToEnd");

                    return WinJS.Promise.join({
                        current: listBinding.next(),
                        next: listBinding.next(),
                        nextNext: listBinding.next()
                    });
                })
                .then(function (items) {
                    dataSource.moveBefore(items.next.key, items.current.key);
                    dataSource.moveAfter(items.nextNext.key, items.next.key);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [75, 3, 1, 101, 2, 60, 4, 0, 90]), "checking the correctness of list after multiple moves");

                    dataSource.moveBefore(items.current.key, items.current.key);  //move before with same keys should be a noop
                    dataSource.moveAfter(items.next.key, items.next.key); //move after with same keys should be a noop

                    LiveUnit.Assert.isTrue(verifyListContent(list, [75, 3, 1, 101, 2, 60, 4, 0, 90]), "checking the correctness of list after noop moves");

                    dataSource.insertAtStart(null, 50);
                    dataSource.insertAtStart(null, 40);
                    LiveUnit.Assert.isTrue(verifyListContent(list, [75, 3, 1, 101, 50, 40, 2, 60, 4, 0, 90]), "checking the correctness of insertion after multiple mutations");
                })
                .then(null, errorHandler)
                .then(complete);
        }

        this.testBindingGroupSortedListMutatingGroup = function (complete) {

            function groupKeySelector(item) {
                return item.group.key;
            }

            function groupDataSelector(item) {
                return {
                    title: item.group.key,
                }
            }

            var list = new WinJS.Binding.List();
            var groupedItems = list.createGrouped(groupKeySelector, groupDataSelector);
            var logger = new LoggingNotificationHandler(true);
            var dataSource = groupedItems.dataSource;
            var listBinding = dataSource.createListBinding(logger);
            var groupsListBinding = groupedItems.groups.dataSource.createListBinding();

            dataSource.beginEdits();
            list.push({ group: { key: "1" }, title: "Banana" });
            list.push({ group: { key: "2" }, title: "Peach" });
            list.push({ group: { key: "1" }, title: "Blueberry" });
            list.push({ group: { key: "2" }, title: "Plum" });
            dataSource.endEdits();

            LiveUnit.Assert.areEqual("Banana,Blueberry,Peach,Plum", groupedItems.map(function (item) { return item.title; }).join());

            groupedItems.getAt(0).group.key = "2";

            logger.setExpected([
                "beginNotifications",
                "removed",
                "inserted",
                "indexChanged",
                "endNotifications"
            ]);
            dataSource.beginEdits();
            groupedItems.notifyMutated(0);
            dataSource.endEdits();
            logger.assertEmpty();

            LiveUnit.Assert.areEqual("Blueberry,Banana,Peach,Plum", groupedItems.map(function (item) { return item.title; }).join());

            var assertItems = listBinding.next()
                .then(function (item) {
                    LiveUnit.Assert.areEqual("Blueberry", item.data.title);
                    LiveUnit.Assert.areEqual("1", item.groupKey);
                    return listBinding.next();
                })
                .then(function (item) {
                    LiveUnit.Assert.areEqual("Banana", item.data.title);
                    LiveUnit.Assert.areEqual("2", item.groupKey);
                    return listBinding.next();
                })
                .then(function (item) {
                    LiveUnit.Assert.areEqual("Peach", item.data.title);
                    LiveUnit.Assert.areEqual("2", item.groupKey);
                    return listBinding.next();
                })
                .then(function (item) {
                    LiveUnit.Assert.areEqual("Plum", item.data.title);
                    LiveUnit.Assert.areEqual("2", item.groupKey);
                });
            var assertGroups = groupsListBinding.next()
                .then(function (group) {
                    LiveUnit.Assert.areEqual("1", group.data.title);
                    LiveUnit.Assert.areEqual(1, group.groupSize);
                    LiveUnit.Assert.areEqual(0, group.firstItemIndexHint);
                    LiveUnit.Assert.areEqual(list.getItem(2).key, group.firstItemKey);
                    return groupsListBinding.next();
                })
                .then(function (group) {
                    LiveUnit.Assert.areEqual("2", group.data.title);
                    LiveUnit.Assert.areEqual(3, group.groupSize);
                    LiveUnit.Assert.areEqual(1, group.firstItemIndexHint);
                    LiveUnit.Assert.areEqual(list.getItem(0).key, group.firstItemKey);
                });

            WinJS.Promise.join([assertItems, assertGroups])
                .then(null, errorHandler)
                .then(complete);

        }

        this.testBindingListDirectAccess = function (complete) {

            var testArray = [10, 20, 30, 40, 50],
                testIndex = 2;

            var list = new WinJS.Binding.List(testArray),
                dataSource = list.dataSource;

            dataSource.itemFromIndex(testIndex)
                .then(function (item) {
                    LiveUnit.Assert.areEqual(testIndex, item.index);
                    LiveUnit.Assert.areEqual(testArray[testIndex], item.data);
                    return dataSource.itemFromKey(item.key);
                })
                .then(function (item) {
                    LiveUnit.Assert.areEqual(testIndex, item.index);
                    LiveUnit.Assert.areEqual(testArray[testIndex], item.data);
                })
                .then(complete);

        };

    };

    global.BindingListWithListViewTests = function () {

        function parent(element) {
            document.body.appendChild(element);
            return function () { document.body.removeChild(element); };
        }

        this.testListViewInstantiation = function (complete) {
            var div = document.createElement("DIV");
            var cleanup = parent(div);

            var list = new WinJS.Binding.List([1, 2, 3]);
            var lv = new WinJS.UI.ListView(div);
            lv.itemDataSource = list.dataSource;
            waitForReady(lv)()
                .then(function () {
                    LiveUnit.Assert.areEqual(3, div.querySelectorAll(".win-container").length);
                })
                .then(null, errorHandler)
                .then(cleanup)
                .done(complete);
        };

    };

    // Register the object as a test class by passing in the name
    LiveUnit.registerTestClass("BindingListTests");
    LiveUnit.registerTestClass("BindingListFilteredProjectionTests");
    LiveUnit.registerTestClass("BindingListWithListViewTests");

}(this));
