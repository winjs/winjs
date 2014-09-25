// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
///<reference path="../../bin/typings/tsd.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

// Test Data Source

module Helper.ItemsManager {
    "use strict";
    var UI = WinJS.UI;
    var Scheduler = WinJS.Utilities.Scheduler;

    interface IFetchResult {
        items: any[];
        offset: number;
        totalCount?: number;
        absoluteIndex?: number;
        atStart?: boolean;
        atEnd?: boolean;
    }

    function createTestDataAdapter(objects, controller, abilities) {

        // Private members
        var listDataNotificationHandler,
            array = [],
            keyToIndexMap = {},
            nextAvailableKey = 0,
            requests = [],
            countBeforeDelta,
            countAfterDelta,
            countBeforeOverride,
            countAfterOverride,
            dataSourceAccessed = false,
            editsInProgress = false,
            requestFulfilledSynchronously = false;

        function directivesForMethod(method, args) {
            if (controller && controller.directivesForMethod) {
                return controller.directivesForMethod(method, args);
            } else {
                return null;
            }
        }

        function getDataLength() {
            return typeof controller.returnCount === 'undefined' ? array.length : Math.min(controller.returnCount, array.length);
        }
        function item(key, data) {
            return { key: key.toString(), data: data };
        }

        function setItem(index, key, data) {
            array[index] = item(key, data);
            keyToIndexMap[key] = index;
        }

        function updateKeyToIndexMap(first) {
            // Update the key map entries for all indices that changed
            for (var i = first; i < array.length; i++) {
                keyToIndexMap[array[i].key] = i;

            }
        }

        function keyFromIndex(index) {
            return (index < 0 || index >= array.length ? null : array[index].key);
        }

        function indexIfSupported(index) {
            return (abilities && !abilities.itemsFromIndex ? undefined : index);
        }

        function itemsFromIndexImplementation(complete, error, index, countBefore, countAfter, returnAbsoluteIndex, maxLength) {
            if (controller.communicationFailure) {
                error(new WinJS.ErrorFromName(UI.FetchError.noResponse.toString()));
            } else {
                var directives = directivesForMethod("itemsFromIndex", [index, countBefore, countAfter]);

                dataSourceAccessed = true;

                countBefore = (countBeforeOverride >= 0 ? countBeforeOverride : Math.max(countBefore + countBeforeDelta, 0));
                countAfter = (countAfterOverride >= 0 ? countAfterOverride : Math.max(countAfter + countAfterDelta, 0));

                // returnCount simulate a datasource that is changing size. 
                // If returnCount is defined, then the maximum number of items can be retrived from this dataSource is returnCount.

                if (index >= maxLength) {
                    error(new WinJS.ErrorFromName(UI.FetchError.doesNotExist.toString()));

                } else {
                    var first = Math.max(0, index - countBefore),
                        last = Math.min(maxLength - 1, index + countAfter),
                        items = new Array(last + 1 - first);

                    for (var i = first; i <= last; i++) {
                        var item = array[i];
                        items[i - first] = {
                            key: item.key,
                            data: item.data
                        };
                    }


                    var fetchResult: IFetchResult = {
                        items: items,
                        offset: index - first,
                        totalCount: (directives.omitCount ? undefined : maxLength), // TODO: omitCount is always undefined. This seems a test bug. I
                    };

                    if (returnAbsoluteIndex && !directives.omitIndices) {
                        fetchResult.absoluteIndex = index;
                    }

                    if (first === 0) {
                        // If the first item is being returned, volunteer this information
                        fetchResult.atStart = true;
                    }

                    if (last >= maxLength) {
                        // If the last item is being returned, volunteer this information
                        fetchResult.atEnd = true;
                    }

                    complete(fetchResult);
                }
            }
        }

        function keyValid(key, error) {
            if (typeof keyToIndexMap[key] !== "number") {
                error(new WinJS.ErrorFromName(UI.EditError.noLongerMeaningful.toString()));
                return false;
            } else {
                return true;
            }
        }

        function noop() {
        }

        function insert(complete, error, index, data) {
            if (controller.communicationFailure) {
                error(new WinJS.ErrorFromName(UI.EditError.noResponse.toString()));
            } else {
                var itemNew = item(nextAvailableKey++, data);
                array.splice(index, 0, itemNew);
                updateKeyToIndexMap(index);

                complete(itemNew);
            }
        }

        function change(complete, error, key, dataNew) {
            if (controller.communicationFailure) {
                error(new WinJS.ErrorFromName(UI.EditError.noResponse.toString()));
            } else if (controller.readOnly) {
                error(new WinJS.ErrorFromName(UI.EditError.notPermitted.toString()));
            } else if (controller.notMeaningfulEdit) {
                error(new WinJS.ErrorFromName(UI.EditError.noLongerMeaningful.toString()));
            } else {
                var index = keyToIndexMap[key];

                array[index].data = dataNew;

                complete();
            }
        }

        function move(complete, error, indexTo, key) {
            if (controller.communicationFailure) {
                error(new WinJS.ErrorFromName(UI.EditError.noResponse.toString()));
            } else {
                var indexFrom = keyToIndexMap[key],
                    removed = array.splice(indexFrom, 1);

                if (indexFrom < indexTo) {
                    indexTo--;
                }

                array.splice(indexTo, 0, removed[0]);
                updateKeyToIndexMap(Math.min(indexFrom, indexTo));

                complete();
            }
        }

        function remove(complete, error, key) {
            if (controller.communicationFailure) {
                error(new WinJS.ErrorFromName(UI.EditError.noResponse.toString()));
            } else {
                var index = keyToIndexMap[key];

                delete keyToIndexMap[key];
                array.splice(index, 1);
                updateKeyToIndexMap(index);

                complete();
            }
        }

        function insertionIndex(previousKey, nextKey) {
            var index;

            if (previousKey === null) {
                return keyToIndexMap[nextKey];
            }

            index = keyToIndexMap[previousKey] + 1;

            if (nextKey !== null && keyToIndexMap[nextKey] !== index) {
                throw new Error("Invalid arguments: previousKey and nextKey should be the keys of adjacent elements.");
            }

            return index;
        }

        function changeNotificationsEnabled(method, args) {
            var directives = directivesForMethod(method, args);
            return directives && directives.sendChangeNotifications;
        }

        function implementRequest(request) {
            var directives = request.directives;

            countBeforeDelta = 0;
            countAfterDelta = 0;
            countBeforeOverride = -1;
            countAfterOverride = -1;

            if (directives) {
                if (directives.countBeforeDelta !== undefined) {
                    countBeforeDelta = directives.countBeforeDelta;
                }

                if (directives.countAfterDelta !== undefined) {
                    countAfterDelta = directives.countAfterDelta;
                }

                if (directives.countBeforeOverride > 0) {
                    countBeforeOverride = directives.countBeforeOverride;
                }

                if (directives.countAfterOverride > 0) {
                    countAfterOverride = directives.countAfterOverride;
                }
            }

            request.execute();
        }

        function createPromise(method, args, promiseInit) {
            return new WinJS.Promise(function (complete, error) {
                var directives = directivesForMethod(method, args);

                var request = {
                    method: method,
                    args: args,
                    directives: directives,
                    execute: function () {
                        promiseInit(complete, error);
                    }
                };

                if (!directives || !directives.callMethodSynchronously) {
                    requests.push(request);

                    if (directives && typeof directives.delay === "number") {
                        var implementNextRequest = function implementNextRequest() {
                            if (requests.length > 0) {
                                implementRequest(requests.splice(0, 1)[0]);
                            }
                        };

                        if (directives.delay === 0) {
                            Scheduler.schedule(function () {
                                implementNextRequest();
                            }, Scheduler.Priority.high, null, "TestComponents._TestDataSource._implementNextRequest");
                        } else {
                            setTimeout(implementNextRequest, directives.delay);
                        }
                    }
                } else {
                    requestFulfilledSynchronously = true;
                    implementRequest(request);
                }
            });
        }

        // Construction

        controller = controller || {};

        // Build the item array and key map
        for (var i = 0, length = objects.length; i < length; i++) {
            setItem(i, nextAvailableKey, objects[i]);
            nextAvailableKey++;
        }

        // Public methods

        return {

            // DataSource methods

            setNotificationHandler: function (notificationHandler) {
                listDataNotificationHandler = notificationHandler;
            },

            itemSignature: abilities && !abilities.itemSignature ? undefined : function (itemData) {
                if (WinJS.Utilities._isDOMElement(itemData)) {
                    return "<" + WinJS.Utilities._uniqueID(itemData) + ">";
                }
                return "<" + JSON.stringify(itemData) + ">";
            },

            itemsFromStart: abilities && !abilities.itemsFromStart ? undefined : function (count) {
                var maxLength = getDataLength();
                return createPromise("itemsFromStart", arguments, function (complete, error) {
                    if (typeof controller.returnCountBeforePromise === 'undefined') {
                        maxLength = getDataLength();
                    }
                    if (maxLength === 0) {
                        error(new WinJS.ErrorFromName(UI.FetchError.doesNotExist.toString()));
                    } else {
                        itemsFromIndexImplementation(complete, error, 0, 0, count - 1, false, maxLength);
                    }
                });
            },

            itemsFromEnd: abilities && !abilities.itemsFromEnd ? undefined : function (count) {
                var maxLength = getDataLength();
                return createPromise("itemsFromEnd", arguments, function (complete, error) {
                    if (typeof controller.returnCountBeforePromise === 'undefined') {
                        maxLength = getDataLength();
                    }
                    if (maxLength === 0) {
                        error(new WinJS.ErrorFromName(UI.FetchError.doesNotExist.toString()));
                    } else {
                        itemsFromIndexImplementation(complete, error, maxLength - 1, count - 1, 0, true, maxLength);
                    }
                });
            },

            itemsFromKey: abilities && !abilities.itemsFromKey ? undefined : function (key, countBefore, countAfter) {
                var maxLength = getDataLength();
                return createPromise("itemsFromKey", arguments, function (complete, error) {
                    var index = keyToIndexMap[key];

                    if (typeof controller.returnCountBeforePromise === 'undefined') {
                        maxLength = getDataLength();
                    }
                    if (typeof index !== "number") {
                        error(new WinJS.ErrorFromName(UI.FetchError.doesNotExist.toString()));
                    } else {
                        itemsFromIndexImplementation(complete, error, index, countBefore, countAfter, true, maxLength);
                    }
                });
            },

            itemsFromIndex: abilities && !abilities.itemsFromIndex ? undefined : function (index, countBefore, countAfter) {
                var maxLength = getDataLength();
                return createPromise("itemsFromIndex", arguments, function (complete, error) {
                    if (typeof controller.returnCountBeforePromise === 'undefined') {
                        maxLength = getDataLength();
                    }
                    itemsFromIndexImplementation(complete, error, index, countBefore, countAfter, false, maxLength);
                });
            },

            itemsFromDescription: abilities && !abilities.itemsFromDescription ? undefined : function (description, countBefore, countAfter) {
                var maxLength = getDataLength();
                return createPromise("itemsFromDescription", arguments, function (complete, error) {
                    // TODO: For now, just treat the description as a key
                    var index = keyToIndexMap[description];

                    if (typeof controller.returnCountBeforePromise === 'undefined') {
                        maxLength = getDataLength();
                    }
                    if (typeof index !== "number") {
                        error(new WinJS.ErrorFromName(UI.FetchError.doesNotExist.toString()));
                    } else {
                        itemsFromIndexImplementation(complete, error, index, countBefore, countAfter, true, maxLength);
                    }
                });
            },

            getCount: abilities && !abilities.getCount ? undefined : function () {
                var maxLength = getDataLength();
                return createPromise("getCount", arguments, function (complete, error) {
                    if (typeof controller.returnCountBeforePromise === 'undefined') {
                        maxLength = getDataLength();
                    }
                    if (controller.count_NoResponse) {
                        error(new WinJS.ErrorFromName(UI.CountError.noResponse.toString()));
                    }

                    else if (controller.countUnknown) {
                        error(new WinJS.ErrorFromName(UI.CountResult.unknown.toString()));
                    }

                    else {
                        complete(maxLength);
                    }
                });
            },

            beginEdits: abilities && !abilities.beginEdits ? undefined : function () {
                if (editsInProgress) {
                    throw new Error();
                }

                editsInProgress = true;
            },

            insertAtStart: abilities && !abilities.insertAtStart ? undefined : function (key, data) {
                return createPromise("insertAtStart", arguments, function (complete, error) {
                    // key parameter is ignored, as keys are generated
                    insert(complete, error, 0, data);
                });
            },

            insertBefore: abilities && !abilities.insertBefore ? undefined : function (key, data, nextKey) {
                return createPromise("insertBefore", arguments, function (complete, error) {
                    // key parameter is ignored, as keys are generated
                    if (keyValid(nextKey, error)) {
                        insert(complete, error, keyToIndexMap[nextKey], data);
                    }
                });
            },

            insertAfter: abilities && !abilities.insertAfter ? undefined : function (key, data, previousKey) {
                return createPromise("insertAfter", arguments, function (complete, error) {
                    // key parameter is ignored, as keys are generated
                    if (keyValid(previousKey, error)) {
                        insert(complete, error, keyToIndexMap[previousKey] + 1, data);
                    }
                });
            },

            insertAtEnd: abilities && !abilities.insertAtEnd ? undefined : function (key, data) {
                var maxLength = getDataLength();
                return createPromise("insertAtEnd", arguments, function (complete, error) {
                    // key parameter is ignored, as keys are generated
                    if (typeof controller.returnCountBeforePromise === 'undefined') {
                        maxLength = getDataLength();
                    }
                    insert(complete, error, maxLength, data);
                });
            },

            change: abilities && !abilities.change ? undefined : function (key, newData) {
                return createPromise("change", arguments, function (complete, error) {
                    if (keyValid(key, error)) {
                        change(complete, error, key, newData);
                    }
                });
            },

            moveToStart: abilities && !abilities.moveToStart ? undefined : function (key) {
                return createPromise("moveToStart", arguments, function (complete, error) {
                    if (keyValid(key, error)) {
                        move(complete, error, 0, key);
                    }
                });
            },

            moveBefore: abilities && !abilities.moveBefore ? undefined : function (key, nextKey) {
                return createPromise("moveBefore", arguments, function (complete, error) {
                    if (keyValid(key, error) && keyValid(nextKey, error)) {
                        move(complete, error, keyToIndexMap[nextKey], key);
                    }
                });
            },

            moveAfter: abilities && !abilities.moveAfter ? undefined : function (key, previousKey) {
                return createPromise("moveAfter", arguments, function (complete, error) {
                    if (keyValid(key, error) && keyValid(previousKey, error)) {
                        move(complete, error, keyToIndexMap[previousKey] + 1, key);
                    }
                });
            },

            moveToEnd: abilities && !abilities.moveToEnd ? undefined : function (key) {
                var maxLength = getDataLength();
                return createPromise("moveToEnd", arguments, function (complete, error) {
                    if (typeof controller.returnCountBeforePromise === 'undefined') {
                        maxLength = getDataLength();
                    }
                    if (keyValid(key, error)) {
                        move(complete, error, maxLength, key);
                    }
                });
            },

            remove: abilities && !abilities.remove ? undefined : function (key) {
                return createPromise("remove", arguments, function (complete, error) {
                    if (keyValid(key, error)) {
                        remove(complete, error, key);
                    }
                });
            },

            endEdits: abilities && !abilities.endEdits ? undefined : function () {
                if (!editsInProgress) {
                    throw new Error();
                }

                editsInProgress = false;
            },

            // Test methods

            // Returns true if the data source has been accessed since the last call to clearDataSourceAccessed
            isDataSourceAccessed: function () {
                return dataSourceAccessed;
            },

            clearDataSourceAccessed: function () {
                dataSourceAccessed = false;
            },

            insertItem: function (key, data, previousKey, nextKey) {
                // key parameter is ignored, as keys are generated
                var index = insertionIndex(previousKey, nextKey);
                array.splice(index, 0, item(nextAvailableKey, data));
                updateKeyToIndexMap(index);
                nextAvailableKey++;
            },

            changeItem: function (key, newData) {
                array[keyToIndexMap[key]].data = newData;
            },

            removeItem: function (key) {
                var index = keyToIndexMap[key];
                delete keyToIndexMap[key];
                array.splice(index, 1);
                updateKeyToIndexMap(index);
            },

            moveItem: function (key, previousKey, nextKey) {
                var indexFrom = keyToIndexMap[key],
                    indexTo = insertionIndex(previousKey, nextKey),
                    removed = array.splice(indexFrom, 1);

                if (indexFrom < indexTo) {
                    indexTo--;
                }
                array.splice(indexTo, 0, removed[0]);
                updateKeyToIndexMap(Math.min(indexFrom, indexTo));
            },

            // Sets the value for the dataSourceAccessed flag
            setDataSourceAccessedFlag: function (status) {
                dataSourceAccessed = status;
            },

            // Call to this method will resume data source edits
            reEstablishDSConnection: function () {
                controller.communicationFailure = false;
            },

            // This will set properties like readOnly/notMeaningfulEdit.
            // Based on these values, DSA returns notPermitted/noLongerMeaningful status code from the editing methods.
            setProperty: function (propertyName, value) {
                if (propertyName === "notMeaningfulEdit")
                    controller.notMeaningfulEdit = value;
                else if (propertyName === "readOnly")
                    controller.readOnly = value;
                else if (propertyName === "communicationFailure")
                    controller.communicationFailure = value;
                else if (propertyName === "count_NoResponse")
                    controller.count_NoResponse = true;
                else if (propertyName === "countUnknown")
                    controller.countUnknown = true;
                else if (propertyName === "returnCount")
                    controller.returnCount = value;
                else if (propertyName === "returnCountBeforePromise")
                    // when value is defined, returnCount is calcualted before promise created; otherwise calculated when promise executed.
                    // By default, returnCountBeforePromise is undefined; and all the previous test is using the value calculated when promise executed and the value is array.length
                    // Thus, adding this varible does not break existing test. 
                    // This value should be set at beginning of a test; and should not be changed in the test. 
                    // If you change it during a test, then the promise still in process will use the new value. 
                    controller.returnCountBeforePromise = value;
            },


            swapItems: function (indexA, indexB) {
                var temp = array[indexA];
                array[indexA] = array[indexB];
                array[indexB] = temp;
                updateKeyToIndexMap(0);
            },

            changeKey: function (oldKey, newKey) {
                var index = keyToIndexMap[oldKey];
                array[index].key = newKey;
                delete keyToIndexMap[oldKey];
                keyToIndexMap[newKey] = index;
            },

            requestCount: function () {
                return requests.length;
            },

            readRequest: function (index) {
                return requests[index];
            },

            fulfillRequest: function (index) {
                implementRequest(requests.splice(index, 1)[0]);
            },

            fulfillNextRequest: function () {
                if (requests.length > 0) {
                    this.fulfillRequest(0);
                }
            },

            fulfillRandomRequest: function () {
                if (requests.length > 0) {
                    this.fulfillRequest(Helper.ItemsManager.pseudorandom(requests.length));
                }
            },

            fulfillAllRequests: function () {
                while (requests.length > 0) {
                    this.fulfillNextRequest();
                }
            },

            requestFulfilledSynchronously: function () {
                var result = requestFulfilledSynchronously;

                // Calling this method clears the flag
                requestFulfilledSynchronously = false;

                return result;
            },

            replaceItems: function (items) {
                array = [];
                keyToIndexMap = {};
                for (var i = 0, length = items.length; i < length; i++) {
                    var item = items[i];

                    setItem(i, item.key, item.data)

                        var keyValue = parseInt(item.key, 10);
                    if (nextAvailableKey <= keyValue) {
                        nextAvailableKey = keyValue + 1;
                    }
                }
            },

            getItems: function () {
                return array;
            },

            invalidateAll: function () {
                listDataNotificationHandler.invalidateAll();
            },

            reload: function () {
                listDataNotificationHandler.reload();
            },

            indexFromKey: function (key) {
                return keyToIndexMap[key];
            },

            currentCount: function () {
                return array.length;
            },

            currentMaxLength: function () {
                var maxLength = getDataLength();
                return maxLength;
            },

            beginModifications: function () {
                if (changeNotificationsEnabled("beginNotifications", arguments)) {
                    listDataNotificationHandler.beginNotifications();
                }
            },

            insertAtIndex: function (data, index) {
                LiveUnit.Assert.isTrue(index >= 0 && index <= array.length);
                insert(noop, noop, index, data);

                if (changeNotificationsEnabled("insertAtIndex", arguments)) {
                    listDataNotificationHandler.inserted(array[index], keyFromIndex(index - 1), keyFromIndex(index + 1), indexIfSupported(index));
                }
            },

            changeAtIndex: function (index, newData) {
                LiveUnit.Assert.isTrue(index >= 0 && index < array.length);
                var key = array[index].key;

                change(noop, noop, key, newData);

                if (changeNotificationsEnabled("changeAtIndex", arguments)) {
                    listDataNotificationHandler.changed(array[index]);
                }
            },

            moveToIndex: function (index, newIndex) {
                LiveUnit.Assert.isTrue(index >= 0 && index < array.length);
                LiveUnit.Assert.isTrue(newIndex >= 0 && newIndex <= array.length);

                var key = array[index].key,
                    data = array[index].data,
                    previousKey = keyFromIndex(newIndex - 1),
                    nextKey = keyFromIndex(newIndex);

                move(noop, noop, newIndex, key);

                if (changeNotificationsEnabled("moveToIndex", arguments)) {
                    listDataNotificationHandler.moved(array[keyToIndexMap[key]], previousKey, nextKey, indexIfSupported(index), indexIfSupported(newIndex));
                }
            },

            removeAtIndex: function (index) {
                LiveUnit.Assert.isTrue(index >= 0 && index < array.length);
                var key = array[index].key;

                remove(noop, noop, key);

                if (changeNotificationsEnabled("removeAtIndex", arguments)) {
                    listDataNotificationHandler.removed(key, indexIfSupported(index));
                }
            },

            endModifications: function () {
                if (changeNotificationsEnabled("endModifications", arguments)) {
                    listDataNotificationHandler.endNotifications();
                }
            }
        };
    };

    var TestDataSource = WinJS.Class.derive(UI.VirtualizedDataSource, function (objects, controller, abilities) {
        var testDataAdapter = createTestDataAdapter(objects, controller, abilities);

        this._baseDataSourceConstructor(testDataAdapter);

        this.testDataAdapter = testDataAdapter;
    });

    export function createTestDataSource(objects, controller, abilities) {
        return new TestDataSource(objects, controller, abilities);
    };
}
