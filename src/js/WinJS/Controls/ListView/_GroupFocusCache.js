// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../../Core/_Base'
    ], function GroupFocusCacheInit(exports, _Base) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _GroupFocusCache: _Base.Namespace._lazy(function () {
            return _Base.Class.define(function GroupFocusCache_ctor(listView) {
                this._listView = listView;
                this.clear();
            }, {
                // We store indices as strings in the cache so index=0 does not evaluate to false as
                // when we check for the existance of an index in the cache. The index is converted
                // back into a number when calling getIndexForGroup

                updateCache: function (groupKey, itemKey, itemIndex) {
                    this._lastFocusedItemKey = itemKey;
                    this._lastFocusedItemIndex = itemIndex;
                    itemIndex = "" + itemIndex;
                    this._itemToIndex[itemKey] = itemIndex;
                    this._groupToItem[groupKey] = itemKey;
                },

                deleteItem: function (itemKey) {
                    if (itemKey === this._lastFocusedItemKey) {
                        this._lastFocusedItemKey = null;
                        this._lastFocusedItemIndex = 0;
                    }

                    if (!this._itemToIndex[itemKey]) {
                        return;
                    }

                    var that = this;
                    var keys = Object.keys(this._groupToItem);
                    for (var i = 0, len = keys.length; i < len; i++) {
                        var key = keys[i];
                        if (that._groupToItem[key] === itemKey) {
                            that.deleteGroup(key);
                            break;
                        }
                    }
                },

                deleteGroup: function (groupKey) {
                    var itemKey = this._groupToItem[groupKey];
                    if (itemKey) {
                        delete this._itemToIndex[itemKey];
                    }
                    delete this._groupToItem[groupKey];
                },

                updateItemIndex: function (itemKey, itemIndex) {
                    if (itemKey === this._lastFocusedItemKey) {
                        this._lastFocusedItemIndex = itemIndex;
                    }

                    if (!this._itemToIndex[itemKey]) {
                        return;
                    }
                    this._itemToIndex[itemKey] = "" + itemIndex;
                },

                getIndexForGroup: function (groupIndex) {
                    var groupKey = this._listView._groups.group(groupIndex).key;

                    var itemKey = this._groupToItem[groupKey];
                    if (itemKey && this._itemToIndex[itemKey]) {
                        return +this._itemToIndex[itemKey];
                    } else {
                        return this._listView._groups.fromKey(groupKey).group.startIndex;
                    }
                },

                clear: function () {
                    this._groupToItem = {};
                    this._itemToIndex = {};
                    this._lastFocusedItemIndex = 0;
                    this._lastFocusedItemKey = null;
                },

                getLastFocusedItemIndex: function () {
                    return this._lastFocusedItemIndex;
                }
            });
        }),

        _UnsupportedGroupFocusCache: _Base.Namespace._lazy(function () {
            return _Base.Class.define(null, {
                updateCache: function (groupKey, itemKey, itemIndex) {
                    this._lastFocusedItemKey = itemKey;
                    this._lastFocusedItemIndex = itemIndex;
                },

                deleteItem: function (itemKey) {
                    if (itemKey === this._lastFocusedItemKey) {
                        this._lastFocusedItemKey = null;
                        this._lastFocusedItemIndex = 0;
                    }
                },

                deleteGroup: function () {
                },

                updateItemIndex: function (itemKey, itemIndex) {
                    if (itemKey === this._lastFocusedItemKey) {
                        this._lastFocusedItemIndex = itemIndex;
                    }
                },

                getIndexForGroup: function () {
                    return 0;
                },

                clear: function () {
                    this._lastFocusedItemIndex = 0;
                    this._lastFocusedItemKey = null;
                },

                getLastFocusedItemIndex: function () {
                    return this._lastFocusedItemIndex;
                }
            });
        })
    });

});