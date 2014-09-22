// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

declare var Windows;

module CorsicaTests {

    "use strict";
    var glob;

    var DatePicker = <typeof WinJS.UI.PrivateDatePicker> WinJS.UI.DatePicker;

    function process(root) {
        return WinJS.UI.processAll(root);
    }

    function isWinRTEnabled() {

        if (window && window['Windows']) {
            glob = Windows.Globalization;
            return true;
        }
        return false;

    }

    var elementToBeRemoved;
    function createPickerWithAppend(options?) {
        var dateObject = null;
        if (options && options.current) {
            // NOTE: If the 'current' property is a string, then we want to 
            // set the property declaratively. If it is a date object, we
            // set it imperatively. This is because stringifying the date
            // object and reparsing it yields different results on different
            // browser implementations.
            if (typeof options.current === "string") {
                options.current = options.current + " 12:00pm";
            } else {
                dateObject = options.current;
                dateObject.setHours(12);
                delete options.current;
            }
        }

        var dp = document.createElement('div');
        elementToBeRemoved = dp;
        document.body.appendChild(dp);
        dp.setAttribute('data-win-control', 'WinJS.UI.DatePicker');

        if (options) {
            dp.setAttribute('data-win-options', JSON.stringify(options));
        }

        // NOTE: The datetime UI is created in a deferred UI manner so
        // we need to have the timeout() to allow the browser to go through
        // a few cycles before returning the object.
        return process(dp).then(function () {
            return WinJS.Promise.timeout().then(function () {
                if (dateObject) {
                    dp.winControl.current = dateObject;
                }
                return dp;
            });
        });
    }
    // return the select element containing the day component
    function dateElement(picker) {
        return picker.querySelector('.win-datepicker .win-datepicker-date');
    }

    // return the select element containing the month component
    function monthElement(picker) {
        return picker.querySelector('.win-datepicker .win-datepicker-month');
    }

    // if YEAR component is hidden, this will return null
    // return the select element containing the year component
    function yearElement(picker) {
        return picker.querySelector('.win-datepicker .win-datepicker-year');
    }

    function dateToString(date) {
        var result = "";
        if ('month' in date) result += "m=" + date.month.toString() + " ";
        if ('day' in date) result += "d=" + date.day.toString() + " ";
        if ('year' in date) result += "y=" + date.year.toString() + " ";
        return result;
    }

    // date object can contain values for 'day', 'month', 'year'.  If any of these values
    // is not present, function will expect querySelector to return null for that cell.
    function verifyDate(picker, date) {
        // 'March' and '03' (day) by default.
        // >>> more clear to use descrete strings to compare in each test case
        LiveUnit.LoggingCore.logComment("picker.winControl.current=" + picker.winControl.current + "; expected=" + dateToString(date));

        if ('day' in date) {
            LiveUnit.Assert.areEqual(date.day.toString() >> 0, dateElement(picker).value >> 0);
        } else {
            LiveUnit.Assert.areEqual(null, dateElement(picker).value);
        }

        if ('month' in date) {
            LiveUnit.Assert.areEqual(date.month.toString() >> 0, monthElement(picker).selectedIndex + 1);
        }

        if ('year' in date) {
            LiveUnit.Assert.areEqual(date.year.toString(), yearElement(picker).value);
        } else {
            LiveUnit.Assert.areEqual(null, yearElement(picker).value);
        }
    }

    function unhandledTestError(msg) {
        try {
            LiveUnit.Assert.fail("unhandled test exception: " + msg);
        } catch (ex) {
            // don't rethrow assertion failure exception
        }
    }

    // returns the text from the selected option of the specified select control
    function getText(selectElement) {
        return selectElement.options[selectElement.selectedIndex].text;
    }

    var dateBackEnd, monthBackEnd, yearBackEnd;
    var datePicker;

    function checkValues(e) {
        var d = new Date(datePicker.winControl.current);
        LiveUnit.Assert.areEqual(dateBackEnd, d.getDate(), "The backend date object has a wrong day value");
        LiveUnit.Assert.areEqual(monthBackEnd, d.getMonth(), "The backend date object has a wrong month value");
        LiveUnit.Assert.areEqual(yearBackEnd, d.getFullYear(), "The backend date object has a wrong year value");
    }

    function addChangeEvent(picker) {
        picker.addEventListener("change", checkValues);
        return function () { picker.removeListener(picker, checkValues); };
    }

    function daysInMonth(y, m) {
        if (isWinRTEnabled()) {
            var c = new Windows.Globalization.Calendar();
            c.month = m + 1;
            c.year = y;
            return c.numberOfDaysInThisMonth;
        }
        return new Date(y, m + 1, 0, 12, 0).getDate();
    }

    function lastDayInMonth(y, m) {
        if (isWinRTEnabled()) {
            var c = new Windows.Globalization.Calendar();
            c.month = m + 1;
            c.year = y;
            return c.numberOfDaysInThisMonth + c.firstDayInThisMonth - 1;
        }
        return new Date(y, m + 1, 0, 12, 0).getDate();
    }

    //;
    // I am thinking of removing the check boolean
    // using the three functions help us mimic the user selection scenario
    // rather than just creating one function with all the changes in it
    //

    function setMonth(picker, m, notFire = false) {
        var selectMonthElement = monthElement(picker);
        monthBackEnd = m - 1;
        selectMonthElement.selectedIndex = monthBackEnd;

        var numOfDays = lastDayInMonth(yearBackEnd, monthBackEnd);
        if (dateBackEnd > numOfDays)
            dateBackEnd = numOfDays;

        if (!notFire) {
            fireOnchange(selectMonthElement);
        }
    }

    function setYear(picker, y, notFire = false) {
        var selectYearElement = yearElement(picker);
        yearBackEnd = y;
        selectYearElement.value = yearBackEnd;

        var numOfDays = daysInMonth(yearBackEnd, monthBackEnd);
        if (dateBackEnd > numOfDays)
            dateBackEnd = numOfDays;

        if (!notFire) {
            fireOnchange(selectYearElement);
        }
    }

    function setDate(picker, d, notFire = false) {
        var selectDayElement = dateElement(picker);
        dateBackEnd = d;
        selectDayElement.selectedIndex = dateBackEnd - 1;
        if (!notFire)
            fireOnchange(selectDayElement);
    }

    function setValues() {
        var dateObj = new Date();
        dateBackEnd = dateObj.getDate();
        monthBackEnd = dateObj.getMonth();
        yearBackEnd = dateObj.getFullYear();
    }

    function cleanupDatePicker() {
        try {
            WinJS.Utilities.disposeSubTree(elementToBeRemoved);
            document.body.removeChild(elementToBeRemoved);
            elementToBeRemoved = null;

            if (!isWinRTEnabled()) {
                DatePicker.getInformation = DatePicker._getInformationJS;
            }
            else {
                DatePicker.getInformation = DatePicker._getInformationWinRT;
            }

        } catch (e) {
            LiveUnit.Assert.fail("cleanupDatePicker() failed: " + e);
        }
    }

    var changeHit,
        datechangeHit,
        monthchangeHit,
        yearchangeHit;

    var changeType = "change";

    function logEventHits(e) {
        LiveUnit.LoggingCore.logComment(e.type + ": changeHit=" + changeHit);
    }

    // note: change event only fires when changing value through UI
    var changeHandler = function (e) {
        changeHit++;
        LiveUnit.Assert.areEqual(e.type, changeType);
        logEventHits(e);
    };

    function attachEventListeners(picker) {
        changeHit = datechangeHit = monthchangeHit = yearchangeHit = 0;

        picker.addEventListener(changeType, changeHandler, false);
    }

    function removeEventListeners(picker) {
        changeHit = 0;

        picker.removeEventListener(changeType, changeHandler);
    }

    // fire a 'change' event on the provided target element
    function fireOnchange(targetElement) {
        var myEvent = document.createEvent('HTMLEvents');
        myEvent.initEvent('change', true, false);
        targetElement.dispatchEvent(myEvent);
    }

    var dateObjectUI, dataObjectBackEnd;
    var supportedCalenders = ["GregorianCalendar", "HijriCalendar", "HebrewCalendar", "JapaneseCalendar", "KoreanCalendar", "ThaiCalendar", "TaiwanCalendar", "UmAlQuraCalendar", "JulianCalendar"];

    function getActualUIOrder() {
        var domElement:any = document.getElementsByClassName('win-datepicker')[0];
        var datePos,
            monthPos,
            yearPos;
        for (var i = 0; i < 3; i++) {
            var elem = domElement.childNodes[i].className;
            if (elem.indexOf('picker-date') !== -1) {
                datePos = i;
            }
            else if (elem.indexOf('picker-month') !== -1) {
                monthPos = i;
            }
            else {
                yearPos = i;
            }
        }
        return getOrder(datePos, monthPos, yearPos);
    }
    function getOrder(datePos, monthPos, yearPos) {

        if (monthPos < yearPos && monthPos < datePos) {
            if (yearPos < datePos)
                return "MYD";
            else
                return "MDY";
        }
        else if (yearPos < monthPos && yearPos < datePos) {
            if (monthPos < datePos)
                return "YMD";
            else
                return "YDM";
        }
        else {
            if (yearPos < monthPos)
                return "DYM";
            else
                return "DMY";
        }
    }
    function getExpectedOrder(calendar) {
        var dtf = Windows.Globalization.DateTimeFormatting;
        var s = "day month.full year";
        var c = new dtf.DateTimeFormatter(s);
        var formatter = new dtf.DateTimeFormatter(s, c.languages, c.geographicRegion, calendar, c.clock);
        var pattern = formatter.patterns[0];
        return getOrder(pattern.indexOf("day"), pattern.indexOf("month"), pattern.indexOf("year"));
    }

    function removeLeadingZeros(val) {
        var i = 0;
        while (val.charAt(i) === '0') i++;
        var t = '';
        while (i < val.length)
            t += val.charAt(i++);
        return t;

    }
    function checkGlobValues(e) {
        var d = new Date(datePicker.winControl.current);
        var month = monthElement(datePicker);
        var year = yearElement(datePicker);
        var day = dateElement(datePicker);
        var temp = currentCalendar || '';

        LiveUnit.Assert.areEqual(dataObjectBackEnd.dateBackEnd, d.getDate(), "The backend date object has a wrong day value " + temp + " seed is " + getSeed() + " and number of Random Ticks is " + getCount());
        LiveUnit.Assert.areEqual(dataObjectBackEnd.monthBackEnd, d.getMonth(), "The backend date object has a wrong month value " + temp + " seed is " + getSeed() + " and number of Random Ticks is " + getCount());
        LiveUnit.Assert.areEqual(dataObjectBackEnd.yearBackEnd, d.getFullYear(), "The backend date object has a wrong year value " + temp + " seed is " + getSeed() + " and number of Random Ticks is " + getCount());
        //Check the UI
        if (dateObjectUI.dateUI !== day.value && dateObjectUI.dateUI !== removeLeadingZeros(day.value))
            LiveUnit.Assert.areEqual(dateObjectUI.dateUI, day.value, "The backend date object has a wrong day value " + temp + " seed is " + getSeed() + " and number of Random Ticks is " + getCount());
        if (dateObjectUI.monthUI !== month.value && dateObjectUI.monthUI !== removeLeadingZeros(month.value))
            LiveUnit.Assert.areEqual(dateObjectUI.monthUI, month.value, "The backend date object has a wrong month value " + temp + " seed is " + getSeed() + " and number of Random Ticks is " + getCount());
        if (dateObjectUI.yearUI !== year.value && dateObjectUI.yearUI !== removeLeadingZeros(year.value))
            LiveUnit.Assert.areEqual(dateObjectUI.yearUI, year.value, "The backend date object has a wrong year value " + temp + " seed is " + getSeed() + " and number of Random Ticks is " + getCount());

    }

    function addGlobChangeEvent(picker) {
        picker.addEventListener("change", checkGlobValues);
        return function () { picker.removeListener(picker, checkGlobValues); };
    }

    function setBackEnd(calendar) {

        calendar.changeCalendarSystem("GregorianCalendar");
        dataObjectBackEnd = {
            yearBackEnd: calendar.year,
            monthBackEnd: calendar.month - 1,
            dateBackEnd: calendar.day
        };
    }
    function setUI(myCalendar, calendarType) {
        myCalendar.changeCalendarSystem(calendarType);
        var dtf = Windows.Globalization.DateTimeFormatting;
        var s = "shortdate";
        var c = new dtf.DateTimeFormatter(s);
        var formatter = new dtf.DateTimeFormatter(s, c.languages, c.geographicRegion, calendarType, c.clock);
        var pattern = formatter.patterns[0];
        var era = '';
        if (pattern.indexOf("era") !== -1)
            era = " " + myCalendar.eraAsString();
        dateObjectUI = {
            yearUI: myCalendar.yearAsString() + era,
            monthUI: myCalendar.monthAsString(),
            dateUI: myCalendar.dayAsString()
        };
    }
    function getControls(picker) {
        return { yearSelect: yearElement(picker), monthSelect: monthElement(picker), dateSelect: dateElement(picker) };
    }

    function checkMonthNames(selectControls, calendarName, year?) {
        var monthSelect = selectControls.monthSelect;
        if (isWinRTEnabled()) {
            var c = new glob.Calendar();
            var myCalendar = new glob.Calendar(c.languages, calendarName, c.getClock());
            if (year) {
                year = parseInt(year);
                //c.addYears(year - c.year);
                myCalendar = new glob.Calendar(c.languages, calendarName, c.getClock());
                myCalendar.addMonths(monthSelect.selectedIndex + 1 - myCalendar.month);
                myCalendar.month = monthSelect.selectedIndex + 1;
                myCalendar.addYears(year - myCalendar.year);
                myCalendar.day = selectControls.dateSelect.selectedIndex + 1;
                //myCalendar.addYears(year - myCalendar.year);
            }
            var totalNumOfMonths = myCalendar.numberOfMonthsInThisYear;
            for (var i = 0; i < totalNumOfMonths; i++) {
                myCalendar.addMonths(-1 * myCalendar.month + (i + 1));
                LiveUnit.Assert.areEqual(myCalendar.monthAsString(), monthSelect[i].value, "Incorrect month name");
            }
        }
    }

    function hijriLeapYear(year) {
        var yearValue = parseInt(year);
        var r = yearValue % 30;
        return (r === 2 || r === 5 || r === 7 || r === 10 || r === 13 || r === 16 || r === 18 || r === 21 || r === 24 || r === 26 || r === 29);
    }

    function isHebrewLeapYear(year) {
        var yearValue = parseInt(year);
        var r = yearValue % 19;
        return (r === 3 || r === 6 || r === 8 || r === 11 || r === 14 || r === 17 || r === 19);
    }

    function validateMonth(month, isLeap, numOfDays) {
        var val = -1;
        switch (month) {
            case 1:
            case 5:
                val = 30;
                break;
            case 4:
                val = 29;
                break;
            case 6:
                if (!isLeap)
                    val = 29;
                else
                    val = 30;
                break;
            case 7:
                if (isLeap)
                    val = 29;
                else
                    val = 30;
                break;
            case 8:
                if (!isLeap)
                    val = 29;
                else
                    val = 30;
                break;
            case 9:
                if (!isLeap)
                    val = 30;
                else
                    val = 29;
                break;
            case 10:
                if (!isLeap)
                    val = 29;
                else
                    val = 30;
                break;
            case 11:
                if (!isLeap)
                    val = 30;
                else
                    val = 29;
                break;
            case 12:
                if (!isLeap)
                    val = 29;
                else
                    val = 30;
                break;
            case 13:
                val = 29;

        }

        if (val !== -1)
            LiveUnit.Assert.areEqual(val, numOfDays, "incorrect number of days in month " + month);
        else
            if (numOfDays !== 29 && numOfDays !== 30)
                LiveUnit.Assert.areEqual(numOfDays, "incorrect number of days in month " + month);
    }

    function getMaxDay(selectControl) {
        var max = -1;
        for (var i = 0; i < selectControl.length; i++) {
            var t = parseInt(selectControl[i].value);
            if (max < t)
                max = t;
        }
        return max;
    }

    function isGregorianLeapYear(year) {
        var val = parseInt(year);
        return ((val % 4 === 0 && val % 100 !== 0) || val % 400 === 0);
    }

    function convertFromKoreanToGreogrianYear(year) {
        return year - (4334 - 2001);
    }

    function numInYear(year) {
        var actualYear = '';
        for (var i = 0; i < year.length; i++) {
            var c = year.charAt(i);
            if (c >= '0' && c <= '9')
                actualYear += c;
            else if (actualYear !== '')
                break;

        }
        return actualYear;
    }

    function convertFromThaiToGreogrianYear(year) {
        return year - (2544 - 2001);
    }

    function isJulianLeapYear(year) {
        return (year % 4 === 0);
    }

    function convertFromTaiwanToGreogrianYear(year) {
        return year + (2001 - 90); //because 2001 represents 90

    }

    //These are stubs until replaced with the ABI
    function getSeed() {
        return 100;
    }

    function getCount() {
        return 2;
    }

    var currentCalendar;

    function verifyDatePickerContent(picker, date) {

        if ('day' in date) {
            LiveUnit.Assert.areEqual(date.day.toString(), dateElement(picker).value);
        } else {
            LiveUnit.Assert.areEqual(null, dateElement(picker).value);
        }

        if ('month' in date) {
            LiveUnit.Assert.areEqual(date.month.toString(), monthElement(picker).value);
        }

        if ('year' in date) {
            LiveUnit.Assert.areEqual(date.year.toString(), yearElement(picker).value);
        } else {
            LiveUnit.Assert.areEqual(null, yearElement(picker).value);
        }
    }

    var numofCalls;
    var getInformationJS = function (startDate, endDate) {

        var minYear = startDate.getFullYear();
        var maxYear = endDate.getFullYear();
        var yearSource = {
            getLength: function () { return Math.max(0, maxYear - minYear + 1); },
            getValue: function (index) { return minYear + index; }
        };

        var months = ["firstMonth", "secondMonth", "thirdMonth", "fourthMonth", "fifthMonth", "sixthMonth"];
        var monthSource = function (yearIndex) {
            return {
                getLength: function () { return months.length; },
                getValue: function (index) { return months[index]; },
                getMonthNumber: function (index) { return Math.min(index, months.length - 1); }
            };
        };

        var dateSource = function (yearIndex, monthIndex) {

            var year = yearSource.getValue(yearIndex);

            var maxValue = 0;
            switch (monthIndex) {
                case 1:
                case 2:
                case 4:
                case 5:
                    maxValue = 61;
                    break;
                case 0:
                    if (year % 4 === 0) {
                        maxValue = 60;
                    }
                    else {
                        maxValue = 59;
                    }
                    break;
                case 3:
                    maxValue = 62;
                    break;

            }

            return {
                getLength: function () { return maxValue; },
                getValue: function (index) { return "" + (index + 1); },
                getDateNumber: function (index) { return Math.min(index + 1, maxValue); }
            };
        };

        return {
            order: ["date", "year", "month"],
            getDate: function (index) {
                var year = yearSource.getValue(index.year);
                var month = monthSource(index.year).getMonthNumber(index.month) * 2;

                var numOfDaysInPreviousMonth = (new Date(year, month + 1, 0)).getDate();
                month += ((index.date > (new Date(year, month + 1, 0)).getDate()) ? 1 : 0);
                var day = (index.date + 1 > numOfDaysInPreviousMonth) ? index.date + 1 - numOfDaysInPreviousMonth : index.date + 1;
                day = Math.min(day, (new Date(year, month + 1, 0).getDate()));

                return new Date(year, month, day);
            },
            getIndex: function (date) {
                numofCalls++;
                var yearIndex = 0;
                var year = date.getFullYear();
                if (year < minYear) {
                    yearIndex = 0;
                }
                else if (year > this.maxYear) {
                    yearIndex = yearSource.getLength() - 1;
                }
                else {
                    yearIndex = date.getFullYear() - minYear;
                }

                var monthIndex = Math.min(date.getMonth() / 2, monthSource(yearIndex).getLength()) | 0;

                var dateIndex;
                if (date.getMonth() % 2 === 0) {
                    dateIndex = Math.min(date.getDate(), dateSource(yearIndex, monthIndex).getLength()) - 1;
                }
                else {
                    var dateValue = date.getDate() + (new Date(year, date.getMonth(), 0, 12)).getDate();
                    dateIndex = Math.min(dateValue, dateSource(yearIndex, monthIndex).getLength()) - 1;
                }

                return {
                    year: yearIndex,
                    month: monthIndex,
                    date: dateIndex
                };
            },
            years: yearSource,
            months: monthSource,
            dates: dateSource
        };
    };
    var ControlOrder = function (x, y, w, h) {
        this.startX = x;
        this.startY = y;
        this.width = w;
        this.height = h;  //to be used later if we decided to change the snap view shape of controls
    };

    function checkCorrectCSS(controlsPosition) {
        for (var i = 0; i < controlsPosition.length - 1; i++) {
            if (controlsPosition[i].startY === controlsPosition[i + 1].startY) {   // to protect against snap view
                LiveUnit.Assert.areEqual(controlsPosition[i].startX + controlsPosition[i].width + 20, controlsPosition[i + 1].startX, "");
            }
        }
    }

    function checkDayCount(controls) {
        var year = parseInt(controls.yearSelect.value);
        var month = controls.monthSelect.selectedIndex;
        var maxValue;
        switch (month) {
            case 1:
            case 2:
            case 4:
            case 5:
                maxValue = 61;
                break;
            case 0:
                if (year % 4 === 0) {
                    maxValue = 60;
                }
                else {
                    maxValue = 59;
                }
                break;
            case 3:
                maxValue = 62;
                break;
        }
        return maxValue === controls.dateSelect.length;
    }
    
    export class DatePickerDecl {
        

        xtestKnownDayWithIndependentStateofSamoa = function (complete) {

            var cleanup;
            createPickerWithAppend({
                current: new Date(2012, 0, 1),
                calendar: 'GregorianCalendar'
            }).then(function (picker) {
                    datePicker = picker;
                    var selectControls = getControls(picker);
                    var year = numInYear(selectControls.yearSelect.value);
                    LiveUnit.Assert.areEqual("2012", year, "Error in known year in Independent State of Samoa");
                    LiveUnit.Assert.areEqual(0, selectControls.monthSelect.selectedIndex, "Error in known month in Independent State of Samoa");
                    LiveUnit.Assert.areEqual(0, selectControls.dateSelect.selectedIndex, "Error in known day in Independent State of Samoa");

                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, unhandledTestError);
        };

        testParameterOfChangeEvent = function (complete) {
            var cleanup;
            createPickerWithAppend({ calendar: 'GregorianCalendar' }).then(function (picker) {
                datePicker = picker;
                cleanup = addChangeEvent(picker);
                //testing 31st of December 2015
                setValues();
                setMonth(picker, 12);
                setDate(picker, 31);
                setYear(picker, 2015);
                verifyDate(picker, { day: 31, month: 12, year: 2015 });

            })
                .then(null, unhandledTestError)
                .then(cleanup) //placed after the error handler to make sure it gets removed even if the test case failed
                .then(cleanupDatePicker)
                .then(complete, unhandledTestError);
        };

        testMaxAndMinYearInGregorian = function (complete) {
            //BugID: 628192
            if (isWinRTEnabled()) {

                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    maxYear: 2000,
                    minYear: 0
                }).
                    then(function (picker) {
                        datePicker = picker;
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual("1", selectControls.yearSelect[0].value, "Incorrect min date");
                        LiveUnit.Assert.areEqual("2000", selectControls.yearSelect[selectControls.yearSelect.length - 1].value, "Incorrect max date");
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testSpecialDayWithIndependentStateofSamoa = function (complete) {

            var cleanup;
            if (isWinRTEnabled()) {
                createPickerWithAppend({ calendar: 'GregorianCalendar' }).then(function (picker) {
                    datePicker = picker;
                    cleanup = addChangeEvent(picker);
                    //testing 31st of January 2012
                    setValues();

                    yearBackEnd = 2012;
                    setYear(picker, 2012);
                    monthBackEnd = 1;
                    setMonth(picker, 1);

                    var selectDayElement = dateElement(picker);
                    dateBackEnd = 31;
                    selectDayElement.selectedIndex = selectDayElement.length - 1;
                    fireOnchange(selectDayElement);

                    verifyDate(picker, { day: 31, month: 1, year: 2012 });

                })
                    .then(null, unhandledTestError)
                    .then(cleanup) //placed after the error handler to make sure it gets removed even if the test case failed
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else {
                complete();
            }
        };

        testMaxAndMinYearInGregorian_temp = function (complete) {
            if (isWinRTEnabled()) {

                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    maxYear: 50,
                    minYear: 0
                }).then(function (picker) {
                        datePicker = picker;
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual("1", selectControls.yearSelect[0].value, "Incorrect min date");
                        LiveUnit.Assert.areEqual("50", selectControls.yearSelect[selectControls.yearSelect.length - 1].value, "Incorrect max date");
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testChangeEventParameterInNonLeapYear = function (complete) {
            // bug #436665
            var cleanup;
            createPickerWithAppend({ calendar: 'GregorianCalendar' }).then(function (picker) {
                datePicker = picker;
                cleanup = addChangeEvent(picker);
                setValues();
                setMonth(picker, 12);
                setDate(picker, 31);
                setYear(picker, 2015);
                verifyDate(picker, { day: 31, month: 12, year: 2015 });
                //testing 28th of Feb 2015
                setMonth(picker, 2);

                verifyDate(picker, { day: 28, month: 2, year: 2015 });

            })
                .then(null, unhandledTestError)
                .then(cleanup) //placed after the error handler to make sure it gets removed even if the test case failed
                .then(cleanupDatePicker)
                .then(complete, unhandledTestError);
        };

        testLeapYearParameter = function (complete) {
            // bug #436665
            var cleanup;
            createPickerWithAppend({ calendar: 'GregorianCalendar' }).then(function (picker) {
                datePicker = picker;
                cleanup = addChangeEvent(picker);

                setValues();
                setMonth(picker, 12);
                setDate(picker, 31);
                setYear(picker, 2015);

                verifyDate(picker, { day: 31, month: 12, year: 2015 });
                //testing 28th of Feb 2016
                setYear(picker, 2016);
                setMonth(picker, 2);
                verifyDate(picker, { day: 29, month: 2, year: 2016 });

            })
                .then(null, unhandledTestError)
                .then(cleanup)
                .then(cleanupDatePicker) //placed after the error handler to make sure it gets removed even if the test case failed
                .then(complete, unhandledTestError);
        };

        testMonthChange = function (complete) {

            var cleanup;
            createPickerWithAppend({ calendar: 'GregorianCalendar' }).then(function (picker) {
                datePicker = picker;
                cleanup = addChangeEvent(picker);

                setValues();
                setMonth(picker, 2);
                setDate(picker, 28);
                setYear(picker, 2015);

                verifyDate(picker, { day: 28, month: 2, year: 2015 });
                //testing 28th of Feb 2016

                setMonth(picker, 3);


                verifyDate(picker, { day: 28, month: 3, year: 2015 });

            })
                .then(null, unhandledTestError)
                .then(cleanup)
                .then(cleanupDatePicker) //placed after the error handler to make sure it gets removed even if the test case failed
                .then(complete, unhandledTestError);
        };

        testSimpleDate = function (complete) {
            createPickerWithAppend({ calendar: 'GregorianCalendar' }).then(function (picker) {
                var today = new Date();
                verifyDate(picker, {
                    day: today.getDate(),
                    month: today.getMonth() + 1,
                    year: today.getFullYear()
                });
            })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testDefaults = function (complete) {
            // validate datePicker defaults
            createPickerWithAppend({ calendar: 'GregorianCalendar' }).then(function (picker) {
                var c = picker.winControl;
                LiveUnit.Assert.isFalse(c.disabled);

                // verify all 3 elements are displayed, style display=""
                LiveUnit.Assert.areEqual("", monthElement(picker).style.display);
                LiveUnit.Assert.areEqual("", dateElement(picker).style.display);
                LiveUnit.Assert.areEqual("", yearElement(picker).style.display);

                var year = new Date().getFullYear();
                var min = year - 100;
                var max = year + 100;
                LiveUnit.Assert.areEqual(min, c.minYear);
                LiveUnit.Assert.areEqual(max, c.maxYear);
            })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testDefaultFormats = function (complete) {
            // validate datePicker default format
            createPickerWithAppend({
                current: new Date(1978, 3, 7),
                calendar: 'GregorianCalendar'
            }).then(function (picker) {

                    LiveUnit.Assert.areEqual("April", getText(monthElement(picker)));

                    if (isWinRTEnabled()) {
                        // .substring(1) strips the direction marker off the text
                        //
                        LiveUnit.Assert.areEqual("7", getText(dateElement(picker)).substring(1));
                        LiveUnit.Assert.areEqual("1978", getText(yearElement(picker)).substring(1));
                    }
                    else {
                        LiveUnit.Assert.areEqual("7", getText(dateElement(picker)));
                        LiveUnit.Assert.areEqual("1978", getText(yearElement(picker)));
                    }
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testSetCurrentFromDate = function (complete) {
            createPickerWithAppend({ calendar: 'GregorianCalendar' }).then(function (picker) {
                var date = new Date(2011, 1, 3, 10, 11, 12);
                picker.winControl.current = date;
                verifyDate(picker, { day: 3, month: 2, year: 2011 });
            })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };


        testDisabled1 = function (complete) {
            // create initial control in disabled state
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(1972, 4, 1),
                disabled: true
            }).then(function (picker) {
                    verifyDate(picker, { day: 1, month: 5, year: 1972 });
                    LiveUnit.Assert.isTrue(picker.winControl.disabled);

                    picker.winControl.disabled = false;
                    LiveUnit.Assert.isFalse(picker.winControl.disabled);
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testDisabled2 = function (complete) {
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(1968, 2, 3),
                disabled: false
            }).then(function (picker) {
                    verifyDate(picker, { day: 3, month: 3, year: 1968 });
                    LiveUnit.Assert.isFalse(picker.winControl.disabled);

                    picker.winControl.disabled = true;
                    LiveUnit.Assert.isTrue(picker.winControl.disabled);
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testCustomDate = function (complete) {
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2005, 1, 3)
            }).then(function (picker) {
                    verifyDate(picker, { day: 3, month: 2, year: 2005 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testLeapYear = function (complete) {
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2000, 1, 29)
            }).then(function (picker) {
                    verifyDate(picker, { day: 29, month: 2, year: 2000 });
                })
            // handle any errors encountered in createPickerWithAppend() through the unhandledTestError
            // function.  Note the first parameter is null because we want to call the harness
            // provided complete function if error or not.  This is handled in the next .then()
            // statement.
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)

            // call the harness provided complete function when done.  Note complete is called
            // when actually complete (no errors) or if there was an error in the previous
            // then() statement's error handler.
                .then(complete, complete);
        };

        testNonLeapYear = function (complete) {
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2001, 1, 29)
            }).then(function (picker) {
                    verifyDate(picker, { day: 1, month: 3, year: 2001 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        // adjust current year to minYear if current year < minYear
        testMinYear = function (complete) {
            //BugID: 450489 - closed by design
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(1989, 3, 20),
                minYear: 2000
            }).then(function (picker) {
                    verifyDate(picker, { day: 20, month: 4, year: 2000 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testMaxYear = function (complete) {
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2035, 11, 29),
                maxYear: 2011
            }).then(function (picker) {
                    verifyDate(picker, { day: 29, month: 12, year: 2011 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testMaxYear2 = function (complete) {
            // use current date, apply max year < current date
            var today = new Date();
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                maxYear: 2011,
                current: new Date(2121, 0, 2)
            }).then(function (picker) {
                    verifyDate(picker, { day: 2, month: 1, year: 2011 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testYearRange1 = function (complete) {
            // verify year > range snaps to maxYear
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2021, 11, 1),
                maxYear: 2001,
                minYear: 2000
            }).then(function (picker) {
                    verifyDate(picker, { day: 1, month: 12, year: 2001 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testYearRange1_second = function (complete) {
            // verify year < range snaps to min year
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(1921, 11, 2),
                maxYear: 2001,
                minYear: 2000
            }).then(function (picker) {
                    verifyDate(picker, { day: 2, month: 12, year: 2000 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testYearRange2 = function (complete) {
            // verify if minyear > maxyear, maxyear == minyear
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(1972, 11, 3),
                maxYear: 1995,
                minYear: 2000
            }).then(function (picker) {
                    verifyDate(picker, { day: 3, month: 12, year: 2000 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testYearRange3 = function (complete) {
            // verify if minyear > maxyear, minyear == maxyear, different attribute order
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(1972, 11, 3),
                minYear: 2000,
                maxYear: 1995
            }).then(function (picker) {
                    verifyDate(picker, { day: 3, month: 12, year: 1995 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testYearRange4 = function (complete) {
            // verify when minyear == maxyear, year snaps to minyear
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(1935, 11, 4),
                maxYear: 1995,
                minYear: 1995
            }).then(function (picker) {
                    verifyDate(picker, { day: 4, month: 12, year: 1995 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testYearRange5 = function (complete) {
            //BugID: 628192
            // verify invalid input, minyear && maxyear are ignored
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(1942, 11, 5),
                maxYear: 1995,
                minYear: 0 // UNDONE: -1995 (1996 BC fails in WinRT mode)
            }).then(function (picker) {
                    verifyDate(picker, { day: 5, month: 12, year: 1942 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testYearRange5_temp = function (complete) {

            // verify invalid input, minyear && maxyear are ignored
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(1942, 11, 5),
                maxYear: 1995,
                minYear: 1910 // UNDONE: -1995 (1996 BC fails in WinRT mode)
            }).then(function (picker) {
                    verifyDate(picker, { day: 5, month: 12, year: 1942 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testYearRange6 = function (complete) {
            // verify min/max adjustment sequence of squirrely-ness
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                minYear: 2010,
                maxYear: 2020,
                current: new Date(2011, 11, 5)
            }).then(function (picker) {
                    verifyDate(picker, { day: 5, month: 12, year: 2011 });

                    var c = picker.winControl;
                    c.minYear = 2030;   // min > previous max
                    LiveUnit.Assert.areEqual(2030, c.minYear);
                    LiveUnit.Assert.areEqual(2030, c.maxYear);

                    c.maxYear = 2130;
                    LiveUnit.Assert.areEqual(2030, c.minYear);
                    LiveUnit.Assert.areEqual(2130, c.maxYear);

                    c.current = new Date(2100, 6, 6);
                    verifyDate(picker, { day: 6, month: 7, year: 2100 });

                    c.maxYear = 1980;   // max < previous min so min == max == 1980
                    LiveUnit.Assert.areEqual(1980, c.minYear);
                    LiveUnit.Assert.areEqual(1980, c.maxYear);

                    c.minYear = 2000;   // min > max so max == min == 2000
                    LiveUnit.Assert.areEqual(2000, c.minYear);
                    LiveUnit.Assert.areEqual(2000, c.maxYear);
                    c.current = new Date(1990, 1, 3);
                    verifyDate(picker, { day: 3, month: 2, year: 2000 });

                    c.maxYear = 2100;
                    LiveUnit.Assert.areEqual(2100, c.maxYear);
                    LiveUnit.Assert.areEqual(2000, c.minYear);
                    c.current = new Date(2050, 2, 5);
                    verifyDate(picker, { day: 5, month: 3, year: 2050 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testYearRange7 = function (complete) {
            // verify min year only, year snaps to minyear
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(1990, 1, 1),
                minYear: 2000
            }).then(function (picker) {
                    verifyDate(picker, { day: 1, month: 2, year: 2000 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testYearRange8 = function (complete) {
            // verify max year only, year doesn't go beyond maxyear
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2100, 1, 1),
                maxYear: 2000
            }).then(function (picker) {
                    verifyDate(picker, { day: 1, month: 2, year: 2000 });

                    var c = picker.winControl;

                    // verify dates < max year still OK
                    c.current = new Date(1990, 1, 3);
                    verifyDate(picker, { day: 3, month: 2, year: 1990 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        xtestDayFormatting = function (complete) {
            // bug: win8TFS:245862 - consume real WinJS.Glob formatting not yet implemented
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2012, 11, 1),
                dayFormat: 'd'
            }).then(function (picker) {
                    verifyDate(picker, { day: '1', month: 12, year: 2012 });
                }).then(null, unhandledTestError)
                .then(cleanupDatePicker);

            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2012, 11, 1),
                dayFormat: 'dd'
            }).then(function (picker) {
                    verifyDate(picker, { day: '01', month: 12, year: 2012 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker);


            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2012, 11, 1),
                dayFormat: ''
            }).then(function (picker) {
                    verifyDate(picker, { month: 12, year: 2012 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };


        xtestMonthFormatting = function (complete) {
            // bug: win8TFS:245862 - consume real WinJS.Glob formatting not yet implemented
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2012, 2, 12),
                monthFormat: 'M'
            }).then(function (picker) {
                    verifyDate(picker, { day: 12, month: '3', year: 2012 });
                }).then(null, unhandledTestError)
                .then(cleanupDatePicker);

            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2012, 2, 12),
                monthFormat: 'MM'
            }).then(function (picker) {
                    verifyDate(picker, { day: 12, month: '03', year: 2012 });
                }).then(null, unhandledTestError)
                .then(cleanupDatePicker);

            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2012, 2, 12),
                monthFormat: 'MMMM'
            }).then(function (picker) {
                    verifyDate(picker, { day: 12, month: 'March', year: 2012 });
                }).then(null, unhandledTestError)
                .then(cleanupDatePicker);

            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2012, 2, 12),
                monthFormat: ''
            }).then(function (picker) {
                    verifyDate(picker, { day: 12, year: 2012 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        xtestYearFormatting = function (complete) {
            // bug: win8TFS:245862 - consume real WinJS.Glob formatting not yet implemented
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2023, 11, 1),
                yearFormat: 'yy'
            }).then(function (picker) {
                    verifyDate(picker, { day: 1, month: 12, year: '23' });
                }).then(null, unhandledTestError)
                .then(cleanupDatePicker);

            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2056, 11, 4),
                yearFormat: 'yyyy'
            })
                .then(function (picker) {
                    verifyDate(picker, { day: '04', month: 12, year: '2056' });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker);

            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2089, 11, 7),
                yearFormat: ''
            })
                .then(function (picker) {
                    verifyDate(picker, { day: 7, month: 12 });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

    

        testFireMonthchangeEvent = function (complete) {
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2011, 3, 1)
            }).then(function (picker) {
                    attachEventListeners(picker);
                    fireOnchange(monthElement(picker));

                    LiveUnit.Assert.areEqual(1, changeHit);
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testFireDatechangeEvent = function (complete) {
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2011, 3, 1)
            }).then(function (picker) {
                    attachEventListeners(picker);
                    fireOnchange(dateElement(picker));

                    LiveUnit.Assert.areEqual(1, changeHit);
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testFireYearchangeEvent = function (complete) {
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2011, 3, 1)
            }).then(function (picker) {
                    attachEventListeners(picker);
                    fireOnchange(yearElement(picker));

                    LiveUnit.Assert.areEqual(1, changeHit);
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testFireAllEventsAndRemove = function (complete) {
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2011, 3, 1)
            }).then(function (picker) {
                    attachEventListeners(picker);
                    verifyDate(picker, { day: '01', month: '04', year: '2011' });

                    fireOnchange(monthElement(picker));
                    verifyDate(picker, { day: '01', month: '04', year: '2011' });
                    fireOnchange(dateElement(picker));
                    verifyDate(picker, { day: '01', month: '04', year: '2011' });
                    fireOnchange(yearElement(picker));
                    verifyDate(picker, { day: '01', month: '04', year: '2011' });

                    LiveUnit.Assert.areEqual(3, changeHit);

                    // remove event listeners, verify events not fired
                    removeEventListeners(picker);

                    fireOnchange(monthElement(picker));
                    fireOnchange(dateElement(picker));
                    fireOnchange(yearElement(picker));

                    LiveUnit.Assert.areEqual(0, changeHit);

                    // make sure date hasn't changed
                    verifyDate(picker, { day: '01', month: '04', year: '2011' });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testFireMultipleChangeEvents = function (complete) {
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2011, 3, 1)
            }).then(function (picker) {
                    attachEventListeners(picker);

                    for (var n = 1; n <= 15; n++) {
                        fireOnchange(monthElement(picker));
                        fireOnchange(dateElement(picker));
                        fireOnchange(yearElement(picker));

                        LiveUnit.Assert.areEqual(n * 3, changeHit);
                    }
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testSettingDateObject = function (complete) {
            // BUG: win8TFS: 245862 - consume real WinJS.Glob
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2011, 3, 1)
            }).then(function (picker) {
                    // note: javascript Date object has 0 based months (0 == January)
                    //    so Feb 03, 2011 == Date(2011, 02, 03)
                    var date = new Date(2011, 1, 3);
                    picker.winControl.current = date;
                    verifyDate(picker, { day: '03', month: '02', year: '2011' });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testdatechangeEvent = function (complete) {
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2011, 3, 1)
            }).then(function (picker) {
                    verifyDate(picker, { day: '01', month: '04', year: '2011' });
                    attachEventListeners(picker);

                    // change the day
                    picker.winControl.current = 'April 02, 2011';
                    verifyDate(picker, { day: '02', month: '04', year: '2011' });
                    LiveUnit.Assert.areEqual(0, changeHit);
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testmonthchangeEvent = function (complete) {
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2011, 3, 1)
            }).then(function (picker) {
                    verifyDate(picker, { day: '01', month: '04', year: '2011' });

                    attachEventListeners(picker);

                    // change the month
                    picker.winControl.current = 'May 01, 2011';
                    verifyDate(picker, { day: '01', month: '05', year: '2011' });
                    LiveUnit.Assert.areEqual(0, changeHit);
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testyearchangeEvent = function (complete) {
            // BUG: 266243 datePicker needs to use Date.getDate() to compare dates instead of Date.getDay() - day of week
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2011, 3, 1)
            }).then(function (picker) {
                    verifyDate(picker, { day: '01', month: '04', year: '2011' });

                    attachEventListeners(picker);

                    // change the year
                    picker.winControl.current = 'April 01, 2012';
                    verifyDate(picker, { day: '01', month: '04', year: '2012' });
                    LiveUnit.Assert.areEqual(0, changeHit);
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testCurrentAttribute = function (complete) {
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2011, 0, 1)
            }).then(function (picker) {
                    var current = picker.winControl.current;
                    verifyDate(picker, { day: '01', month: '01', year: '2011' });
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        testThreeEventsAndRemove = function (complete) {
            createPickerWithAppend({
                calendar: 'GregorianCalendar',
                current: new Date(2011, 3, 1)
            }).then(function (picker) {
                    attachEventListeners(picker);
                    verifyDate(picker, { day: '01', month: '04', year: '2011' });

                    // change all 3
                    picker.winControl.current = 'June 03, 2013';
                    verifyDate(picker, { day: '03', month: '06', year: '2013' });
                    LiveUnit.Assert.areEqual(0, changeHit);

                    // remove event listeners, verify events still not received
                    removeEventListeners(picker);
                    picker.winControl.current = new Date(2014, 6, 4);
                    verifyDate(picker, { day: '04', month: '07', year: '2014' });
                    LiveUnit.Assert.areEqual(0, changeHit);
                })
                .then(null, unhandledTestError)
                .then(cleanupDatePicker)
                .then(complete, complete);
        };

        

        

        testHijriCalender = function (complete) {
            //BugID: 446784
            if (isWinRTEnabled()) {
                var calendarType = 'HijriCalendar';
                var cleanup;
                createPickerWithAppend({
                    calendar: calendarType,
                    current: new Date(2011, 9, 25)
                }).then(function (picker) {
                        datePicker = picker;
                        cleanup = addGlobChangeEvent(picker);
                        var c = new glob.Calendar();

                        var myCalendar = new glob.Calendar(c.languages, "GregorianCalendar", c.getClock());
                        myCalendar.year = 2011;
                        myCalendar.month = 10;
                        myCalendar.day = 25;
                        myCalendar.changeCalendarSystem("HijriCalendar");

                        setBackEnd(myCalendar);
                        setUI(myCalendar, calendarType);
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendarType), getActualUIOrder(), "Incorrect UI order");
                        checkMonthNames(selectControls, calendarType);

                        myCalendar.addMonths(1);
                        ++selectControls.monthSelect.selectedIndex;
                        setBackEnd(myCalendar);
                        setUI(myCalendar, calendarType);
                        fireOnchange(selectControls.monthSelect);

                    })
                    .then(null, unhandledTestError)
                    .then(cleanup) //placed after the error handler to make sure it gets removed even if the test case failed
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testUpdateDatePickerToHijriCalendar = function (complete) {

            if (isWinRTEnabled()) {
                var cleanup;
                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    current: new Date(2011, 9, 25)
                }).then(function (picker) {
                        datePicker = picker;
                        cleanup = addGlobChangeEvent(picker);
                        var c = new glob.Calendar();
                        var calendarType = "GregorianCalendar";
                        var myCalendar = new glob.Calendar(c.languages, calendarType, c.getClock());

                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendarType), getActualUIOrder(), "Incorrect UI order for GregorianCalendar");

                        calendarType = "HijriCalendar";
                        picker.winControl.calendar = calendarType;
                        myCalendar.changeCalendarSystem(calendarType);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendarType), getActualUIOrder(), "Incorrect UI order for HijriCalendar");
                    })
                    .then(null, unhandledTestError)
                    .then(cleanup) //placed after the error handler to make sure it gets removed even if the test case failed
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testHijriCalenderLeapDays = function (complete) {
            if (isWinRTEnabled()) {
                var calendarType = 'HijriCalendar';
                createPickerWithAppend({
                    calendar: calendarType
                }).then(function (picker) {
                        datePicker = picker;
                        var c = new glob.Calendar();
                        //var calendar = picker['data-win-control'].calendar;
                        var myCalendar = new glob.Calendar(c.languages, calendarType, c.getClock());
                        var totalNumOfDays = 30;

                        var selectControls = getControls(picker);
                        checkMonthNames(selectControls, calendarType);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendarType), getActualUIOrder(), "Incorrect UI order");
                        for (var i = 0; i < 12; i++) {
                            selectControls.monthSelect.selectedIndex = i;
                            fireOnchange(selectControls.monthSelect);
                            if (i === 11 && hijriLeapYear(selectControls.yearSelect.value))
                                i++;
                            LiveUnit.Assert.areEqual(totalNumOfDays - (i % 2), selectControls.dateSelect.length, "Error in the number of days in " + selectControls.monthSelect.value + " the Hijri calendar");
                        }


                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testHijriCalenderLeapDaysInLeapYears = function (complete) {
            if (isWinRTEnabled()) {
                var calendarType = 'HijriCalendar';
                createPickerWithAppend({
                    calendar: calendarType
                }).then(function (picker) {
                        datePicker = picker;
                        var c = new glob.Calendar();
                        var calendar = calendarType;
                        var myCalendar = new glob.Calendar(c.languages, calendar, c.getClock());
                        var totalNumOfDays = 30;

                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        selectControls.yearSelect.value = "1431"; //example of Leap year
                        fireOnchange(selectControls.yearSelect);
                        checkMonthNames(selectControls, calendar);
                        for (var i = 0; i < 12; i++) {
                            selectControls.monthSelect.selectedIndex = i;
                            fireOnchange(selectControls.monthSelect);
                            if (i === 11 && hijriLeapYear(selectControls.yearSelect.value))
                                i++;
                            LiveUnit.Assert.areEqual(totalNumOfDays - (i % 2), selectControls.dateSelect.length, "Error in the number of days in " + selectControls.monthSelect.value + " the Hijri calendar");
                        }
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testSpecialHebrewCalendarScenario = function (complete) {
            if (isWinRTEnabled()) {
                var calendarType = 'HebrewCalendar';
                createPickerWithAppend({
                    calendar: calendarType
                }).then(function (picker) {
                        datePicker = picker;
                        var calendar = calendarType;
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        var d = new Date();
                        var currentYear = d.getFullYear();
                        //5784 in hebrew === 2024 in Gregorian
                        selectControls.yearSelect.selectedIndex = selectControls.yearSelect.selectedIndex + (2024 - currentYear);

                        fireOnchange(selectControls.yearSelect);

                        selectControls.dateSelect.selectedIndex = 28;
                        fireOnchange(selectControls.dateSelect);

                        selectControls.monthSelect.selectedIndex = 3;
                        fireOnchange(selectControls.monthSelect);

                        var max = selectControls.dateSelect.length;
                        LiveUnit.Assert.areEqual(29, max, "Wrong number of days populated into dateControl");

                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testSpecialHebrewCalendar = function (complete) {
            if (isWinRTEnabled()) {
                var calendarType = 'HebrewCalendar';
                createPickerWithAppend({
                    calendar: calendarType,
                }).then(function (picker) {
                        datePicker = picker;

                        var c = new glob.Calendar();
                        var calendar = calendarType;
                        var myCalendar = new glob.Calendar(c.languages, calendar, c.getClock());

                        var totalNumOfDays = 30;
                        var years = ["5784", "5785"]; //first is a leap year and second is not leap year
                        var gregorianYears = [2024, 2025]; //Gregorian Years
                        var numOfmonths;

                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        for (var j = 0; j < years.length; j++) {
                            var d = new Date();
                            var currentYear = d.getFullYear();

                            selectControls.yearSelect.selectedIndex = selectControls.yearSelect.selectedIndex + (parseInt(years[j]) - myCalendar.year); //selectControls.yearSelect.selectedIndex + (gregorianYears[j] - currentYear);
                            myCalendar.year = parseInt(years[j]);  // Update local calendar to stay in sync with DatePicker's private calendar

                            fireOnchange(selectControls.yearSelect);
                            checkMonthNames(selectControls, calendar, years[j]);
                            numOfmonths = 12;
                            var isLeap = isHebrewLeapYear(years[j]);
                            if (isLeap)
                                numOfmonths = 13;
                            LiveUnit.Assert.areEqual(numOfmonths, selectControls.monthSelect.length, "incorrect number of months in year " + years[j]);

                            for (var i = 0; i < numOfmonths; i++) {
                                selectControls.monthSelect.selectedIndex = i;
                                fireOnchange(selectControls.monthSelect);
                                validateMonth(i + 1, isLeap, selectControls.dateSelect.length);
                            }
                        }
                        LiveUnit.Assert.areEqual(numOfmonths, selectControls.monthSelect.length, "Error in the number of months in the Hebrew calendar");
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testNonLeapYearInGregorianCalendar = function (complete) {
            if (isWinRTEnabled()) {
                var calendarType = 'GregorianCalendar';
                var cleanup;
                createPickerWithAppend({
                    calendar: calendarType,
                    minYear: 1899,
                    current: new Date(1900, 3, 7)
                }).then(function (picker) {
                        datePicker = picker;

                        var c = new glob.Calendar();
                        var calendar = calendarType;
                        var myCalendar = new glob.Calendar(c.languages, calendar, c.getClock());

                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        checkMonthNames(selectControls, calendar);
                        selectControls.monthSelect.selectedIndex = 1;
                        fireOnchange(selectControls.monthSelect);
                        var totalNumofDays = 28;
                        LiveUnit.Assert.areEqual(totalNumofDays, selectControls.dateSelect.length, "Error in the number of days in a non leap year");
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testLeapYearInGregorianCalendar = function (complete) {
            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'GregorianCalendar';
                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    current: new Date(2000, 3, 7)
                }).then(function (picker) {
                        datePicker = picker;

                        var c = new glob.Calendar();
                        var calendar = calendarType;
                        var myCalendar = new glob.Calendar(c.languages, calendar, c.getClock());

                        var selectControls = getControls(picker);
                        checkMonthNames(selectControls, calendar);
                        selectControls.monthSelect.selectedIndex = 1;
                        fireOnchange(selectControls.monthSelect);
                        var totalNumofDays = 29;
                        LiveUnit.Assert.areEqual(totalNumofDays, selectControls.dateSelect.length, "Error in the number of days in a non leap year");
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testNumOfDaysInKoreanCalendar = function (complete) {
            //WinRT bug
            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'KoreanCalendar';
                createPickerWithAppend({
                    calendar: calendarType
                }).then(function (picker) {
                        datePicker = picker;

                        var c = new glob.Calendar();
                        var calendar = calendarType;
                        var myCalendar = new glob.Calendar(c.languages, calendar, c.getClock());
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        checkMonthNames(selectControls, calendar);
                        for (var j = 0; j < 5; j++) {

                            for (var i = 0; i < 12; i++) {

                                selectControls.monthSelect.selectedIndex = i;
                                fireOnchange(selectControls.monthSelect);

                                var numOfdaysInMonth = daysInMonth(convertFromKoreanToGreogrianYear(parseInt(selectControls.yearSelect.value)), i);
                                LiveUnit.Assert.areEqual(numOfdaysInMonth, selectControls.dateSelect.length, "Error in the number of days in Korean Calendar month " + (i + 1) + " and year " + selectControls.yearSelect.value);
                            }
                            selectControls.yearSelect.selectedIndex++; //to make sure we included a leap year
                            fireOnchange(selectControls.yearSelect);
                        }
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testKnownDayInThai = function (complete) {
            //BugID: 449918
            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'ThaiCalendar';
                createPickerWithAppend({
                    calendar: calendarType,
                    minYear: 2000,
                    current: new Date(2001, 0, 1)
                }).then(function (picker) {
                        datePicker = picker;
                        var calendar = calendarType;
                        var selectControls = getControls(picker);
                        checkMonthNames(selectControls, calendar);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        var year = numInYear(selectControls.yearSelect.value);
                        LiveUnit.Assert.areEqual('2544', year, "Error in known year in Thai");
                        LiveUnit.Assert.areEqual(0, selectControls.monthSelect.selectedIndex, "Error in known month in Thai");
                        LiveUnit.Assert.areEqual(0, selectControls.dateSelect.selectedIndex, "Error in known day in Thai");

                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testNumOfDaysInThaiCalendar = function (complete) {
            //BugID: 651414
            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'ThaiCalendar';
                createPickerWithAppend({
                    calendar: calendarType
                }).then(function (picker) {
                        datePicker = picker;
                        var calendar = calendarType;
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");

                        for (var j = 0; j < 5; j++) {
                            checkMonthNames(selectControls, calendar, selectControls.yearSelect.value);
                            for (var i = 0; i < 12; i++) {

                                selectControls.monthSelect.selectedIndex = i;
                                fireOnchange(selectControls.monthSelect);

                                var numOfdaysInMonth = daysInMonth(convertFromThaiToGreogrianYear(parseInt(selectControls.yearSelect.value)), i);
                                LiveUnit.Assert.areEqual(numOfdaysInMonth, selectControls.dateSelect.length, "Error in the number of days in Thai Calendar month " + (i + 1) + " and year " + selectControls.yearSelect.value);
                            }
                            selectControls.yearSelect.selectedIndex++; //to make sure we included a leap year
                            fireOnchange(selectControls.yearSelect);
                        }
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testJapaneseCalendarKnownDate = function (complete) {
            //BugID: 628192
            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'JapaneseCalendar';
                createPickerWithAppend({
                    calendar: calendarType,
                    current: new Date(2001, 0, 1)
                }).then(function (picker) {
                        datePicker = picker;
                        var calendar = calendarType;

                        var selectControls = getControls(picker);
                        checkMonthNames(selectControls, calendar);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        var year = numInYear(selectControls.yearSelect.value);
                        LiveUnit.Assert.areEqual("13", year, "Error in known year in Japanese");
                        LiveUnit.Assert.areEqual(0, selectControls.monthSelect.selectedIndex, "Error in known month in Japanese");
                        LiveUnit.Assert.areEqual(0, selectControls.dateSelect.selectedIndex, "Error in known day in Japanese");
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testJapaneseCalendarKnownBuggyDate = function (complete) {

            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'JapaneseCalendar';
                createPickerWithAppend({
                    calendar: calendarType,
                    current: new Date(1989, 0, 7)
                }).then(function (picker) {
                        datePicker = picker;
                        var calendar = calendarType;
                        var selectControls = getControls(picker);

                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        LiveUnit.Assert.areEqual(1, selectControls.monthSelect.length, "Error in number of months in Japanese Calendar");
                        LiveUnit.Assert.areEqual(7, selectControls.dateSelect.length, "Error in number of days in Japanese Calendar");
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testJapaneseCalendarKnownDate_temp = function (complete) {

            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'JapaneseCalendar';
                createPickerWithAppend({
                    calendar: calendarType,
                    current: new Date(2001, 0, 1),
                    minYear: 1990,
                    maxYear: 2010
                }).then(function (picker) {
                        datePicker = picker;
                        var calendar = calendarType;

                        var selectControls = getControls(picker);
                        checkMonthNames(selectControls, calendar);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        var year = numInYear(selectControls.yearSelect.value);
                        LiveUnit.Assert.areEqual("13", year, "Error in known year in Japanese");
                        LiveUnit.Assert.areEqual(0, selectControls.monthSelect.selectedIndex, "Error in known month in Japanese");
                        LiveUnit.Assert.areEqual(0, selectControls.dateSelect.selectedIndex, "Error in known day in Japanese");
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testNumOfDaysInJapaneseCalendar = function (complete) {
            //WinRT bug
            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'JapaneseCalendar';
                createPickerWithAppend({
                    calendar: calendarType
                }).then(function (picker) {
                        datePicker = picker;

                        var c = new glob.Calendar();
                        var calendar = calendarType;
                        var myCalendar = new glob.Calendar(c.languages, calendar, c.getClock());

                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        for (var j = 0; j < 5; j++) {
                            myCalendar.addMonths(-1 * myCalendar.month + 1);
                            checkMonthNames(selectControls, calendar, selectControls.yearSelect.value);
                            for (var i = 0; i < 12; i++) {

                                selectControls.monthSelect.selectedIndex = i;
                                fireOnchange(selectControls.monthSelect);
                                setBackEnd(myCalendar);

                                var numOfdaysInMonth = daysInMonth(myCalendar.year, i);
                                myCalendar.changeCalendarSystem(calendar);
                                if (i !== 1)  //in order not to add an extra year by mistake
                                    myCalendar.addMonths(1);
                                LiveUnit.Assert.areEqual(numOfdaysInMonth, selectControls.dateSelect.length, "Error in the number of days in Japanese Calendar month " + (i + 1) + " and year " + selectControls.yearSelect.value);
                            }
                            myCalendar.addYears(1);
                            selectControls.yearSelect.selectedIndex++; //to make sure we included a leap year
                            fireOnchange(selectControls.yearSelect);
                        }
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testMinAndMaxYearGlob = function (complete) {
            //BugID: 450489
            if (isWinRTEnabled()) {
                var calendarType = 'HijriCalendar';
                var cleanup;
                var minYearValue = 1430;
                var maxYearValue = 1462;

                createPickerWithAppend({
                    calendar: calendarType,
                    minYear: 2009,
                    maxYear: 2040
                }).then(function (picker) {
                        datePicker = picker;
                        var calendar = calendarType;

                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        checkMonthNames(selectControls, calendar);
                        LiveUnit.Assert.areEqual(minYearValue + '', selectControls.yearSelect[0].value, "Error in the specified minimum year");
                        LiveUnit.Assert.areEqual(maxYearValue + '', selectControls.yearSelect[selectControls.yearSelect.length - 1].value, "Error in the specified maximum year");

                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testJulianCalendarKnownDay = function (complete) {
            //not working because of a problem with WinRT Glob
            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'JulianCalendar';
                createPickerWithAppend({
                    calendar: calendarType,
                    current: new Date(2001, 0, 1)
                }).then(function (picker) {
                        datePicker = picker;
                        var calendar = calendarType;
                        var selectControls = getControls(picker);
                        checkMonthNames(selectControls, calendar);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        var year = numInYear(selectControls.yearSelect.value);
                        LiveUnit.Assert.areEqual("2000", year, "Error in known year in Julian");
                        LiveUnit.Assert.areEqual(11, selectControls.monthSelect.selectedIndex, "Error in known month in Julian");
                        LiveUnit.Assert.areEqual(18, selectControls.dateSelect.selectedIndex, "Error in known day in Julian");

                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testJulianCalendarNumOfDays = function (complete) {
            //not working because of a problem with WinRT Glob
            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'JulianCalendar';
                createPickerWithAppend({
                    calendar: calendarType,
                    minYear: 1889,
                    maxYear: 2050
                }).then(function (picker) {
                        datePicker = picker;
                        //1900 is a leap year in Julian Calendar but not a leap year in Gregorian Calendar
                        //2000 is a leap year in both Gregorian and Julian Calendars due to the exception fo divisible by 400
                        //2002 is a non leap year in both Gregorian and Julian Calendars
                        //2004 is a leap year in both Gregorian and Julian Calendars with no exceptions of divisible by 400
                        var years = [1900, 2000, 2002, 2004];
                        var calendar = calendarType;
                        var selectControls = getControls(picker);
                        for (var i = 0; i < years.length; i++) {
                            selectControls.yearSelect.value = years[i];
                            fireOnchange(selectControls.yearSelect);
                            checkMonthNames(selectControls, calendar, years[i]);
                            LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                            var isLeap = isJulianLeapYear(years[i]);
                            for (var j = 0; j < 12; j++) {
                                selectControls.monthSelect.selectedIndex = j;
                                fireOnchange(selectControls.monthSelect);
                                var year = years[i];
                                if (isLeap) {
                                    year = 2000; //to make sure that daysInMonth will work for Julian too to account for the case that the year is divisible by 100
                                }
                                var numOfDays = daysInMonth(year, j);
                                LiveUnit.Assert.areEqual(numOfDays, selectControls.dateSelect.length, "Correct number of days in month " + (j + 1) + " in year " + years[i]);
                            }
                        }
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testTaiwanKnownDate = function (complete) {
            //BugID: 628192
            //BugID: 449809
            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'TaiwanCalendar';
                createPickerWithAppend({
                    calendar: calendarType,
                    current: new Date(2001, 0, 1)
                }).then(function (picker) {
                        datePicker = picker;
                        var calendar = calendarType;
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");

                        var year = numInYear(selectControls.yearSelect.value);
                        LiveUnit.Assert.areEqual("90", year, "Error in known year in Taiwan Calendar");
                        LiveUnit.Assert.areEqual(0, selectControls.monthSelect.selectedIndex, "Error in known month in Taiwan Calendar");
                        LiveUnit.Assert.areEqual(0, selectControls.dateSelect.selectedIndex, "Error in known day in Taiwan Calendar");

                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testTaiwanKnownDate_temp = function (complete) {

            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'TaiwanCalendar';
                createPickerWithAppend({
                    calendar: calendarType,
                    current: new Date(2001, 0, 1),
                    minYear: 1990,
                    maxYear: 2011
                }).then(function (picker) {
                        datePicker = picker;
                        var calendar = calendarType;
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");

                        var year = numInYear(selectControls.yearSelect.value);
                        LiveUnit.Assert.areEqual("90", year, "Error in known year in Taiwan Calendar");
                        LiveUnit.Assert.areEqual(0, selectControls.monthSelect.selectedIndex, "Error in known month in Taiwan Calendar");
                        LiveUnit.Assert.areEqual(0, selectControls.dateSelect.selectedIndex, "Error in known day in Taiwan Calendar");

                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        

        testTaiwanCalendarNumOfDays = function (complete) {
            //BugID: 628192
            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'TaiwanCalendar';
                createPickerWithAppend({
                    calendar: calendarType,
                }).then(function (picker) {
                        datePicker = picker;
                        var c = new glob.Calendar();
                        var calendar = calendarType;
                        var myCalendar = new glob.Calendar(c.languages, calendar, c.getClock());
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        for (var j = 0; j < 5; j++) {
                            checkMonthNames(selectControls, calendar, selectControls.yearSelect.value);
                            for (var i = 0; i < 12; i++) {

                                selectControls.monthSelect.selectedIndex = i;
                                fireOnchange(selectControls.monthSelect);

                                var numOfdaysInMonth = daysInMonth(convertFromTaiwanToGreogrianYear(parseInt(selectControls.yearSelect.value)), i);
                                LiveUnit.Assert.areEqual(numOfdaysInMonth, selectControls.dateSelect.length, "Error in the number of days in Korean Calendar month " + (i + 1) + " and year " + selectControls.yearSelect.value);
                            }
                            selectControls.yearSelect.selectedIndex++; //to make sure we included a leap year
                            fireOnchange(selectControls.yearSelect);
                        }
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testTaiwanCalendarNumOfDays_temp = function (complete) {

            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'TaiwanCalendar';
                createPickerWithAppend({
                    calendar: calendarType,
                    maxYear: 2020,
                    minYear: 1990
                }).then(function (picker) {
                        datePicker = picker;
                        var c = new glob.Calendar();
                        var calendar = calendarType;
                        var myCalendar = new glob.Calendar(c.languages, calendar, c.getClock());
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        for (var j = 0; j < 5; j++) {
                            checkMonthNames(selectControls, calendar, selectControls.yearSelect.value);
                            for (var i = 0; i < 12; i++) {

                                selectControls.monthSelect.selectedIndex = i;
                                fireOnchange(selectControls.monthSelect);

                                var numOfdaysInMonth = daysInMonth(convertFromTaiwanToGreogrianYear(parseInt(selectControls.yearSelect.value)), i);
                                LiveUnit.Assert.areEqual(numOfdaysInMonth, selectControls.dateSelect.length, "Error in the number of days in Korean Calendar month " + (i + 1) + " and year " + selectControls.yearSelect.value);
                            }
                            selectControls.yearSelect.selectedIndex++; //to make sure we included a leap year
                            fireOnchange(selectControls.yearSelect);
                        }
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };


        testUmAlQuraCalenderLeapDays = function (complete) {
            //BugID: 449812
            if (isWinRTEnabled()) {
                var calendarType = 'UmAlQuraCalendar';
                createPickerWithAppend({
                    calendar: calendarType
                }).then(function (picker) {
                        datePicker = picker;
                        var c = new glob.Calendar();
                        var calendar = calendarType;
                        var myCalendar = new glob.Calendar(c.languages, calendar, c.getClock());

                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        checkMonthNames(selectControls, calendar);
                        for (var i = 0; i < 12; i++) {
                            selectControls.monthSelect.selectedIndex = i;
                            fireOnchange(selectControls.monthSelect);
                            var numOfDays = selectControls.dateSelect.length;
                            if (numOfDays !== 29 && numOfDays !== 30)
                                LiveUnit.Assert.areEqual(30, numOfDays, "Error in the number of days in " + selectControls.monthSelect.value + " the UmAlQura calendar");
                        }
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        
        testDateWithObviousFormat = function (complete) {
            //BugID: 538276
            if (isWinRTEnabled()) {
                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    current: 'April 01, 2011',
                    yearPattern: "{year.full}",
                    monthPattern: "{month.integer(2)}",
                    datePattern: "{day.integer(2)}",
                }).then(function (picker) {
                        verifyDatePickerContent(picker, { day: '01', month: '04', year: '2011' });
                        attachEventListeners(picker);

                        // change the day
                        picker.winControl.current = 'April 02, 2011';
                        verifyDatePickerContent(picker, { day: '02', month: '04', year: '2011' });
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, complete);
            }
            else {
                complete();
            }
        };

        testDateWithAbbreviatedNameFormat = function (complete) {
            //BugID: 538276
            if (isWinRTEnabled()) {
                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    current: 'December 22, 2011',
                    yearPattern: "{year.abbreviated(2)}",
                    monthPattern: "{month.abbreviated(3)} .",
                    datePattern: "{dayofweek.abbreviated(4)} .",
                }).then(function (picker) {
                        verifyDatePickerContent(picker, { day: 'Thu .', month: 'Dec .', year: '11' });

                        picker.winControl.current = 'February 02, 2005';
                        verifyDatePickerContent(picker, { day: 'Wed .', month: 'Feb .', year: '05' });
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, complete);
            }
            else {
                complete();
            }
        };

        testDateWithAbbreviatedFormat = function (complete) {
            //BugID: 538276
            if (isWinRTEnabled()) {
                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    current: 'April 05, 2011',
                    yearPattern: "year {year.full}",
                    monthPattern: "month {month.full}",
                    datePattern: "day {dayofweek.solo.full}",
                }).then(function (picker) {
                        verifyDatePickerContent(picker, { day: 'day Tuesday', month: 'month April', year: 'year 2011' });


                        // change the day
                        picker.winControl.current = 'March 25, 2012';
                        verifyDatePickerContent(picker, { day: 'day Sunday', month: 'month March', year: 'year 2012' });
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, complete);
            }
            else {
                complete();
            }
        };

        testDateWithSoloFormats = function (complete) {
            //BugID: 628192
            //BugID: 538276
            if (isWinRTEnabled()) {
                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    current: 'May 30, 1999',
                    yearPattern: "example {year.abbreviated(2)}",
                    monthPattern: "month {month.solo.full}",
                    datePattern: "day {dayofweek.solo.full}",
                }).then(function (picker) {
                        verifyDatePickerContent(picker, { day: 'day Sunday', month: 'month May', year: 'example 99' });

                        // change the day
                        picker.winControl.current = 'July 26, 2019';
                        verifyDatePickerContent(picker, { day: 'day Friday', month: 'month July', year: 'example 19' });
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, complete);
            }
            else {
                complete();
            }
        };

        testDateWithSoloFormats_temp = function (complete) {

            if (isWinRTEnabled()) {
                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    current: 'May 30, 1999',
                    minYear: 1990,
                    maxyYear: 2011,
                    yearPattern: "example {year.abbreviated(2)}",
                    monthPattern: "month {month.solo.full}",
                    datePattern: "day {dayofweek.solo.full}",
                }).then(function (picker) {
                        verifyDatePickerContent(picker, { day: 'day Sunday', month: 'month May', year: 'example 99' });

                        // change the day
                        picker.winControl.current = 'July 26, 2019';
                        verifyDatePickerContent(picker, { day: 'day Friday', month: 'month July', year: 'example 19' });
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, complete);
            }
            else {
                complete();
            }
        };

        testDateWithSoloAbbreviatedFormats = function (complete) {
            //BugID: 628192
            //BugID: 538276
            if (isWinRTEnabled()) {
                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    current: 'May 30, 1999',
                    yearPattern: "example {year.abbreviated(2)}",
                    monthPattern: "month {month.solo.abbreviated(3)}",
                    datePattern: "day {dayofweek.solo.abbreviated(2)}",
                }).then(function (picker) {

                        verifyDatePickerContent(picker, { day: 'day Su', month: 'month May', year: 'example 99' });

                        // change the day
                        picker.winControl.current = 'July 26, 2019';
                        verifyDatePickerContent(picker, { day: 'day Fr', month: 'month Jul', year: 'example 19' });
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, complete);
            }
            else {
                complete();
            }
        };

        testDateWithSoloAbbreviatedFormats_temp = function (complete) {

            if (isWinRTEnabled()) {
                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    current: 'May 30, 1999',
                    minYear: 1990,
                    maxYear: 2020,
                    yearPattern: "example {year.abbreviated(2)}",
                    monthPattern: "month {month.solo.abbreviated(3)}",
                    datePattern: "day {dayofweek.solo.abbreviated(2)}",
                }).then(function (picker) {

                        verifyDatePickerContent(picker, { day: 'day Su', month: 'month May', year: 'example 99' });

                        // change the day
                        picker.winControl.current = 'July 26, 2019';
                        verifyDatePickerContent(picker, { day: 'day Fr', month: 'month Jul', year: 'example 19' });
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, complete);
            }
            else {
                complete();
            }
        };

        testCreateMutipleDatePickersOneWithPatternAndOneWithout = function (complete) {
            //BugID: 628192
            //BugID: 538276
            if (isWinRTEnabled()) {
                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    current: 'May 30, 1999',
                    yearPattern: "example {year.abbreviated(2)}",
                    monthPattern: "month {month.solo.abbreviated(3)}",
                    datePattern: "day {dayofweek.solo.abbreviated(2)}",
                }).then(function (picker) {

                        verifyDatePickerContent(picker, { day: 'day Su', month: 'month May', year: 'example 99' });
                        // change the day
                        picker.winControl.current = 'July 26, 2019';
                        verifyDatePickerContent(picker, { day: 'day Fr', month: 'month Jul', year: 'example 19' });
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(function () {

                        createPickerWithAppend({
                            current: 'October 30, 2011',
                            calendar: 'GregorianCalendar',
                        }).then(function (picker) {
                                verifyDatePickerContent(picker, { day: '30', month: 'October', year: '2011' });

                            })
                            .then(null, unhandledTestError)
                            .then(cleanupDatePicker);
                    })
                    .then(complete, complete);
            }
            else {
                complete();
            }
        };

        xtestVerifyCSSVerticalLayout = function (complete) {
            /* bug #555425, test passes in IE and wwahost if you comment out these lines in the ui-dark.css file:
        .win-datepicker {
        display: -ms-inline-box;
        height: auto;
        width: auto;
        }

        when bug #555425 is fixed, similar test case needs to be added to timepicker-decl.js
        */

            var targetStyleSheet = null;
            var newRuleIndex = -1;

            createPickerWithAppend().then(function (picker:any) {
                /* add this rule so that any subelements starting with 'win-datepicker' get the new style to make them layout vertical
        .vertAlwaysDate *[class^="win-datepicker"] {
        display:block;
        float:none;
        }
        */

                var countStyleSheets = document.styleSheets.length;

                // append new stylesheet to head
                targetStyleSheet = document.createElement('STYLE');
                document.head.appendChild(targetStyleSheet);

                // verify new style sheet was added
                LiveUnit.Assert.isTrue(document.styleSheets.length === countStyleSheets + 1);
                countStyleSheets++;

                // append new rule to the style sheet
                targetStyleSheet = document.styleSheets[countStyleSheets - 1];
                var countRules = targetStyleSheet.cssRules.length;

                // note: return from addRule is squirrely.  When adding to sheet 0 it returns 1735 (perhaps index of *all* rules??), but cssRules.length is only 389 for the sheet 0
                targetStyleSheet.addRule(".vertAlwaysDate *[class^='win-datepicker']", "float: none; display: block; background-color:red;");
                newRuleIndex = targetStyleSheet.cssRules.length - 1;

                LiveUnit.Assert.isTrue(targetStyleSheet.cssRules.length === countRules + 1, "expected #cssRules + 1 after addRule; previous #cssRules=" + countRules + ", after addRule #cssRules=" + targetStyleSheet.cssRules.length);
                LiveUnit.Assert.areEqual(".vertAlwaysDate *[class^='win-datepicker'] { float: none; display: block; background-color: red; }", targetStyleSheet.cssRules[newRuleIndex].cssText);

                // add the vertAlwaysDate class to the datepicker control
                picker.className += " vertAlwaysDate";

                // verify the Y coordinates of child items are in increasing order by at least height of the child SELECT element
                var currTop, currHeight;
                var prevTop = -1;
                var height0 = picker.childNodes[0].offsetHeight;
                for (var x = 0; x < picker.childNodes.length; x++) {
                    currHeight = picker.childNodes[x].offsetHeight;
                    LiveUnit.Assert.isTrue(currHeight === height0, "expected height of current element === height of first element.  Actual: currHeight=" + currHeight + ", height0=" + height0);

                    currTop = picker.childNodes[x].offsetTop;
                    LiveUnit.Assert.isTrue(currTop >= (prevTop + currHeight), "expecting currTop > (prevTop + currHeight).  Actual: currTop=" + currTop + ", prevTop=" + prevTop + ", currHeight=" + currHeight);

                    prevTop = currTop;
                }
            })
                .then(null, unhandledTestError)
                .then(function () {
                    if (targetStyleSheet) {
                        targetStyleSheet.removeRule(newRuleIndex);
                    }
                    cleanupDatePicker();
                })
                .then(complete, complete);
        };

        testGetInformationCheckValidityOfControls = function (complete) {

            if (!isWinRTEnabled()) {
                var cleanup;
                DatePicker.getInformation = getInformationJS;
                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    current: new Date(2011, 11, 31)
                }).then(function (picker) {

                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual("DYM", getActualUIOrder(), "Incorrect UI order");
                        LiveUnit.Assert.areEqual(6, selectControls.monthSelect.length, "checking the number of months in the custom calendar");
                        LiveUnit.Assert.areEqual("sixthMonth", selectControls.monthSelect.value, "checking the correctness of the selected month");
                        LiveUnit.Assert.areEqual("61", selectControls.dateSelect.value, "checking the correctness of the selected day");
                        LiveUnit.Assert.areEqual("2011", selectControls.yearSelect.value, "checking the correctness of the selected year");

                        for (var j = 0; j < 4; j++) {  // to make sure that we will hit a leap year
                            setYear(picker, (parseInt(selectControls.yearSelect.value) + 1) + '');
                            for (var i = 1; i <= selectControls.monthSelect.length; i++) {
                                setMonth(picker, i);
                                LiveUnit.Assert.isTrue(checkDayCount(selectControls));
                            }
                        }
                    })
                    .then(null, unhandledTestError)
                    .then(cleanup) //placed after the error handler to make sure it gets removed even if the test case failed
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else {
                complete();
            }
        };

        testSpecialCustomCalendarCasesWithChangeEvents = function (complete) {
            if (!isWinRTEnabled()) {
                var cleanup;
                DatePicker.getInformation = getInformationJS;
                createPickerWithAppend({ current: new Date(2011, 11, 31) }).then(function (picker) {

                    var selectControls = getControls(picker);
                    LiveUnit.Assert.areEqual("DYM", getActualUIOrder(), "Incorrect UI order");
                    LiveUnit.Assert.areEqual(6, selectControls.monthSelect.length, "checking the number of months in the custom calendar");
                    LiveUnit.Assert.areEqual("sixthMonth", selectControls.monthSelect.value, "checking the correctness of the selected month");
                    LiveUnit.Assert.areEqual("61", selectControls.dateSelect.value, "checking the correctness of the selected day");
                    LiveUnit.Assert.areEqual("2011", selectControls.yearSelect.value, "checking the correctness of the selected year");

                    setMonth(picker, 1);
                    LiveUnit.Assert.areEqual(6, selectControls.monthSelect.length, "checking the number of months in the custom calendar");
                    LiveUnit.Assert.areEqual("firstMonth", selectControls.monthSelect.value, "checking the correctness of the selected month");
                    LiveUnit.Assert.areEqual("59", selectControls.dateSelect.value, "checking the correctness of the selected day");
                    LiveUnit.Assert.areEqual("2011", selectControls.yearSelect.value, "checking the correctness of the selected year");

                    setMonth(picker, 4);
                    setDate(picker, 62);
                    LiveUnit.Assert.areEqual(6, selectControls.monthSelect.length, "checking the number of months in the custom calendar");
                    LiveUnit.Assert.areEqual("fourthMonth", selectControls.monthSelect.value, "checking the correctness of the selected month");
                    LiveUnit.Assert.areEqual("62", selectControls.dateSelect.value, "checking the correctness of the selected day");
                    LiveUnit.Assert.areEqual("2011", selectControls.yearSelect.value, "checking the correctness of the selected year");

                    setYear(picker, "2012");
                    setMonth(picker, 5);
                    LiveUnit.Assert.areEqual(6, selectControls.monthSelect.length, "checking the number of months in the custom calendar");
                    LiveUnit.Assert.areEqual("fifthMonth", selectControls.monthSelect.value, "checking the correctness of the selected month");
                    LiveUnit.Assert.areEqual("61", selectControls.dateSelect.value, "checking the correctness of the selected day");
                    LiveUnit.Assert.areEqual("2012", selectControls.yearSelect.value, "checking the correctness of the selected year");

                    setMonth(picker, 1);
                    LiveUnit.Assert.areEqual(6, selectControls.monthSelect.length, "checking the number of months in the custom calendar");
                    LiveUnit.Assert.areEqual("firstMonth", selectControls.monthSelect.value, "checking the correctness of the selected month");
                    LiveUnit.Assert.areEqual("60", selectControls.dateSelect.value, "checking the correctness of the selected day");
                    LiveUnit.Assert.areEqual("2012", selectControls.yearSelect.value, "checking the correctness of the selected year");
                })
                    .then(null, unhandledTestError)
                    .then(cleanup) //placed after the error handler to make sure it gets removed even if the test case failed
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else {
                complete();
            }
        };

        testUmAlQuaraCalenderKnownDate = function (complete) {

            if (isWinRTEnabled()) {
                var calendarType = 'UmAlQuraCalendar';
                var cleanup;
                createPickerWithAppend({
                    calendar: calendarType,
                    current: new Date(2011, 9, 25)
                }).then(function (picker) {
                        datePicker = picker;
                        cleanup = addGlobChangeEvent(picker);
                        var c = new glob.Calendar();

                        var myCalendar = new glob.Calendar(c.languages, "GregorianCalendar", c.getClock());
                        myCalendar.year = 2011;
                        myCalendar.month = 10;
                        myCalendar.day = 25;
                        myCalendar.changeCalendarSystem("UmAlQuraCalendar");

                        setBackEnd(myCalendar);
                        setUI(myCalendar, calendarType);
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendarType), getActualUIOrder(), "Incorrect UI order");
                        checkMonthNames(selectControls, calendarType);

                        myCalendar.addMonths(1);
                        ++selectControls.monthSelect.selectedIndex;
                        setBackEnd(myCalendar);
                        setUI(myCalendar, calendarType);
                        fireOnchange(selectControls.monthSelect);

                    })
                    .then(null, unhandledTestError)
                    .then(cleanup) //placed after the error handler to make sure it gets removed even if the test case failed
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testMaxAndMinInUmAlQuraCalender = function (complete) {
            //BugID: 566405
            //UmAlquara calendar supports up to 2029

            if (isWinRTEnabled()) {
                var calendarType = 'UmAlQuraCalendar';
                createPickerWithAppend({
                    calendar: calendarType,
                    maxYear: 2200,
                    minYear: 623 //first year of umalquara is 1900
                }).then(function (picker) {
                        datePicker = picker;
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual("1318", selectControls.yearSelect[0].value, "Incorrect min date");
                        LiveUnit.Assert.areEqual("1500", selectControls.yearSelect[selectControls.yearSelect.length - 1].value, "Incorrect max date");
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testMaxAndMinInHijriCalender = function (complete) {
            //BugID: 628192
            if (isWinRTEnabled()) {
                var calendarType = 'HijriCalendar';
                createPickerWithAppend({
                    calendar: calendarType,
                    maxYear: 2200,
                    minYear: 623 //first year of HijriCalendar
                }).then(function (picker) {
                        datePicker = picker;
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual("1627", selectControls.yearSelect[selectControls.yearSelect.length - 1].value, "Incorrect max date");
                        LiveUnit.Assert.areEqual("1", selectControls.yearSelect[0].value, "Incorrect min date");
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testMaxAndMinYearInGregorianWithZeroMinYear = function (complete) {
            //BugID: 566275
            if (isWinRTEnabled()) {

                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    maxYear: 2000,
                    minYear: 0
                }).then(function (picker) {
                        datePicker = picker;
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual("1", selectControls.yearSelect[0].value, "Incorrect min date");
                        LiveUnit.Assert.areEqual("2000", selectControls.yearSelect[selectControls.yearSelect.length - 1].value, "Incorrect max date");
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testMaxAndMinYearInGregorianWithNegativeMinYear = function (complete) {
            //BugID: 628192
            if (isWinRTEnabled()) {

                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    maxYear: 2000,
                    minYear: -1
                }).then(function (picker) {
                        datePicker = picker;
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual("1", selectControls.yearSelect[0].value, "Incorrect min date");
                        LiveUnit.Assert.areEqual("2000", selectControls.yearSelect[selectControls.yearSelect.length - 1].value, "Incorrect max date");
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testTaiwanLeapMinYears = function (complete) {
            //BugID: 628192
            if (isWinRTEnabled()) {
                var cleanup;
                var calendarType = 'TaiwanCalendar';
                createPickerWithAppend({
                    calendar: calendarType,
                    minYear: 1899,
                    maxYear: 2111,
                    current: new Date(1900, 0, 1)

                }).then(function (picker) {
                        datePicker = picker;
                        var calendar = calendarType;
                        var selectControls = getControls(picker);
                        LiveUnit.Assert.areEqual(getExpectedOrder(calendar), getActualUIOrder(), "Incorrect UI order");
                        LiveUnit.Assert.areEqual("1", selectControls.yearSelect[0].value, "Incorrect min date");
                        LiveUnit.Assert.areEqual("200", selectControls.yearSelect[selectControls.yearSelect.length - 1].value, "Incorrect max date");
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, unhandledTestError);
            }
            else
                complete();
        };

        testDateWithAbbreviatedWithSpecialCharacters = function (complete) {
            if (isWinRTEnabled()) {
                createPickerWithAppend({
                    calendar: 'GregorianCalendar',
                    current: 'April 05, 2011',
                    yearPattern: "year: ' & < > # {year.full}",
                    monthPattern: 'month: ! @ $ % ^ " {month.full}',
                    datePattern: "day ( ) - + = _ {dayofweek.solo.full}",
                }).then(function (picker) {
                        verifyDatePickerContent(picker, { day: 'day ( ) - + = _ Tuesday', month: 'month: ! @ $ % ^ " April', year: "year: ' & < > # 2011" });


                        // change the day
                        picker.winControl.current = 'March 25, 2012';
                        verifyDatePickerContent(picker, { day: 'day ( ) - + = _ Sunday', month: 'month: ! @ $ % ^ " March', year: "year: ' & < > # 2012" });
                    })
                    .then(null, unhandledTestError)
                    .then(cleanupDatePicker)
                    .then(complete, complete);
            }
            else {
                complete();
            }
        };

        testConstructionWithEventHandlerInOptions = function (complete) {
            var handler = function () {
                complete();
            };
            var dp = new DatePicker(null, { onchange: handler });
            document.body.appendChild(dp.element);

            var evnt = <UIEvent>document.createEvent("UIEvents");
            evnt.initUIEvent("change", false, false, window, 0);
            dp.element.dispatchEvent(evnt);
        };
    };
}
LiveUnit.registerTestClass("CorsicaTests.DatePickerDecl");
