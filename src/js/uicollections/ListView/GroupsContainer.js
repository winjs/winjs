/*
Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved.

Licensed under the Apache License, Version 2.0.

See License.txt in the project root for license information.
*/

﻿(function groupsContainerInit(global, WinJS, undefined) {
    "use strict";

    var utilities = WinJS.Utilities,
        Promise = WinJS.Promise;

    WinJS.Namespace.define("WinJS.UI", {
        _GroupsContainerBase: WinJS.Namespace._lazy(function () {
            return WinJS.Class.define(function () {
            }, {
                index: function (element) {
                    var header = this.headerFrom(element);
                    if (header) {
                        for (var i = 0, len = this.groups.length; i < len; i++) {
                            if (header === this.groups[i].header) {
                                return i;
                            }
                        }
                    }
                    return WinJS.UI._INVALID_INDEX;
                },

                headerFrom: function (element) {
                    while (element && !utilities.hasClass(element, WinJS.UI._headerClass)) {
                        element = element.parentNode;
                    }
                    return element;
                },

                requestHeader: function GroupsContainerBase_requestHeader(index) {
                    this._waitingHeaderRequests = this._waitingHeaderRequests || {};
                    if (!this._waitingHeaderRequests[index]) {
                        this._waitingHeaderRequests[index] = [];
                    }

                    var that = this;
                    return new Promise(function (complete, error) {
                        var group = that.groups[index];
                        if (group && group.header) {
                            complete(group.header);
                        } else {
                            that._waitingHeaderRequests[index].push(complete);
                        }
                    });
                },

                notify: function GroupsContainerBase_notify(index, header) {
                    if (this._waitingHeaderRequests && this._waitingHeaderRequests[index]) {
                        var requests = this._waitingHeaderRequests[index];
                        for (var i = 0, len = requests.length; i < len; i++) {
                            requests[i](header);
                        }

                        this._waitingHeaderRequests[index] = [];
                    }
                },

                groupFromImpl: function GroupsContainerBase_groupFromImpl(fromGroup, toGroup, comp) {
                    if (toGroup < fromGroup) {
                        return null;
                    }

                    var center = fromGroup + Math.floor((toGroup - fromGroup) / 2),
                        centerGroup = this.groups[center];

                    if (comp(centerGroup, center)) {
                        return this.groupFromImpl(fromGroup, center - 1, comp);
                    } else if (center < toGroup && !comp(this.groups[center + 1], center + 1)) {
                        return this.groupFromImpl(center + 1, toGroup, comp);
                    } else {
                        return center;
                    }
                },

                groupFrom: function GroupsContainerBase_groupFrom(comp) {
                    //#DBG _ASSERT(this.assertValid());
                    if (this.groups.length > 0) {
                        var lastGroupIndex = this.groups.length - 1,
                            lastGroup = this.groups[lastGroupIndex];

                        if (!comp(lastGroup, lastGroupIndex)) {
                            return lastGroupIndex;
                        } else {
                            return this.groupFromImpl(0, this.groups.length - 1, comp);
                        }
                    } else {
                        return null;
                    }
                },

                groupFromItem: function GroupsContainerBase_groupFromItem(itemIndex) {
                    return this.groupFrom(function (group) {
                        return itemIndex < group.startIndex;
                    });
                },

                groupFromOffset: function GroupsContainerBase_groupFromOffset(offset) {
                    //#DBG _ASSERT(this.assertValid());
                    return this.groupFrom(function (group, groupIndex) {
                        //#DBG _ASSERT(group.offset !== undefined);
                        return offset < group.offset;
                    });
                },

                group: function GroupsContainerBase_getGroup(index) {
                    return this.groups[index];
                },

                length: function GroupsContainerBase_length() {
                    return this.groups.length;
                },

                cleanUp: function GroupsContainerBase_cleanUp() {
                    if (this.listBinding) {
                        for (var i = 0, len = this.groups.length; i < len; i++) {
                            var group = this.groups[i];
                            if (group.userData) {
                                this.listBinding.releaseItem(group.userData);
                            }
                        }
                        this.listBinding.release();
                    }
                },

                _dispose: function GroupsContainerBase_dispose() {
                    this.cleanUp();
                },

                /*#DBG
                assertValid: function () {
                if (WinJS.validation) {
                if (this.groups.length) {
                var prevIndex = this.groups[0].startIndex,
                prevKey = this.groups[0].key,
                keys = {};
            
                //#DBG _ASSERT(prevIndex === 0);
                keys[prevKey] = true;
            
                for (var i = 1, len = this.groups.length; i < len; i++) {
                var group = this.groups[i];
                //#DBG _ASSERT(group.startIndex > prevIndex);
                prevIndex = group.startIndex;
            
                //#DBG _ASSERT(!keys[group.key]);
                keys[group.key] = true;
            
                prevKey = group.key;
                }
                }
                }
                return  true;
                },
                #DBG*/

                synchronizeGroups: function GroupsContainerBase_synchronizeGroups() {
                    var that = this;

                    this.pendingChanges = [];
                    this.ignoreChanges = true;
                    return this.groupDataSource.invalidateAll().then(function () {
                        return Promise.join(that.pendingChanges);
                    }).then(function () {
                        if (that._listView._ifZombieDispose()) {
                            return WinJS.Promise.cancel;
                        }
                    }).then(
                        function () {
                            that.ignoreChanges = false;
                        },
                        function (error) {
                            that.ignoreChanges = false;
                            return WinJS.Promise.wrapError(error);
                        }
                    );
                },

                fromKey: function GroupsContainerBase_fromKey(key) {
                    for (var i = 0, len = this.groups.length; i < len; i++) {
                        var group = this.groups[i];
                        if (group.key === key) {
                            return {
                                group: group,
                                index: i
                            }
                        }
                    }
                    return null;
                },

                fromHandle: function GroupsContainerBase_fromHandle(handle) {
                    for (var i = 0, len = this.groups.length; i < len; i++) {
                        var group = this.groups[i];
                        if (group.handle === handle) {
                            return {
                                group: group,
                                index: i
                            }
                        }
                    }
                    return null;
                }
            });
        }),

        _UnvirtualizedGroupsContainer: WinJS.Namespace._lazy(function () {
            return WinJS.Class.derive(WinJS.UI._GroupsContainerBase, function (listView, groupDataSource) {
                this._listView = listView;
                this.groupDataSource = groupDataSource;
                this.groups = [];
                this.pendingChanges = [];
                this.dirty = true;

                var that = this,
                notificationHandler = {
                    beginNotifications: function GroupsContainer_beginNotifications() {
                        that._listView._versionManager.beginNotifications();
                    },

                    endNotifications: function GroupsContainer_endNotifications() {
                        //#DBG _ASSERT(that.assertValid());
                        that._listView._versionManager.endNotifications();

                        if (that._listView._ifZombieDispose()) { return; }

                        if (!that.ignoreChanges && that._listView._groupsChanged) {
                            that._listView._scheduleUpdate();
                        }
                    },

                    indexChanged: function GroupsContainer_indexChanged(item, newIndex, oldIndex) {
                        that._listView._versionManager.receivedNotification();

                        if (that._listView._ifZombieDispose()) { return; }

                        this.scheduleUpdate();
                    },

                    itemAvailable: function GroupsContainer_itemAvailable(item, placeholder) {
                    },

                    countChanged: function GroupsContainer_countChanged(newCount, oldCount) {
                        that._listView._versionManager.receivedNotification();

                        that._listView._writeProfilerMark("groupCountChanged(" + newCount + "),info");

                        if (that._listView._ifZombieDispose()) { return; }

                        this.scheduleUpdate();
                    },

                    changed: function GroupsContainer_changed(newItem, oldItem) {
                        that._listView._versionManager.receivedNotification();

                        if (that._listView._ifZombieDispose()) { return; }

                        //#DBG _ASSERT(newItem.key == oldItem.key);
                        var groupEntry = that.fromKey(newItem.key);
                        if (groupEntry) {
                            that._listView._writeProfilerMark("groupChanged(" + groupEntry.index + "),info");

                            groupEntry.group.userData = newItem;
                            groupEntry.group.startIndex = newItem.firstItemIndexHint;
                            //#DBG _ASSERT(that.assertValid());
                            this.markToRemove(groupEntry.group);
                        }

                        this.scheduleUpdate();
                    },

                    removed: function GroupsContainer_removed(itemHandle, mirage) {
                        that._listView._versionManager.receivedNotification();
                        that._listView._groupRemoved(itemHandle);

                        if (that._listView._ifZombieDispose()) { return; }

                        var groupEntry = that.fromHandle(itemHandle);
                        if (groupEntry) {
                            that._listView._writeProfilerMark("groupRemoved(" + groupEntry.index + "),info");

                            that.groups.splice(groupEntry.index, 1);
                            var index = that.groups.indexOf(groupEntry.group, groupEntry.index);

                            if (index > -1) {
                                that.groups.splice(index, 1);
                            }

                            //#DBG _ASSERT(that.assertValid());
                            this.markToRemove(groupEntry.group);
                        }

                        this.scheduleUpdate();
                    },

                    inserted: function GroupsContainer_inserted(itemPromise, previousHandle, nextHandle) {
                        that._listView._versionManager.receivedNotification();

                        if (that._listView._ifZombieDispose()) { return; }

                        that._listView._writeProfilerMark("groupInserted,info");

                        var notificationHandler = this;
                        itemPromise.retain().then(function (item) {
                            //#DBG _ASSERT(!that.fromKey(item.key))

                            var index;
                            if (!previousHandle && !nextHandle && !that.groups.length) {
                                index = 0;
                            } else {
                                index = notificationHandler.findIndex(previousHandle, nextHandle);
                            }
                            if (index !== -1) {
                                var newGroup = {
                                    key: item.key,
                                    startIndex: item.firstItemIndexHint,
                                    userData: item,
                                    handle: itemPromise.handle
                                };

                                that.groups.splice(index, 0, newGroup);
                            }
                            notificationHandler.scheduleUpdate();
                        });
                        that.pendingChanges.push(itemPromise);
                    },

                    moved: function GroupsContainer_moved(itemPromise, previousHandle, nextHandle) {
                        that._listView._versionManager.receivedNotification();

                        if (that._listView._ifZombieDispose()) { return; }

                        that._listView._writeProfilerMark("groupMoved,info");

                        var notificationHandler = this;
                        itemPromise.then(function (item) {
                            var newIndex = notificationHandler.findIndex(previousHandle, nextHandle),
                                groupEntry = that.fromKey(item.key);

                            if (groupEntry) {
                                that.groups.splice(groupEntry.index, 1);

                                if (newIndex !== -1) {
                                    if (groupEntry.index < newIndex) {
                                        newIndex--;
                                    }

                                    groupEntry.group.key = item.key;
                                    groupEntry.group.userData = item;
                                    groupEntry.group.startIndex = item.firstItemIndexHint;
                                    that.groups.splice(newIndex, 0, groupEntry.group);
                                }

                            } else if (newIndex !== -1) {
                                var newGroup = {
                                    key: item.key,
                                    startIndex: item.firstItemIndexHint,
                                    userData: item,
                                    handle: itemPromise.handle
                                };
                                that.groups.splice(newIndex, 0, newGroup);
                                itemPromise.retain();
                            }

                            //#DBG _ASSERT(that.assertValid());
                            notificationHandler.scheduleUpdate();
                        });
                        that.pendingChanges.push(itemPromise);
                    },

                    reload: function GroupsContainer_reload() {
                        that._listView._versionManager.receivedNotification();

                        if (that._listView._ifZombieDispose()) {
                            return;
                        }

                        that._listView._processReload();
                    },

                    markToRemove: function GroupsContainer_markToRemove(group) {
                        if (group.header) {
                            var header = group.header;
                            group.header = null;
                            group.left = -1;
                            group.width = -1;
                            group.decorator = null;
                            group.tabIndex = -1;
                            header.tabIndex = -1;

                            that._listView._groupsToRemove[WinJS.Utilities._uniqueID(header)] = { group: group, header: header };
                        }
                    },

                    scheduleUpdate: function GroupsContainer_scheduleUpdate() {
                        that.dirty = true;
                        if (!that.ignoreChanges) {
                            that._listView._groupsChanged = true;
                        }
                    },

                    findIndex: function GroupsContainer_findIndex(previousHandle, nextHandle) {
                        var index = -1,
                            groupEntry;

                        if (previousHandle) {
                            groupEntry = that.fromHandle(previousHandle);
                            if (groupEntry) {
                                index = groupEntry.index + 1;
                            }
                        }

                        if (index === -1 && nextHandle) {
                            groupEntry = that.fromHandle(nextHandle);
                            if (groupEntry) {
                                index = groupEntry.index;
                            }
                        }

                        return index;
                    },

                    removeElements: function GroupsContainer_removeElements(group) {
                        if (group.header) {
                            var parentNode = group.header.parentNode;
                            if (parentNode) {
                                WinJS.Utilities.disposeSubTree(group.header);
                                parentNode.removeChild(group.header);
                            }
                            group.header = null;
                            group.left = -1;
                            group.width = -1;
                        }
                    }
                };

                this.listBinding = this.groupDataSource.createListBinding(notificationHandler);
            }, {
                initialize: function UnvirtualizedGroupsContainer_initialize() {
                    if (this.initializePromise) {
                        this.initializePromise.cancel();
                    }

                    this._listView._writeProfilerMark("GroupsContainer_initialize,StartTM");

                    var that = this;
                    this.initializePromise = this.groupDataSource.getCount().then(function (count) {
                        var promises = [];
                        for (var i = 0; i < count; i++) {
                            promises.push(that.listBinding.fromIndex(i).retain());
                        }
                        return Promise.join(promises);
                    }).then(
                        function (groups) {
                            that.groups = [];

                            for (var i = 0, len = groups.length; i < len; i++) {
                                var group = groups[i];

                                that.groups.push({
                                    key: group.key,
                                    startIndex: group.firstItemIndexHint,
                                    handle: group.handle,
                                    userData: group,
                                });
                            }
                            that._listView._writeProfilerMark("GroupsContainer_initialize groups(" + groups.length + "),info");
                            that._listView._writeProfilerMark("GroupsContainer_initialize,StopTM");
                        },
                        function (error) {
                            that._listView._writeProfilerMark("GroupsContainer_initialize,StopTM");
                            return WinJS.Promise.wrapError(error);
                        });
                    return this.initializePromise;
                },

                renderGroup: function UnvirtualizedGroupsContainer_renderGroup(index) {
                    if (this._listView.groupHeaderTemplate) {
                        var group = this.groups[index];
                        return Promise.wrap(this._listView._groupHeaderRenderer(Promise.wrap(group.userData))).then(WinJS.UI._normalizeRendererReturn);
                    } else {
                        return Promise.wrap(null);
                    }
                },

                setDomElement: function UnvirtualizedGroupsContainer_setDomElement(index, headerElement) {
                    this.groups[index].header = headerElement;
                    this.notify(index, headerElement);
                },

                removeElements: function UnvirtualizedGroupsContainer_removeElements() {
                    var elements = this._listView._groupsToRemove || {},
                        keys = Object.keys(elements),
                        focusedItemPurged = false;

                    var focused = this._listView._selection._getFocused();
                    for (var i = 0, len = keys.length; i < len; i++) {
                        var group = elements[keys[i]],
                            header = group.header,
                            groupData = group.group;

                        if (!focusedItemPurged && focused.type === WinJS.UI.ObjectType.groupHeader && groupData.userData.index === focused.index) {
                            this._listView._unsetFocusOnItem();
                            focusedItemPurged = true;
                        }

                        if (header) {
                            var parentNode = header.parentNode;
                            if (parentNode) {
                                WinJS.Utilities._disposeElement(header);
                                parentNode.removeChild(header);
                            }
                        }
                    }

                    if (focusedItemPurged) {
                        this._listView._setFocusOnItem(focused);
                    }

                    this._listView._groupsToRemove = {};
                },

                resetGroups: function UnvirtualizedGroupsContainer_resetGroups() {
                    var groups = this.groups.slice(0);

                    for (var i = 0, len = groups.length; i < len; i++) {
                        var group = groups[i];

                        if (this.listBinding && group.userData) {
                            this.listBinding.releaseItem(group.userData);
                        }
                    }

                    // Set the lengths to zero to clear the arrays, rather than setting = [], which re-instantiates
                    this.groups.length = 0;
                    this.dirty = true;
                }
            });
        }),

        _NoGroups: WinJS.Namespace._lazy(function () {
            return WinJS.Class.derive(WinJS.UI._GroupsContainerBase, function (listView) {
                this._listView = listView;
                this.groups = [{ startIndex: 0 }];
                this.dirty = true;
            }, {
                synchronizeGroups: function () {
                    return WinJS.Promise.wrap();
                },

                addItem: function (itemIndex, itemPromise) {
                    return WinJS.Promise.wrap(this.groups[0]);
                },

                resetGroups: function () {
                    this.groups = [{ startIndex: 0 }];
                    delete this.pinnedItem;
                    delete this.pinnedOffset;
                    this.dirty = true;
                },

                renderGroup: function () {
                    return WinJS.Promise.wrap(null);
                },

                ensureFirstGroup: function () {
                    return WinJS.Promise.wrap(this.groups[0]);
                },

                groupOf: function (item) {
                    return WinJS.Promise.wrap(this.groups[0]);
                },

                removeElements: function () {
                }
            });
        })
    });

})(this, WinJS);
