// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Grouped Item Data Source

define([
    '../Core/_Base',
    './_GroupDataSource'
    ], function groupedItemDataSourceInit(_Base, _GroupDataSource) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {

        computeDataSourceGroups: function (listDataSource, groupKey, groupData, options) {
            /// <signature helpKeyword="WinJS.UI.computeDataSourceGroups">
            /// <summary locid="WinJS.UI.computeDataSourceGroups">
            /// Returns a data source that adds group information to the items of another data source.  The "groups" property
            /// of this data source evaluates to yet another data source that enumerates the groups themselves.
            /// </summary>
            /// <param name="listDataSource" type="VirtualizedDataSource" locid="WinJS.UI.computeDataSourceGroups_p:listDataSource">
            /// The data source for the individual items to group.
            /// </param>
            /// <param name="groupKey" type="Function" locid="WinJS.UI.computeDataSourceGroups_p:groupKey">
            /// A callback function that takes an item in the list as an argument. The function is called
            /// for each item in the list and returns the group key for the item as a string.
            /// </param>
            /// <param name="groupData" type="Function" locid="WinJS.UI.computeDataSourceGroups_p:groupData">
            /// A callback function that takes an item in the IListDataSource as an argument.
            /// The function is called on one item in each group and returns
            /// an object that represents the header of that group.
            /// </param>
            /// <param name="options" type="Object" locid="WinJS.UI.computeDataSourceGroups_p:options">
            /// An object that can contain properties that specify additional options:
            ///
            /// groupCountEstimate:
            /// A Number value that is the initial estimate for the number of groups. If you specify -1,
            /// this function returns no result is until the actual number of groups
            /// has been determined.
            ///
            /// batchSize:
            /// A Number greater than 0 that specifies the number of items to fetch during each processing pass when
            /// searching for groups. (In addition to the number specified, one item from the previous batch
            /// is always included.)
            /// </param>
            /// <returns type="IListDataSource" locid="WinJS.UI.computeDataSourceGroups_returnValue">
            /// An IListDataSource that contains the items in the original data source and provides additional
            /// group info in a "groups" property. The "groups" property returns another
            /// IListDataSource that enumerates the different groups in the list.
            /// </returns>
            /// </signature>

            var groupedItemDataSource = Object.create(listDataSource);

            function createGroupedItem(item) {
                if (item) {
                    var groupedItem = Object.create(item);

                    groupedItem.groupKey = groupKey(item);

                    if (groupData) {
                        groupedItem.groupData = groupData(item);
                    }

                    return groupedItem;
                } else {
                    return null;
                }
            }

            function createGroupedItemPromise(itemPromise) {
                var groupedItemPromise = Object.create(itemPromise);

                groupedItemPromise.then = function (onComplete, onError, onCancel) {
                    return itemPromise.then(function (item) {
                        return onComplete(createGroupedItem(item));
                    }, onError, onCancel);
                };

                return groupedItemPromise;
            }

            groupedItemDataSource.createListBinding = function (notificationHandler) {
                var groupedNotificationHandler;

                if (notificationHandler) {
                    groupedNotificationHandler = Object.create(notificationHandler);

                    groupedNotificationHandler.inserted = function (itemPromise, previousHandle, nextHandle) {
                        return notificationHandler.inserted(createGroupedItemPromise(itemPromise), previousHandle, nextHandle);
                    };

                    groupedNotificationHandler.changed = function (newItem, oldItem) {
                        return notificationHandler.changed(createGroupedItem(newItem), createGroupedItem(oldItem));
                    };

                    groupedNotificationHandler.moved = function (itemPromise, previousHandle, nextHandle) {
                        return notificationHandler.moved(createGroupedItemPromise(itemPromise), previousHandle, nextHandle);
                    };
                } else {
                    groupedNotificationHandler = null;
                }

                var listBinding = listDataSource.createListBinding(groupedNotificationHandler),
                    groupedItemListBinding = Object.create(listBinding);

                var listBindingMethods = [
                    "first",
                    "last",
                    "fromDescription",
                    "jumpToItem",
                    "current"
                ];

                for (var i = 0, len = listBindingMethods.length; i < len; i++) {
                    (function (listBindingMethod) {
                        if (listBinding[listBindingMethod]) {
                            groupedItemListBinding[listBindingMethod] = function () {
                                return createGroupedItemPromise(listBinding[listBindingMethod].apply(listBinding, arguments));
                            };
                        }
                    })(listBindingMethods[i]);
                }

                // The following methods should be fast

                if (listBinding.fromKey) {
                    groupedItemListBinding.fromKey = function (key) {
                        return createGroupedItemPromise(listBinding.fromKey(key));
                    };
                }

                if (listBinding.fromIndex) {
                    groupedItemListBinding.fromIndex = function (index) {
                        return createGroupedItemPromise(listBinding.fromIndex(index));
                    };
                }

                groupedItemListBinding.prev = function () {
                    return createGroupedItemPromise(listBinding.prev());
                };

                groupedItemListBinding.next = function () {
                    return createGroupedItemPromise(listBinding.next());
                };

                return groupedItemListBinding;
            };

            var listDataSourceMethods = [
                "itemFromKey",
                "itemFromIndex",
                "itemFromDescription",
                "insertAtStart",
                "insertBefore",
                "insertAfter",
                "insertAtEnd",
                "change",
                "moveToStart",
                "moveBefore",
                "moveAfter",
                "moveToEnd"
                // remove does not return an itemPromise
            ];

            for (var i = 0, len = listDataSourceMethods.length; i < len; i++) {
                (function (listDataSourceMethod) {
                    if (listDataSource[listDataSourceMethod]) {
                        groupedItemDataSource[listDataSourceMethod] = function () {
                            return createGroupedItemPromise(listDataSource[listDataSourceMethod].apply(listDataSource, arguments));
                        };
                    }
                })(listDataSourceMethods[i]);
            }

            ["addEventListener", "removeEventListener", "dispatchEvent"].forEach(function (methodName) {
                if (listDataSource[methodName]) {
                    groupedItemDataSource[methodName] = function () {
                        return listDataSource[methodName].apply(listDataSource, arguments);
                    };
                }
            });

            var groupDataSource = null;

            Object.defineProperty(groupedItemDataSource, "groups", {
                get: function () {
                    if (!groupDataSource) {
                        groupDataSource = new _GroupDataSource._GroupDataSource(listDataSource, groupKey, groupData, options);
                    }
                    return groupDataSource;
                },
                enumerable: true,
                configurable: true
            });

            return groupedItemDataSource;
        }

    });

});

