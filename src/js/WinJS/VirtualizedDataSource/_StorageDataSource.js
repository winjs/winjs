// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Storage Item Data Source

define([
    'exports',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_ErrorFromName',
    '../Core/_WriteProfilerMark',
    '../Animations',
    '../Promise',
    '../Utilities/_UI',
    './_VirtualizedDataSourceImpl'
    ], function storageDataSourceInit(exports, _WinRT, _Base, _ErrorFromName, _WriteProfilerMark, Animations, Promise, _UI, VirtualizedDataSource) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        StorageDataSource: _Base.Namespace._lazy(function () {
            var StorageDataAdapter = _Base.Class.define(function StorageDataAdapter_ctor(query, options) {
                // Constructor
                _WriteProfilerMark("WinJS.UI.StorageDataSource:constructor,StartTM");

                var mode = _WinRT.Windows.Storage.FileProperties.ThumbnailMode.singleItem,
                    size = 256,
                    flags = _WinRT.Windows.Storage.FileProperties.ThumbnailOptions.useCurrentScale,
                    delayLoad = true,
                    library;

                if (query === "Pictures") {
                    mode = _WinRT.Windows.Storage.FileProperties.ThumbnailMode.picturesView;
                    library = _WinRT.Windows.Storage.KnownFolders.picturesLibrary;
                    size = 190;
                } else if (query === "Music") {
                    mode = _WinRT.Windows.Storage.FileProperties.ThumbnailMode.musicView;
                    library = _WinRT.Windows.Storage.KnownFolders.musicLibrary;
                    size = 256;
                } else if (query === "Documents") {
                    mode = _WinRT.Windows.Storage.FileProperties.ThumbnailMode.documentsView;
                    library = _WinRT.Windows.Storage.KnownFolders.documentsLibrary;
                    size = 40;
                } else if (query === "Videos") {
                    mode = _WinRT.Windows.Storage.FileProperties.ThumbnailMode.videosView;
                    library = _WinRT.Windows.Storage.KnownFolders.videosLibrary;
                    size = 190;
                }

                if (!library) {
                    this._query = query;
                } else {
                    var queryOptions = new _WinRT.Windows.Storage.Search.QueryOptions();
                    queryOptions.folderDepth = _WinRT.Windows.Storage.Search.FolderDepth.deep;
                    queryOptions.indexerOption = _WinRT.Windows.Storage.Search.IndexerOption.useIndexerWhenAvailable;
                    this._query = library.createFileQueryWithOptions(queryOptions);
                }

                if (options) {
                    if (typeof options.mode === "number") {
                        mode = options.mode;
                    }
                    if (typeof options.requestedThumbnailSize === "number") {
                        size = Math.max(1, Math.min(options.requestedThumbnailSize, 1024));
                    } else {
                        switch (mode) {
                            case _WinRT.Windows.Storage.FileProperties.ThumbnailMode.picturesView:
                            case _WinRT.Windows.Storage.FileProperties.ThumbnailMode.videosView:
                                size = 190;
                                break;
                            case _WinRT.Windows.Storage.FileProperties.ThumbnailMode.documentsView:
                            case _WinRT.Windows.Storage.FileProperties.ThumbnailMode.listView:
                                size = 40;
                                break;
                            case _WinRT.Windows.Storage.FileProperties.ThumbnailMode.musicView:
                            case _WinRT.Windows.Storage.FileProperties.ThumbnailMode.singleItem:
                                size = 256;
                                break;
                        }
                    }
                    if (typeof options.thumbnailOptions === "number") {
                        flags = options.thumbnailOptions;
                    }
                    if (typeof options.waitForFileLoad === "boolean") {
                        delayLoad = !options.waitForFileLoad;
                    }
                }

                this._loader = new _WinRT.Windows.Storage.BulkAccess.FileInformationFactory(this._query, mode, size, flags, delayLoad);
                this.compareByIdentity = false;
                this.firstDataRequest = true;
                _WriteProfilerMark("WinJS.UI.StorageDataSource:constructor,StopTM");
            }, {
                // Public members

                setNotificationHandler: function (notificationHandler) {
                    this._notificationHandler = notificationHandler;
                    this._query.addEventListener("contentschanged", function () {
                        notificationHandler.invalidateAll();
                    });
                    this._query.addEventListener("optionschanged", function () {
                        notificationHandler.invalidateAll();
                    });
                },

                itemsFromEnd: function (count) {
                    var that = this;
                    _WriteProfilerMark("WinJS.UI.StorageDataSource:itemsFromEnd,info");
                    return this.getCount().then(function (totalCount) {
                        if (totalCount === 0) {
                            return Promise.wrapError(new _ErrorFromName(_UI.FetchError.doesNotExist));
                        }
                        // Intentionally passing countAfter = 1 to go one over the end so that itemsFromIndex will
                        // report the vector size since its known.
                        return that.itemsFromIndex(totalCount - 1, Math.min(totalCount - 1, count - 1), 1);
                    });
                },

                itemsFromIndex: function (index, countBefore, countAfter) {
                    // don't allow more than 64 items to be retrieved at once
                    if (countBefore + countAfter > 64) {
                        countBefore = Math.min(countBefore, 32);
                        countAfter = 64 - (countBefore + 1);
                    }

                    var first = (index - countBefore),
                        count = (countBefore + 1 + countAfter);
                    var that = this;
                    // Fetch a minimum of 32 items on the first request for smoothness. Otherwise 
                    // listview displays 2 items first and then the rest of the page.
                    if (that.firstDataRequest) {
                        that.firstDataRequest = false;
                        count = Math.max(count, 32);
                    }
                    function listener(ev) {
                        that._notificationHandler.changed(that._item(ev.target));
                    }

                    var perfId = "WinJS.UI.StorageDataSource:itemsFromIndex(" + first + "-" + (first + count - 1) + ")";
                    _WriteProfilerMark(perfId + ",StartTM");
                    return this._loader.getItemsAsync(first, count).then(function (itemsVector) {
                        var vectorSize = itemsVector.size;
                        if (vectorSize <= countBefore) {
                            return Promise.wrapError(new _ErrorFromName(_UI.FetchError.doesNotExist));
                        }
                        var items = new Array(vectorSize);
                        var localItemsVector = new Array(vectorSize);
                        itemsVector.getMany(0, localItemsVector);
                        for (var i = 0; i < vectorSize; i++) {
                            items[i] = that._item(localItemsVector[i]);
                            localItemsVector[i].addEventListener("propertiesupdated", listener);
                        }
                        var result = {
                            items: items,
                            offset: countBefore,
                            absoluteIndex: index
                        };
                        // set the totalCount only when we know it (when we retrieived fewer items than were asked for)
                        if (vectorSize < count) {
                            result.totalCount = first + vectorSize;
                        }
                        _WriteProfilerMark(perfId + ",StopTM");
                        return result;
                    });
                },

                itemsFromDescription: function (description, countBefore, countAfter) {
                    var that = this;
                    _WriteProfilerMark("WinJS.UI.StorageDataSource:itemsFromDescription,info");
                    return this._query.findStartIndexAsync(description).then(function (index) {
                        return that.itemsFromIndex(index, countBefore, countAfter);
                    });
                },

                getCount: function () {
                    _WriteProfilerMark("WinJS.UI.StorageDataSource:getCount,info");
                    return this._query.getItemCountAsync();
                },

                itemSignature: function (item) {
                    return item.folderRelativeId;
                },

                // compareByIdentity: set in constructor
                // itemsFromStart: not implemented
                // itemsFromKey: not implemented
                // insertAtStart: not implemented
                // insertBefore: not implemented
                // insertAfter: not implemented
                // insertAtEnd: not implemented
                // change: not implemented
                // moveToStart: not implemented
                // moveBefore: not implemented
                // moveAfter: not implemented
                // moveToEnd: not implemented
                // remove: not implemented

                // Private members

                _item: function (item) {
                    return {
                        key: item.path || item.folderRelativeId,
                        data: item
                    };
                }
            }, {
                supportedForProcessing: false,
            });

            return _Base.Class.derive(VirtualizedDataSource.VirtualizedDataSource, function (query, options) {
                /// <signature helpKeyword="WinJS.UI.StorageDataSource">
                /// <summary locid="WinJS.UI.StorageDataSource">
                /// Creates a data source that enumerates an IStorageQueryResultBase.
                /// </summary>
                /// <param name="query" type="_WinRT.Windows.Storage.Search.IStorageQueryResultBase" locid="WinJS.UI.StorageDataSource_p:query">
                /// The object to enumerate. It must support IStorageQueryResultBase.
                /// </param>
                /// <param name="options" mayBeNull="true" optional="true" type="Object" locid="WinJS.UI.StorageDataSource_p:options">
                /// An object that specifies options for the data source. This parameter is optional. It can contain these properties: 
                ///
                /// mode:
                /// A _WinRT.Windows.Storage.FileProperties.ThumbnailMode - a value that specifies whether to request
                /// thumbnails and the type of thumbnails to request.
                ///
                /// requestedThumbnailSize:
                /// A Number that specifies the size of the thumbnails.
                ///
                /// thumbnailOptions:
                /// A _WinRT.Windows.Storage.FileProperties.ThumbnailOptions value that specifies additional options for the thumbnails.
                ///
                /// waitForFileLoad:
                /// If you set this to true, the data source returns items only after it loads their properties and thumbnails.
                ///
                /// </param>
                /// </signature>
                this._baseDataSourceConstructor(new StorageDataAdapter(query, options));
            }, {
                /* empty */
            }, {
                loadThumbnail: function (item, image) {
                    /// <signature>
                    /// <summary locid="WinJS.UI.StorageDataSource.loadThumbnail">
                    /// Returns a promise for an image element that completes when the full quality thumbnail of the provided item is drawn to the
                    /// image element.
                    /// </summary>
                    /// <param name="item" type="ITemplateItem" locid="WinJS.UI.StorageDataSource.loadThumbnail_p:item">
                    /// The item to retrieve a thumbnail for.
                    /// </param>
                    /// <param name="image" type="Object" domElement="true" optional="true" locid="WinJS.UI.StorageDataSource.loadThumbnail_p:image">
                    /// The image element to use. If not provided, a new image element is created.
                    /// </param>
                    /// </signature>
                    var thumbnailUpdateHandler,
                        thumbnailPromise,
                        shouldRespondToThumbnailUpdate = false;
            
                    return new Promise(function (complete, error, progress) {
                        // Load a thumbnail if it exists. The promise completes when a full quality thumbnail is visible.
                        var tagSupplied = (image ? true : false);
                        var processThumbnail = function (thumbnail) {
                            if (thumbnail) {
                                var url = URL.createObjectURL(thumbnail, {oneTimeOnly: true});

                                // If this is the first version of the thumbnail we're loading, fade it in.
                                if (!thumbnailPromise) {
                                    thumbnailPromise = item.loadImage(url, image).then(function (image) {
                                        // Wrapping the fadeIn call in a promise for the image returned by loadImage allows us to
                                        // pipe the result of loadImage to further chained promises.  This is necessary because the
                                        // image element provided to loadThumbnail is optional, and loadImage will create an image
                                        // element if none is provided.
                                        return item.isOnScreen().then(function (visible) {
                                            var imagePromise;
                                            if (visible && tagSupplied) {
                                                imagePromise = Animations.fadeIn(image).then(function () {
                                                    return image;
                                                });
                                            } else {
                                                image.style.opacity = 1;
                                                imagePromise = Promise.wrap(image);
                                            }
                                            return imagePromise;
                                        });
                                    });
                                }
                                    // Otherwise, replace the existing version without animation.
                                else {
                                    thumbnailPromise = thumbnailPromise.then(function (image) {
                                        return item.loadImage(url, image);
                                    });
                                }

                                // If we have the full resolution thumbnail, we can cancel further updates and complete the promise
                                // when current work is complete.
                                if ((thumbnail.type !== _WinRT.Windows.Storage.FileProperties.ThumbnailType.icon) && !thumbnail.returnedSmallerCachedSize) {
                                    _WriteProfilerMark("WinJS.UI.StorageDataSource:loadThumbnail complete,info");
                                    item.data.removeEventListener("thumbnailupdated", thumbnailUpdateHandler);
                                    shouldRespondToThumbnailUpdate = false;
                                    thumbnailPromise = thumbnailPromise.then(function (image) {
                                        thumbnailUpdateHandler = null;
                                        thumbnailPromise = null;
                                        complete(image);
                                    });
                                }
                            }
                        };

                        thumbnailUpdateHandler = function (e) {
                            // Ensure that a zombie update handler does not get invoked.
                            if (shouldRespondToThumbnailUpdate) {
                                processThumbnail(e.target.thumbnail);
                            }
                        };
                        item.data.addEventListener("thumbnailupdated", thumbnailUpdateHandler);
                        shouldRespondToThumbnailUpdate = true;
                
                        // If we already have a thumbnail we should render it now.
                        processThumbnail(item.data.thumbnail);
                    }, function () {
                        item.data.removeEventListener("thumbnailupdated", thumbnailUpdateHandler);
                        shouldRespondToThumbnailUpdate = false;
                        thumbnailUpdateHandler = null;
                        if (thumbnailPromise) {
                            thumbnailPromise.cancel();
                            thumbnailPromise = null;
                        }
                    });
                },

                supportedForProcessing: false,
            });
        })
    });

});