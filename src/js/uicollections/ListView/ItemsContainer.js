/*
Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved.

Licensed under the Apache License, Version 2.0.

See License.txt in the project root for license information.
*/

﻿(function itemsContainerInit(global, WinJS, undefined) {
    "use strict";

    WinJS.Namespace.define("WinJS.UI", {
        _ItemsContainer: WinJS.Namespace._lazy(function () {
            var utilities = WinJS.Utilities,
                Promise = WinJS.Promise;

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
                    var promise = new Promise(function (complete, error) {
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
                    /*#DBG
                    delete WinJS.Utilities.data(this._itemData[index].element).itemData;
                    delete WinJS.Utilities.data(this._itemData[index].element).itemsContainer;
                    #DBG*/
                    delete this._itemData[index];
                },

                removeItems: function ItemsContainer_removeItems() {
                    /*#DBG
                    var that = this;
                    Object.keys(this._itemData).forEach(function (k) {
                        delete WinJS.Utilities.data(that._itemData[k].element).itemData;
                        delete WinJS.Utilities.data(that._itemData[k].element).itemsContainer;
                    });
                    #DBG*/
                    this._itemData = {};
                    this.waitingItemRequests = {};
                },

                setItemAt: function ItemsContainer_setItemAt(itemIndex, itemData) {
                    /*#DBG
                    if (itemData.itemsManagerRecord.released) {
                        throw "ACK! Attempt to use a released itemsManagerRecord";
                    }
                    var oldItemData = WinJS.Utilities.data(itemData.element).itemData;
                    if (oldItemData || WinJS.Utilities.data(itemData.element).itemsContainer) {
                        if (oldItemData.itemsManagerRecord.item.index !== itemIndex) {
                            throw "ACK! Attempted use of already in-use element";
                        }
                    }
                    WinJS.Utilities.data(itemData.element).itemData = itemData;
                    WinJS.Utilities.data(itemData.element).itemsContainer = this;
                    #DBG*/
                    //#DBG _ASSERT(itemData.element && (itemData.element instanceof HTMLElement));
                    //#DBG _ASSERT(!this._itemData[itemIndex]);
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
                    while (element && !utilities.hasClass(element, WinJS.UI._itemBoxClass)) {
                        element = element.parentNode;
                    }

                    return element;
                },

                containerFrom: function ItemsContainer_containerFrom(element) {
                    while (element && !utilities.hasClass(element, WinJS.UI._containerClass)) {
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

                    return WinJS.UI._INVALID_INDEX;
                },

                each: function ItemsContainer_each(callback) {
                    for (var index in this._itemData) {
                        if (this._itemData.hasOwnProperty(index)) {
                            var itemData = this._itemData[index];
                            //#DBG _ASSERT(itemData);
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

})(this, WinJS);
