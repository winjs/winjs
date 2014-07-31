// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://$(TargetFramework)/js/base.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/ui.js" />
/// <reference path="ms-appx://$(TargetFramework)/js/en-us/ui.strings.js" />
/// <reference path="ms-appx://$(TargetFramework)/css/ui-dark.css" />

var CorsicaTests = CorsicaTests || {};

CorsicaTests.TimePickerDecl = function () {
    "use strict";
    var glob;

    function isWinRTEnabled() {

        if (window && window.Windows) {
            glob = Windows.Globalization;
            return true;
        }
        return false;

    }

    function process(root) {
        return WinJS.UI.processAll(root);
    }

    // returns string with leading zero prepended for values < 10
    function addLeadingZero(value) {
        if (value < 10) {
            return '0' + value.toString();
        } else {
            return value.toString();
        }
    }

    function createPicker(options) {
        var dp = document.createElement('div');

        dp.setAttribute('data-win-control', 'WinJS.UI.TimePicker');

        if (options !== undefined) {
            dp.setAttribute('data-win-options', JSON.stringify(options));
        }

        // NOTE: The datetime UI is created in a deferred UI manner so
        // we need to have the timeout to allow the browser to go through
        // a few cycles.
        return process(dp).then(function () {
            return WinJS.Promise.timeout().then(
                function () { return dp; });
        });
    }

    var elementToBeRemoved;
    function createPickerWithAppend(options) {
        var dp = document.createElement('div');
        document.body.appendChild(dp);
        elementToBeRemoved = dp;

        dp.setAttribute('data-win-control', 'WinJS.UI.TimePicker');

        if (options !== undefined) {
            dp.setAttribute('data-win-options', JSON.stringify(options));
        }

        // NOTE: The datetime UI is created in a deferred UI manner so
        // we need to have the timeout to allow the browser to go through
        // a few cycles.
        return process(dp).then(function () {
            return WinJS.Promise.timeout().then(
                function () { return dp; });
        });
    }
    // return the select element containing the hour component
    function hourElement(picker) {
        return picker.querySelector('.win-timepicker .win-timepicker-hour');
    }

    // return the select element containing the minute component
    function minuteElement(picker) {
        return picker.querySelector('.win-timepicker .win-timepicker-minute');
    }

    // return the select element containing the period component
    function periodElement(picker) {
        return picker.querySelector('.win-timepicker .win-timepicker-period');
    }

    function timeToString(time) {
        return "[h=" + time.hour + ", m=" + time.minute + ", period=" + time.period + "]";
    }

    function addChangeEvent(picker) {
        picker.addEventListener("change", checkValues);
        return function () { picker.removeEventListener("change", checkValues); };
    }
    var hourBackEnd, minuteBackEnd;
    var AM = 0, PM = 1;

    function setHours(picker, h, notFire) {
        var selectHourElement = hourElement(picker);
        hourBackEnd = h;
        selectHourElement.value = hourBackEnd;
        var selectPeriodElement = periodElement(picker);
        if (selectPeriodElement && selectPeriodElement.selectedIndex === PM && hourBackEnd < 12) {
            hourBackEnd += 12;
        } else if (selectPeriodElement && selectPeriodElement.selectedIndex === AM && hourBackEnd === 12) {
            hourBackEnd -= 12;
        }
        if (!notFire) {
            fireOnchange(selectHourElement);
        }
    }
    function setPeriod(picker, p, notFire) {
        var selectPeriodElement = periodElement(picker);
        if (p === PM && hourBackEnd < 12) {
            hourBackEnd += 12;
        }
        else if (p === AM && hourBackEnd >= 12) {
            hourBackEnd -= 12;
        }

        selectPeriodElement.selectedIndex = p;

        if (!notFire) {
            fireOnchange(selectPeriodElement);
        }
    }
    function setMinutes(picker, m, notFire) {
        var selectMinuteElement = minuteElement(picker);
        minuteBackEnd = m;
        selectMinuteElement.selectedIndex = minuteBackEnd;

        if (!notFire) {
            fireOnchange(selectMinuteElement);
        }
    }
    function setValues() {
        var today = new Date();
        hourBackEnd = today.getHours();
        minuteBackEnd = today.getMinutes();


    }
    var timePicker;
    function checkValues(e) {
        var d = new Date(timePicker.winControl.current);
        LiveUnit.Assert.areEqual(hourBackEnd, d.getHours(), "The backend date object has a wrong hour value");
        LiveUnit.Assert.areEqual(minuteBackEnd, d.getMinutes(), "The backend date object has a wrong minute value");
    }

    function cleanupTimePicker() {
        try {
            WinJS.Utilities.disposeSubTree(elementToBeRemoved);
            document.body.removeChild(elementToBeRemoved);
        } catch (e) {
            LiveUnit.Assert.fail("cleanupTimePicker() failed: " + e);
        }
    }

    this.testCorrectBackEndValue = function (complete) {

        var cleanup;
        createPickerWithAppend().then(function (picker) {
            timePicker = picker;
            setValues();
            cleanup = addChangeEvent(picker);
            setMinutes(picker, 30);
            setHours(picker, 11);
        })
        .then(null, unhandledTestError)
        .then(cleanup)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.xtestBackEndAtNoon = function (complete) {
        //Bug # 437064
        var cleanup;
        createPickerWithAppend().then(function (picker) {
            timePicker = picker;
            setValues();
            cleanup = addChangeEvent(picker);
            setPeriod(picker, AM);
            setMinutes(picker, 30);
            setHours(picker, 12);
            setPeriod(picker, PM);
        })
        .then(null, unhandledTestError)
        .then(cleanup)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    // time object can contain values for 'hour', 'minute', 'period'.  If any of these values
    // is not present, function will expect querySelector to return null for that cell.
    function verifyTime(picker, time) {

        LiveUnit.LoggingCore.logComment("picker.winControl.current=" + picker.winControl.current + "; expected=" + timeToString(time));
        var periodControl = isPeriodControl();

        if ('period' in time && !periodControl && 'hour' in time) {
            if (time.period.toUpperCase() === "PM") {
                if (time.hour < 12) { time.hour = (parseInt(time.hour) + 12) + ''; }
            }
            else {
                if (time.hour === 12) { time.hour = "0"; }
            }
        }
        if ('hour' in time) {
            LiveUnit.Assert.areEqual(time.hour.toString() >> 0, hourElement(picker).value >> 0);
        } else {
            LiveUnit.Assert.areEqual(null, hourElement(picker).value);
        }

        if ('minute' in time) {
            LiveUnit.Assert.areEqual(time.minute.toString() >> 0, minuteElement(picker).value >> 0);
        } else {
            LiveUnit.Assert.areEqual(null, minuteElement(picker).value);
        }

        if ('period' in time && periodControl) {
            LiveUnit.Assert.areEqual(time.period.toString() >> 0, periodElement(picker).value >> 0);
        } else {
            LiveUnit.Assert.areEqual(null, periodElement(picker));
        }
    }

    // given an integer hour, return appropriate 'am' or 'pm' value
    // TODO: make local smart
    function calcPeriod(hour) {
        if (hour < 12) {
            return 'AM';
        } else {
            return 'PM';
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
    function isPeriodControl() {
        if (isWinRTEnabled()) {
            var calendar = new Windows.Globalization.Calendar();
            var computedClock = calendar.getClock();
            return (computedClock !== "24HourClock");
        }
        return true;

    }
    // create default picker.  Note, this test uses runtime date/time value so needs to be smart as the date
    // value will change between runs and locales.  before/after noon, etc..
    this.testSimpleTime = function (complete) {
        var today = new Date();
        createPickerWithAppend().then(function (picker) {
            var expectedHour = today.getHours();

            var periodControl = isPeriodControl();
            // workaround date object defaulting to 24h format.
            if (expectedHour > 12 && periodControl) { expectedHour -= 12; }
            if (expectedHour === 0) { expectedHour = 12; }

            verifyTime(picker, {
                hour: expectedHour,
                minute: today.getMinutes(),
                period: calcPeriod(today.getHours())
            });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testDefaults = function (complete) {
        // validate timePicker defaults
        createPickerWithAppend().then(function (picker) {
            var c = picker.winControl;
            LiveUnit.Assert.isFalse(c.disabled);

            // verify all 3 elements are displayed, style display=""
            LiveUnit.Assert.areEqual("", hourElement(picker).style.display);
            LiveUnit.Assert.areEqual("", minuteElement(picker).style.display);
            if (periodElement(picker)) {
                LiveUnit.Assert.areEqual("", periodElement(picker).style.display);
            }
            LiveUnit.Assert.areEqual(1, c.minuteIncrement);
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testDefaultFormats = function (complete) {
        // validate datePicker default format
        createPickerWithAppend({ current: '1:23 am' }).then(function (picker) {
            LiveUnit.Assert.areEqual("1", getText(hourElement(picker)));
            LiveUnit.Assert.areEqual("23", getText(minuteElement(picker)));
            if (isPeriodControl()) {
                LiveUnit.Assert.areEqual("AM", getText(periodElement(picker)));
            }
            else {
                LiveUnit.Assert.areEqual(null, periodElement(picker), "period control is not found in 24HourClock");
            }
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testSetCurrentFromDate = function (complete) {
        createPickerWithAppend().then(function (picker) {
            var date = new Date(2011, 1, 3, 10, 11, 12);
            picker.winControl.current = date;
            verifyTime(picker, { hour: '10', minute: '11', period: 'AM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.xtestSetCurrentFromString = function (complete) {
        // bug #426214
        createPickerWithAppend().then(function (picker) {
            picker.winControl.current = "7/28/2011 1:30:57 PM";
            verifyTime(picker, { hour: '1', minute: '30', period: 'PM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.xtestSetCurrentFromString2 = function (complete) {
        // bug #426214
        // "27/7/2010T1:30:00" is valid for Date() constructor, yields Tue Mar 6 10:30:00 PST 2012
        createPickerWithAppend().then(function (picker) {
            picker.winControl.current = "27/7/2010T1:30:00";
            verifyTime(picker, { hour: '10', minute: '30', period: 'AM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testDisabled1 = function (complete) {
        createPickerWithAppend({
            current: '10:11 pm',
            disabled: true
        })
        .then(function (picker) {
            verifyTime(picker, { hour: '10', minute: '11', period: 'PM' });
            LiveUnit.Assert.isTrue(picker.winControl.disabled);

            picker.winControl.disabled = false;
            LiveUnit.Assert.isFalse(picker.winControl.disabled);
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testDisabled2 = function (complete) {
        createPickerWithAppend({
            current: '10:11 pm',
            disabled: false
        })
        .then(function (picker) {
            verifyTime(picker, { hour: '10', minute: '11', period: 'PM' });
            LiveUnit.Assert.isFalse(picker.winControl.disabled);

            picker.winControl.disabled = true;
            LiveUnit.Assert.isTrue(picker.winControl.disabled);
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testMinuteIncrement1 = function (complete) {
        // verify time snaps backward to last valid increment
        createPickerWithAppend({
            current: '10:15 am',
            minuteIncrement: 15
        }).then(function (picker) {
            verifyTime(picker, { hour: '10', minute: '15', period: 'AM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testMinuteIncrement2 = function (complete) {
        // verify time snaps backward to last valid increment
        createPickerWithAppend({
            current: '10:16 am',
            minuteIncrement: 15
        }).then(function (picker) {
            verifyTime(picker, { hour: '10', minute: '15', period: 'AM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testMinuteIncrement3 = function (complete) {
        // verify time snaps backward to last valid increment
        createPickerWithAppend({
            current: '10:29 am',
            minuteIncrement: 15
        }).then(function (picker) {
            verifyTime(picker, { hour: '10', minute: '15', period: 'AM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testMinuteIncrement4 = function (complete) {
        // verify time snaps backward to last valid increment not evenly divisible
        createPickerWithAppend({
            current: '10:51 am',
            minuteIncrement: 50
        }).then(function (picker) {
            verifyTime(picker, { hour: '10', minute: '50', period: 'AM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testMinuteIncrement_boundary1 = function (complete) {
        // verify time not changed for 0 increment
        createPickerWithAppend({
            current: '10:11 am',
            minuteIncrement: 0
        }).then(function (picker) {
            verifyTime(picker, { hour: '10', minute: '11', period: 'AM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testMinuteIncrement_boundary2 = function (complete) {
        // verify time not changed for increment == 60
        createPickerWithAppend({
            current: '10:21 am',
            minuteIncrement: 60
        }).then(function (picker) {
            verifyTime(picker, { hour: '10', minute: '21', period: 'AM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testMinuteIncrement_boundary3 = function (complete) {
        // verify time not changed for increment > 60
        createPickerWithAppend({
            current: '10:31 am',
            minuteIncrement: 61
        }).then(function (picker) {
            verifyTime(picker, { hour: '10', minute: '31', period: 'AM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testMinuteIncrement_boundary4 = function (complete) {
        // verify time not changed for increment < 0
        createPickerWithAppend({
            current: '10:41 am',
            minuteIncrement: -15
        }).then(function (picker) {
            verifyTime(picker, { hour: '10', minute: '30', period: 'AM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testMinuteIncrement_boundary5 = function (complete) {
        // verify increment > 60 == increment mod 60
        createPickerWithAppend({
            current: '10:51 am',
            minuteIncrement: 74
        }).then(function (picker) {
            // 74-60=14, 14*3 = 42
            verifyTime(picker, { hour: '10', minute: '42', period: 'AM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testCustomTimePM = function (complete) {
        // bug WIN8 250170:  Expected '"05"' but actual was '"5"'
        createPickerWithAppend({ current: '17:00:01' }).then(function (picker) {
            verifyTime(picker, { hour: 5, minute: '00', period: 'PM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testCustomTimeAM = function (complete) {
        createPickerWithAppend({ current: '0:53:15' }).then(function (picker) {
            verifyTime(picker, { hour: 12, minute: 53, period: 'AM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testCustomTimeNoon = function (complete) {
        // UNDONE: This may actually be 'AM' in certain locales.
        //
        createPickerWithAppend({ current: '12:00:00' }).then(function (picker) {
            verifyTime(picker, { hour: 12, minute: '00', period: calcPeriod(12) });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testCustomTimeNoonPlus = function (complete) {
        createPickerWithAppend({ current: '12:01:00' }).then(function (picker) {
            verifyTime(picker, { hour: 12, minute: '01', period: 'PM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    // developer formatting tests

    /*
h    The hour with no leading 0, 1-12
hh    The hour with a leading 0 if before 10, 01-12  *DEFAULT
H    The hour between 0-23, removes the AM/PM specifier and no leading 0 if below 10.
HH    The hour of the day between 0-23, removes the AM/PM specifier and contains a leading 0 before 10
tt    Displays the AM/PM designator
m    The minute with no leading 0, 0-59
mm    The minute with a leading 0 if before 10, 0-59   *DEFAULT
<empty-string>, null    Remove time element
*/

    this.xtestHourFormatting = function (complete) {
        // BUG: win8TFS: 245862 - formatting not implemented, consume real WinJS.Glob

        createPicker({
            current: '18:28:00',
            hourFormat: 'h'
        }).then(function (picker) {
            verifyTime(picker, { hour: '6', minute: 28, period: 'PM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker);

        // bug: time formats not honored Expected '"06"' but actual was '"6"'
        createPickerWithAppend({
            current: '18:28:00',
            hourFormat: 'hh'
        }).then(function (picker) {
            verifyTime(picker, { hour: '06', minute: 28, period: 'PM' });
        }).then(null, unhandledTestError)
        .then(cleanupTimePicker);

        createPickerWithAppend({
            current: '8:28:00',
            hourFormat: 'H'
        }).then(function (picker) {
            verifyTime(picker, { hour: '8', minute: 28, period: '' });
        }).then(null, unhandledTestError)
        .then(cleanupTimePicker);

        createPickerWithAppend({
            current: '8:28:00',
            hourFormat: 'HH'
        }).then(function (picker) {
            verifyTime(picker, { hour: '08', minute: 28, period: '' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.xtestMinuteFormatting = function (complete) {
        // BUG: win8TFS: 245862 - formatting not implemented, consume real WinJS.Glob
        createPickerWithAppend({
            current: '18:08:00',
            minuteFormat: 'm'
        }).then(function (picker) {
            verifyTime(picker, { hour: '6', minute: '8', period: 'PM' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker);

        createPickerWithAppend({
            current: '18:08:00',
            hourFormat: 'mm'
        }).then(function (picker) {
            verifyTime(picker, { hour: '06', minute: '08', period: 'PM' });
        })
        .then(null, unhandledTestError)
        .then(complete, complete);
    };

    // basic event tests
    var changeHit = 0;

    var changeType = "change";

    function logEventHits(e) {
        LiveUnit.LoggingCore.logComment(e.type + ": changeHit=" + changeHit);
    }

    var changeHandler = function (e) {
        changeHit++;
        LiveUnit.Assert.areEqual(e.type, changeType);
        logEventHits(e);
    };

    function attachEventListeners(picker) {
        changeHit = 0;

        picker.addEventListener(changeType, changeHandler, false);
        return function () { changeHit = 0; picker.removeEventListener(changeType, changeHandler, false); };
    }

    this.xtestSettingFromDateObject = function (complete) {
        // BUG: win8TFS: 245862 - consume real WinJS.Glob
        createPickerWithAppend()
       .then(function (picker) {
           var date = new Date(2011, 1, 3, 10, 11, 12);
           picker.winControl.current = date;

           verifyTime(picker, { hour: '10', minute: '11', period: 'AM' });
       })
       .then(null, unhandledTestError)
       .then(cleanupTimePicker)
       .then(complete, complete);
    };

    // fire a 'change' event on the provided target element
    function fireOnchange(targetElement) {
        var myEvent = document.createEvent('HTMLEvents');
        myEvent.initEvent('change', true, false);
        targetElement.dispatchEvent(myEvent);
    }

    this.testFireHourchangeEvent = function (complete) {
        var cleanup;
        createPickerWithAppend({
            current: '11:20 pm'
        }).then(function (picker) {
            timePicker = picker;
            cleanup = attachEventListeners(picker);
            fireOnchange(hourElement(picker));

            LiveUnit.Assert.areEqual(1, changeHit);
        })
        .then(null, unhandledTestError)
        .then(cleanup)
        .then(cleanupTimePicker)
        .then(complete, unhandledTestError);
    };

    this.testFireMinutechangeEvent = function (complete) {
        var cleanup;
        createPickerWithAppend({
            current: '11:21 pm'
        }).then(function (picker) {
            timePicker = picker;
            cleanup = attachEventListeners(picker);
            fireOnchange(minuteElement(picker));

            LiveUnit.Assert.areEqual(1, changeHit);
        })
        .then(null, unhandledTestError)
        .then(cleanup)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testFirePeriodchangeEvent = function (complete) {
        var cleanup;
        createPickerWithAppend({
            current: '11:22 pm'
        }).then(function (picker) {
            if (isPeriodControl()) {
                timePicker = picker;
                cleanup = attachEventListeners(picker);
                fireOnchange(periodElement(picker));

                LiveUnit.Assert.areEqual(1, changeHit);
            }
        })
        .then(null, unhandledTestError)
        .then(cleanup)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testFireAllEventsAndRemove = function (complete) {
        var cleanup;
        createPickerWithAppend({
            current: '11:23 pm'
        }).then(function (picker) {
            timePicker = picker;
            cleanup = attachEventListeners(picker);
            verifyTime(picker, { hour: '11', minute: '23', period: 'pm' });

            fireOnchange(hourElement(picker));
            fireOnchange(minuteElement(picker));

            if (isPeriodControl()) {
                fireOnchange(periodElement(picker));
                LiveUnit.Assert.areEqual(3, changeHit);
            }
            else {
                LiveUnit.Assert.areEqual(2, changeHit);
            }

            // make sure time hasn't changed
            verifyTime(picker, { hour: '11', minute: '23', period: 'pm' });

            cleanup();
            fireOnchange(hourElement(picker));
            fireOnchange(minuteElement(picker));

            if (isPeriodControl()) {
                fireOnchange(periodElement(picker));
            }
            LiveUnit.Assert.areEqual(0, changeHit);

            // make sure time hasn't changed
            verifyTime(picker, { hour: '11', minute: '23', period: 'pm' });
        })
        .then(null, unhandledTestError)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testFireMultipleChangeEvents = function (complete) {
        var cleanup;
        createPickerWithAppend({
            current: '11:24 pm'
        }).then(function (picker) {
            timePicker = picker;
            cleanup = attachEventListeners(picker);

            for (var n = 1; n <= 15; n++) {
                fireOnchange(hourElement(picker));
                fireOnchange(minuteElement(picker));
                if (isPeriodControl()) {
                    fireOnchange(periodElement(picker));
                    LiveUnit.Assert.areEqual(n * 3, changeHit);
                }
                else {
                    LiveUnit.Assert.areEqual(n * 2, changeHit);
                }
            }
            // make sure time hasn't changed
            verifyTime(picker, { hour: '11', minute: '24', period: 'pm' });
        })
        .then(null, unhandledTestError)
        .then(cleanup)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testhourchangeEvent = function (complete) {
        var cleanup;
        createPickerWithAppend({
            current: '11:12 am'
        }).then(function (picker) {
            timePicker = picker;
            verifyTime(picker, { hour: '11', minute: '12', period: 'AM' });
            cleanup = attachEventListeners(picker);

            // change the hour
            picker.winControl.current = '10:12 am';
            verifyTime(picker, { hour: '10', minute: '12', period: 'AM' });
            LiveUnit.Assert.areEqual(0, changeHit);
        })
        .then(null, unhandledTestError)
        .then(cleanup)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testminutechangeEvent = function (complete) {
        var cleanup;
        createPickerWithAppend({
            current: '11:12 am'
        }).then(function (picker) {
            timePicker = picker;
            verifyTime(picker, { hour: '11', minute: '12', period: 'AM' });
            cleanup = attachEventListeners(picker);

            // change the minute
            picker.winControl.current = '11:10 am';
            verifyTime(picker, { hour: '11', minute: '10', period: 'AM' });
            LiveUnit.Assert.areEqual(0, changeHit);
        })
        .then(null, unhandledTestError)
        .then(cleanup)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testPeriodChangeEvent = function (complete) {
        var cleanup;
        createPickerWithAppend({
            current: '11:12 pm'
        }).then(function (picker) {
            timePicker = picker;
            verifyTime(picker, { hour: '11', minute: '12', period: 'PM' });
            cleanup = attachEventListeners(picker);

            // change the period
            picker.winControl.current = '11:12 am';
            verifyTime(picker, { hour: '11', minute: '12', period: 'AM' });
            LiveUnit.Assert.areEqual(0, changeHit);
        })
        .then(null, unhandledTestError)
        .then(cleanup)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.testChangeThreeEventsAndRemove = function (complete) {
        var cleanup;
        createPickerWithAppend({
            current: '10:11 am'
        }).then(function (picker) {
            timePicker = picker;
            cleanup = attachEventListeners(picker);
            verifyTime(picker, { hour: '10', minute: '11', period: 'AM' });

            // change all 3
            picker.winControl.current = '11:12 pm';
            verifyTime(picker, { hour: '11', minute: '12', period: 'PM' });
            LiveUnit.Assert.areEqual(0, changeHit);

            picker.winControl.current = '10:11 am';
            verifyTime(picker, { hour: '10', minute: '11', period: 'am' });
            LiveUnit.Assert.areEqual(0, changeHit);
        })
        .then(null, unhandledTestError)
        .then(cleanup)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.test24Format = function (complete) {
        var cleanup;
        createPickerWithAppend(
        {
            clock: '24HourClock', current: '13:05:00'
        }).then(function (picker) {
            timePicker = picker;
            var expectedHour = "13";

            var expectedMinute = "05";
            cleanup = addChangeEvent(picker);
            var hour = hourElement(picker).value;
            var minute = minuteElement(picker).value;
            var current = picker.winControl.current;

            LiveUnit.Assert.areEqual(null, periodElement(picker), "period element was generated incorrectly");
            LiveUnit.Assert.areEqual(expectedHour, hour, "Wrong value for the hour");
            LiveUnit.Assert.areEqual(expectedMinute, minute, "Wrong value for the minute");
            LiveUnit.Assert.areEqual(parseInt(expectedHour), current.getHours(), "Wrong value for the current hour");
            LiveUnit.Assert.areEqual(parseInt(expectedMinute), current.getMinutes(), "Wrong value for the current minute");
        })
        .then(null, unhandledTestError)
        .then(cleanup)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.test12Format = function (complete) {
        //BUGID: 729979
        var cleanup;
        createPickerWithAppend(
        {
            clock: '12HourClock', current: '08:05:00'
        }).then(function (picker) {
            timePicker = picker;

            var expectedHour = "8";
            var expectedMinute = "05";
            var expectedPeriod = "AM";
            cleanup = addChangeEvent(picker);
            var hour = hourElement(picker).value;
            var minute = minuteElement(picker).value;
            var current = picker.winControl.current;

            LiveUnit.Assert.areEqual(expectedPeriod, periodElement(picker).value, "period element was set incorrectly");
            LiveUnit.Assert.areEqual(expectedHour, hour, "Wrong value for the hour");
            LiveUnit.Assert.areEqual(expectedMinute, minute, "Wrong value for the minute");
            LiveUnit.Assert.areEqual(parseInt(expectedHour), current.getHours(), "Wrong value for the current hour");
            LiveUnit.Assert.areEqual(parseInt(expectedMinute), current.getMinutes(), "Wrong value for the current minute");
        })
        .then(null, unhandledTestError)
        .then(cleanup)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    function checkPeriodControlValue(expectedValue, control, force) {
        if (force || isPeriodControl()) {
            LiveUnit.Assert.areEqual(expectedValue, control.value, "period element was set incorrectly");
        }
        else {
            LiveUnit.Assert.areEqual(null, control, "period element should not be there");
        }
    }

    this.testImplicit12Format = function (complete) {
        var cleanup;
        createPickerWithAppend(
        {
            current: '08:05:00'
        }).then(function (picker) {
            timePicker = picker;

            var expectedHour = "8";
            var expectedMinute = "05";
            var expectedPeriod = "AM";
            cleanup = addChangeEvent(picker);
            var hour = hourElement(picker).value;
            var minute = minuteElement(picker).value;
            var current = picker.winControl.current;

            checkPeriodControlValue(expectedPeriod, periodElement(picker));
            LiveUnit.Assert.areEqual(expectedHour, hour, "Wrong value for the hour");
            LiveUnit.Assert.areEqual(expectedMinute, minute, "Wrong value for the minute");
            LiveUnit.Assert.areEqual(parseInt(expectedHour), current.getHours(), "Wrong value for the current hour");
            LiveUnit.Assert.areEqual(parseInt(expectedMinute), current.getMinutes(), "Wrong value for the current minute");
        })
        .then(null, unhandledTestError)
        .then(cleanup)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    this.xtestTimeCurrentFormat = function (complete) {
        //BUGID: 460303
        var cleanup;
        createPickerWithAppend(
        {
            current: '13:05:00-05:00'
        }).then(function (picker) {
            timePicker = picker;
            var expectedHour = "8";
            var expectedMinute = "05";
            var expectedPeriod = "AM";
            cleanup = addChangeEvent(picker);
            var hour = hourElement(picker).value;
            var minute = minuteElement(picker).value;
            var current = picker.winControl.current;

            LiveUnit.Assert.areEqual(expectedPeriod, periodElement(picker).value, "period element was set incorrectly");
            LiveUnit.Assert.areEqual(expectedHour, hour, "Wrong value for the hour");
            LiveUnit.Assert.areEqual(expectedMinute, minute, "Wrong value for the minute");
            LiveUnit.Assert.areEqual(parseInt(expectedHour), current.getHours(), "Wrong value for the current hour");
            LiveUnit.Assert.areEqual(parseInt(expectedMinute), current.getMinutes(), "Wrong value for the current minute");
        })
        .then(null, unhandledTestError)
        .then(cleanup)
        .then(cleanupTimePicker)
        .then(complete, complete);
    };

    function getActualUIOrder(selectControls) {
        var minutePos, periodPos, hourPos;
        var domElement = document.getElementsByClassName('win-timepicker')[0];
        for (var i = 0; i < domElement.children.length; i++) {
            var elem = domElement.childNodes[i].className;
            if (elem.indexOf('picker-hour') !== -1) {
                hourPos = i;
            }
            else if (elem.indexOf('picker-minute') !== -1) {
                minutePos = i;
            }
            else {
                periodPos = i;
            }
        }
        return getOrder(hourPos, minutePos, periodPos);

    }

    function getOrder(hourPos, minutePos, periodPos) {
        if (!periodPos && periodPos !== 0) {
            if (hourPos < minutePos) {
                return "HM";
            }
            return "MH";
        }
        else if (minutePos < periodPos && minutePos < hourPos) {
            if (periodPos < hourPos) {
                return "MPH";
            }
            else {
                return "MHP";
            }
        }
        else if (periodPos < minutePos && periodPos < hourPos) {
            if (minutePos < hourPos) {
                return "PMH";
            }
            else {
                return "PHM";
            }
        }
        else {
            if (periodPos < minutePos) {
                return "HPM";
            }
            else {
                return "HMP";
            }
        }
    }

    function getExpectedOrder(calendar, clock) {
        var dtf = Windows.Globalization.DateTimeFormatting;
        var s = "hour minute";
        var c = new dtf.DateTimeFormatter(s);
        c = new dtf.DateTimeFormatter(s);
        var formatter = new dtf.DateTimeFormatter(s, c.languages, c.geographicRegion, calendar, clock);
        var pattern = formatter.patterns[0];
        var hourIndex = pattern.indexOf("hour");
        var minuteIndex = pattern.indexOf("minute");
        var periodIndex = pattern.indexOf("period");
        if (periodIndex === -1) {
            periodIndex = null;
        }
        return getOrder(hourIndex, minuteIndex, periodIndex);
    }

    function getControls(picker) {
        return { hourSelect: hourElement(picker), minuteSelect: minuteElement(picker), periodSelect: periodElement(picker) };
    }

    this.testTimePickerGlobalization = function (complete) {
        var cleanup;
        if (isWinRTEnabled()) {
            createPickerWithAppend(
            {
                current: '13:05:00-05:00'
            }).then(function (picker) {
                timePicker = picker;

                var calendar = new glob.Calendar();
                //  calendar.changeClock("12HourClock");
                var clock = calendar.getClock();
                var expectedCount = 12;
                var definedPeriod = true;
                if (clock === "12HourClock") {
                    expectedCount = 12;
                }
                else {
                    expectedCount = 24;
                    definedPeriod = false;
                }
                var selectControls = getControls(picker);
                LiveUnit.Assert.areEqual(expectedCount, selectControls.hourSelect.length, "wrong number of hour elements");
                LiveUnit.Assert.areEqual(definedPeriod, !!selectControls.periodSelect, "Not expected behavior of period control");
                var UIOrder = getActualUIOrder(selectControls);
                var actualOrder = getExpectedOrder(calendar.getCalendarSystem(), clock);
                LiveUnit.Assert.areEqual(actualOrder, UIOrder, "Order is not corrrect on 12HourClock");

            })
            .then(null, unhandledTestError)
            .then(cleanupTimePicker)
            .then(complete, complete);
        }
        else
            complete();
    };

    this.testTimePicker24HourClockGlobalization = function (complete) {
        if (isWinRTEnabled()) {
            var cleanup;
            createPickerWithAppend(
            {
                current: '13:05:00',
                clock: "24HourClock"

            }).then(function (picker) {
                timePicker = picker;

                var calendar = new glob.Calendar();
                calendar.changeClock("24HourClock");
                var clock = calendar.getClock();
                var expectedCount = 12;
                var definedPeriod = true;
                if (clock === "12HourClock") {
                    expectedCount = 12;
                }
                else {
                    expectedCount = 24;
                    definedPeriod = false;
                }
                var selectControls = getControls(picker);
                LiveUnit.Assert.areEqual(expectedCount, selectControls.hourSelect.length, "wrong number of hour elements");
                LiveUnit.Assert.areEqual(definedPeriod, !!selectControls.periodSelect, "Not expected behavior of period control");
                var UIOrder = getActualUIOrder(selectControls);
                var actualOrder = getExpectedOrder(calendar.getCalendarSystem(), clock);
                LiveUnit.Assert.areEqual(actualOrder, UIOrder, "Order is not corrrect on 12HourClock");

            })
            .then(null, unhandledTestError)
            .then(cleanupTimePicker)
            .then(complete, complete);
        }
        else
            complete();
    };

    this.testtimePickerExplicit12HourClockGlobalization = function (complete) {
        //BUGID: 729979
        if (isWinRTEnabled()) {
            var cleanup;
            createPickerWithAppend(
            {
                current: '13:05:00',
                clock: "12HourClock"

            }).then(function (picker) {
                timePicker = picker;

                var calendar = new glob.Calendar();
                calendar.changeClock("12HourClock");
                var clock = calendar.getClock();
                var expectedCount = 12;
                var definedPeriod = true;
                if (clock === "12HourClock") {
                    expectedCount = 12;
                }
                else {
                    expectedCount = 24;
                    definedPeriod = false;
                }
                var selectControls = getControls(picker);
                LiveUnit.Assert.areEqual(expectedCount, selectControls.hourSelect.length, "wrong number of hour elements");
                LiveUnit.Assert.areEqual(definedPeriod, !!selectControls.periodSelect, "The period control visibility is not correct");

                var UIOrder = getActualUIOrder(selectControls);
                var actualOrder = getExpectedOrder(calendar.getCalendarSystem(), clock);

                LiveUnit.Assert.areEqual(actualOrder, UIOrder, "Order is not corrrect on 12HourClock");

            })
            .then(null, unhandledTestError)
            .then(cleanupTimePicker)
            .then(complete, complete);
        }
        else
            complete();
    };

    this.testTimePickerGlobalizationWithCornerCaseCurrnet = function (complete) {
        if (isWinRTEnabled()) {
            var cleanup;
            createPickerWithAppend(
            {
                current: '13:05:00+05:00'
            }).then(function (picker) {
                timePicker = picker;

                var calendar = new glob.Calendar();

                var clock = calendar.getClock();
                var expectedCount = 12;
                var definedPeriod = true;
                if (clock === "12HourClock") {
                    expectedCount = 12;
                }
                else {
                    expectedCount = 24;
                    definedPeriod = false;
                }
                var selectControls = getControls(picker);
                LiveUnit.Assert.areEqual(expectedCount, selectControls.hourSelect.length, "wrong number of hour elements");
                LiveUnit.Assert.areEqual(definedPeriod, !!selectControls.periodSelect, "Not expected behavior of period control");
                var UIOrder = getActualUIOrder(selectControls);
                var actualOrder = getExpectedOrder(calendar.getCalendarSystem(), clock);
                LiveUnit.Assert.areEqual(actualOrder, UIOrder, "Order is not corrrect on 12HourClock");

            })
            .then(null, unhandledTestError)
            .then(cleanupTimePicker)
            .then(complete, complete);
        }
        else
            complete();
    };

    this.testCorrectBackEndValueWith24HourClock = function (complete) {

        if (isWinRTEnabled()) {
            var cleanup;
            createPickerWithAppend({
                clock: "24HourClock"
            }).
            then(function (picker) {
                timePicker = picker;
                setValues();
                cleanup = addChangeEvent(picker);
                setMinutes(picker, 30);
                for (var i = 1; i < 24; i++)
                    setHours(picker, i);
            })
            .then(null, unhandledTestError)
            .then(cleanup)
            .then(cleanupTimePicker)
            .then(complete, complete);
        }
        else
            complete();
    };

    this.testDirectPatternDeclaratively = function (complete) {
        //BugID: 538276
        if (isWinRTEnabled()) {
            var cleanup;
            createPickerWithAppend({

                hourPattern: "{hour.integer(2)}",
                minutePattern: "{minute.integer(2)}",
                current: '05:10:01'
            }).
            then(function (picker) {

                var hour = hourElement(picker).value;
                var minute = minuteElement(picker).value;
                var current = picker.winControl.current;
                LiveUnit.Assert.areEqual('05', hour, "checking the content of hour");
                LiveUnit.Assert.areEqual('10', minute, "checking the content of minute");
                checkPeriodControlValue("AM", periodElement(picker));

            })
            .then(null, unhandledTestError)
            .then(cleanupTimePicker)
            .then(complete, complete);
        }
        else
            complete();
    };

    this.testPatternWithSmallIntegersDeclaratively = function (complete) {
        //BugID: 538276
        if (isWinRTEnabled()) {
            var cleanup, cleanupListeners;
            createPickerWithAppend({
                hourPattern: "{hour.integer(1)}",
                minutePattern: "{minute.integer(1)}",
                periodPattern: "{period.abbreviated(1)}",
                current: '12:25:01'
            }).
            then(function (picker) {

                var hour = hourElement(picker).value;
                var minute = minuteElement(picker).value;
                //var period = periodElement(picker).value;
                var current = picker.winControl.current;
                checkPeriodControlValue("P", periodElement(picker));
                //LiveUnit.Assert.areEqual('P', period, "checking the content of period");
                LiveUnit.Assert.areEqual('12', hour, "checking the content of hour");
                LiveUnit.Assert.areEqual('25', minute, "checking the content of minute");

            })
            .then(null, unhandledTestError)
            .then(cleanupTimePicker)
            .then(complete, complete);
        }
        else
            complete();
    };

    this.testPatternWithInvalidPatternDeclaratively = function (complete) {
        //BugID: 538276
        if (isWinRTEnabled()) {

            createPickerWithAppend({
                hourPattern: "{hour.integer(3)}",
                minutePattern: "{minute.integer(3)}",
                periodPattern: "{period.abbreviated(3)}",
                current: '15:45:01'
            }).
            then(function (picker) {

                var hour = hourElement(picker).value;
                var minute = minuteElement(picker).value;
                //var period = periodElement(picker).value;
                var current = picker.winControl.current;
                checkPeriodControlValue("PM", periodElement(picker));
                //LiveUnit.Assert.areEqual('PM', period, "checking the content of period");
                if (isPeriodControl()) {
                    LiveUnit.Assert.areEqual('003', hour, "checking the content of hour");
                }
                else {
                    LiveUnit.Assert.areEqual('015', hour, "checking the content of hour");
                }
                LiveUnit.Assert.areEqual('045', minute, "checking the content of minute");

            })
            .then(null, unhandledTestError)
            .then(cleanupTimePicker)
            .then(complete, complete);
        }
        else
            complete();
    };

    this.testPatternWithIntegerAndAdditionPatternDeclaratively = function (complete) {
        //BugID: 538276
        if (isWinRTEnabled()) {

            createPickerWithAppend({
                hourPattern: "{hour.integer(2)} clock",
                minutePattern: "{minute.integer(2)} minutes",
                periodPattern: "{period.abbreviated(2)} period",
                current: '15:45:01'
            }).
            then(function (picker) {


                var current = picker.winControl.current;
                var periodControl = periodElement(picker);
                var minuteControl = minuteElement(picker);
                var hourControl = hourElement(picker);

                checkPeriodControlValue("PM period", periodControl);
                if (isPeriodControl()) {
                    LiveUnit.Assert.areEqual('03 clock', hourControl.value, "checking the content of hour");
                }
                else {
                    LiveUnit.Assert.areEqual('15 clock', hourControl.value, "checking the content of hour");
                }
                LiveUnit.Assert.areEqual('45 minutes', minuteControl.value, "checking the content of minute");


                if (isPeriodControl()) {
                    periodControl.selectedIndex = 0;  //AM
                    fireOnchange(periodControl);
                }
                minuteControl.selectedIndex = 30;  //30
                fireOnchange(minuteControl);

                hourControl.selectedIndex = 11;
                fireOnchange(hourControl);

                checkPeriodControlValue("AM period", periodControl);
                LiveUnit.Assert.areEqual('11 clock', hourControl.value, "checking the content of hour");
                LiveUnit.Assert.areEqual('30 minutes', minuteControl.value, "checking the content of minute");

                hourControl.selectedIndex = 0;
                fireOnchange(hourControl);
                checkPeriodControlValue("AM period", periodControl);
                if (isPeriodControl()) {
                    LiveUnit.Assert.areEqual('12 clock', hourControl.value, "checking the content of hour");
                }
                else {
                    LiveUnit.Assert.areEqual('00 clock', hourControl.value, "checking the content of hour");
                }
                LiveUnit.Assert.areEqual('30 minutes', minuteControl.value, "checking the content of minute");
            })
            .then(null, unhandledTestError)
            .then(cleanupTimePicker)
            .then(complete, complete);
        }
        else
            complete();
    };

    this.testTwoTimePickerOneWithPatternAndOneWithout = function (complete) {
        //BugID: 538276
        if (isWinRTEnabled()) {
            createPickerWithAppend({
                hourPattern: "{hour.integer(2)} clock",
                minutePattern: "{minute.integer(2)} minutes",
                periodPattern: "{period.abbreviated(2)} period",
                current: '15:45:01'
            }).then(function (picker) {

                var current = picker.winControl.current;
                var periodControl = periodElement(picker);
                var minuteControl = minuteElement(picker);
                var hourControl = hourElement(picker);

                checkPeriodControlValue('PM period', periodControl);

                if (isPeriodControl()) {
                    LiveUnit.Assert.areEqual('03 clock', hourControl.value, "checking the content of hour");
                }
                else {
                    LiveUnit.Assert.areEqual('15 clock', hourControl.value, "checking the content of hour");
                }
                LiveUnit.Assert.areEqual('45 minutes', minuteControl.value, "checking the content of minute");

            }).
            then(null, unhandledTestError).
            then(cleanupTimePicker).
            then(function () {

                createPickerWithAppend({
                    current: '02:30:02',
                }).then(function (picker) {
                    var periodControl = periodElement(picker);
                    var minuteControl = minuteElement(picker);
                    var hourControl = hourElement(picker);

                    checkPeriodControlValue('AM', periodControl);
                    LiveUnit.Assert.areEqual('2', hourControl.value, "checking the content of hour");
                    LiveUnit.Assert.areEqual('30', minuteControl.value, "checking the content of minute");

                }).
                then(null, unhandledTestError).
                then(cleanupTimePicker);
            })
            .then(complete, complete);
        }
        else {
            complete();
        }
    };

    var getInformationJS = function (clock, minuteIncrement) {
        var hours = ["twelve", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"];

        var minutes = {};
        minutes.getLength = function () { return 60 / minuteIncrement; };
        minutes.getValue = function (index) {
            var display = index * minuteIncrement;
            if (display < 10) {
                return "0" + display.toString();
            }
            else {
                return display.toString();
            }
        };

        var order = ["period", "minute", "hour"];
        if (clock === "24HourClock") {
            hours = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
            hours.push("thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenteen", "twenty-one", "twenty-two", "twenty-three");
            order = ["hour", "minute"];
        }

        return { minutes: minutes, hours: hours, clock: clock || "12HourClock", periods: ["AM", "PM"], order: order };
    };

    this.testCustomInformationProvider12HourClock = function (complete) {
        if (!isWinRTEnabled()) {
            var old = WinJS.UI.TimePicker.getInformation;
            var newComplete = function () {
                WinJS.UI.TimePicker.getInformation = old;
                complete();
            };

            WinJS.UI.TimePicker.getInformation = getInformationJS;
            createPickerWithAppend({
                clock: '12HourClock',
                current: '13:05:00'
            }).then(function (picker) {

                var current = picker.winControl.current;
                var periodControl = periodElement(picker);
                var minuteControl = minuteElement(picker);
                var hourControl = hourElement(picker);

                LiveUnit.Assert.areEqual('PM', periodControl.value, "checking the content of period");
                LiveUnit.Assert.areEqual('one', hourControl.value, "checking the content of hour");
                LiveUnit.Assert.areEqual('05', minuteControl.value, "checking the content of minute");
                LiveUnit.Assert.areEqual("PMH", getActualUIOrder(), "checking the correctness of the order");
                LiveUnit.Assert.areEqual(12, hourControl.length, "checking that 24 elements are added");
                LiveUnit.Assert.areEqual(60, minuteControl.length, "checking that 24 elements are added");
            }).
            then(null, unhandledTestError).
            then(cleanupTimePicker).
            then(newComplete, newComplete);
        }
        else {
            complete();
        }
    };

    this.testCustomInformationProvider24HourClock = function (complete) {
        if (!isWinRTEnabled()) {
            var old = WinJS.UI.TimePicker.getInformation;
            var newComplete = function () {
                WinJS.UI.TimePicker.getInformation = old;
                complete();
            };
            WinJS.UI.TimePicker.getInformation = getInformationJS;

            createPickerWithAppend({
                clock: '24HourClock',
                current: '00:30:00'
            }).then(function (picker) {

                var x = 2;
                var current = picker.winControl.current;
                var periodControl = periodElement(picker);
                var minuteControl = minuteElement(picker);
                var hourControl = hourElement(picker);

                LiveUnit.Assert.isTrue(!periodControl, "checking the content of period");
                LiveUnit.Assert.areEqual('zero', hourControl.value, "checking the content of hour");
                LiveUnit.Assert.areEqual('30', minuteControl.value, "checking the content of minute");
                LiveUnit.Assert.areEqual("HM", getActualUIOrder(), "checking the correctness of the order");
                LiveUnit.Assert.areEqual(24, hourControl.length, "checking that 24 elements are added");
                LiveUnit.Assert.areEqual(60, minuteControl.length, "checking that 24 elements are added");
            }).
            then(null, unhandledTestError).
            then(cleanupTimePicker).
            then(newComplete, newComplete);
        }
        else {
            complete();
        }
    };

    this.testCustomInformationProvider24HourClockWithDifferentIncrements = function (complete) {
        if (!isWinRTEnabled()) {
            var old = WinJS.UI.TimePicker.getInformation;
            var newComplete = function () {
                WinJS.UI.TimePicker.getInformation = old;
                complete();
            };

            WinJS.UI.TimePicker.getInformation = getInformationJS;

            createPickerWithAppend({
                clock: '24HourClock',
                current: '23:30:00',
                minuteIncrement: 15
            }).then(function (picker) {

                var x = 2;
                var current = picker.winControl.current;
                var periodControl = periodElement(picker);
                var minuteControl = minuteElement(picker);
                var hourControl = hourElement(picker);

                LiveUnit.Assert.isTrue(!periodControl, "checking the content of period");
                LiveUnit.Assert.areEqual('twenty-three', hourControl.value, "checking the content of hour");
                LiveUnit.Assert.areEqual('30', minuteControl.value, "checking the content of minute");
                LiveUnit.Assert.areEqual("HM", getActualUIOrder(), "checking the correctness of the order");
                LiveUnit.Assert.areEqual(24, hourControl.length, "checking that 24 elements are added");
                LiveUnit.Assert.areEqual(4, minuteControl.length, "checking that 24 elements are added");
            }).
            then(null, unhandledTestError).
            then(cleanupTimePicker).
            then(newComplete, newComplete);
        }
        else {
            complete();
        }
    };

    this.testChangingClockFormat = function (complete) {
        //BUGID: 729979
        var cleanup;
        if (isWinRTEnabled()) {
            createPickerWithAppend(
            {
                clock: '12HourClock',
                current: '13:05:00'
            }).then(function (picker) {
                timePicker = picker;

                var clock = "12HourClock";
                var calendar = new glob.Calendar();
                calendar.changeClock(clock);
                clock = calendar.getClock();
                var expectedCount = 12;
                var definedPeriod = true;

                var selectControls = getControls(picker);
                LiveUnit.Assert.areEqual(expectedCount, selectControls.hourSelect.length, "wrong number of hour elements");
                LiveUnit.Assert.areEqual(definedPeriod, !!selectControls.periodSelect, "Not expected behavior of period control");
                var UIOrder = getActualUIOrder(selectControls);
                var actualOrder = getExpectedOrder(calendar.getCalendarSystem(), clock);
                LiveUnit.Assert.areEqual(actualOrder, UIOrder, "Order is not corrrect on 12HourClock");
                LiveUnit.Assert.areEqual("1", selectControls.hourSelect.value, "Expected Value for hourControl in 12HourClock is not correct");
                LiveUnit.Assert.areEqual("05", selectControls.minuteSelect.value, "Expected Value for minuteControl in 12HourClock is not correct");
                checkPeriodControlValue("PM", selectControls.periodSelect, true);

                clock = "24HourClock";
                calendar.changeClock(clock);
                picker.winControl.clock = clock;
                picker.winControl.minuteIncrement = "15";
                clock = calendar.getClock();
                expectedCount = 24;
                definedPeriod = false;


                actualOrder = getExpectedOrder(calendar.getCalendarSystem(), clock);
                selectControls = getControls(picker);
                LiveUnit.Assert.areEqual(expectedCount, selectControls.hourSelect.length, "wrong number of hour elements");
                LiveUnit.Assert.areEqual(definedPeriod, !!selectControls.periodSelect, "Not expected behavior of period control for 24 hour clock");
                UIOrder = getActualUIOrder(selectControls);

                LiveUnit.Assert.areEqual(actualOrder, UIOrder, "Order is not corrrect on 12HourClock");
                LiveUnit.Assert.areEqual("13", selectControls.hourSelect.value, "Expected Value for hourControl in 24HourClock is not correct");
                LiveUnit.Assert.areEqual("00", selectControls.minuteSelect.value, "Expected Value for minuteControl in 24HourClock is not correct");

            })
            .then(null, unhandledTestError)
            .then(cleanupTimePicker)
            .then(complete, complete);
        }
        else
            complete();
    };

    this.testPatternWithSpecialCharacters = function (complete) {

        if (isWinRTEnabled()) {

            createPickerWithAppend({
                hourPattern: " ' & < > # {hour.integer(3)}",
                minutePattern: " ' & < > # {minute.integer(3)}",
                periodPattern: ': ! @ $ % ^ " {period.abbreviated(3)}',
                current: '15:45:01'
            }).
            then(function (picker) {

                var hour = hourElement(picker).value;
                var minute = minuteElement(picker).value;
                var period = periodElement(picker);
                var current = picker.winControl.current;
                checkPeriodControlValue(': ! @ $ % ^ " PM', period);
                if (isPeriodControl()) {
                    LiveUnit.Assert.areEqual(" ' & < > # 003", hour, "checking the content of hour");
                }
                else {
                    LiveUnit.Assert.areEqual(" ' & < > # 015", hour, "checking the content of hour");
                }
                LiveUnit.Assert.areEqual(" ' & < > # 045", minute, "checking the content of minute");

                picker.winControl.current = '05:20:03';

                hour = hourElement(picker).value;
                minute = minuteElement(picker).value;


                checkPeriodControlValue(': ! @ $ % ^ " AM', period);
                LiveUnit.Assert.areEqual(" ' & < > # 005", hour, "checking the content of hour");
                LiveUnit.Assert.areEqual(" ' & < > # 020", minute, "checking the content of minute");

            })
            .then(null, unhandledTestError)
            .then(cleanupTimePicker)
            .then(complete, complete);
        }
        else
            complete();
    };

    this.testMinuteIncrement = function (complete) {
        if (isWinRTEnabled()) {

            createPickerWithAppend({
                minuteIncrement: 5,
                current: '3:30PM'
            }).
            then(function (picker) {

                function setAndCheck(increment) {
                    picker.winControl.minuteIncrement = increment;
                    var minute = minuteElement(picker).value;
                    LiveUnit.Assert.areEqual("30", minute, "checking the content of minute");
                }

                setAndCheck(15);
                setAndCheck(10);
                setAndCheck(30);
                setAndCheck(5);
            })
            .then(null, unhandledTestError)
            .then(cleanupTimePicker)
            .then(complete, complete);
        }
        else
            complete();
    };

    this.testConstructionWithEventHandlerInOptions = function(complete) {
        var handler = function() {
            complete();
        };
        var dp = new WinJS.UI.TimePicker(null, { onchange: handler});
        document.body.appendChild(dp.element);

        var evnt = document.createEvent("UIEvents");
        evnt.initUIEvent("change", false, false, window, 0);
        dp.element.dispatchEvent(evnt);
    };
};

LiveUnit.registerTestClass("CorsicaTests.TimePickerDecl");
