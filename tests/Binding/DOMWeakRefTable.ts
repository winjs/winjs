// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

module CorsicaTests {

    "use strict";

    function onError(e) {
        try {
            LiveUnit.Assert.fail(e);
        } catch (ex) {
        }
    }

    var U = WinJS.Utilities;

    export class DOMWeakRefTable {

        testBasic(complete) {
            var id = "myElement";
            var content = "MyElementContent";

            // force cleanup on post and always clearing the table by
            // pushing the timeout into the future
            var previous_sweepPeriod = U._DOMWeakRefTable_sweepPeriod;
            var previous_timeout = U._DOMWeakRefTable_timeout;
            var previous_noTimeoutUnderDebugger = U._DOMWeakRefTable_noTimeoutUnderDebugger;
            U._DOMWeakRefTable_sweepPeriod = 0;
            U._DOMWeakRefTable_timeout = -1;
            U._DOMWeakRefTable_noTimeoutUnderDebugger = false;

            var element = document.createElement("div");
            element.id = id;
            element.textContent = content;
            U._createWeakRef(element, id);

            var element2 = U._getWeakRefElement(id);
            LiveUnit.Assert.areEqual(id, element2.id);
            LiveUnit.Assert.areEqual(content, element2.textContent);

            WinJS.Utilities.Scheduler.schedulePromiseIdle().
                then(function () {
                    var element3 = U._getWeakRefElement(id);
                    LiveUnit.Assert.isNull(element3);
                }).
                then(null, onError).
                then(function () {
                    U._DOMWeakRefTable_sweepPeriod = previous_sweepPeriod;
                    U._DOMWeakRefTable_timeout = previous_timeout;
                    U._DOMWeakRefTable_noTimeoutUnderDebugger = previous_noTimeoutUnderDebugger;
                }).
                then(complete);
        }

        testBasicAddingToDOM(complete) {
            var id = "myElement";
            var content = "MyElementContent";

            // force cleanup on post and always clearing the table by
            // pushing the timeout into the future
            var previous_sweepPeriod = U._DOMWeakRefTable_sweepPeriod;
            var previous_timeout = U._DOMWeakRefTable_timeout;
            var previous_noTimeoutUnderDebugger = U._DOMWeakRefTable_noTimeoutUnderDebugger;
            U._DOMWeakRefTable_sweepPeriod = 0;
            U._DOMWeakRefTable_timeout = -1;
            U._DOMWeakRefTable_noTimeoutUnderDebugger = false;

            var element = document.createElement("div");
            element.id = id;
            element.textContent = content;
            U._createWeakRef(element, id);
            LiveUnit.Assert.areEqual(1, U._DOMWeakRefTable_tableSize);

            document.body.appendChild(element);

            var element2 = U._getWeakRefElement(id);
            LiveUnit.Assert.areEqual(id, element2.id);
            LiveUnit.Assert.areEqual(content, element2.textContent);
            LiveUnit.Assert.areEqual(0, U._DOMWeakRefTable_tableSize);

            WinJS.Utilities.Scheduler.schedulePromiseIdle().
                then(function () {
                    var element3 = U._getWeakRefElement(id);
                    LiveUnit.Assert.areEqual(id, element2.id);
                    LiveUnit.Assert.areEqual(content, element2.textContent);
                    LiveUnit.Assert.areEqual(0, U._DOMWeakRefTable_tableSize);
                }).
                then(null, onError).
                then(function () {
                    document.body.removeChild(element);
                    U._DOMWeakRefTable_sweepPeriod = previous_sweepPeriod;
                    U._DOMWeakRefTable_timeout = previous_timeout;
                    U._DOMWeakRefTable_noTimeoutUnderDebugger = previous_noTimeoutUnderDebugger;
                }).
                then(complete);
        }

        testBasicAddingToDOMAndAgingOut(complete) {
            var id = "myElement";
            var content = "MyElementContent";

            // force cleanup on post and always clearing the table by
            // pushing the timeout into the future
            var previous_sweepPeriod = U._DOMWeakRefTable_sweepPeriod;
            var previous_timeout = U._DOMWeakRefTable_timeout;
            var previous_noTimeoutUnderDebugger = U._DOMWeakRefTable_noTimeoutUnderDebugger;
            U._DOMWeakRefTable_sweepPeriod = 0;
            U._DOMWeakRefTable_timeout = -1;
            U._DOMWeakRefTable_noTimeoutUnderDebugger = false;

            var element = document.createElement("div");
            element.id = id;
            element.textContent = content;
            U._createWeakRef(element, id);
            LiveUnit.Assert.areEqual(1, U._DOMWeakRefTable_tableSize);

            document.body.appendChild(element);

            WinJS.Utilities.Scheduler.schedulePromiseIdle().
                then(function () {
                    // The element should have aged out of the table by now
                    LiveUnit.Assert.areEqual(0, U._DOMWeakRefTable_tableSize);

                    var element3 = U._getWeakRefElement(id);
                    LiveUnit.Assert.areEqual(id, element3.id);
                    LiveUnit.Assert.areEqual(content, element3.textContent);
                }).
                then(null, onError).
                then(function () {
                    document.body.removeChild(element);
                    U._DOMWeakRefTable_sweepPeriod = previous_sweepPeriod;
                    U._DOMWeakRefTable_timeout = previous_timeout;
                    U._DOMWeakRefTable_noTimeoutUnderDebugger = previous_noTimeoutUnderDebugger;
                }).
                then(complete);
        }


        testBasicAddingToDOMAndAgingOutTimer(complete) {
            var id = "myElement";
            var content = "MyElementContent";

            // force cleanup on post and always clearing the table by
            // pushing the timeout into the future
            var previous_sweepPeriod = U._DOMWeakRefTable_sweepPeriod;
            var previous_timeout = U._DOMWeakRefTable_timeout;
            var previous_noTimeoutUnderDebugger = U._DOMWeakRefTable_noTimeoutUnderDebugger;
            U._DOMWeakRefTable_sweepPeriod = 4;
            U._DOMWeakRefTable_timeout = -1;
            U._DOMWeakRefTable_noTimeoutUnderDebugger = false;

            var element = document.createElement("div");
            element.id = id;
            element.textContent = content;
            U._createWeakRef(element, id);
            LiveUnit.Assert.areEqual(1, U._DOMWeakRefTable_tableSize);

            document.body.appendChild(element);

            // *4 is to ensure we get into the next frame...
            //
            WinJS.Promise.timeout(U._DOMWeakRefTable_sweepPeriod * 4).
                then(function () {
                    // The element should have aged out of the table by now
                    LiveUnit.Assert.areEqual(0, U._DOMWeakRefTable_tableSize);

                    var element3 = U._getWeakRefElement(id);
                    LiveUnit.Assert.areEqual(id, element3.id);
                    LiveUnit.Assert.areEqual(content, element3.textContent);
                }).
                then(null, onError).
                then(function () {
                    document.body.removeChild(element);
                    U._DOMWeakRefTable_sweepPeriod = previous_sweepPeriod;
                    U._DOMWeakRefTable_timeout = previous_timeout;
                    U._DOMWeakRefTable_noTimeoutUnderDebugger = previous_noTimeoutUnderDebugger;
                }).
                then(complete);
        }
    }
}

// If this condition is true we are using the built in weak refs.
if (!(WinJS.Utilities.hasWinRT && window['msSetWeakWinRTProperty'] && window['msGetWeakWinRTProperty'])) {
    LiveUnit.registerTestClass("CorsicaTests.DOMWeakRefTable");
}
