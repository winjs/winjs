// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// WinJS.Binding.ListDataSource
//
define([
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Binding/_DomWeakRefTable',
    '../Promise',
    '../Scheduler',
    '../Utilities/_UI'
    ], function bindingListDataSourceInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _DomWeakRefTable, Promise, Scheduler, _UI) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.Binding", {
        _BindingListDataSource: _Base.Namespace._lazy(function () {
            var errors = {
                get noLongerMeaningful() { return Promise.wrapError(new _ErrorFromName(_UI.EditError.noLongerMeaningful)); }
            };

            function findNextKey(list, index) {
                var len = list.length;
                while (index < len - 1) {
                    var item = list.getItem(++index);
                    if (item) {
                        return item.key;
                    }
                }
                return null;
            }

            function findPreviousKey(list, index) {
                while (index > 0) {
                    var item = list.getItem(--index);
                    if (item) {
                        return item.key;
                    }
                }
                return null;
            }

            function subscribe(target, handlers) {
                Object.keys(handlers).forEach(function (handler) {
                    target.addEventListener(handler, handlers[handler]);
                });
            }

            function unsubscribe(target, handlers) {
                Object.keys(handlers).forEach(function (handler) {
                    target.removeEventListener(handler, handlers[handler]);
                });
            }

            var CompletePromise = Promise.wrap().constructor;

            var NullWrappedItem = _Base.Class.derive(CompletePromise,
                function () {
                    this._value = null;
                }, {
                    release: function () { },
                    retain: function () { return this; }
                }, {
                    supportedForProcessing: false,
                }
            );

            var WrappedItem = _Base.Class.derive(CompletePromise,
                function (listBinding, item) {
                    this._value = item;
                    this._listBinding = listBinding;
                }, {
                    handle: {
                        get: function () { return this._value.key; }
                    },
                    index: {
                        get: function () { return this._value.index; }
                    },
                    release: function () {
                        this._listBinding._release(this._value, this._listBinding._list.indexOfKey(this._value.key));
                    },
                    retain: function () {
                        this._listBinding._addRef(this._value, this._listBinding._list.indexOfKey(this._value.key));
                        return this;
                    }
                }, {
                    supportedForProcessing: false,
                }
            );

            var AsyncWrappedItem = _Base.Class.derive(Promise,
                function (listBinding, item, name) {
                    var that = this;
                    this._item = item;
                    this._listBinding = listBinding;
                    Promise.call(this, function (c) {
                        Scheduler.schedule(function BindingList_async_item() {
                            if (listBinding._released) {
                                that.cancel();
                                return;
                            }
                            c(item);
                        }, Scheduler.Priority.normal, null, "WinJS.Binding.List." + name);
                    });
                }, {
                    handle: {
                        get: function () { return this._item.key; }
                    },
                    index: {
                        get: function () { return this._item.index; }
                    },
                    release: function () {
                        this._listBinding._release(this._item, this._listBinding._list.indexOfKey(this._item.key));
                    },
                    retain: function () {
                        this._listBinding._addRef(this._item, this._listBinding._list.indexOfKey(this._item.key));
                        return this;
                    }
                }, {
                    supportedForProcessing: false,
                }
            );

            function wrap(listBinding, item) {
                return item ? new WrappedItem(listBinding, item) : new NullWrappedItem();
            }

            function wrapAsync(listBinding, item, name) {
                return item ? new AsyncWrappedItem(listBinding, item, name) : new NullWrappedItem();
            }

            function cloneWithIndex(list, item, index) {
                return item && list._annotateWithIndex(item, index);
            }

            var ListBinding = _Base.Class.define(function ListBinding_ctor(dataSource, list, notificationHandler, id) {
                this._dataSource = dataSource;
                this._list = list;
                this._editsCount = 0;
                this._notificationHandler = notificationHandler;
                this._pos = -1;
                this._retained = [];
                this._retained.length = list.length;
                this._retainedKeys = {};
                this._affectedRange = null;
                // When in WebContext, weakref utility functions don't work as desired so we capture this
                // ListBinding object in the handler's closure. This causes the same leak as in 1.0.
                var fallbackReference = null;
                if (!_BaseUtils.hasWinRT || !_Global.msSetWeakWinRTProperty || !_Global.msGetWeakWinRTProperty) {
                    fallbackReference = this;
                }
                if (notificationHandler) {
                    var handleEvent = function (eventName, eventArg) {
                        var lb = _DomWeakRefTable._getWeakRefElement(id) || fallbackReference;
                        if (lb) {
                            lb["_" + eventName](eventArg);
                            return true;
                        }
                        return false;
                    };

                    this._handlers = {
                        itemchanged: function handler(event) {
                            if (!handleEvent("itemchanged", event)) {
                                list.removeEventListener("itemchanged", handler);
                            }
                        },
                        iteminserted: function handler(event) {
                            if (!handleEvent("iteminserted", event)) {
                                list.removeEventListener("iteminserted", handler);
                            }
                        },
                        itemmoved: function handler(event) {
                            if (!handleEvent("itemmoved", event)) {
                                list.removeEventListener("itemmoved", handler);
                            }
                        },
                        itemremoved: function handler(event) {
                            if (!handleEvent("itemremoved", event)) {
                                list.removeEventListener("itemremoved", handler);
                            }
                        },
                        reload: function handler() {
                            if (!handleEvent("reload")) {
                                list.removeEventListener("reload", handler);
                            }
                        }
                    };
                    subscribe(this._list, this._handlers);
                }
            }, {
                _itemchanged: function (event) {
                    var key = event.detail.key;
                    var index = event.detail.index;
                    this._updateAffectedRange(index, "changed");
                    var newItem = event.detail.newItem;
                    var oldItem = this._retained[index];
                    if (oldItem) {
                        var handler = this._notificationHandler;
                        if (oldItem.index !== index) {
                            var oldIndex = oldItem.index;
                            oldItem.index = index;
                            if (handler && handler.indexChanged) {
                                handler.indexChanged(newItem.key, index, oldIndex);
                            }
                        }
                        newItem = cloneWithIndex(this._list, newItem, index);
                        newItem._retainedCount = oldItem._retainedCount;
                        this._retained[index] = newItem;
                        this._retainedKeys[key] = newItem;

                        this._beginEdits(this._list.length);
                        if (handler && handler.changed) {
                            handler.changed(
                                newItem,
                                oldItem
                            );
                        }
                        this._endEdits();
                    } else {
                        // Item was not retained, but we still want to batch this change with the other edits to send the affectedRange notification.
                        this._beginEdits(this._list.length);
                        this._endEdits();
                    }
                },

                _iteminserted: function (event) {
                    var index = event.detail.index;
                    this._updateAffectedRange(index, "inserted");
                    this._beginEdits(this._list.length - 1);
                    if (index <= this._pos) {
                        this._pos = Math.min(this._pos + 1, this._list.length);
                    }
                    var retained = this._retained;
                    // create a hole for this thing and then immediately make it undefined
                    retained.splice(index, 0, 0);
                    delete retained[index];
                    if (this._shouldNotify(index) || this._list.length === 1) {
                        var handler = this._notificationHandler;
                        if (handler && handler.inserted) {
                            handler.inserted(
                                wrap(this, cloneWithIndex(this._list, this._list.getItem(index), index)),
                                findPreviousKey(this._list, index),
                                findNextKey(this._list, index)
                            );
                        }
                    }
                    this._endEdits();
                },

                _itemmoved: function (event) {
                    var oldIndex = event.detail.oldIndex;
                    var newIndex = event.detail.newIndex;
                    this._updateAffectedRange(oldIndex, "moved");
                    this._updateAffectedRange(newIndex, "moved");
                    this._beginEdits(this._list.length);
                    if (oldIndex < this._pos || newIndex <= this._pos) {
                        if (newIndex > this._pos) {
                            this._pos = Math.max(-1, this._pos - 1);
                        } else if (oldIndex > this._pos) {
                            this._pos = Math.min(this._pos + 1, this._list.length);
                        }
                    }
                    var retained = this._retained;
                    var item = retained.splice(oldIndex, 1)[0];
                    retained.splice(newIndex, 0, item);
                    if (!item) {
                        delete retained[newIndex];
                        item = cloneWithIndex(this._list, this._list.getItem(newIndex), newIndex);
                    }
                    item._moved = true;
                    this._addRef(item, newIndex);
                    this._endEdits();
                },

                _itemremoved: function (event) {
                    var key = event.detail.key;
                    var index = event.detail.index;
                    this._updateAffectedRange(index, "removed");
                    this._beginEdits(this._list.length + 1);
                    if (index < this._pos) {
                        this._pos = Math.max(-1, this._pos - 1);
                    }
                    var retained = this._retained;
                    var retainedKeys = this._retainedKeys;
                    var wasRetained = index in retained;
                    retained.splice(index, 1);
                    delete retainedKeys[key];
                    var handler = this._notificationHandler;
                    if (wasRetained && handler && handler.removed) {
                        handler.removed(key, false);
                    }
                    this._endEdits();
                },

                _reload: function () {
                    this._retained = [];
                    this._retainedKeys = {};
                    var handler = this._notificationHandler;
                    if (handler && handler.reload) {
                        handler.reload();
                    }
                },

                _addRef: function (item, index) {
                    if (index in this._retained) {
                        this._retained[index]._retainedCount++;
                    } else {
                        this._retained[index] = item;
                        this._retainedKeys[item.key] = item;
                        item._retainedCount = 1;
                    }
                },
                _release: function (item, index) {
                    var retained = this._retained[index];
                    if (retained) {
                        if (retained._retainedCount === 1) {
                            delete this._retained[index];
                            delete this._retainedKeys[retained.key];
                        } else {
                            retained._retainedCount--;
                        }
                    }
                },
                _shouldNotify: function (index) {
                    var retained = this._retained;
                    return index in retained || index + 1 in retained || index - 1 in retained;
                },

                _updateAffectedRange: function ListBinding_updateAffectedRange(index, operation) {
                    // Creates a range of affected indices [start, end).
                    // Definition of _affectedRange.start: All items in the set of data with indices < _affectedRange.start have not been directly modified.
                    // Definition of _affectedRange.end: All items in the set of data with indices >= _affectedRange.end have not been directly modified.

                    if (!this._notificationHandler.affectedRange) {
                        return;
                    }

                    //[newStart, newEnd)
                    var newStart = index;
                    var newEnd = (operation !== "removed") ?
                        index + 1 : index;

                    if (this._affectedRange) {
                        switch (operation) {
                            case "inserted":
                                if (index <= this._affectedRange.end) {
                                    ++this._affectedRange.end;
                                }
                                break;
                            case "removed":
                                if (index < this._affectedRange.end) {
                                    --this._affectedRange.end;
                                }
                                break;
                            case "moved":
                            case "changed":
                                break;
                        }
                        this._affectedRange.start = Math.min(this._affectedRange.start, newStart);
                        this._affectedRange.end = Math.max(this._affectedRange.end, newEnd);
                    } else {
                        // Handle the initial state
                        this._affectedRange = { start: newStart, end: newEnd };
                    }
                },

                _notifyAffectedRange: function ListBinding_notifyAffectedRange() {
                    if (this._affectedRange) {
                        if (this._notificationHandler && this._notificationHandler.affectedRange) {
                            this._notificationHandler.affectedRange(this._affectedRange);
                        }
                        // reset range
                        this._affectedRange = null;
                    }
                },
                _notifyCountChanged: function () {
                    var oldCount = this._countAtBeginEdits;
                    var newCount = this._list.length;
                    if (oldCount !== newCount) {
                        var handler = this._notificationHandler;
                        if (handler && handler.countChanged) {
                            handler.countChanged(newCount, oldCount);
                        }
                    }
                },
                _notifyIndicesChanged: function () {
                    var retained = this._retained;
                    for (var i = 0, len = retained.length; i < len; i++) {
                        var item = retained[i];
                        if (item && item.index !== i) {
                            var newIndex = i;
                            var oldIndex = item.index;
                            item.index = newIndex;
                            var handler = this._notificationHandler;
                            if (handler && handler.indexChanged) {
                                handler.indexChanged(item.key, newIndex, oldIndex);
                            }
                        }
                    }
                },
                _notifyMoved: function () {
                    var retained = this._retained;
                    for (var i = 0, len = retained.length; i < len; i++) {
                        var item = retained[i];
                        if (item && item._moved) {
                            item._moved = false;
                            this._release(item, i);
                            if (this._shouldNotify(i)) {
                                var handler = this._notificationHandler;
                                if (handler && handler.moved) {
                                    handler.moved(
                                        wrap(this, item),
                                        findPreviousKey(this._list, i),
                                        findNextKey(this._list, i)
                                    );
                                }
                            }
                        }
                    }
                },

                _beginEdits: function (length, explicit) {
                    this._editsCount++;
                    var handler = this._notificationHandler;
                    if (this._editsCount === 1 && handler) {
                        if (!explicit) {
                            // Batch all edits between now and the job running. This has the effect
                            // of batching synchronous edits.
                            //
                            this._editsCount++;
                            var that = this;
                            Scheduler.schedule(function BindingList_async_batchedEdits() {
                                that._endEdits();
                            }, Scheduler.Priority.high, null, "WinJS.Binding.List._endEdits");
                        }
                        if (handler.beginNotifications) {
                            handler.beginNotifications();
                        }
                        this._countAtBeginEdits = length;
                    }
                },
                _endEdits: function () {
                    this._editsCount--;
                    var handler = this._notificationHandler;
                    if (this._editsCount === 0 && handler) {
                        this._notifyIndicesChanged();
                        this._notifyMoved();
                        this._notifyCountChanged();
                        // It's important to notify the affectedRange after _notifyCountChanged since we expect developers
                        // may take a dependancy on the count being up to date when they recieve the affected range.
                        this._notifyAffectedRange();
                        if (handler.endNotifications) {
                            handler.endNotifications();
                        }
                    }
                },

                jumpToItem: function (item) {
                    var index = this._list.indexOfKey(item.handle);
                    if (index === -1) {
                        return Promise.wrap(null);
                    }
                    this._pos = index;
                    return this.current();
                },
                current: function () {
                    return this.fromIndex(this._pos);
                },
                previous: function () {
                    this._pos = Math.max(-1, this._pos - 1);
                    return this._fromIndex(this._pos, true, "previous");
                },
                next: function () {
                    this._pos = Math.min(this._pos + 1, this._list.length);
                    return this._fromIndex(this._pos, true, "next");
                },
                releaseItem: function (item) {
                    if (item.release) {
                        item.release();
                    } else {
                        this._release(item, this._list.indexOfKey(item.key));
                    }
                },
                release: function () {
                    if (this._notificationHandler) {
                        unsubscribe(this._list, this._handlers);
                    }
                    this._notificationHandler = null;
                    this._dataSource._releaseBinding(this);
                    this._released = true;
                },
                first: function () {
                    return this.fromIndex(0);
                },
                last: function () {
                    return this.fromIndex(this._list.length - 1);
                },
                fromKey: function (key) {
                    var retainedKeys = this._retainedKeys;
                    var item;
                    if (key in retainedKeys) {
                        item = retainedKeys[key];
                    } else {
                        item = cloneWithIndex(this._list, this._list.getItemFromKey(key), this._list.indexOfKey(key));
                    }
                    return wrap(this, item);
                },
                fromIndex: function (index) {
                    return this._fromIndex(index, false, "fromIndex");
                },
                _fromIndex: function (index, async, name) {
                    var retained = this._retained;
                    var item;
                    if (index in retained) {
                        item = retained[index];
                    } else {
                        item = cloneWithIndex(this._list, this._list.getItem(index), index);
                    }
                    return async ? wrapAsync(this, item, name) : wrap(this, item);
                },
            }, {
                supportedForProcessing: false,
            });

            function insertAtStart(unused, data) {
                /*jshint validthis: true */
                // List ignores the key because its key management is internal
                this._list.unshift(data);
                return this.itemFromIndex(0);
            }
            function insertBefore(unused, data, nextKey) {
                /*jshint validthis: true */
                // List ignores the key because its key management is internal
                var index = this._list.indexOfKey(nextKey);
                if (index === -1) {
                    return errors.noLongerMeaningful;
                }
                this._list.splice(index, 0, data);
                return this.itemFromIndex(index);
            }
            function insertAfter(unused, data, previousKey) {
                /*jshint validthis: true */
                // List ignores the key because its key management is internal
                var index = this._list.indexOfKey(previousKey);
                if (index === -1) {
                    return errors.noLongerMeaningful;
                }
                index += 1;
                this._list.splice(index, 0, data);
                return this.itemFromIndex(index);
            }
            function insertAtEnd(unused, data) {
                /*jshint validthis: true */
                // List ignores the key because its key management is internal
                this._list.push(data);
                return this.itemFromIndex(this._list.length - 1);
            }
            function change(key, newData) {
                /*jshint validthis: true */
                var index = this._list.indexOfKey(key);
                if (index === -1) {
                    return errors.noLongerMeaningful;
                }
                this._list.setAt(index, newData);
                return this.itemFromIndex(index);
            }
            function moveToStart(key) {
                /*jshint validthis: true */
                var sourceIndex = this._list.indexOfKey(key);
                if (sourceIndex === -1) {
                    return errors.noLongerMeaningful;
                }
                var targetIndex = 0;
                this._list.move(sourceIndex, targetIndex);
                return this.itemFromIndex(targetIndex);
            }
            function moveBefore(key, nextKey) {
                /*jshint validthis: true */
                var sourceIndex = this._list.indexOfKey(key);
                var targetIndex = this._list.indexOfKey(nextKey);
                if (sourceIndex === -1 || targetIndex === -1) {
                    return errors.noLongerMeaningful;
                }
                targetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
                this._list.move(sourceIndex, targetIndex);
                return this.itemFromIndex(targetIndex);
            }
            function moveAfter(key, previousKey) {
                /*jshint validthis: true */
                var sourceIndex = this._list.indexOfKey(key);
                var targetIndex = this._list.indexOfKey(previousKey);
                if (sourceIndex === -1 || targetIndex === -1) {
                    return errors.noLongerMeaningful;
                }
                targetIndex = sourceIndex <= targetIndex ? targetIndex : targetIndex + 1;
                this._list.move(sourceIndex, targetIndex);
                return this.itemFromIndex(targetIndex);
            }
            function moveToEnd(key) {
                /*jshint validthis: true */
                var sourceIndex = this._list.indexOfKey(key);
                if (sourceIndex === -1) {
                    return errors.noLongerMeaningful;
                }
                var targetIndex = this._list.length - 1;
                this._list.move(sourceIndex, targetIndex);
                return this.itemFromIndex(targetIndex);
            }
            function remove(key) {
                /*jshint validthis: true */
                var index = this._list.indexOfKey(key);
                if (index === -1) {
                    return errors.noLongerMeaningful;
                }
                this._list.splice(index, 1);
                return Promise.wrap();
            }

            var bindingId = 0;
            var DataSource = _Base.Class.define(function DataSource_ctor(list) {
                this._usingWeakRef = _BaseUtils.hasWinRT && _Global.msSetWeakWinRTProperty && _Global.msGetWeakWinRTProperty;
                this._bindings = {};
                this._list = list;

                if (list.unshift) {
                    this.insertAtStart = insertAtStart;
                }
                if (list.push) {
                    this.insertAtEnd = insertAtEnd;
                }
                if (list.setAt) {
                    this.change = change;
                }
                if (list.splice) {
                    this.insertAfter = insertAfter;
                    this.insertBefore = insertBefore;
                    this.remove = remove;
                }
                if (list.move) {
                    this.moveAfter = moveAfter;
                    this.moveBefore = moveBefore;
                    this.moveToEnd = moveToEnd;
                    this.moveToStart = moveToStart;
                }
            }, {
                _releaseBinding: function (binding) {
                    delete this._bindings[binding._id];
                },

                addEventListener: function () {
                    // nop, we don't send statusChanged
                },
                removeEventListener: function () {
                    // nop, we don't send statusChanged
                },

                createListBinding: function (notificationHandler) {
                    var id = "ds_" + (++bindingId);
                    var binding = new ListBinding(this, this._list, notificationHandler, id);
                    binding._id = id;

                    if (this._usingWeakRef) {
                        _DomWeakRefTable._createWeakRef(binding, id);
                        this._bindings[id] = id;
                    } else {
                        this._bindings[id] = binding;
                    }

                    return binding;
                },

                getCount: function () {
                    return Promise.wrap(this._list.length);
                },

                itemFromKey: function (key) {
                    // Clone with a dummy index
                    var list = this._list,
                        item = cloneWithIndex(list, list.getItemFromKey(key), -1);

                    // Override the index property with a getter
                    Object.defineProperty(item, "index", {
                        get: function () {
                            return list.indexOfKey(key);
                        },
                        enumerable: false,
                        configurable: true
                    });

                    return Promise.wrap(item);
                },
                itemFromIndex: function (index) {
                    return Promise.wrap(cloneWithIndex(this._list, this._list.getItem(index), index));
                },

                list: {
                    get: function () { return this._list; }
                },

                beginEdits: function () {
                    var length = this._list.length;
                    this._forEachBinding(function (binding) {
                        binding._beginEdits(length, true);
                    });
                },
                endEdits: function () {
                    this._forEachBinding(function (binding) {
                        binding._endEdits();
                    });
                },
                _forEachBinding: function (callback) {
                    if (this._usingWeakRef) {
                        var toBeDeleted = [];
                        Object.keys(this._bindings).forEach(function (id) {
                            var lb = _DomWeakRefTable._getWeakRefElement(id);
                            if (lb) {
                                callback(lb);
                            } else {
                                toBeDeleted.push(id);
                            }
                        });
                        for (var i = 0, len = toBeDeleted.length; i < len; i++) {
                            delete this._bindings[toBeDeleted[i]];
                        }
                    } else {
                        var that = this;
                        Object.keys(this._bindings).forEach(function (id) {
                            callback(that._bindings[id]);
                        });
                    }
                },

                invalidateAll: function () {
                    return Promise.wrap();
                },

                //
                // insert* and change are not implemented as I don't understand how they are 
                //  used by the controls since it is hard to fathom how they would be able
                //  to make up unique keys. Manual editing of the List is meant to go through
                //  the list itself.
                //
                // move* are implemented only if the underlying list supports move(). The 
                //  GroupsListProjection for instance does not.
                //
                moveAfter: undefined,
                moveBefore: undefined,
                moveToEnd: undefined,
                moveToStart: undefined

            }, {
                supportedForProcessing: false,
            });
            return DataSource;
        })
    });

});
