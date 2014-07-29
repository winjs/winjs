// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Items Manager

define([
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Promise',
    '../_Signal',
    '../Scheduler',
    '../Utilities/_ElementUtilities',
    './_ParallelWorkQueue',
    './_VersionManager'
    ], function itemsManagerInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Resources, _WriteProfilerMark, Promise, _Signal, Scheduler, _ElementUtilities, _ParallelWorkQueue, _VersionManager) {
    "use strict";

    var markSupportedForProcessing = _BaseUtils.markSupportedForProcessing;
    var uniqueID = _ElementUtilities._uniqueID;

    function simpleItemRenderer(f) {
        return markSupportedForProcessing(function (itemPromise, element) {
            return itemPromise.then(function (item) {
                return (item ? f(item, element) : null);
            });
        });
    }

    var trivialHtmlRenderer = simpleItemRenderer(function (item) {
        if (_ElementUtilities._isDOMElement(item.data)) {
            return item.data;
        }

        var data = item.data;
        if (data === undefined) {
            data = "undefined";
        } else if (data === null) {
            data = "null";
        } else if (typeof data === "object") {
            data = JSON.stringify(data);
        }

        var element = _Global.document.createElement("span");
        element.textContent = data.toString();
        return element;
    });

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _normalizeRendererReturn: function (v) {
            if (v) {
                if (typeof v === "object" && v.element) {
                    var elementPromise = Promise.as(v.element);
                    return elementPromise.then(function (e) { return { element: e, renderComplete: Promise.as(v.renderComplete) }; });
                }
                else {
                    var elementPromise = Promise.as(v);
                    return elementPromise.then(function (e) { return { element: e, renderComplete: Promise.as() }; });
                }
            }
            else {
                return { element: null, renderComplete: Promise.as() };
            }
        },
        simpleItemRenderer: simpleItemRenderer,
        _trivialHtmlRenderer: trivialHtmlRenderer
    });

    // Private statics

    var strings = {
        get listDataSourceIsInvalid() { return "Invalid argument: dataSource must be an object."; },
        get itemRendererIsInvalid() { return "Invalid argument: itemRenderer must be a function."; },
        get itemIsInvalid() { return "Invalid argument: item must be a DOM element that was returned by the Items Manager, and has not been replaced or released."; },
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
    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
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
        imageLoader = imageLoader || new _ParallelWorkQueue._ParallelWorkQueue(6);
        return imageLoader.queue(function () {
            return new Promise(function (c, e) {
                Scheduler.schedule(function ImageLoader_async_loadImage(jobInfo) {
                    if (!image) {
                        image = _Global.document.createElement("img");
                    }

                    var seen = seenUrls[srcUrl];

                    if (!seen) {
                        jobInfo.setPromise(new Promise(function (imageLoadComplete) {
                            var tempImage = _Global.document.createElement("img");

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
                            };

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

    function defaultRenderer() {
        return _Global.document.createElement("div");
    }

    // Public definitions

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _createItemsManager: _Base.Namespace._lazy(function () {
            var ListNotificationHandler = _Base.Class.define(function ListNotificationHandler_ctor(itemsManager) {
                // Constructor

                this._itemsManager = itemsManager;
            }, {
                // Public methods

                beginNotifications: function () {
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

            var ItemsManager = _Base.Class.define(function ItemsManager_ctor(listDataSource, itemRenderer, elementNotificationHandler, options) {
                // Constructor

                if (!listDataSource) {
                    throw new _ErrorFromName("WinJS.UI.ItemsManager.ListDataSourceIsInvalid", strings.listDataSourceIsInvalid);
                }
                if (!itemRenderer) {
                    throw new _ErrorFromName("WinJS.UI.ItemsManager.ItemRendererIsInvalid", strings.itemRendererIsInvalid);
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
                    this._versionManager = options.versionManager || new _VersionManager._VersionManager();
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
                    return this._waitForElement(this._elementForItem(itemPromise));
                },
                // If stage 0 is not yet complete, caller is responsible for transitioning the item from stage 0 to stage 1
                _itemFromItemPromiseThrottled: function (itemPromise) {
                    return this._waitForElement(this._elementForItem(itemPromise, true));
                },
                _itemAtIndex: function (index) {
                    var itemPromise = this._itemPromiseAtIndex(index);
                    this._itemFromItemPromise(itemPromise).then(null, function (e) {
                        itemPromise.cancel();
                        return Promise.wrapError(e);
                    });
                },
                _itemPromiseAtIndex: function (index) {
                    return this._listBinding.fromIndex(index);
                },
                _waitForElement: function (possiblePlaceholder) {
                    var that = this;
                    return new Promise(function (c) {
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
                    var stage1Signal = new _Signal();
                    var readySignal = new _Signal();
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
                            return Promise.cancel;
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
                            };
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
                    var rendererPromise = Promise.as(that._itemRenderer(itemForRendererPromise, record.element)).
                        then(exports._normalizeRendererReturn).
                        then(function (v) {
                            if (that._released) {
                                return Promise.cancel;
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
                                };
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
                    this._removeEntryFromElementMap(record.element);
                    record.element = elementNew;
                    this._addEntryToElementMap(elementNew, record);
                },

                _changeElement: function (record, elementNew, elementNewIsPlaceholder) {
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
                    this._elementMap[uniqueID(element)] = record;
                },

                _removeEntryFromElementMap: function (element) {
                    delete this._elementMap[uniqueID(element)];
                },

                _recordFromElement: function (element) {
                    var record = this._elementMap[uniqueID(element)];
                    if (!record) {
                        this._writeProfilerMark("_recordFromElement:ItemIsInvalidError,info");
                        throw new _ErrorFromName("WinJS.UI.ItemsManager.ItemIsInvalid", strings.itemIsInvalid);
                    }

                    return record;
                },

                _addEntryToHandleMap: function (handle, record) {
                    this._handleMap[handle] = record;
                },

                _removeEntryFromHandleMap: function (handle) {
                    delete this._handleMap[handle];
                },

                _handleInHandleMap: function (handle) {
                    return !!this._handleMap[handle];
                },

                _recordFromHandle: function (handle, ignoreFailure) {
                    var record = this._handleMap[handle];
                    if (!record && !ignoreFailure) {
                        throw new _ErrorFromName("WinJS.UI.ItemsManager.ItemIsInvalid", strings.itemIsInvalid);
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
                    var newItemPromise = Promise.as(newItem);
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

                                    var newItemPromise = Promise.as(itemToRender);
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
                    this._handlerToNotify();
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
                    _WriteProfilerMark(message);
                }
            }, { // Static Members
                supportedForProcessing: false,
            });

            return function (dataSource, itemRenderer, elementNotificationHandler, options) {
                return new ItemsManager(dataSource, itemRenderer, elementNotificationHandler, options);
            };
        })
    });

});

