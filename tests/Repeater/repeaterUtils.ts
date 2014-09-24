// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.


class MyCustomControlForRepeater {
    element;
    _disposed = false;
    constructor(element?, options?) {
        this.element = element || document.createElement("div");
        this.element.winControl = this;
        this.element.classList.add("mycustomcontrolforrepeater");
        this.element.classList.add("win-disposable");
        WinJS.UI.setOptions(this, options || {});

    }

    dispose() {
        if (this._disposed) {
            return;
        }
        this._disposed = true;
    }

    static supportedForProcessing = true;

}

module repeaterUtils {
    "use strict";

    export function createSequentialData(lessThan, startWithOne?) {
        var data = [],
            start = startWithOne ? 1 : 0;

        for (var i = start; i < lessThan; i++) {
            data.push(i);
        }
        return data;
    }

    export function createSecondsList() {
        var seconds = repeaterUtils.createSequentialData(60);
        return new WinJS.Binding.List(seconds);
    };

    export function createMinutesList() {
        var minutes = repeaterUtils.createSequentialData(60);
        return new WinJS.Binding.List(minutes);
    };

    export function createHoursList() {
        var hours = repeaterUtils.createSequentialData(24);
        return new WinJS.Binding.List(hours);
    };

    export function createDaysList() {
        var days = repeaterUtils.createSequentialData(32, true);
        return new WinJS.Binding.List(days);
    };

    export function createWeekdaysList() {
        var days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        return new WinJS.Binding.List(days);
    };

    export function createMonthsList() {
        var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return new WinJS.Binding.List(months);
    };

    export var timeData = {
        seconds: repeaterUtils.createSecondsList(),
        minutes: repeaterUtils.createMinutesList(),
        hours: repeaterUtils.createHoursList(),
        days: repeaterUtils.createDaysList(),
        weekdays: repeaterUtils.createWeekdaysList(),
        months: repeaterUtils.createMonthsList()
    };

    export function getRandomMoment() {
        var date: any = {},
            time = repeaterUtils.timeData,
            rand = Math.random();

        date.seconds = time.seconds.getAt(Math.floor(rand * time.seconds.length));
        date.minutes = time.minutes.getAt(Math.floor(rand * time.minutes.length));
        date.hour = time.hours.getAt(Math.floor(rand * time.hours.length));
        date.day = time.days.getAt(Math.floor(rand * time.days.length));
        date.weekday = time.weekdays.getAt(Math.floor(rand * time.weekdays.length));
        date.month = time.months.getAt(Math.floor(rand * time.months.length));

        return date;
    };

    export function getListOfMoments(size) {
        var list = new WinJS.Binding.List();
        for (var i = 0; i < size; i++) {
            list.push(repeaterUtils.getRandomMoment());
        };

        return list;
    };

    export var events = {
        loadedEvent: "itemsloaded",
        insertingEvent: "iteminserting",
        insertedEvent: "iteminserted",
        removingEvent: "itemremoving",
        removedEvent: "itemremoved",
        movingEvent: "itemmoving",
        movedEvent: "itemmoved",
        changingEvent: "itemchanging",
        changedEvent: "itemchanged",
        reloadingEvent: "itemsreloading",
        reloadedEvent: "itemsreloaded",
    };

    export function simpleRenderer(item) {
        var root = document.createElement("div");
        root.textContent = item;
        root.className = "repeater-child";
        return root;
    };

    WinJS.Utilities.markSupportedForProcessing(repeaterUtils.simpleRenderer);

    export function waitForReady(listView, delay?) {
        if (listView.winControl) { listView = listView.winControl; }

        return function (x?) {
            return new WinJS.Promise(function (c, e, p) {
                function waitForReady_handler() {
                    LiveUnit.LoggingCore.logComment("waitForReady_handler: ListView loadingState = " + listView.loadingState);
                    if (listView.loadingState === "complete") {
                        listView.removeEventListener("loadingstatechanged", waitForReady_handler, false);
                        c(x);
                    }
                }

                function waitForReady_work() {
                    LiveUnit.LoggingCore.logComment("waitForReady_work ListView loadingState = " + listView.loadingState);
                    if (listView.loadingState !== "complete") {
                        listView.addEventListener("loadingstatechanged", waitForReady_handler, false);
                    }
                    else {
                        c(x);
                    }
                }

                if (delay) {
                    if (delay < 0) {
                        WinJS.Utilities._setImmediate(waitForReady_work);
                    }
                    else {
                        setTimeout(waitForReady_work, delay);
                    }
                }
                else {
                    waitForReady_work();
                }
            });
        }
}

    export function winJSCtrlRenderer(item) {
        var root = document.createElement("div");
        WinJS.Utilities.addClass(root, "repeater-child");
        var control = new MyCustomControlForRepeater(root);
        return root;
    };


    export function disposableRenderer(item) {
        var root = document.createElement("button");
        WinJS.Utilities.addClass(root, "repeater-child");
        root.textContent = item;

        WinJS.Utilities.markDisposable(root, function () {
            root.textContent = "Disposed";
        });
        return root;
    }
}