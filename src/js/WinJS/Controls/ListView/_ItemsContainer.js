// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../../Core/_Base',
    '../../Promise',
    '../../Utilities/_ElementUtilities',
    '../ItemContainer/_Constants'
    ], function itemsContainerInit(exports, _Base, Promise, _ElementUtilities, _Constants) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _ItemsContainer: _Base.Namespace._lazy(function () {

            var _ItemsContainer = function (site) {
                this.site = site;
                this._itemData = {};
                this.waitingItemRequests = {};
            };
            _ItemsContainer.prototype = {
                requestItem: function ItemsContainer_requestItem(itemIndex) {
                    if (!this.waitingItemRequests[itemIndex]) {
                        this.waitingItemRequests[itemIndex] = [];
                    }

                    var that = this;
                    var promise = new Promise(function (complete) {
                        var itemData = that._itemData[itemIndex];
                        if (itemData && !itemData.detached && itemData.element) {
                            complete(itemData.element);
                        } else {
                            that.waitingItemRequests[itemIndex].push(complete);
                        }
                    });

                    return promise;
                },

                removeItem: function (index) {
                    delete this._itemData[index];
                },

                removeItems: function ItemsContainer_removeItems() {
                    this._itemData = {};
                    this.waitingItemRequests = {};
                },

                setItemAt: function ItemsContainer_setItemAt(itemIndex, itemData) {
                    this._itemData[itemIndex] = itemData;
                    if (!itemData.detached) {
                        this.notify(itemIndex, itemData);
                    }
                },

                notify: function ItemsContainer_notify(itemIndex, itemData) {
                    if (this.waitingItemRequests[itemIndex]) {
                        var requests = this.waitingItemRequests[itemIndex];
                        for (var i = 0; i < requests.length; i++) {
                            requests[i](itemData.element);
                        }

                        this.waitingItemRequests[itemIndex] = [];
                    }
                },

                elementAvailable: function ItemsContainer_elementAvailable(itemIndex) {
                    var itemData = this._itemData[itemIndex];
                    itemData.detached = false;
                    this.notify(itemIndex, itemData);
                },

                itemAt: function ItemsContainer_itemAt(itemIndex) {
                    var itemData = this._itemData[itemIndex];
                    return itemData ? itemData.element : null;
                },

                itemDataAt: function ItemsContainer_itemDataAt(itemIndex) {
                    return this._itemData[itemIndex];
                },

                containerAt: function ItemsContainer_containerAt(itemIndex) {
                    var itemData = this._itemData[itemIndex];
                    return itemData ? itemData.container : null;
                },

                itemBoxAt: function ItemsContainer_itemBoxAt(itemIndex) {
                    var itemData = this._itemData[itemIndex];
                    return itemData ? itemData.itemBox : null;
                },

                itemBoxFrom: function ItemsContainer_containerFrom(element) {
                    while (element && !_ElementUtilities.hasClass(element, _Constants._itemBoxClass)) {
                        element = element.parentNode;
                    }

                    return element;
                },

                containerFrom: function ItemsContainer_containerFrom(element) {
                    while (element && !_ElementUtilities.hasClass(element, _Constants._containerClass)) {
                        element = element.parentNode;
                    }

                    return element;
                },

                index: function ItemsContainer_index(element) {
                    var item = this.containerFrom(element);
                    if (item) {
                        for (var index in this._itemData) {
                            if (this._itemData[index].container === item) {
                                return parseInt(index, 10);
                            }
                        }
                    }

                    return _Constants._INVALID_INDEX;
                },

                each: function ItemsContainer_each(callback) {
                    for (var index in this._itemData) {
                        if (this._itemData.hasOwnProperty(index)) {
                            var itemData = this._itemData[index];
                            callback(parseInt(index, 10), itemData.element, itemData);
                        }
                    }
                },

                eachIndex: function ItemsContainer_each(callback) {
                    for (var index in this._itemData) {
                        if (callback(parseInt(index, 10))) {
                            break;
                        }
                    }
                },

                count: function ItemsContainer_count() {
                    return Object.keys(this._itemData).length;
                }
            };
            return _ItemsContainer;
        })
    });

});
