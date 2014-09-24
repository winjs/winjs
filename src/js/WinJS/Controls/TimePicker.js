// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

define([
    '../Core/_Global',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_Events',
    '../Core/_Resources',
    '../Utilities/_Control',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    '../Utilities/_Select',
    'require-style!less/desktop/controls'
    ], function timePickerInit(_Global, _WinRT, _Base, _BaseUtils, _Events, _Resources, _Control, _ElementUtilities, _Hoverable, _Select) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.TimePicker">Allows users to select time values.</summary>
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        /// <name locid="WinJS.UI.TimePicker_name">Time Picker</name>
        /// <icon src="ui_winjs.ui.timepicker.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.timepicker.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<div data-win-control="WinJS.UI.TimePicker"></div>]]></htmlSnippet>
        /// <event name="change" locid="WinJS.UI.TimePicker_e:change">Occurs when the time changes.</event>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        TimePicker: _Base.Namespace._lazy(function () {
            // Constants definition
            var DEFAULT_MINUTE_PATTERN = "{minute.integer(2)}",
                DEFAULT_HOUR_PATTERN = "{hour.integer(1)}",
                DEFAULT_PERIOD_PATTERN = "{period.abbreviated(2)}";

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/timePicker").value; },
                get selectHour() { return _Resources._getWinJSString("ui/selectHour").value; },
                get selectMinute() { return _Resources._getWinJSString("ui/selectMinute").value; },
                get selectAMPM() { return _Resources._getWinJSString("ui/selectAMPM").value; },
            };

            // date1 and date2 must be Date objects with their date portions set to the
            // sentinel date.
            var areTimesEqual = function (date1, date2) {
                return date1.getHours() === date2.getHours() &&
                    date1.getMinutes() === date2.getMinutes();
            };

            var TimePicker = _Base.Class.define(function TimePicker_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.TimePicker.TimePicker">
                /// <summary locid="WinJS.UI.TimePicker.constructor">Initializes a new instance of the TimePicker control</summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.TimePicker.constructor_p:element">
                /// The DOM element associated with the TimePicker control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.TimePicker.constructor_p:options">
                /// The set of options to be applied initially to the TimePicker control.
                /// </param>
                /// <returns type="WinJS.UI.TimePicker" locid="WinJS.UI.TimePicker.constructor_returnValue">A constructed TimePicker control.</returns>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>

                // Default to current time
                this._currentTime = TimePicker._sentinelDate();

                element = element || _Global.document.createElement("div");
                _ElementUtilities.addClass(element, "win-disposable");
                element.winControl = this;

                var label = element.getAttribute("aria-label");
                if (!label) {
                    element.setAttribute("aria-label", strings.ariaLabel);
                }

                this._timePatterns = {
                    minute: null,
                    hour: null,
                    period: null
                };

                // Options should be set after the element is initialized which is
                // the same order of operation as imperatively setting options.
                this._init(element);
                _Control.setOptions(this, options);
            }, {
                _currentTime: null,
                _clock: null,
                _disabled: false,
                _hourElement: null,
                _hourControl: null,
                _minuteElement: null,
                _minuteControl: null,
                _ampmElement: null,
                _ampmControl: null,
                _minuteIncrement: 1,
                _timePatterns: {
                    minute: null,
                    hour: null,
                    period: null
                },
                _information: null,

                _addAccessibilityAttributes: function () {
                    //see http://www.w3.org/TR/wai-aria/rdf_model.png for details
                    this._domElement.setAttribute("role", "group");

                    this._hourElement.setAttribute("aria-label", strings.selectHour);
                    this._minuteElement.setAttribute("aria-label", strings.selectMinute);
                    if (this._ampmElement) {
                        this._ampmElement.setAttribute("aria-label", strings.selectAMPM);
                    }
                },

                _addControlsInOrder: function (info) {
                    var that = this;
                    info.order.forEach(function (s, index) {
                        switch (s) {
                            case "hour":
                                that._domElement.appendChild(that._hourElement);
                                _ElementUtilities.addClass(that._hourElement, "win-order" + index);
                                break;
                            case "minute":
                                that._domElement.appendChild(that._minuteElement);
                                _ElementUtilities.addClass(that._minuteElement, "win-order" + index);
                                break;
                            case "period":
                                if (that._ampmElement) {
                                    that._domElement.appendChild(that._ampmElement);
                                    _ElementUtilities.addClass(that._ampmElement, "win-order" + index);
                                }
                                break;
                        }
                    });
                },

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.TimePicker.dispose">
                    /// <summary locid="WinJS.UI.TimePicker.dispose">
                    /// Disposes this TimePicker.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                },

                /// <field type="String" locid="WinJS.UI.TimePicker.clock" helpKeyword="WinJS.UI.TimePicker.clock">
                /// Gets or sets the type of clock to display (12HourClock or 24HourClock). It defaults to the user setting.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                clock: {
                    get: function () {
                        return this._clock;
                    },
                    set: function (value) {
                        if (this._clock !== value) {
                            this._clock = value;
                            this._init();
                        }
                    }
                },

                /// <field type="Date" locid="WinJS.UI.TimePicker.current" helpKeyword="WinJS.UI.TimePicker.current">
                /// Gets or sets the current date (and time) of the TimePicker.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                current: {
                    get: function () {
                        var cur = this._currentTime;
                        if (cur) {
                            var time = TimePicker._sentinelDate();
                            time.setHours(cur.getHours()); // accounts for AM/PM
                            time.setMinutes(this._getMinutesIndex(cur) * this.minuteIncrement);
                            time.setSeconds(0);
                            time.setMilliseconds(0);
                            return time;
                        } else {
                            return cur;
                        }
                    },
                    set: function (value) {
                        var newTime;
                        if (typeof (value) === "string") {
                            newTime = TimePicker._sentinelDate();
                            newTime.setTime(Date.parse(newTime.toDateString() + " " + value));
                        } else {
                            newTime = TimePicker._sentinelDate();
                            newTime.setHours(value.getHours());
                            newTime.setMinutes(value.getMinutes());
                        }

                        var oldTime = this._currentTime;
                        if (!areTimesEqual(oldTime, newTime)) {
                            this._currentTime = newTime;

                            this._updateDisplay();
                        }
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.TimePicker.disabled" helpKeyword="WinJS.UI.TimePicker.disabled">
                /// Specifies whether the TimePicker is disabled.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                disabled: {
                    get: function () { return this._disabled; },
                    set: function (value) {
                        if (this._disabled !== value) {
                            this._disabled = value;
                            if (this._hourControl) {
                                this._hourControl.setDisabled(value);
                                this._minuteControl.setDisabled(value);
                            }
                            if (this._ampmControl) {
                                this._ampmControl.setDisabled(value);
                            }
                        }
                    }
                },

                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.TimePicker.element" helpKeyword="WinJS.UI.TimePicker.element">
                /// Gets the DOM element for the TimePicker.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                element: {
                    get: function () { return this._domElement; }
                },


                _init: function (element) {
                    this._setElement(element);
                    this._updateDisplay();
                },

                /// <field type="String" locid="WinJS.UI.TimePicker.hourPattern" helpKeyword="WinJS.UI.TimePicker.hourPattern">
                /// Gets or sets the display pattern for the hour.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                hourPattern: {
                    get: function () { return this._timePatterns.hour.pattern; },
                    set: function (value) {
                        if (this._timePatterns.hour !== value) {
                            this._timePatterns.hour = value;
                            this._init();
                        }
                    }

                },

                _getHoursAmpm: function (time) {
                    var hours24 = time.getHours();
                    if (this._ampmElement) {
                        if (hours24 === 0) {
                            return { hours: 12, ampm: 0 };
                        } else if (hours24 < 12) {
                            return { hours: hours24, ampm: 0 };
                        }
                        return { hours: hours24 - 12, ampm: 1 };
                    }

                    return { hours: hours24 };
                },

                _getHoursIndex: function (hours) {
                    if (this._ampmElement && hours === 12) {
                        return 0;
                    }
                    return hours;
                },

                _getMinutesIndex: function (time) {
                    return parseInt(time.getMinutes() / this.minuteIncrement);
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.TimePicker.minuteIncrement" helpKeyword="WinJS.UI.TimePicker.minuteIncrement">
                /// Gets or sets the minute increment. For example, "15" specifies that the TimePicker minute control should display only the choices 00, 15, 30, 45.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                minuteIncrement: {
                    //prevent divide by 0, and leave user's input intact
                    get: function () { return Math.max(1, Math.abs(this._minuteIncrement | 0) % 60); },
                    set: function (value) {
                        if (this._minuteIncrement !== value) {
                            this._minuteIncrement = value;
                            this._init();
                        }
                    }

                },

                /// <field type="String" locid="WinJS.UI.TimePicker.minutePattern" helpKeyword="WinJS.UI.TimePicker.minutePattern">
                /// Gets or sets the display pattern for the minute.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                minutePattern: {
                    get: function () { return this._timePatterns.minute.pattern; },
                    set: function (value) {
                        if (this._timePatterns.minute !== value) {
                            this._timePatterns.minute = value;
                            this._init();
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.TimePicker.periodPattern" helpKeyword="WinJS.UI.TimePicker.periodPattern">
                /// Gets or sets the display pattern for the period.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                periodPattern: {
                    get: function () { return this._timePatterns.period.pattern; },
                    set: function (value) {

                        if (this._timePatterns.period !== value) {
                            this._timePatterns.period = value;
                            this._init();
                        }
                    }
                },

                _setElement: function (element) {
                    this._domElement = this._domElement || element;
                    if (!this._domElement) { return; }

                    var info = TimePicker.getInformation(this.clock, this.minuteIncrement, this._timePatterns);
                    this._information = info;

                    if (info.forceLanguage) {
                        this._domElement.setAttribute("lang", info.forceLanguage);
                        this._domElement.setAttribute("dir", info.isRTL ? "rtl" : "ltr");
                    }

                    _ElementUtilities.empty(this._domElement);
                    _ElementUtilities.addClass(this._domElement, "win-timepicker");

                    this._hourElement = _Global.document.createElement("select");
                    _ElementUtilities.addClass(this._hourElement, "win-timepicker-hour");

                    this._minuteElement = _Global.document.createElement("select");
                    _ElementUtilities.addClass(this._minuteElement, "win-timepicker-minute");

                    this._ampmElement = null;
                    if (info.clock === "12HourClock") {
                        this._ampmElement = _Global.document.createElement("select");
                        _ElementUtilities.addClass(this._ampmElement, "win-timepicker-period");
                    }

                    this._addControlsInOrder(info);

                    var hoursAmpm = this._getHoursAmpm(this.current);
                    this._hourControl = new _Select._Select(this._hourElement, {
                        dataSource: this._getInfoHours(),
                        disabled: this.disabled,
                        index: this._getHoursIndex(hoursAmpm.hours)
                    });
                    this._minuteControl = new _Select._Select(this._minuteElement, {
                        dataSource: info.minutes,
                        disabled: this.disabled,
                        index: this._getMinutesIndex(this.current)
                    });
                    this._ampmControl = null;
                    if (this._ampmElement) {
                        this._ampmControl = new _Select._Select(this._ampmElement, {
                            dataSource: info.periods,
                            disabled: this.disabled,
                            index: hoursAmpm.ampm
                        });
                    }

                    this._wireupEvents();
                    this._updateValues();
                    this._addAccessibilityAttributes();
                },

                _getInfoHours: function () {
                    return this._information.hours;
                },

                _updateLayout: function () {
                    if (!this._domElement) {
                        return;
                    }
                    this._updateValues();
                },

                _updateValues: function () {
                    if (this._hourControl) {
                        var hoursAmpm = this._getHoursAmpm(this.current);
                        if (this._ampmControl) {
                            this._ampmControl.index = hoursAmpm.ampm;
                        }
                        this._hourControl.index = this._getHoursIndex(hoursAmpm.hours);
                        this._minuteControl.index = this._getMinutesIndex(this.current);
                    }
                },

                _updateDisplay: function () {
                    //Render display index based on constraints (minuteIncrement)
                    //Will not modify current time

                    var hoursAmpm = this._getHoursAmpm(this.current);

                    if (this._ampmControl) {
                        this._ampmControl.index = hoursAmpm.ampm;
                    }

                    if (this._hourControl) {
                        this._hourControl.index = this._getHoursIndex(hoursAmpm.hours);
                        this._minuteControl.index = this._getMinutesIndex(this.current);
                    }
                },

                _wireupEvents: function () {
                    var that = this;

                    var fixupHour = function () {
                        var hour = that._hourControl.index;
                        if (that._ampmElement) {
                            if (that._ampmControl.index === 1) {
                                if (hour !== 12) {
                                    hour += 12;
                                }
                            }
                        }
                        return hour;
                    };

                    var changed = function () {
                        var hour = fixupHour();
                        that._currentTime.setHours(hour);

                        that._currentTime.setMinutes(that._minuteControl.index * that.minuteIncrement);
                    };

                    this._hourElement.addEventListener("change", changed, false);
                    this._minuteElement.addEventListener("change", changed, false);
                    if (this._ampmElement) {
                        this._ampmElement.addEventListener("change", changed, false);
                    }
                }
            }, {
                _sentinelDate: function () {
                    // This is July 15th, 2011 as our sentinel date. There are no known
                    //  daylight savings transitions that happened on that date.
                    var current = new Date();
                    return new Date(2011, 6, 15, current.getHours(), current.getMinutes());
                },
                _getInformationWinRT: function (clock, minuteIncrement, timePatterns) {
                    var newFormatter = function (pattern, defaultPattern) {
                        var dtf = _WinRT.Windows.Globalization.DateTimeFormatting;
                        pattern = !pattern ? defaultPattern : pattern;
                        var formatter = new dtf.DateTimeFormatter(pattern);
                        if (clock) {
                            formatter = dtf.DateTimeFormatter(pattern, formatter.languages, formatter.geographicRegion, formatter.calendar, clock);
                        }
                        return formatter;
                    };

                    var glob = _WinRT.Windows.Globalization;
                    var calendar = new glob.Calendar();
                    if (clock) {
                        calendar = new glob.Calendar(calendar.languages, calendar.getCalendarSystem(), clock);
                    }
                    calendar.setDateTime(TimePicker._sentinelDate());

                    var computedClock = calendar.getClock();
                    var numberOfHours = 24;
                    numberOfHours = calendar.numberOfHoursInThisPeriod;

                    var periods = (function () {
                        var periodFormatter = newFormatter(timePatterns.period, DEFAULT_PERIOD_PATTERN);
                        return {
                            getLength: function () { return 2; },
                            getValue: function (index) {
                                var date = TimePicker._sentinelDate();
                                if (index === 0) {
                                    date.setHours(1);
                                    var am = periodFormatter.format(date);
                                    return am;
                                }
                                if (index === 1) {
                                    date.setHours(13);
                                    var pm = periodFormatter.format(date);
                                    return pm;
                                }
                                return null;
                            }
                        };
                    })();

                    // Determine minute format from the DateTimeFormatter
                    var minutes = (function () {
                        var minuteFormatter = newFormatter(timePatterns.minute, DEFAULT_MINUTE_PATTERN);
                        var now = TimePicker._sentinelDate();
                        return {
                            getLength: function () { return 60 / minuteIncrement; },
                            getValue: function (index) {
                                var display = index * minuteIncrement;
                                now.setMinutes(display);
                                return minuteFormatter.format(now);
                            }
                        };
                    })();


                    // Determine hour format from the DateTimeFormatter
                    var hours = (function () {
                        var hourFormatter = newFormatter(timePatterns.hour, DEFAULT_HOUR_PATTERN);
                        var now = TimePicker._sentinelDate();
                        return {
                            getLength: function () { return numberOfHours; },
                            getValue: function (index) {
                                now.setHours(index);
                                return hourFormatter.format(now);
                            }
                        };
                    })();

                    // Determine the order of the items from the DateTimeFormatter.
                    // "hour minute" also returns the period (if needed).
                    //
                    var hourMinuteFormatter = newFormatter("hour minute");
                    var pattern = hourMinuteFormatter.patterns[0];
                    var order = ["hour", "minute"];

                    var indexes = {
                        period: pattern.indexOf("{period"),
                        hour: pattern.indexOf("{hour"),
                        minute: pattern.indexOf("{minute")
                    };
                    if (indexes.period > -1) {
                        order.push("period");
                    }


                    var DateTimeFormatter = _WinRT.Windows.Globalization.DateTimeFormatting.DateTimeFormatter;
                    var dtf = new DateTimeFormatter("month.full", _WinRT.Windows.Globalization.ApplicationLanguages.languages, "ZZ", "GregorianCalendar", "24HourClock");
                    var pat = dtf.patterns[0];
                    var isRTL = pat.charCodeAt(0) === 8207;

                    if (isRTL) {
                        var temp = indexes.hour;
                        indexes.hour = indexes.minute;
                        indexes.minute = temp;
                    }

                    order.sort(function (a, b) {
                        if (indexes[a] < indexes[b]) {
                            return -1;
                        } else if (indexes[a] > indexes[b]) {
                            return 1;
                        } else {
                            return 0;
                        }
                    });

                    return { minutes: minutes, hours: hours, clock: computedClock, periods: periods, order: order, forceLanguage: hourMinuteFormatter.resolvedLanguage, isRTL: isRTL };
                },
                _getInformationJS: function (clock, minuteIncrement) {
                    var hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

                    var minutes = {};
                    minutes.getLength = function () { return 60 / minuteIncrement; };
                    minutes.getValue = function (index) {
                        var display = index * minuteIncrement;
                        if (display < 10) {
                            return "0" + display.toString();
                        } else {
                            return display.toString();
                        }
                    };

                    var order = ["hour", "minute", "period"];
                    if (clock === "24HourClock") {
                        hours = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
                        order = ["hour", "minute"];
                    }
                    return { minutes: minutes, hours: hours, clock: clock || "12HourClock", periods: ["AM", "PM"], order: order };
                }
            });
            if (_WinRT.Windows.Globalization.DateTimeFormatting && _WinRT.Windows.Globalization.Calendar && _WinRT.Windows.Globalization.ApplicationLanguages) {
                TimePicker.getInformation = TimePicker._getInformationWinRT;
            } else {
                TimePicker.getInformation = TimePicker._getInformationJS;
            }
            _Base.Class.mix(TimePicker, _Events.createEventProperties("change"));
            _Base.Class.mix(TimePicker, _Control.DOMEventMixin);
            return TimePicker;
        })
    });


});
