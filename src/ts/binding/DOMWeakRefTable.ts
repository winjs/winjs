// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function DOMWeakRefTableInit(global) {
    "use strict";

    if (WinJS.Utilities.hasWinRT && global.msSetWeakWinRTProperty && global.msGetWeakWinRTProperty) {

        var host = new Windows.Foundation.Uri("about://blank");

        WinJS.Namespace.define("WinJS.Utilities", {

            _createWeakRef: function (element, id) {
                msSetWeakWinRTProperty(host, id, element);
                return id;
            },

            _getWeakRefElement: function (id) {
                return msGetWeakWinRTProperty(host, id);
            }

        });

        return;

    }

    var U = WinJS.Utilities;

    // Defaults 
    var SWEEP_PERIOD = 500;
    var TIMEOUT = 1000;
    var table = {};
    var cleanupToken;

    function cleanup() {
        if (U._DOMWeakRefTable_sweepPeriod === 0) {     // If we're using post
            cleanupToken = 0;                           // indicate that cleanup has run
        }
        var keys = Object.keys(table);
        var time = Date.now() - U._DOMWeakRefTable_timeout;
        var i, len;
        for (i = 0, len = keys.length; i < len; i++) {
            var id = keys[i];
            if (table[id].time < time) {
                delete table[id];
            }
        }
        unscheduleCleanupIfNeeded();
    }

    function scheduleCleanupIfNeeded() {
        if ((global.Debug && Debug.debuggerEnabled && U._DOMWeakRefTable_noTimeoutUnderDebugger) || cleanupToken) {
            return;
        }
        var period = U._DOMWeakRefTable_sweepPeriod;
        if (period === 0) {
            WinJS.Utilities.Scheduler.schedule(cleanup, WinJS.Utilities.Scheduler.Priority.idle, null, "WinJS.Utilities._DOMWeakRefTable.cleanup");
            cleanupToken = 1;
        } else {
            cleanupToken = setInterval(cleanup, U._DOMWeakRefTable_sweepPeriod);
        }
    }

    function unscheduleCleanupIfNeeded() {
        if (global.Debug && Debug.debuggerEnabled && U._DOMWeakRefTable_noTimeoutUnderDebugger) {
            return;
        }
        var period = U._DOMWeakRefTable_sweepPeriod;
        if (period === 0) {                                 // if we're using post
            if (!cleanupToken) {                            // and there isn't already one scheduled
                if (Object.keys(table).length !== 0) {      // and there are items in the table
                    WinJS.Utilities.Scheduler.schedule(     // schedule another call to cleanup
                        cleanup,
                        WinJS.Utilities.Scheduler.Priority.idle,
                        null, "WinJS.Utilities._DOMWeakRefTable.cleanup"
                    );           
                    cleanupToken = 1;                       // and protect against overscheduling
                }
            }
        } else if (cleanupToken) {
            if (Object.keys(table).length === 0) {
                clearInterval(cleanupToken);
                cleanupToken = 0;
            }
        }
    }

    function createWeakRef(element, id) {
        table[id] = { element: element, time: Date.now() };
        scheduleCleanupIfNeeded();
        return id;
    }

    function getWeakRefElement(id) {
        if (WinJS.Utilities._DOMWeakRefTable_fastLoadPath) {
            var entry = table[id];
            if (entry) {
                return entry.element;
            }
            else {
                return document.getElementById(id);
            }
        }
        else {
            var element = document.getElementById(id);
            if (element) {
                delete table[id];
                unscheduleCleanupIfNeeded();
            } else {
                var entry = table[id];
                if (entry) {
                    entry.time = Date.now();
                    element = entry.element;
                }
            }
            return element;
        }
    }

    WinJS.Namespace.define("WinJS.Utilities", {
        _DOMWeakRefTable_noTimeoutUnderDebugger: true,
        _DOMWeakRefTable_sweepPeriod: SWEEP_PERIOD,
        _DOMWeakRefTable_timeout: TIMEOUT,
        _DOMWeakRefTable_tableSize: { get: function () { return Object.keys(table).length; } },
        _DOMWeakRefTable_fastLoadPath: false,
        _createWeakRef: createWeakRef,
        _getWeakRefElement: getWeakRefElement

    });

})(this);
