// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function versionManagerInit(global) {
    "use strict";

    WinJS.Namespace.define("WinJS.UI", {
        _VersionManager: WinJS.Namespace._lazy(function () {
            return WinJS.Class.define(function _VersionManager_ctor() {
                this._unlocked = new WinJS._Signal();
                this._unlocked.complete();
            }, {
                _cancelCount: 0,
                _notificationCount: 0,
                _updateCount: 0,
                _version: 0,

                // This should be used generally for all logic that should be suspended while data changes are happening
                //
                locked: { get: function () { return this._notificationCount !== 0 || this._updateCount !== 0; } },

                // this should only be accessed by the update logic in ListViewImpl.js
                //
                noOutstandingNotifications: { get: function () { return this._notificationCount === 0; } },
                version: { get: function () { return this._version; } },

                unlocked: { get: function () { return this._unlocked.promise; } },

                _dispose: function () {
                    if (this._unlocked) {
                        this._unlocked.cancel();
                        this._unlocked = null;
                    }
                },

                beginUpdating: function () {
                    this._checkLocked();
                    /*#DBG
                    if (this._updateCount !== 0) {
                        throw "ACK! incorrect begin/endUpdating pair on version manager";
                    }
                    #DBG*/
                    this._updateCount++;
                },
                endUpdating: function() {
                    this._updateCount--;
                    /*#DBG
                    if (this._updateCount < 0) {
                        throw "ACK! incorrect begin/endUpdating pair on version manager";
                    }
                    #DBG*/
                    this._checkUnlocked();
                },
                beginNotifications: function () {
                    this._checkLocked();
                    this._notificationCount++;
                },
                endNotifications: function () {
                    this._notificationCount--;
                    /*#DBG
                    if (this._notificationCount < 0) {
                        throw "ACK! incorrect begin/endNotifications pair on version manager";
                    }
                    #DBG*/
                    this._checkUnlocked();
                },
                _checkLocked: function () {
                    if (!this.locked) {
                        this._dispose();
                        this._unlocked = new WinJS._Signal();
                    }
                },
                _checkUnlocked: function () {
                    if (!this.locked) {
                        this._unlocked.complete();
                    }
                },
                receivedNotification: function () {
                    this._version++;
                    if (this._cancel) {
                        var cancel = this._cancel;
                        this._cancel = null;
                        cancel.forEach(function (p) { p && p.cancel(); });
                    }
                },
                cancelOnNotification: function (promise) {
                    if (!this._cancel) {
                        this._cancel = [];
                        this._cancelCount = 0;
                    }
                    this._cancel[this._cancelCount++] = promise;
                    return this._cancelCount - 1;
                },
                clearCancelOnNotification: function (token) {
                    if (this._cancel) {
                        delete this._cancel[token];
                    }
                }
            }, {
                supportedForProcessing: false,
            });
        })
    });

})();

