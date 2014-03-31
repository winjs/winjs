// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
﻿// Items Manager

(function itemsManagerInit(global) {
    "use strict";

    /*#DBG
        function dbg_stackTraceDefault() { return "add global function dbg_stackTrace to see stack traces"; }
    
        global.dbg_stackTrace = global.dbg_stackTrace || dbg_stackTraceDefault;
    #DBG*/

    var markSupportedForProcessing = WinJS.Utilities.markSupportedForProcessing;

    WinJS.Namespace.define("WinJS.UI", {
        _normalizeRendererReturn: function (v) {
            if (v) {
                if (typeof v === "object" && v.element) {
                    var elementPromise = WinJS.Promise.as(v.element);
                    return elementPromise.then(function (e) { return { element: e, renderComplete: WinJS.Promise.as(v.renderComplete) } });
                }
                else {
                    var elementPromise = WinJS.Promise.as(v);
                    return elementPromise.then(function (e) { return { element: e, renderComplete: WinJS.Promise.as() } });
                }
            }
            else {
                return { element: null, renderComplete: WinJS.Promise.as() };
            }
        },
        simpleItemRenderer: function (f) {
            return markSupportedForProcessing(function (itemPromise, element) {
                return itemPromise.then(function (item) {
                    return (item ? f(item, element) : null);
                });
            });
        }
    });

    var Promise = WinJS.Promise;
    var Signal = WinJS._Signal;
    var Scheduler = WinJS.Utilities.Scheduler;
    var uniqueID = WinJS.Utilities._uniqueID;
    var UI = WinJS.UI;

    // Private statics

    var strings = {
        get listDataSourceIsInvalid() { return WinJS.Resources._getWinJSString("ui/listDataSourceIsInvalid").value; },
        get itemRendererIsInvalid() { return WinJS.Resources._getWinJSString("ui/itemRendererIsInvalid").value; },
        get itemIsInvalid() { return WinJS.Resources._getWinJSString("ui/itemIsInvalid").value; },
        get invalidItemsManagerCallback() { return WinJS.Resources._getWinJSString("ui/invalidItemsManagerCallback").value; }
    };

    var imageLoader;
    var lastSort = new Date();
    var minDurationBetweenImageSort = 64;

    // This optimization is good for a couple of reasons:
    // - It is a global optimizer, which means that all on screen images take precedence over all off screen images.
    // - It avoids resorting too frequently by only resorting when a new image loads and it has been at least 64 ms since
    //   the last sort.
    // Also, it is worth noting that "sort" on an empty queue does no work (besides the function call).
    function compareImageLoadPriority(a, b) {
        var aon = false;
        var bon = false;

        // Currently isOnScreen is synchronous and fast for list view
        a.isOnScreen().then(function (v) { aon = v; });
        b.isOnScreen().then(function (v) { bon = v; });

        return (aon ? 0 : 1) - (bon ? 0 : 1);
    }

    var nextImageLoaderId = 0;
    var seenUrls = {};
    var seenUrlsMRU = [];
    var SEEN_URLS_MAXSIZE = 250;
    var SEEN_URLS_MRU_MAXSIZE = 1000;

    function seenUrl(srcUrl) {
        if ((/^blob:/i).test(srcUrl)) {
            return;
        }

        seenUrls[srcUrl] = true;
        seenUrlsMRU.push(srcUrl);

        if (seenUrlsMRU.length > SEEN_URLS_MRU_MAXSIZE) {
            var mru = seenUrlsMRU;
            seenUrls = {};
            seenUrlsMRU = [];

            for (var count = 0, i = mru.length - 1; i >= 0 && count < SEEN_URLS_MAXSIZE; i--) {
                var url = mru[i];
                if (!seenUrls[url]) {
                    seenUrls[url] = true;
                    count++;
                }
            }
        }
    }

    // Exposing the seenUrl related members to use them in unit tests
    WinJS.Namespace.define("WinJS.UI", {
        _seenUrl: seenUrl,
        _getSeenUrls: function () {
            return seenUrls;
        },
        _getSeenUrlsMRU: function () {
            return seenUrlsMRU;
        },
        _seenUrlsMaxSize: SEEN_URLS_MAXSIZE,
        _seenUrlsMRUMaxSize: SEEN_URLS_MRU_MAXSIZE
    });

    function loadImage(srcUrl, image, data) {
        var imageId = nextImageLoaderId++;
        imageLoader = imageLoader || new WinJS.UI._ParallelWorkQueue(6);
        return imageLoader.queue(function () {
            return new WinJS.Promise(function (c, e, p) {
                Scheduler.schedule(function ImageLoader_async_loadImage(jobInfo) {
                    if (!image) {
                        image = document.createElement("img");
                    }

                    var seen = seenUrls[srcUrl];

                    if (!seen) {
                        jobInfo.setPromise(new WinJS.Promise(function (imageLoadComplete) {
                            var tempImage = document.createElement("img");

                            var cleanup = function () {
                                tempImage.removeEventListener("load", loadComplete, false);
                                tempImage.removeEventListener("error", loadError, false);

                                // One time use blob images are cleaned up as soon as they are not referenced by images any longer.
                                // We set the image src before clearing the tempImage src to make sure the blob image is always
                                // referenced.
                                image.src = srcUrl;

                                var currentDate = new Date();
                                if (currentDate - lastSort > minDurationBetweenImageSort) {
                                    lastSort = currentDate;
                                    imageLoader.sort(compareImageLoadPriority);
                                }
                            }

                            var loadComplete = function () {
                                imageLoadComplete(jobComplete);
                            };
                            var loadError = function () {
                                imageLoadComplete(jobError);
                            };

                            var jobComplete = function () {
                                seenUrl(srcUrl);
                                cleanup();
                                c(image);
                            };
                            var jobError = function () {
                                cleanup();
                                e(image);
                            };

                            tempImage.addEventListener("load", loadComplete, false);
                            tempImage.addEventListener("error", loadError, false);
                            tempImage.src = srcUrl;
                        }));
                    } else {
                        seenUrl(srcUrl);
                        image.src = srcUrl;
                        c(image);
                    }
                }, Scheduler.Priority.normal, null, "WinJS.UI._ImageLoader._image" + imageId);
            });
        }, data);
    }

    function isImageCached(srcUrl) {
        return seenUrls[srcUrl];
    }

    function defaultRenderer(item) {
        return document.createElement("div");
    }

    // Type-checks a callback parameter, since a failure will be hard to diagnose when it occurs
    function checkCallback(callback, name) {
        if (typeof callback !== "function") {
            throw new WinJS.ErrorFromName("WinJS.UI.ItemsManager.CallbackIsInvalid", WinJS.Resources._formatString(strings.invalidItemsManagerCallback, name));
        }
    }

    // Public definitions

    WinJS.Namespace.define("WinJS.UI", {
        _createItemsManager: WinJS.Namespace._lazy(function () {
            var ListNotificationHandler = WinJS.Class.define(function ListNotificationHandler_ctor(itemsManager) {
                // Constructor

                this._itemsManager = itemsManager;
                /*#DBG
                this._notificationsCount = 0;
                #DBG*/
            }, {
                // Public methods

                beginNotifications: function () {
                    /*#DBG
                    if (this._notificationsCount !== 0) {
                        throw new "ACK! Unbalanced beginNotifications call";
                    }
                    this._notificationsCount++;
                    #DBG*/
                    this._itemsManager._versionManager.beginNotifications();
                    this._itemsManager._beginNotifications();
                },

                // itemAvailable: not implemented

                inserted: function (itemPromise, previousHandle, nextHandle) {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._inserted(itemPromise, previousHandle, nextHandle);
                },

                changed: function (newItem, oldItem) {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._changed(newItem, oldItem);
                },

                moved: function (itemPromise, previousHandle, nextHandle) {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._moved(itemPromise, previousHandle, nextHandle);
                },

                removed: function (handle, mirage) {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._removed(handle, mirage);
                },

                countChanged: function (newCount, oldCount) {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._countChanged(newCount, oldCount);
                },

                indexChanged: function (handle, newIndex, oldIndex) {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._indexChanged(handle, newIndex, oldIndex);
                },

                affectedRange: function (range) {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._affectedRange(range);
                },

                endNotifications: function () {
                    /*#DBG
                    if (this._notificationsCount !== 1) {
                        throw new "ACK! Unbalanced endNotifications call";
                    }
                    this._notificationsCount--;
                    #DBG*/
                    this._itemsManager._versionManager.endNotifications();
                    this._itemsManager._endNotifications();
                },

                reload: function () {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._reload();
                }
            }, { // Static Members
                supportedForProcessing: false,
            });

            var ItemsManager = WinJS.Class.define(function ItemsManager_ctor(listDataSource, itemRenderer, elementNotificationHandler, options) {
                // Constructor

                if (!listDataSource) {
                    throw new WinJS.ErrorFromName("WinJS.UI.ItemsManager.ListDataSourceIsInvalid", strings.listDataSourceIsInvalid);
                }
                if (!itemRenderer) {
                    throw new WinJS.ErrorFromName("WinJS.UI.ItemsManager.ItemRendererIsInvalid", strings.itemRendererIsInvalid);
                }

                this.$pipeline_callbacksMap = {};

                this._listDataSource = listDataSource;

                this.dataSource = this._listDataSource;

                this._elementNotificationHandler = elementNotificationHandler;

                this._listBinding = this._listDataSource.createListBinding(new ListNotificationHandler(this));

                if (options) {
                    if (options.ownerElement) {
                        this._ownerElement = options.ownerElement;
                    }
                    this._profilerId = options.profilerId;
                    this._versionManager = options.versionManager || new WinJS.UI._VersionManager();
                }

                this._indexInView = options && options.indexInView;
                this._itemRenderer = itemRenderer;
                this._viewCallsReady = options && options.viewCallsReady;

                // Map of (the uniqueIDs of) elements to records for items
                this._elementMap = {};

                // Map of handles to records for items
                this._handleMap = {};

                // Owner for use with jobs on the scheduler. Allows for easy cancellation of jobs during clean up.
                this._jobOwner = Scheduler.createOwnerToken();

                // Boolean to track whether endNotifications needs to be called on the ElementNotificationHandler
                this._notificationsSent = false;

                // Only enable the lastItem method if the data source implements the itemsFromEnd method
                if (this._listBinding.last) {
                    this.lastItem = function () {
                        return this._elementForItem(this._listBinding.last());
                    };
                }
            }, {
                _itemFromItemPromise: function (itemPromise) {
                    return this._waitForElement(this._elementForItem(itemPromise))
                },
                // If stage 0 is not yet complete, caller is responsible for transitioning the item from stage 0 to stage 1
                _itemFromItemPromiseThrottled: function (itemPromise) {
                    return this._waitForElement(this._elementForItem(itemPromise, true))
                },
                _itemAtIndex: function (index) {
                    /*#DBG
                    var that = this;
                    var startVersion = that._versionManager.version;
                    #DBG*/
                    var itemPromise = this._itemPromiseAtIndex(index)
                    var result = this._itemFromItemPromise(itemPromise)/*#DBG .
                then(function (v) {
                    var rec = that._recordFromElement(v);
                    var endVersion = that._versionManager.version;
                    if (rec.item.index !== index) {
                        throw "ACK! inconsistent index";
                    }
                    if (startVersion !== endVersion) {
                        throw "ACK! inconsistent version";
                    }
                    if (WinJS.Utilities.data(v).itemData &&
                            WinJS.Utilities.data(v).itemData.itemsManagerRecord.item.index !== index) {
                                throw "ACK! inconsistent itemData.index";
                            }
                    return v;
                }) #DBG*/;
                    return result.then(null, function (e) {
                        itemPromise.cancel();
                        return WinJS.Promise.wrapError(e);
                    });
                },
                _itemPromiseAtIndex: function (index) {
                    /*#DBG
                    var that = this;
                    var startVersion = that._versionManager.version;
                    if (that._versionManager.locked) {
                        throw "ACK! Attempt to get an item while editing";
                    }
                    #DBG*/
                    var itemPromise = this._listBinding.fromIndex(index);
                    /*#DBG
                    itemPromise.then(function (item) {
                        var endVersion = that._versionManager.version;
                        if (item.index !== index) {
                            throw "ACK! inconsistent index";
                        }
                        if (startVersion !== endVersion) {
                            throw "ACK! inconsistent version";
                        }
                        return item;
                    });
                    #DBG*/
                    return itemPromise;
                },
                _waitForElement: function (possiblePlaceholder) {
                    var that = this;
                    return new WinJS.Promise(function (c, e, p) {
                        if (possiblePlaceholder) {
                            if (!that.isPlaceholder(possiblePlaceholder)) {
                                c(possiblePlaceholder);
                            }
                            else {
                                var placeholderID = uniqueID(possiblePlaceholder);
                                var callbacks = that.$pipeline_callbacksMap[placeholderID];
                                if (!callbacks) {
                                    that.$pipeline_callbacksMap[placeholderID] = [c];
                                } else {
                                    callbacks.push(c);
                                }
                            }
                        }
                        else {
                            c(possiblePlaceholder);
                        }
                    });
                },
                _updateElement: function (newElement, oldElement) {
                    var placeholderID = uniqueID(oldElement);
                    var callbacks = this.$pipeline_callbacksMap[placeholderID];
                    if (callbacks) {
                        delete this.$pipeline_callbacksMap[placeholderID];
                        callbacks.forEach(function (c) { c(newElement); });
                    }
                },
                _firstItem: function () {
                    return this._waitForElement(this._elementForItem(this._listBinding.first()));
                },
                _lastItem: function () {
                    return this._waitForElement(this._elementForItem(this._listBinding.last()));
                },
                _previousItem: function (element) {
                    this._listBinding.jumpToItem(this._itemFromElement(element));
                    return this._waitForElement(this._elementForItem(this._listBinding.previous()));
                },
                _nextItem: function (element) {
                    this._listBinding.jumpToItem(this._itemFromElement(element));
                    return this._waitForElement(this._elementForItem(this._listBinding.next()));
                },
                _itemFromPromise: function (itemPromise) {
                    return this._waitForElement(this._elementForItem(itemPromise));
                },
                isPlaceholder: function (item) {
                    return !!this._recordFromElement(item).elementIsPlaceholder;
                },

                itemObject: function (element) {
                    return this._itemFromElement(element);
                },

                release: function () {
                    this._listBinding.release();
                    this._elementNotificationHandler = null;
                    this._listBinding = null;
                    this._jobOwner.cancelAll();
                    this._released = true;
                },

                releaseItemPromise: function (itemPromise) {
                    var handle = itemPromise.handle;
                    var record = this._handleMap[handle];
                    if (!record) {
                        // The item promise is not in our handle map so we didn't even try to render it yet.
                        itemPromise.cancel();
                    } else {
                        this._releaseRecord(record);
                    }
                },

                releaseItem: function (element) {
                    var record = this._elementMap[uniqueID(element)];
                    this._releaseRecord(record);
                },

                _releaseRecord: function (record) {
                    if (!record) { return; }

                    /*#DBG
                    if (record.released) {
                        throw "ACK! Double release on item";
                    }
                    #DBG*/

                    if (record.renderPromise) {
                        record.renderPromise.cancel();
                    }
                    if (record.itemPromise) {
                        record.itemPromise.cancel();
                    }
                    if (record.imagePromises) {
                        record.imagePromises.forEach(function (promise) {
                            promise.cancel();
                        });
                    }
                    if (record.itemReadyPromise) {
                        record.itemReadyPromise.cancel();
                    }
                    if (record.renderComplete) {
                        record.renderComplete.cancel();
                    }

                    this._removeEntryFromElementMap(record.element);
                    this._removeEntryFromHandleMap(record.itemPromise.handle, record);

                    if (record.item) {
                        this._listBinding.releaseItem(record.item);
                    }

                    /*#DBG
                    record.released = true;
                    if (record.updater) {
                        throw "ACK! attempt to release item current held by updater";
                    }
                    #DBG*/
                },

                refresh: function () {
                    return this._listDataSource.invalidateAll();
                },

                // Private members

                _handlerToNotifyCaresAboutItemAvailable: function () {
                    return !!(this._elementNotificationHandler && this._elementNotificationHandler.itemAvailable);
                },

                _handlerToNotify: function () {
                    if (!this._notificationsSent) {
                        this._notificationsSent = true;

                        if (this._elementNotificationHandler && this._elementNotificationHandler.beginNotifications) {
                            this._elementNotificationHandler.beginNotifications();
                        }
                    }
                    return this._elementNotificationHandler;
                },

                _defineIndexProperty: function (itemForRenderer, item, record) {
                    record.indexObserved = false;
                    Object.defineProperty(itemForRenderer, "index", {
                        get: function () {
                            record.indexObserved = true;
                            return item.index;
                        }
                    });
                },

                _renderPlaceholder: function (record) {
                    var itemForRenderer = {};
                    var elementPlaceholder = defaultRenderer(itemForRenderer);
                    record.elementIsPlaceholder = true;
                    return elementPlaceholder;
                },

                _renderItem: function (itemPromise, record, callerThrottlesStage1) {
                    var that = this;
                    var indexInView = that._indexInView || function () { return true; };
                    var stage1Signal = new Signal();
                    var readySignal = new Signal();
                    var perfItemPromiseId = "_renderItem(" + record.item.index + "):itemPromise";

                    var stage0RunningSync = true;
                    var stage0Ran = false;
                    itemPromise.then(function (item) {
                        stage0Ran = true;
                        if (stage0RunningSync) {
                            stage1Signal.complete(item);
                        }
                    });
                    stage0RunningSync = false;

                    var itemForRendererPromise = stage1Signal.promise.then(function (item) {
                        if (item) {
                            var itemForRenderer = Object.create(item);
                            // Derive a new item and override its index property, to track whether it is read
                            that._defineIndexProperty(itemForRenderer, item, record);
                            itemForRenderer.ready = readySignal.promise;
                            itemForRenderer.isOnScreen = function () {
                                return Promise.wrap(indexInView(item.index));
                            };
                            itemForRenderer.loadImage = function (srcUrl, image) {
                                var loadImagePromise = loadImage(srcUrl, image, itemForRenderer);
                                if (record.imagePromises) {
                                    record.imagePromises.push(loadImagePromise);
                                } else {
                                    record.imagePromises = [loadImagePromise];
                                }
                                return loadImagePromise;
                            };
                            itemForRenderer.isImageCached = isImageCached;
                            return itemForRenderer;
                        } else {
                            return WinJS.Promise.cancel;
                        }
                    });

                    function queueAsyncStage1() {
                        itemPromise.then(function (item) {
                            that._writeProfilerMark(perfItemPromiseId + ",StartTM");
                            stage1Signal.complete(item);
                            that._writeProfilerMark(perfItemPromiseId + ",StopTM");
                        });
                    }
                    if (!stage0Ran) {
                        if (callerThrottlesStage1) {
                            record.stage0 = itemPromise;
                            record.startStage1 = function () {
                                record.startStage1 = null;
                                queueAsyncStage1();
                            }
                        } else {
                            queueAsyncStage1();
                        }
                    }

                    itemForRendererPromise.handle = itemPromise.handle;
                    record.itemPromise = itemForRendererPromise;
                    record.itemReadyPromise = readySignal.promise;
                    record.readyComplete = false;

                    // perfRendererWorkId = stage 1 rendering (if itemPromise is async) or stage 1+2 (if itemPromise is sync and ran inline)
                    // perfItemPromiseId = stage 2 rendering only (should only be emitted if itemPromise was async)
                    // perfItemReadyId = stage 3 rendering
                    var perfRendererWorkId = "_renderItem(" + record.item.index + (stage0Ran ? "):syncItemPromise" : "):placeholder");
                    var perfItemReadyId = "_renderItem(" + record.item.index + "):itemReady";

                    this._writeProfilerMark(perfRendererWorkId + ",StartTM");
                    var rendererPromise = WinJS.Promise.as(that._itemRenderer(itemForRendererPromise, record.element)).
                        then(WinJS.UI._normalizeRendererReturn).
                        then(function (v) {
                            if (that._released) {
                                return WinJS.Promise.cancel;
                            }

                            itemForRendererPromise.then(function (item) {
                                // Store pending ready callback off record so ScrollView can call it during realizePage. Otherwise
                                // call it ourselves.
                                record.pendingReady = function () {
                                    if (record.pendingReady) {
                                        record.pendingReady = null;
                                        record.readyComplete = true;
                                        that._writeProfilerMark(perfItemReadyId + ",StartTM");
                                        readySignal.complete(item);
                                        that._writeProfilerMark(perfItemReadyId + ",StopTM");
                                    }
                                }
                                if (!that._viewCallsReady) {
                                    var job = Scheduler.schedule(record.pendingReady, Scheduler.Priority.normal,
                                        record, "WinJS.UI._ItemsManager._pendingReady");
                                    job.owner = that._jobOwner;
                                }
                            });
                            return v;
                        });

                    this._writeProfilerMark(perfRendererWorkId + ",StopTM");
                    return rendererPromise;
                },

                _replaceElement: function (record, elementNew) {
                    /*#DBG
                    if (!this._handleInHandleMap(record.item.handle)) {
                        throw "ACK! replacing element not present in handle map";
                    }
                    #DBG*/
                    this._removeEntryFromElementMap(record.element);
                    record.element = elementNew;
                    this._addEntryToElementMap(elementNew, record);
                },

                _changeElement: function (record, elementNew, elementNewIsPlaceholder) {
                    //#DBG _ASSERT(elementNew);
                    record.renderPromise = null;
                    var elementOld = record.element,
                        itemOld = record.item;

                    if (record.newItem) {
                        record.item = record.newItem;
                        record.newItem = null;
                    }

                    this._replaceElement(record, elementNew);

                    if (record.item && record.elementIsPlaceholder && !elementNewIsPlaceholder) {
                        record.elementDelayed = null;
                        record.elementIsPlaceholder = false;
                        this._updateElement(record.element, elementOld);
                        if (this._handlerToNotifyCaresAboutItemAvailable()) {
                            this._handlerToNotify().itemAvailable(record.element, elementOld);
                        }
                    } else {
                        this._handlerToNotify().changed(elementNew, elementOld, itemOld);
                    }
                },

                _elementForItem: function (itemPromise, callerThrottlesStage1) {
                    var handle = itemPromise.handle,
                        record = this._recordFromHandle(handle, true),
                        element;

                    if (!handle) {
                        return null;
                    }

                    if (record) {
                        element = record.element;
                    } else {
                        // Create a new record for this item
                        record = {
                            item: itemPromise,
                            itemPromise: itemPromise
                        };
                        this._addEntryToHandleMap(handle, record);

                        var that = this;
                        var mirage = false;
                        var synchronous = false;

                        var renderPromise =
                            that._renderItem(itemPromise, record, callerThrottlesStage1).
                            then(function (v) {
                                var elementNew = v.element;
                                record.renderComplete = v.renderComplete;

                                itemPromise.then(function (item) {
                                    record.item = item;
                                    if (!item) {
                                        mirage = true;
                                        element = null;
                                    }
                                });

                                synchronous = true;
                                record.renderPromise = null;

                                if (elementNew) {
                                    if (element) {
                                        that._presentElements(record, elementNew);
                                    } else {
                                        element = elementNew;
                                    }
                                }
                            });

                        if (!mirage) {
                            if (!synchronous) {
                                record.renderPromise = renderPromise;
                            }

                            if (!element) {
                                element = this._renderPlaceholder(record);
                            }

                            record.element = element;
                            this._addEntryToElementMap(element, record);

                            itemPromise.retain();
                        }
                    }

                    return element;
                },

                _addEntryToElementMap: function (element, record) {
                    /*#DBG 
                    if (WinJS.Utilities.data(element).itemsManagerRecord) {
                        throw "ACK! Extra call to _addEntryToElementMap, ref counting error";
                    }
                    WinJS.Utilities.data(element).itemsManagerRecord = record;
                    #DBG*/
                    this._elementMap[uniqueID(element)] = record;
                },

                _removeEntryFromElementMap: function (element) {
                    /*#DBG
                    if (!WinJS.Utilities.data(element).itemsManagerRecord) {
                        throw "ACK! Extra call to _removeEntryFromElementMap, ref counting error";
                    }
                    WinJS.Utilities.data(element).removeElementMapRecord = WinJS.Utilities.data(element).itemsManagerRecord;
                    WinJS.Utilities.data(element).removeEntryMapStack = dbg_stackTrace();
                    delete WinJS.Utilities.data(element).itemsManagerRecord;
                    #DBG*/
                    delete this._elementMap[uniqueID(element)];
                },

                _recordFromElement: function (element, ignoreFailure) {
                    var record = this._elementMap[uniqueID(element)];
                    if (!record) {
                        /*#DBG
                        var removeElementMapRecord = WinJS.Utilities.data(element).removeElementMapRecord;
                        var itemsManagerRecord = WinJS.Utilities.data(element).itemsManagerRecord;
                        #DBG*/
                        this._writeProfilerMark("_recordFromElement:ItemIsInvalidError,info");
                        throw new WinJS.ErrorFromName("WinJS.UI.ItemsManager.ItemIsInvalid", strings.itemIsInvalid);
                    }

                    return record;
                },

                _addEntryToHandleMap: function (handle, record) {
                    /*#DBG
                    if (this._handleMap[handle]) {
                        throw "ACK! Extra call to _addEntryToHandleMap, ref counting error";
                    }
                    this._handleMapLeak = this._handleMapLeak || {};
                    this._handleMapLeak[handle] = { record: record, addHandleMapStack: dbg_stackTrace() };
                    #DBG*/
                    this._handleMap[handle] = record;
                },

                _removeEntryFromHandleMap: function (handle, record) {
                    /*#DBG
                    if (!this._handleMap[handle]) {
                        throw "ACK! Extra call to _removeEntryFromHandleMap, ref counting error";
                    }
                    this._handleMapLeak[handle].removeHandleMapStack = dbg_stackTrace();
                    #DBG*/
                    delete this._handleMap[handle];
                },

                _handleInHandleMap: function (handle) {
                    return !!this._handleMap[handle];
                },

                _recordFromHandle: function (handle, ignoreFailure) {
                    var record = this._handleMap[handle];
                    if (!record && !ignoreFailure) {
                        /*#DBG
                        var leak = this._handleMapLeak[handle];
                        #DBG*/
                        throw new WinJS.ErrorFromName("WinJS.UI.ItemsManager.ItemIsInvalid", strings.itemIsInvalid);
                    }
                    return record;
                },

                _foreachRecord: function (callback) {
                    var records = this._handleMap;
                    for (var property in records) {
                        var record = records[property];
                        callback(record);
                    }
                },

                _itemFromElement: function (element) {
                    return this._recordFromElement(element).item;
                },

                _elementFromHandle: function (handle) {
                    if (handle) {
                        var record = this._recordFromHandle(handle, true);

                        if (record && record.element) {
                            return record.element;
                        }
                    }

                    return null;
                },

                _inserted: function (itemPromise, previousHandle, nextHandle) {
                    this._handlerToNotify().inserted(itemPromise, previousHandle, nextHandle);
                },

                _changed: function (newItem, oldItem) {
                    if (!this._handleInHandleMap(oldItem.handle)) { return; }

                    var record = this._recordFromHandle(oldItem.handle);

                    //#DBG _ASSERT(record);
                    if (record.renderPromise) {
                        record.renderPromise.cancel();
                    }
                    if (record.itemPromise) {
                        record.itemPromise.cancel();
                    }
                    if (record.imagePromises) {
                        record.imagePromises.forEach(function (promise) {
                            promise.cancel();
                        });
                    }
                    if (record.itemReadyPromise) {
                        record.itemReadyPromise.cancel();
                    }
                    if (record.renderComplete) {
                        record.renderComplete.cancel();
                    }

                    record.newItem = newItem;

                    var that = this;
                    var newItemPromise = WinJS.Promise.as(newItem);
                    newItemPromise.handle = record.itemPromise.handle;
                    record.renderPromise = this._renderItem(newItemPromise, record).
                        then(function (v) {
                            record.renderComplete = v.renderComplete;
                            that._changeElement(record, v.element, false);
                            that._presentElements(record);
                        });
                },

                _moved: function (itemPromise, previousHandle, nextHandle) {
                    // no check for haveHandle, as we get move notification for items we 
                    // are "next" to, so we handle the "null element" cases below
                    //
                    var element = this._elementFromHandle(itemPromise.handle);
                    var previous = this._elementFromHandle(previousHandle);
                    var next = this._elementFromHandle(nextHandle);

                    this._handlerToNotify().moved(element, previous, next, itemPromise);
                    this._presentAllElements();
                },

                _removed: function (handle, mirage) {
                    if (this._handleInHandleMap(handle)) {
                        var element = this._elementFromHandle(handle);

                        //#DBG _ASSERT(element);
                        this._handlerToNotify().removed(element, mirage, handle);
                        this.releaseItem(element);
                        this._presentAllElements();
                    } else {
                        this._handlerToNotify().removed(null, mirage, handle);
                    }
                },

                _countChanged: function (newCount, oldCount) {
                    if (this._elementNotificationHandler && this._elementNotificationHandler.countChanged) {
                        this._handlerToNotify().countChanged(newCount, oldCount);
                    }
                },

                _indexChanged: function (handle, newIndex, oldIndex) {
                    var element;
                    if (this._handleInHandleMap(handle)) {
                        var record = this._recordFromHandle(handle);
                        if (record.indexObserved) {
                            if (!record.elementIsPlaceholder) {
                                if (record.item.index !== newIndex) {
                                    if (record.renderPromise) {
                                        record.renderPromise.cancel();
                                    }
                                    if (record.renderComplete) {
                                        record.renderComplete.cancel();
                                    }

                                    var itemToRender = record.newItem || record.item;
                                    itemToRender.index = newIndex;

                                    var newItemPromise = WinJS.Promise.as(itemToRender);
                                    newItemPromise.handle = record.itemPromise.handle;

                                    var that = this;
                                    record.renderPromise = this._renderItem(newItemPromise, record).
                                        then(function (v) {
                                            record.renderComplete = v.renderComplete;
                                            that._changeElement(record, v.element, false);
                                            that._presentElements(record);
                                        });
                                }
                            } else {
                                this._changeElement(record, this._renderPlaceholder(record), true);
                            }
                        }
                        element = record.element;
                    }
                    if (this._elementNotificationHandler && this._elementNotificationHandler.indexChanged) {
                        this._handlerToNotify().indexChanged(element, newIndex, oldIndex);
                    }
                },

                _affectedRange: function (range) {
                    if (this._elementNotificationHandler && this._elementNotificationHandler.updateAffectedRange) {
                        this._handlerToNotify().updateAffectedRange(range);
                    }
                },

                _beginNotifications: function () {
                    // accessing _handlerToNotify will force the call to beginNotifications on the client
                    //
                    this._externalBegin = true;
                    var x = this._handlerToNotify();
                },
                _endNotifications: function () {
                    if (this._notificationsSent) {
                        this._notificationsSent = false;
                        this._externalBegin = false;

                        if (this._elementNotificationHandler && this._elementNotificationHandler.endNotifications) {
                            this._elementNotificationHandler.endNotifications();
                        }
                    }
                },

                _reload: function () {
                    if (this._elementNotificationHandler && this._elementNotificationHandler.reload) {
                        this._elementNotificationHandler.reload();
                    }
                },

                // Some functions may be called synchronously or asynchronously, so it's best to post _endNotifications to avoid
                // calling it prematurely.
                _postEndNotifications: function () {
                    if (this._notificationsSent && !this._externalBegin && !this._endNotificationsPosted) {
                        this._endNotificationsPosted = true;
                        var that = this;
                        Scheduler.schedule(function ItemsManager_async_endNotifications() {
                            that._endNotificationsPosted = false;
                            that._endNotifications();
                        }, Scheduler.Priority.high, null, "WinJS.UI._ItemsManager._postEndNotifications");
                    }
                },

                _presentElement: function (record) {
                    var elementOld = record.element;
                    //#DBG _ASSERT(elementOld);

                    // Finish modifying the slot before calling back into user code, in case there is a reentrant call
                    this._replaceElement(record, record.elementDelayed);
                    record.elementDelayed = null;

                    record.elementIsPlaceholder = false;
                    this._updateElement(record.element, elementOld);
                    if (this._handlerToNotifyCaresAboutItemAvailable()) {
                        this._handlerToNotify().itemAvailable(record.element, elementOld);
                    }
                },

                _presentElements: function (record, elementDelayed) {
                    if (elementDelayed) {
                        record.elementDelayed = elementDelayed;
                    }

                    this._listBinding.jumpToItem(record.item);
                    if (record.elementDelayed) {
                        this._presentElement(record);
                    }

                    this._postEndNotifications();
                },

                // Presents all delayed elements
                _presentAllElements: function () {
                    var that = this;
                    this._foreachRecord(function (record) {
                        if (record.elementDelayed) {
                            that._presentElement(record);
                        }
                    });
                },

                _writeProfilerMark: function (text) {
                    var message = "WinJS.UI._ItemsManager:" + (this._profilerId ? (this._profilerId + ":") : ":") + text;
                    WinJS.Utilities._writeProfilerMark(message);
                }
            }, { // Static Members
                supportedForProcessing: false,
            });

            return function (dataSource, itemRenderer, elementNotificationHandler, options) {
                return new ItemsManager(dataSource, itemRenderer, elementNotificationHandler, options);
            };
        })
    });

})(this);

