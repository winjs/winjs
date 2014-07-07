// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../Core/_Global',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Scheduler'
    ], function DOMWeakRefTableInit(exports, _Global, _WinRT, _Base, _BaseUtils, Scheduler) {
    "use strict";

    if (_WinRT.Windows.Foundation.Uri && _WinRT.msSetWeakWinRTProperty && _WinRT.msGetWeakWinRTProperty) {

        var host = new _WinRT.Windows.Foundation.Uri("about://blank");

        _Base.Namespace._moduleDefine(exports, "WinJS.Utilities", {

            _createWeakRef: function (element, id) {
                _WinRT.msSetWeakWinRTProperty(host, id, element);
                return id;
            },

            _getWeakRefElement: function (id) {
                return _WinRT.msGetWeakWinRTProperty(host, id);
            }

        });

        return;

    }

    // Defaults 
    var SWEEP_PERIOD = 500;
    var TIMEOUT = 1000;
    var table = {};
    var cleanupToken;
    var noTimeoutUnderDebugger = true;
    var fastLoadPath = false;

    function cleanup() {
        if (SWEEP_PERIOD === 0) {     // If we're using post
            cleanupToken = 0;          // indicate that cleanup has run
        }
        var keys = Object.keys(table);
        var time = Date.now() - TIMEOUT;
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
        if ((_Global.Debug && _Global.Debug.debuggerEnabled && noTimeoutUnderDebugger) || cleanupToken) {
            return;
        }
        if (SWEEP_PERIOD === 0) {
            Scheduler.schedule(cleanup, Scheduler.Priority.idle, null, "WinJS.Utilities._DOMWeakRefTable.cleanup");
            cleanupToken = 1;
        } else {
            cleanupToken = _Global.setInterval(cleanup, SWEEP_PERIOD);
        }
    }

    function unscheduleCleanupIfNeeded() {
        if (_Global.Debug && _Global.Debug.debuggerEnabled && noTimeoutUnderDebugger) {
            return;
        }
        if (SWEEP_PERIOD === 0) {                           // if we're using post
            if (!cleanupToken) {                            // and there isn't already one scheduled
                if (Object.keys(table).length !== 0) {      // and there are items in the table
                    Scheduler.schedule(     // schedule another call to cleanup
                        cleanup,
                        Scheduler.Priority.idle,
                        null, "WinJS.Utilities._DOMWeakRefTable.cleanup"
                    );
                    cleanupToken = 1;                       // and protect against overscheduling
                }
            }
        } else if (cleanupToken) {
            if (Object.keys(table).length === 0) {
                _Global.clearInterval(cleanupToken);
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
        if (fastLoadPath) {
            var entry = table[id];
            if (entry) {
                return entry.element;
            }
            else {
                return _Global.document.getElementById(id);
            }
        }
        else {
            var element = _Global.document.getElementById(id);
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

    _Base.Namespace._moduleDefine(exports, "WinJS.Utilities",  {
        _DOMWeakRefTable_noTimeoutUnderDebugger: {
            get: function() {
                return noTimeoutUnderDebugger;
            },
            set: function(value) {
                noTimeoutUnderDebugger = value;
            }
        },
        _DOMWeakRefTable_sweepPeriod: {
            get: function() {
                return SWEEP_PERIOD;
            },
            set: function(value) {
                SWEEP_PERIOD = value;
            }
        },
        _DOMWeakRefTable_timeout: {
            get: function() {
                return TIMEOUT;
            },
            set: function(value) {
                TIMEOUT = value;
            }
        },
        _DOMWeakRefTable_tableSize: { get: function () { return Object.keys(table).length; } },
        _DOMWeakRefTable_fastLoadPath: {
            get: function() {
                return fastLoadPath;
            },
            set: function(value) {
                fastLoadPath = value;
            }
        },
        _createWeakRef: createWeakRef,
        _getWeakRefElement: getWeakRefElement

    });

});