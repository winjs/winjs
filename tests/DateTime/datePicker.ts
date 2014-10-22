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
    var glob;
    function isWinRTEnabled() {

        if (window && window['Windows']) {
            glob = Windows.Globalization;
            return true;
        }
        return false;

    }

    var DatePicker = <typeof WinJS.UI.PrivateDatePicker> WinJS.UI.DatePicker;

    export class DatePickerTests {

        DatePickerClassName = {
            DatePicker: "win-datepicker",
            DatePicker_Month: "win-datepicker-month",
            DatePicker_Year: "win-datepicker-year",
            DatePicker_Date: "win-datepicker-date"
        };

        DatePickerQuery = {
            Month: this.DatePickerClassName.DatePicker + " ." + this.DatePickerClassName.DatePicker_Month,
            Year: this.DatePickerClassName.DatePicker + " ." + this.DatePickerClassName.DatePicker_Year,
            Date: this.DatePickerClassName.DatePicker + " ." + this.DatePickerClassName.DatePicker_Date
        };

        testMaxMinCurrentDatesFarTop = function () {
            if (!isWinRTEnabled()) { return; }

            var dp = new WinJS.UI.DatePicker(null, { calendar: "UmAlQuraCalendar", minYear: 29220, maxYear: 29221 });
            var cur = dp.current;
            var min = dp.minYear;
            var max = dp.maxYear;

            LiveUnit.Assert.areEqual(2076, cur.getFullYear());
            LiveUnit.Assert.areEqual(2076, min);
            LiveUnit.Assert.areEqual(2077, max);
        };

        testMaxMinCurrentDatesFarBottom = function () {
            if (!isWinRTEnabled()) { return; }

            var dp = new WinJS.UI.DatePicker(null, { calendar: "UmAlQuraCalendar", minYear: 0, maxYear: 1 });
            var cur = dp.current;
            var min = dp.minYear;
            var max = dp.maxYear;

            LiveUnit.Assert.areEqual(1901, cur.getFullYear());
            LiveUnit.Assert.areEqual(1900, min);
            LiveUnit.Assert.areEqual(1901, max);
        };

        testMaxMinCurrentDatesMiddle = function () {
            if (!isWinRTEnabled()) { return; }

            var dp = new WinJS.UI.DatePicker(null, { calendar: "UmAlQuraCalendar", minYear: 1910, maxYear: 2110 });
            var cur = dp.current;
            var min = dp.minYear;
            var max = dp.maxYear;

            LiveUnit.Assert.areEqual(new Date().getFullYear(), cur.getFullYear());
            LiveUnit.Assert.areEqual(1909, min);
            LiveUnit.Assert.areEqual(2077, max);
        };

        testDefaultConstructor = function () {
            var controlElement = document.createElement("div");
            var t = new Date();
            var date1 = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12, 0, 0, 0);
            var control = new DatePicker(controlElement, { calendar: "GregorianCalendar" });
            t = new Date();
            var date2 = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12, 0, 0, 0);

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isTrue(control.current <= date2);
            LiveUnit.Assert.isTrue(control.current >= date1);
            LiveUnit.Assert.isTrue(control.minYear == date1.getFullYear() - 100);
            LiveUnit.Assert.isTrue(control.maxYear == date1.getFullYear() + 100);
            LiveUnit.Assert.isTrue(!control.disabled);
        };

        testRoundTripWinRT = function () {
            if (isWinRTEnabled()) {
                var calendars = ["HijriCalendar", "GregorianCalendar"];
                var dateRanges = [{ start: new Date(2009, 0, 1), end: new Date(2012, 11, 31) }, { start: new Date(2008, 0, 1), end: new Date(2013, 11, 31) }];
                var dates = [new Date(2010, 0, 1), new Date(2010, 1, 1), new Date(2010, 11, 31), ];

                dateRanges.forEach(function (range) {
                    dates.forEach(function (date) {
                        calendars.forEach(function (cal) {
                            var ni = DatePicker.getInformation(
                                range.start,
                                range.end,
                                cal);

                            var f2 = date;
                            var f3 = ni.getIndex(f2);
                            var f4 = ni.getDate(f3);

                            LiveUnit.Assert.areEqual(f2.getFullYear(), f4.getFullYear());
                            LiveUnit.Assert.areEqual(f2.getMonth(), f4.getMonth());
                            LiveUnit.Assert.areEqual(f2.getDate(), f4.getDate());
                        });
                    });
                });
            }
        };

        testAdjustDates = function () {
            if (isWinRTEnabled()) {
                var dateRanges = [
                    { start: new Date(2009, 0, 1, 12, 0, 0, 0), end: new Date(2012, 11, 31, 12, 0, 0, 0) },
                    { start: new Date(2008, 0, 1, 12, 0, 0, 0), end: new Date(2013, 11, 31, 12, 0, 0, 0) }
                ];

                dateRanges.forEach(function (range) {
                    var ni = DatePicker.getInformation(range.start, range.end);

                    var f2 = new Date(2012, 7, 31);
                    var f3 = ni.getIndex(f2);
                    f3.month = 1; // feb
                    var f4 = ni.getDate(f3);

                    LiveUnit.Assert.areEqual(f2.getFullYear(), f4.getFullYear());
                    LiveUnit.Assert.areEqual(1, f4.getMonth());
                    LiveUnit.Assert.areEqual(29, f4.getDate());

                    var f5 = ni.getIndex(f4);
                    f5.year--; // 2011
                    var f6 = ni.getDate(f5);

                    LiveUnit.Assert.areEqual(2011, f6.getFullYear());
                    LiveUnit.Assert.areEqual(1, f6.getMonth());
                    LiveUnit.Assert.areEqual(28, f6.getDate());
                });
            }
        };

        //  7/8/11:  default date/time pickers look visually correct with redline spec, so verifying corresponding margin values below
        testRedlines = function () {
            var controlElement = document.createElement("div");
            try {
                var control = new DatePicker(controlElement);
                document.body.appendChild(controlElement);

                LiveUnit.Assert.areEqual("80px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Month))["minWidth"]);
                LiveUnit.Assert.areEqual("80px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Date))["minWidth"]);
                LiveUnit.Assert.areEqual("80px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Year))["minWidth"]);

                LiveUnit.Assert.areEqual("4px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Month)).marginTop);
                LiveUnit.Assert.areEqual("20px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Month)).marginRight);
                LiveUnit.Assert.areEqual("4px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Month)).marginBottom);
                LiveUnit.Assert.areEqual("0px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Month)).marginLeft);

                LiveUnit.Assert.areEqual("4px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Date)).marginTop);
                LiveUnit.Assert.areEqual("20px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Date)).marginRight);
                LiveUnit.Assert.areEqual("4px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Date)).marginBottom);
                LiveUnit.Assert.areEqual("0px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Date)).marginLeft);

                LiveUnit.Assert.areEqual("4px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Year)).marginTop);
                LiveUnit.Assert.areEqual("0px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Year)).marginRight);
                LiveUnit.Assert.areEqual("4px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Year)).marginBottom);
                LiveUnit.Assert.areEqual("0px", getComputedStyle(controlElement.querySelector("." + this.DatePickerQuery.Year)).marginLeft);
            } finally {
                WinJS.Utilities.disposeSubTree(controlElement);
                document.body.removeChild(controlElement);
            }
        };

        testEmptyOptions = function () {
            var controlElement = document.createElement("div");
            var t = new Date();
            var date1 = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12, 0, 0, 0);
            var control = new DatePicker(controlElement, { calendar: "GregorianCalendar" });
            t = new Date();
            var date2 = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12, 0, 0, 0);

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isTrue(control.current <= date2);
            LiveUnit.Assert.isTrue(control.current >= date1);
            LiveUnit.Assert.areEqual(control.minYear, date1.getFullYear() - 100);
            LiveUnit.Assert.areEqual(control.maxYear, date1.getFullYear() + 100);
            LiveUnit.Assert.isTrue(!control.disabled);
        };

        testEmptyConstructor = function () {
            var control = new DatePicker();

            // verify an element was created with class "win-datepicker"
            LiveUnit.Assert.isTrue(control.element.outerHTML.indexOf("win-datepicker") > 0);
            LiveUnit.Assert.areEqual(control, control.element.winControl);
        };

        testElementProperty = function () {
            var controlElement = document.createElement("div");
            var control = new DatePicker(controlElement, { current: 'january 10, 1995' });

            LiveUnit.Assert.areEqual(controlElement, control.element);
            LiveUnit.Assert.areEqual(control, control.element.winControl);
        };

        testImperativeEvent = function () {

            // fire a 'change' event on the provided target element
            function fireOnchange(targetElement) {
                var myEvent = document.createEvent('HTMLEvents');
                myEvent.initEvent('change', true, false);
                targetElement.dispatchEvent(myEvent);
            }

            var control = new DatePicker();
            var hitCount = 0;

            control.addEventListener("change", function (e) { hitCount++; });
            fireOnchange(control.element);

            LiveUnit.Assert.areEqual(1, hitCount);
        };

        testDateString = function () {
            var controlElement = document.createElement("div");
            var control = new DatePicker(controlElement, { current: 'january 10, 1995' });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.areEqual(0, control.current.getMonth());
            LiveUnit.Assert.areEqual(10, control.current.getDate());
            LiveUnit.Assert.areEqual(1995, control.current.getFullYear());
            LiveUnit.Assert.isTrue(!control.disabled);
        };

        testDateString2 = function () {
            var controlElement = document.createElement("div");
            var control = new DatePicker(controlElement, { current: '2/4/1995' });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.areEqual(1, control.current.getMonth());
            LiveUnit.Assert.areEqual(4, control.current.getDate());
            LiveUnit.Assert.areEqual(1995, control.current.getFullYear());
            LiveUnit.Assert.isTrue(!control.disabled);
        };

        // test cases adapted from \\devx-snap\testsnew\FBLIEDEV1\IE\IE9\ScriptEngine\EzeJSTestFiles\Date\Date.js
        testDateString3 = function () {
            var controlElement = document.createElement("div");
            var control = new DatePicker(controlElement, { calendar: "GregorianCalendar" });

            // note: if month is July, put 7 as expected month value and we'll adjust to 0 base in comparison below
            var dateStrings = [[new Date(2011, 6, 28, 13, 30, 57), 7, 28, 2011],          // time that found original bug #427727
                ["2/29/2000", 2, 29, 2000],                     // y2k leap year date
                ["1969/12/31 23:59:59", 12, 31, 1969],          // *almost* midnight
                ["1999/12/31 23:59:59", 12, 31, 1999],          // just before Y2K
                ["2000/01/01 00:00:00", 1, 1, 2000],            // just after Y2K
                ["1582/10/04 23:59:59", 10, 4, 1582],           // gJulianEnd,
                ["1582/10/05 00:00:00", 10, 5, 1582],           // gJulianEnd + 1,
                ["1582/10/15 00:00:00", 10, 15, 1582],          // gGregorianStart,
                ["1582/10/14 23:59:59", 10, 14, 1582],          // gGregorianStart-1
                // bug 464745 fails under wwahost        ["29222/04/25 16:53:20", 4, 25, 29222],         // gMaxMs,  This makes actual date Mon Apr 25 16:53:20 PDT 29222
                // bug 464745 fails under wwahost        ["-25283/09/08 07:06:40", 9, 8, 25283],         // -1*gMaxMs,
            ];
            var dateString = 0, month = 1, date = 2, year = 3;

            dateStrings.forEach(function (item: any) {
                // set min/maxYear range to allow correct date.  Note, if you set maxYear = 29222 first, you can end up with
                // a date range of prevMin (1900...29222) and corrsponding options for all those which take 70s to removeChild()
                control.minYear = Math.abs(item[year]);
                control.maxYear = Math.abs(item[year]);

                // assign test value
                control.current = item[dateString];

                // subtract 1 from expected month to align with javascript date 0 based month conventions
                LiveUnit.Assert.areEqual(item[month] - 1, control.current.getMonth(), "month of: " + item[dateString] + ", actual=" + control.current);
                LiveUnit.Assert.areEqual(item[date], control.current.getDate(), "date of: " + item[dateString] + ", actual=" + control.current);
                LiveUnit.Assert.areEqual(item[year], control.current.getFullYear(), "year of: " + item[dateString] + ", actual=" + control.current);
            });
        };

        testDate = function () {
            var date = new Date(2010, 5, 4, 1, 2, 3, 4);

            var controlElement = document.createElement("div");
            var control = new DatePicker(controlElement, { current: date });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.areEqual(5, control.current.getMonth());
            LiveUnit.Assert.areEqual(4, control.current.getDate());
            LiveUnit.Assert.areEqual(2010, control.current.getFullYear());
            LiveUnit.Assert.areEqual(12, control.current.getHours());
            LiveUnit.Assert.areEqual(0, control.current.getMinutes());
            LiveUnit.Assert.areEqual(0, control.current.getSeconds());
            LiveUnit.Assert.isTrue(!control.disabled);
        };

        testDateChange = function () {
            var controlElement = document.createElement("div");
            var picker = new DatePicker(controlElement, { current: new Date(2011, 7, 31) });

            LiveUnit.Assert.areEqual(2011, picker.current.getFullYear(), "Check the Year");
            LiveUnit.Assert.areEqual(7, picker.current.getMonth(), "Check the Month");
            LiveUnit.Assert.areEqual(31, picker.current.getDate(), "Check the Day of Month");

            // Change the date to display
            picker.current = new Date(1968, 10, 21);

            LiveUnit.Assert.areEqual(1968, picker.current.getFullYear(), "Check the Year");
            LiveUnit.Assert.areEqual(10, picker.current.getMonth(), "Check the Month");
            LiveUnit.Assert.areEqual(21, picker.current.getDate(), "Check the Day on Month");
        };

        testDatePattern = function () {
            if (window['Windows'] && Windows.Globalization && Windows.Globalization.Calendar) {
                var controlElement = document.createElement("div");
                try {
                    var control = new DatePicker(controlElement, { current: new Date(2011, 6, 1), calendar: "GregorianCalendar" });
                    document.body.appendChild(controlElement);

                    // specific elements of the datepicker corresponding to the classes
                    var getYearElementValue = function () { return (<HTMLSelectElement>controlElement.querySelector(".win-datepicker-year")).value; };
                    var getMonthElementValue = function () { return (<HTMLSelectElement>controlElement.querySelector(".win-datepicker-month")).value; };
                    var getDateElementValue = function () { return (<HTMLSelectElement>controlElement.querySelector(".win-datepicker-date")).value; };


                    //Verify current display value
                    //Default pattern {year.full} {month.full} {day.integer(2)}
                    LiveUnit.Assert.areEqual("2011", getYearElementValue(), "Check year");
                    LiveUnit.Assert.areEqual("July", getMonthElementValue(), "Check month");
                    LiveUnit.Assert.areEqual("1", getDateElementValue(), "Check date");

                    //Update year pattern
                    control.yearPattern = "{year.full} {era.abbreviated}";
                    LiveUnit.Assert.areEqual("2011 A.D.", getYearElementValue(), "Check year");
                    LiveUnit.Assert.areEqual("July", getMonthElementValue(), "Check month");
                    LiveUnit.Assert.areEqual("1", getDateElementValue(), "Check date");

                    //Update date pattern
                    control.datePattern = "{day.integer(1)} {dayofweek.abbreviated}";
                    LiveUnit.Assert.areEqual("2011 A.D.", getYearElementValue(), "Check year");
                    LiveUnit.Assert.areEqual("July", getMonthElementValue(), "Check month");
                    LiveUnit.Assert.areEqual("1 Fri", getDateElementValue(), "Check date");

                    //Update month pattern
                    control.monthPattern = "{month.abbreviated(3)}";
                    LiveUnit.Assert.areEqual("2011 A.D.", getYearElementValue(), "Check year");
                    LiveUnit.Assert.areEqual("Jul", getMonthElementValue(), "Check month");
                    LiveUnit.Assert.areEqual("1 Fri", getDateElementValue(), "Check date");

                    //update year, expect everything day of week updated with the new pattern
                    control.current = new Date(2012, 6, 1);
                    LiveUnit.Assert.areEqual("2012 A.D.", getYearElementValue(), "Check year");
                    LiveUnit.Assert.areEqual("Jul", getMonthElementValue(), "Check month");
                    LiveUnit.Assert.areEqual("1 Sun", getDateElementValue(), "Check date");

                } finally {
                    WinJS.Utilities.disposeSubTree(controlElement);
                    document.body.removeChild(controlElement);
                }
            }
        };



        testDisabledTrue = function () {
            var controlElement = document.createElement("div");
            var control = new DatePicker(controlElement, { disabled: true });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isTrue(control.disabled);
            LiveUnit.Assert.areEqual("disabled", control._domElement.querySelector(".win-datepicker-year").getAttribute("disabled"));
            LiveUnit.Assert.areEqual("disabled", control._domElement.querySelector(".win-datepicker-month").getAttribute("disabled"));
            LiveUnit.Assert.areEqual("disabled", control._domElement.querySelector(".win-datepicker-date").getAttribute("disabled"));
        };

        testDisabledFalse = function () {
            var controlElement = document.createElement("div");
            var control = new DatePicker(controlElement, { disabled: false });

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isFalse(control.disabled);
            LiveUnit.Assert.isFalse(control._domElement.querySelector(".win-datepicker-year").getAttribute("disabled"));
            LiveUnit.Assert.isFalse(control._domElement.querySelector(".win-datepicker-month").getAttribute("disabled"));
            LiveUnit.Assert.isFalse(control._domElement.querySelector(".win-datepicker-date").getAttribute("disabled"));
        };

        testDisabledTrueDelayed = function () {
            var controlElement = document.createElement("div");
            var control = new DatePicker(controlElement, { disabled: false });

            control.disabled = true;

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isTrue(control.disabled);
            LiveUnit.Assert.areEqual("disabled", control._domElement.querySelector(".win-datepicker-year").getAttribute("disabled"));
            LiveUnit.Assert.areEqual("disabled", control._domElement.querySelector(".win-datepicker-month").getAttribute("disabled"));
            LiveUnit.Assert.areEqual("disabled", control._domElement.querySelector(".win-datepicker-date").getAttribute("disabled"));
        };

        testDisabledFalseDelayed = function () {
            var controlElement = document.createElement("div");
            var control = new DatePicker(controlElement, { disabled: true });

            control.disabled = false;

            LiveUnit.Assert.areEqual(controlElement, control._domElement);
            LiveUnit.Assert.isFalse(control.disabled);
            LiveUnit.Assert.isFalse(control._domElement.querySelector(".win-datepicker-year").getAttribute("disabled"));
            LiveUnit.Assert.isFalse(control._domElement.querySelector(".win-datepicker-month").getAttribute("disabled"));
            LiveUnit.Assert.isFalse(control._domElement.querySelector(".win-datepicker-date").getAttribute("disabled"));
        };

        testAccessibilityAttributeVerification = function () {
            var controlElement = document.createElement("div");
            var control = new DatePicker(controlElement, { current: "January 1 2010", minYear: 2000, maxYear: 2020 });
            document.body.appendChild(controlElement);

            LiveUnit.Assert.areEqual(controlElement.getAttribute("role"), "group");

            var that = this;
            var dateChecker = function (monthNow, monthText, dayNow, dayText, yearNow, yearText) {
                var childNodes = controlElement.childNodes;
                for (var i = 0; i < childNodes.length; i++) {
                    var child = <HTMLElement>childNodes[i];
                    if (child.className == that.DatePickerQuery.Month) {
                        LiveUnit.Assert.areEqual("Select Month", child.getAttribute("aria-label"));
                    }

                    if (child.className == that.DatePickerQuery.Date) {
                        LiveUnit.Assert.areEqual("Select Day", child.getAttribute("aria-label"));
                    }

                    if (child.className == that.DatePickerQuery.Year) {
                        LiveUnit.Assert.areEqual("Select Year", child.getAttribute("aria-label"));
                    }

                }
            };


            //modify current and re-check updated values
            control.current = new Date(2011, 1, 1);
            dateChecker("2", "February", "1", "1", "2011", "2011");


            //cleanup
            WinJS.Utilities.disposeSubTree(controlElement);
            document.body.removeChild(controlElement);
        };

        testDatePickerDispose = function () {
            var dp = new DatePicker();
            LiveUnit.Assert.isTrue(dp.dispose);
            LiveUnit.Assert.isTrue(dp.element.classList.contains("win-disposable"));
            LiveUnit.Assert.isFalse(dp._disposed);

            dp.dispose();
            dp.dispose();
        };
    };
}
LiveUnit.registerTestClass("CorsicaTests.DatePickerTests");
