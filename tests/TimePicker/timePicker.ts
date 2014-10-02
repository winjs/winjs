// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />
///<reference path="../../typings/typings.d.ts" />
///<reference path="../TestLib/liveToQ/liveToQ.d.ts" />
///<reference path="../TestLib/winjs.dev.d.ts" />

declare var Windows;

module CorsicaTests {


    "use strict";

    function isPeriodControl() {
        if (window && window['Windows']) {
            var calendar = new Windows.Globalization.Calendar();
            var computedClock = calendar.getClock();
            return (computedClock !== "24HourClock");
        }
        return true;

    }

    export class TimePicker {

        TimePickerClassName = {
            TimePicker: "win-timepicker",
            TimePicker_Hour: "win-timepicker-hour",
            TimePicker_Minute: "win-timepicker-minute",
            TimePicker_Period: "win-timepicker-period"
        }

        TimePickerQuery = {
            Hour: this.TimePickerClassName.TimePicker + " ." + this.TimePickerClassName.TimePicker_Hour,
            Minute: this.TimePickerClassName.TimePicker + " ." + this.TimePickerClassName.TimePicker_Minute,
            Period: this.TimePickerClassName.TimePicker + " ." + this.TimePickerClassName.TimePicker_Period
        }


        testDefaultConstructor() {
            var controlElement = document.createElement("div");
            var t = new Date();
            var date1 = new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), t.getMinutes(), 0, 0);
            var control = <WinJS.UI.ITimePicker> new WinJS.UI.TimePicker(controlElement);
            t = new Date();
            var date2 = new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), t.getMinutes(), 0, 0);

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isTrue(control.current.getHours() <= date2.getHours());
            LiveUnit.Assert.isTrue(control.current.getMinutes() <= date2.getMinutes());
            LiveUnit.Assert.isTrue(control.current.getHours() >= date1.getHours());
            LiveUnit.Assert.isTrue(control.current.getMinutes() >= date1.getMinutes());
            LiveUnit.Assert.isTrue(control.minuteIncrement === 1);
            LiveUnit.Assert.isTrue(!control.disabled);
        }

        //  7/8/11:  default date/time pickers look visually correct with redline spec, so verifying corresponding margin values below
        testRedlines() {
            var controlElement = document.createElement("div");
            try {
                var control = new WinJS.UI.TimePicker(controlElement);
                document.body.appendChild(controlElement);

                LiveUnit.Assert.areEqual("80px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Hour))["minWidth"]);
                LiveUnit.Assert.areEqual("80px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Minute))["minWidth"]);
                if (isPeriodControl()) {
                    LiveUnit.Assert.areEqual("80px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Period))["minWidth"]);
                }


                LiveUnit.Assert.areEqual("4px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Hour)).marginTop);
                LiveUnit.Assert.areEqual("20px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Hour)).marginRight);
                LiveUnit.Assert.areEqual("4px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Hour)).marginBottom);
                LiveUnit.Assert.areEqual("0px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Hour)).marginLeft);
                LiveUnit.Assert.areEqual("4px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Minute)).marginTop);
                LiveUnit.Assert.areEqual("20px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Minute)).marginRight);
                LiveUnit.Assert.areEqual("4px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Minute)).marginBottom);
                LiveUnit.Assert.areEqual("0px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Minute)).marginLeft);

                if (isPeriodControl()) {
                    LiveUnit.Assert.areEqual("4px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Period)).marginTop);
                    LiveUnit.Assert.areEqual("0px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Period)).marginRight);
                    LiveUnit.Assert.areEqual("4px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Period)).marginBottom);
                    LiveUnit.Assert.areEqual("0px", getComputedStyle(controlElement.querySelector("." + this.TimePickerQuery.Period)).marginLeft);
                }
            } finally {
                WinJS.Utilities.disposeSubTree(controlElement);
                document.body.removeChild(controlElement);
            }
        }



        testRedlines2() {
            var controlElement = document.createElement("div");

            // this select element will be used as the truth, ie styles of the datepicker subelements
            // should be the same as a basic select element
            var selectElement = document.createElement("select");

            try {
                var control = new WinJS.UI.TimePicker(controlElement);
                document.body.appendChild(controlElement);
                document.body.appendChild(selectElement);

                // classes of the timepicker
                var classes = ["." + this.TimePickerClassName.TimePicker_Hour, "." + this.TimePickerClassName.TimePicker_Minute, "." + this.TimePickerClassName.TimePicker_Period];

                // specific elements of the datepicker corresponding to the classes
                var subElements = [];

                // styles of the subelements to compare to the select element
                var stylesToVerify = ["color",
                    "lineHeight",
                    "fontStyle",
                    "fontWeight",
                    "fontSize",
                    "fontStretch",
                    "fontSizeAdjust",
                    "borderTopWidth",
                    "borderRightWidth",
                    "borderLeftWidth",
                    "borderBottomWidth",
                    "borderTopStyle",
                    "borderRightStyle",
                    "borderLeftStyle",
                    "borderBottomStyle",
                ];

                // initialize the subelements
                classes.forEach(function (item, index) {
                    subElements[index] = controlElement.querySelector(".win-timepicker " + item);
                });

                // compare styles of subelements to the basic select element
                subElements.forEach(function (subElement) {
                    if (subElement !== null) {
                        stylesToVerify.forEach(function (testStyle) {
                            LiveUnit.Assert.areEqual(getComputedStyle(selectElement)[testStyle], getComputedStyle(subElement)[testStyle],
                                  "testing subElement=" + subElement.getAttribute("class") + ", style=" + testStyle);
                        });
                    }
                });
            } finally {
                WinJS.Utilities.disposeSubTree(controlElement);
                WinJS.Utilities.disposeSubTree(selectElement);
                document.body.removeChild(controlElement);
                document.body.removeChild(selectElement);
            }
        }

        testEmptyOptions() {
            var controlElement = document.createElement("div");
            var t = new Date();
            var date1 = new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), t.getMinutes(), 0, 0);
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, {});
            t = new Date();
            var date2 = new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), t.getMinutes(), 0, 0);

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isTrue(control.current.getHours() <= date2.getHours());
            LiveUnit.Assert.isTrue(control.current.getMinutes() <= date2.getMinutes());
            LiveUnit.Assert.isTrue(control.current.getHours() >= date1.getHours());
            LiveUnit.Assert.isTrue(control.current.getMinutes() >= date1.getMinutes());
            LiveUnit.Assert.isTrue(control.minuteIncrement === 1);
            LiveUnit.Assert.isTrue(!control.disabled);
        }

        testEmptyConstructor() {
            var control = new WinJS.UI.TimePicker();

            // verify an element was created with class "win-timepicker"
            LiveUnit.Assert.isTrue(control.element.outerHTML.indexOf("win-timepicker") > 0);
            LiveUnit.Assert.areEqual(control, control.element.winControl);
        }

        testElementProperty() {
            var controlElement = document.createElement("div");
            var control = new WinJS.UI.TimePicker(controlElement, { current: '3:30 PM' });

            LiveUnit.Assert.areEqual(controlElement, control.element);
            LiveUnit.Assert.areEqual(control, control.element.winControl);
        }

        testTimePattern() {
            if (window['Windows'] && Windows.Globalization && Windows.Globalization.Calendar) {
                var controlElement = document.createElement("div");
                try {
                    var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { current: '3:03 PM' });
                    document.body.appendChild(controlElement);

                    // specific elements of the datepicker corresponding to the classes
                    var getHourElementValue = function () { return (<HTMLSelectElement>control._domElement.querySelector(".win-timepicker-hour")).value; };
                    var getMinuteElementValue = function () { return (<HTMLSelectElement>control._domElement.querySelector(".win-timepicker-minute")).value; };
                    var getPeriodElementValue = function () { return (<HTMLSelectElement>control._domElement.querySelector(".win-timepicker-period")).value; };

                    //Verify current display value
                    //Default pattern {hour.integer(1)} {minute.integer(2)} {period.abbreviated(2)}
                    LiveUnit.Assert.areEqual("03", getMinuteElementValue(), "Check minute");
                    if (isPeriodControl()) {
                        LiveUnit.Assert.areEqual("3", getHourElementValue(), "Check hour");
                        LiveUnit.Assert.areEqual("PM", getPeriodElementValue(), "Check period");
                    }
                    else {
                        LiveUnit.Assert.areEqual("15", getHourElementValue(), "Check hour");
                    }
                    //Update hour pattern
                    control.hourPattern = "{hour.integer(2)} hours";
                    LiveUnit.Assert.areEqual("03", getMinuteElementValue(), "Check minute");
                    if (isPeriodControl()) {
                        LiveUnit.Assert.areEqual("03 hours", getHourElementValue(), "Check hour");
                        LiveUnit.Assert.areEqual("PM", getPeriodElementValue(), "Check period");
                    }
                    else {
                        LiveUnit.Assert.areEqual("15 hours", getHourElementValue(), "Check hour");
                    }
                    //Update minute pattern
                    control.minutePattern = "{minute.integer(1)} minutes";
                    LiveUnit.Assert.areEqual("3 minutes", getMinuteElementValue(), "Check minute");
                    if (isPeriodControl()) {
                        LiveUnit.Assert.areEqual("03 hours", getHourElementValue(), "Check hour");
                        LiveUnit.Assert.areEqual("PM", getPeriodElementValue(), "Check period");
                    }
                    else {
                        LiveUnit.Assert.areEqual("15 hours", getHourElementValue(), "Check hour");
                    }

                    //Update period pattern
                    control.periodPattern = "{period.abbreviated(2)} period";

                    LiveUnit.Assert.areEqual("3 minutes", getMinuteElementValue(), "Check month");
                    if (isPeriodControl()) {
                        LiveUnit.Assert.areEqual("03 hours", getHourElementValue(), "Check hour");
                        LiveUnit.Assert.areEqual("PM period", getPeriodElementValue(), "Check period");
                    }
                    else {
                        LiveUnit.Assert.areEqual("15 hours", getHourElementValue(), "Check hour");
                    }

                    //update year, expect everything day of week updated with the new pattern
                    control.current = new Date(2011, 1, 1, 5, 9);
                    LiveUnit.Assert.areEqual("05 hours", getHourElementValue(), "Check year");
                    LiveUnit.Assert.areEqual("9 minutes", getMinuteElementValue(), "Check month");
                    if (isPeriodControl()) {

                        LiveUnit.Assert.areEqual("AM period", getPeriodElementValue(), "Check date");
                    }

                } finally {
                    WinJS.Utilities.disposeSubTree(controlElement);
                    document.body.removeChild(controlElement);
                }
            }
        }

        testImperativeEvent() {
            var control = new WinJS.UI.TimePicker();
            var hitCount = 0;

            // fire a 'change' event on the provided target element
            function fireOnchange(targetElement) {
                var myEvent = document.createEvent('HTMLEvents');
                myEvent.initEvent('change', true, false);
                targetElement.dispatchEvent(myEvent);
            }

            control.addEventListener("change", function (e) { hitCount++; });
            fireOnchange(control.element);

            LiveUnit.Assert.areEqual(1, hitCount);
        }

        testTimeString() {
            var controlElement = document.createElement("div");
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { current: '3:30 PM' });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isTrue(control.current.getHours() === 15);
            LiveUnit.Assert.isTrue(control.current.getMinutes() === 30);
            LiveUnit.Assert.isTrue(control.minuteIncrement === 1);
            LiveUnit.Assert.isTrue(!control.disabled);
        }

        testTime24HourString() {
            var controlElement = document.createElement("div");
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { current: '22:30' });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isTrue(control.current.getHours() === 22);
            LiveUnit.Assert.isTrue(control.current.getMinutes() === 30);
            LiveUnit.Assert.isTrue(control.minuteIncrement === 1);
            LiveUnit.Assert.isTrue(!control.disabled);
        }

        testTime() {
            var date = new Date(2010, 5, 4, 1, 2, 3, 4);

            var controlElement = document.createElement("div");
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { current: date });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isTrue(control.current.getHours() === 1);
            LiveUnit.Assert.isTrue(control.current.getMinutes() === 2);
            LiveUnit.Assert.isTrue(control.current.getSeconds() === 0);
            LiveUnit.Assert.isTrue(control.minuteIncrement === 1);
            LiveUnit.Assert.isTrue(!control.disabled);
        }

        testDisabledTrue() {
            var controlElement = document.createElement("div");
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { disabled: true });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isTrue(control.disabled);
            LiveUnit.Assert.areEqual("disabled", control._domElement.querySelector(".win-timepicker-hour").getAttribute("disabled"));
            LiveUnit.Assert.areEqual("disabled", control._domElement.querySelector(".win-timepicker-minute").getAttribute("disabled"));
            if (isPeriodControl()) {
                LiveUnit.Assert.areEqual("disabled", control._domElement.querySelector(".win-timepicker-period").getAttribute("disabled"));
            }
        }

        testDisabledFalse() {
            var controlElement = document.createElement("div");
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { disabled: false });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isFalse(control.disabled);
            LiveUnit.Assert.isFalse(control._domElement.querySelector(".win-timepicker-hour").getAttribute("disabled"));
            LiveUnit.Assert.isFalse(control._domElement.querySelector(".win-timepicker-minute").getAttribute("disabled"));
            if (isPeriodControl()) {
                LiveUnit.Assert.isFalse(control._domElement.querySelector(".win-timepicker-period").getAttribute("disabled"));
            }
        }

        testDisabledTrueDelayed() {
            var controlElement = document.createElement("div");
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { disabled: false });

            control.disabled = true;

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isTrue(control.disabled);
            LiveUnit.Assert.areEqual("disabled", control._domElement.querySelector(".win-timepicker-hour").getAttribute("disabled"));
            LiveUnit.Assert.areEqual("disabled", control._domElement.querySelector(".win-timepicker-minute").getAttribute("disabled"));
            if (isPeriodControl()) {
                LiveUnit.Assert.areEqual("disabled", control._domElement.querySelector(".win-timepicker-period").getAttribute("disabled"));
            }
        }

        testDisabledFalseDelayed() {
            var controlElement = document.createElement("div");
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { disabled: true });

            control.disabled = false;

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isFalse(control.disabled);
            LiveUnit.Assert.isFalse(control._hourElement.disabled);
            LiveUnit.Assert.isFalse(control._minuteElement.disabled);
            if (isPeriodControl()) {
                LiveUnit.Assert.isFalse(control._ampmElement.disabled);
            }
        }

        testBadMinuteIncrement() {
            var controlElement = document.createElement("div");
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { minuteIncrement: 0 });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.areEqual(control.minuteIncrement, 1);
            // If we got here, then 0 correctly didn't cause infinite loop when filling minutes
        }

        testBadMinuteIncrement2() {
            var controlElement = document.createElement("div");
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { minuteIncrement: -1 });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.areEqual(control.minuteIncrement, 1);
            // If we got here, then -1 correctly didn't cause infinite loop when filling minutes
        }

        testBadMinuteIncrement3() {
            var controlElement = document.createElement("div");
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { minuteIncrement: 63 });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.areEqual(control.minuteIncrement, 3);
        }

        testBadMinuteIncrement4() {
            var controlElement = document.createElement("div");
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { minuteIncrement: 60 });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.areEqual(control.minuteIncrement, 1);
        }

        testBadMinuteIncrement5() {
            var controlElement = document.createElement("div");
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { minuteIncrement: "fish" });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.areEqual(control.minuteIncrement, 1);
        }

        testNormalMinuteIncrement() {
            var controlElement = document.createElement("div");
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { minuteIncrement: 15 });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.areEqual(control.minuteIncrement, 15);
        }

        testWeirdMinuteIncrement() {
            var controlElement = document.createElement("div");
            var control = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker(controlElement, { minuteIncrement: 7 });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.areEqual(control.minuteIncrement, 7);
        }

        testAdjustMinuteIncrement() {
            var date = new Date(2010, 5, 4, 14, 23);
            var control = new WinJS.UI.TimePicker(null, { current: date });

            LiveUnit.Assert.isTrue(control.current.getHours() === 14);
            LiveUnit.Assert.isTrue(control.current.getMinutes() === 23);
            LiveUnit.Assert.isTrue(control.current.getSeconds() === 0);

            control.minuteIncrement = 10;

            LiveUnit.Assert.isTrue(control.current.getHours() === 14);
            LiveUnit.Assert.isTrue(control.current.getMinutes() === 20);
            LiveUnit.Assert.isTrue(control.current.getSeconds() === 0);

            LiveUnit.Assert.areEqual(20, +((<HTMLSelectElement>control.element.querySelector(".win-timepicker-minute")).value), "UI should be updated to minute increment");
        }

        testAccessibilityAttributeVerification() {
            var controlElement = document.createElement("div");
            var control = new WinJS.UI.TimePicker(controlElement, { current: "4:31 AM" });
            document.body.appendChild(controlElement);

            var that = this;
            var timeChecker = function (hourNow, hourText, minNow, minText, ampmNow, ampmText, maxMinute?) {
                maxMinute = maxMinute || "59";
                var childNodes = controlElement.childNodes;
                for (var i = 0; i < childNodes.length; i++) {
                    var child = <HTMLElement>childNodes[i];
                    if (child.className === that.TimePickerClassName.TimePicker_Hour + " win-order0") {
                        LiveUnit.Assert.areEqual("Select Hour", child.getAttribute("aria-label"));
                        continue;
                    }

                    if (child.className === that.TimePickerClassName.TimePicker_Minute + " win-order1") {
                        LiveUnit.Assert.areEqual("Select Minute", child.getAttribute("aria-label"));
                        continue;
                    }

                    if (child.className === that.TimePickerClassName.TimePicker_Period + " win-order2") {
                        LiveUnit.Assert.areEqual("Select A.M P.M", child.getAttribute("aria-label"));
                        continue;
                    }

                    LiveUnit.Assert.fail("unexpected child node: " + child.className);
                }
            };

            LiveUnit.Assert.areEqual(controlElement.getAttribute("role"), "group");
            timeChecker("4", "4", "31", "31", "AM", "AM");

            //Update current and re-check values
            control.current = new Date(2012, 1, 1, 12, 32);
            timeChecker("12", "12", "32", "32", "AM", "AM");

            //Update minute Increment and re-check values
            control.minuteIncrement = 15;
            timeChecker("12", "12", "30", "30", "AM", "AM", "45");

            //Update minute Increment and re-check values
            control.minuteIncrement = 1;
            timeChecker("12", "12", "32", "32", "AM", "AM");

            //cleanup
            WinJS.Utilities.disposeSubTree(controlElement);
            document.body.removeChild(controlElement);
        }

        testTimePickerDispose() {
            var tp = <WinJS.UI.ITimePicker>new WinJS.UI.TimePicker();
            LiveUnit.Assert.isTrue(tp.dispose);
            LiveUnit.Assert.isTrue(tp.element.classList.contains("win-disposable"));
            LiveUnit.Assert.isFalse(tp._disposed);

            // Double dispose sentinel
            var sentinel: any = document.createElement("div");
            sentinel.disposed = false;
            WinJS.Utilities.addClass(sentinel, "win-disposable");
            tp.element.appendChild(sentinel);

            tp.dispose();
            tp.dispose();
        }
    };
}
LiveUnit.registerTestClass("CorsicaTests.TimePicker");
