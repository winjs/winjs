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
    ], function datePickerInit(_Global, _WinRT, _Base, _BaseUtils, _Events, _Resources, _Control, _ElementUtilities, _Hoverable, _Select) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.DatePicker">Allows users to pick a date value.</summary>
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        /// <name locid="WinJS.UI.DatePicker_name">Date Picker</name>
        /// <icon src="ui_winjs.ui.datepicker.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.datepicker.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<div data-win-control="WinJS.UI.DatePicker"></div>]]></htmlSnippet>
        /// <event name="change" locid="WinJS.UI.DatePicker_e:change">Occurs when the current date changes.</event>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        DatePicker: _Base.Namespace._lazy(function () {
            // Constants definition
            var DEFAULT_DAY_PATTERN = 'day',
                DEFAULT_MONTH_PATTERN = '{month.full}',
                DEFAULT_YEAR_PATTERN = 'year.full';

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/datePicker").value; },
                get selectDay() { return _Resources._getWinJSString("ui/selectDay").value; },
                get selectMonth() { return _Resources._getWinJSString("ui/selectMonth").value; },
                get selectYear() { return _Resources._getWinJSString("ui/selectYear").value; },
            };

            var yearFormatCache = {};

            function newFormatter(pattern, calendar, defaultPattern) {
                var dtf = _WinRT.Windows.Globalization.DateTimeFormatting;
                pattern = !pattern ? defaultPattern : pattern;
                var c = new dtf.DateTimeFormatter(pattern);
                if (calendar) {
                    return new dtf.DateTimeFormatter(pattern, c.languages, c.geographicRegion, calendar, c.clock);
                }
                return c;
            }

            function formatCacheLookup(pattern, calendar, defaultPattern) {
                var pat = yearFormatCache[pattern];
                if (!pat) {
                    pat = yearFormatCache[pattern] = {};
                }
                var cal = pat[calendar];
                if (!cal) {
                    cal = pat[calendar] = {};
                }
                var def = cal[defaultPattern];
                if (!def) {
                    def = cal[defaultPattern] = {};
                    def.formatter = newFormatter(pattern, calendar, defaultPattern);
                    def.years = {};
                }
                return def;
            }

            function formatYear(pattern, calendar, defaultPattern, datePatterns, order, cal) {
                var cache = formatCacheLookup(pattern, calendar, defaultPattern);
                var y = cache.years[cal.year + "-" + cal.era];
                if (!y) {
                    y = cache.formatter.format(cal.getDateTime());
                    cache.years[cal.year + "-" + cal.era] = y;
                }
                return y;
            }

            function formatMonth(pattern, calendar, defaultPattern, cal) {
                var cache = formatCacheLookup(pattern, calendar, defaultPattern);
                // can't cache actual month names because the hebrew calendar varies
                // the month name depending on religious holidays and leap months.
                //
                return cache.formatter.format(cal.getDateTime());
            }

            function formatDay(pattern, calendar, defaultPattern, cal) {
                var cache = formatCacheLookup(pattern, calendar, defaultPattern);
                // can't cache actual day names because the format may include the day of the week,
                // which, of course, varies from month to month.
                //
                return cache.formatter.format(cal.getDateTime());
            }

            function newCal(calendar) {
                var glob = _WinRT.Windows.Globalization;
                var c = new glob.Calendar();
                if (calendar) {
                    return new glob.Calendar(c.languages, calendar, c.getClock());
                }
                return c;
            }

            function yearDiff(start, end) {
                var yearCount = 0;

                if (start.era === end.era) {
                    yearCount = end.year - start.year;
                } else {
                    while (start.era !== end.era || start.year !== end.year) {
                        yearCount++;
                        start.addYears(1);
                    }
                }
                return yearCount;
            }

            var DatePicker = _Base.Class.define(function DatePicker_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.DatePicker.DatePicker">
                /// <summary locid="WinJS.UI.DatePicker.constructor">Creates a new DatePicker control.</summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.DatePicker.constructor_p:element">
                /// The DOM element that will host the DatePicker control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.DatePicker.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control. Each property of the options object corresponds
                /// to one of the control's properties or events.
                /// </param>
                /// <returns type="WinJS.UI.DatePicker" locid="WinJS.UI.DatePicker.constructor_returnValue">A constructed DatePicker control.</returns>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>

                // Default to current date
                this._currentDate = new Date();

                // Default to +/- 100 years
                this._minYear = this._currentDate.getFullYear() - 100;
                this._maxYear = this._currentDate.getFullYear() + 100;
                this._datePatterns = {
                    date: null,
                    month: null,
                    year: null
                };

                element = element || _Global.document.createElement("div");
                _ElementUtilities.addClass(element, "win-disposable");
                element.winControl = this;

                var label = element.getAttribute("aria-label");
                if (!label) {
                    element.setAttribute("aria-label", strings.ariaLabel);
                }

                // Options should be set after the element is initialized which is
                // the same order of operation as imperatively setting options.
                this._init(element);
                _Control.setOptions(this, options);
            }, {
                _information: null,
                _currentDate: null,
                _calendar: null,
                _disabled: false,
                _dateElement: null,
                _dateControl: null,
                _monthElement: null,
                _monthControl: null,
                _minYear: null,
                _maxYear: null,
                _yearElement: null,
                _yearControl: null,
                _datePatterns: {
                    date: null,
                    month: null,
                    year: null
                },

                _addAccessibilityAttributes: function () {
                    //see http://www.w3.org/TR/wai-aria/rdf_model.png for details
                    this._domElement.setAttribute("role", "group");

                    this._dateElement.setAttribute("aria-label", strings.selectDay);
                    this._monthElement.setAttribute("aria-label", strings.selectMonth);
                    this._yearElement.setAttribute("aria-label", strings.selectYear);
                },

                _addControlsInOrder: function () {
                    var e = this._domElement;
                    var that = this;
                    var orderIndex = 0; // don't use forEach's index, because "era" is in the list
                    that._information.order.forEach(function (s) {
                        switch (s) {
                            case "month":
                                e.appendChild(that._monthElement);
                                _ElementUtilities.addClass(that._monthElement, "win-order" + (orderIndex++));
                                break;
                            case "date":
                                e.appendChild(that._dateElement);
                                _ElementUtilities.addClass(that._dateElement, "win-order" + (orderIndex++));
                                break;
                            case "year":
                                e.appendChild(that._yearElement);
                                _ElementUtilities.addClass(that._yearElement, "win-order" + (orderIndex++));
                                break;
                        }
                    });
                },

                _createControlElements: function () {
                    this._monthElement = _Global.document.createElement("select");
                    this._monthElement.className = "win-datepicker-month";
                    this._dateElement = _Global.document.createElement("select");
                    this._dateElement.className = "win-datepicker-date";
                    this._yearElement = _Global.document.createElement("select");
                    this._yearElement.className = "win-datepicker-year";
                },

                _createControls: function () {
                    var info = this._information;
                    var index = info.getIndex(this.current);

                    if (info.forceLanguage) {
                        this._domElement.setAttribute("lang", info.forceLanguage);
                        this._domElement.setAttribute("dir", info.isRTL ? "rtl" : "ltr");
                    }


                    this._yearControl = new _Select._Select(this._yearElement, {
                        dataSource: this._information.years,
                        disabled: this.disabled,
                        index: index.year
                    });

                    this._monthControl = new _Select._Select(this._monthElement, {
                        dataSource: this._information.months(index.year),
                        disabled: this.disabled,
                        index: index.month
                    });

                    this._dateControl = new _Select._Select(this._dateElement, {
                        dataSource: this._information.dates(index.year, index.month),
                        disabled: this.disabled,
                        index: index.date
                    });

                    this._wireupEvents();
                },
                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.DatePicker.dispose">
                    /// <summary locid="WinJS.UI.DatePicker.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                },

                /// <field type="String" locid="WinJS.UI.DatePicker.calendar" helpKeyword="WinJS.UI.DatePicker.calendar">
                /// Gets or sets the calendar to use.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                calendar: {
                    get: function () {
                        return this._calendar;
                    },
                    set: function (value) {
                        this._calendar = value;
                        this._setElement(this._domElement);
                    }
                },

                /// <field type="Date" locid="WinJS.UI.DatePicker.current" helpKeyword="WinJS.UI.DatePicker.current">
                /// Gets or sets the current date of the DatePicker.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                current: {
                    get: function () {
                        var d = this._currentDate;
                        var y = d.getFullYear();
                        return new Date(Math.max(Math.min(this.maxYear, y), this.minYear), d.getMonth(), d.getDate(), 12, 0, 0, 0);
                    },
                    set: function (value) {
                        var newDate;
                        if (typeof (value) === "string") {
                            newDate = new Date(Date.parse(value));
                            newDate.setHours(12, 0, 0, 0);
                        } else {
                            newDate = value;
                        }

                        var oldDate = this._currentDate;
                        if (oldDate !== newDate) {
                            this._currentDate = newDate;
                            this._updateDisplay();
                        }
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.DatePicker.disabled" helpKeyword="WinJS.UI.DatePicker.disabled">
                /// Gets or sets a value that specifies whether the DatePicker is disabled. A value of true indicates that the DatePicker is disabled.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                disabled: {
                    get: function () { return this._disabled; },
                    set: function (value) {
                        if (this._disabled !== value) {
                            this._disabled = value;
                            // all controls get populated at the same time, so any check is OK
                            //
                            if (this._yearControl) {
                                this._monthControl.setDisabled(value);
                                this._dateControl.setDisabled(value);
                                this._yearControl.setDisabled(value);
                            }
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.DatePicker.datePattern" helpKeyword="WinJS.UI.DatePicker.datePattern">
                /// Gets or sets the display pattern for the date.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                datePattern: {
                    get: function () { return this._datePatterns.date; },
                    set: function (value) {
                        if (this._datePatterns.date !== value) {
                            this._datePatterns.date = value;
                            this._init();
                        }
                    }
                },


                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.DatePicker.element" helpKeyword="WinJS.UI.DatePicker.element">
                /// Gets the DOM element for the DatePicker.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                element: {
                    get: function () { return this._domElement; }
                },

                _setElement: function (element) {
                    this._domElement = this._domElement || element;
                    if (!this._domElement) { return; }

                    _ElementUtilities.empty(this._domElement);
                    _ElementUtilities.addClass(this._domElement, "win-datepicker");

                    this._updateInformation();

                    this._createControlElements();
                    this._addControlsInOrder();
                    this._createControls();
                    this._addAccessibilityAttributes();
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.DatePicker.minYear" helpKeyword="WinJS.UI.DatePicker.minYear">
                /// Gets or sets the minimum Gregorian year available for picking.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                minYear: {
                    get: function () {
                        return this._information.getDate({ year: 0, month: 0, date: 0 }).getFullYear();
                    },
                    set: function (value) {
                        if (this._minYear !== value) {
                            this._minYear = value;
                            if (value > this._maxYear) {
                                this._maxYear = value;
                            }
                            this._updateInformation();
                            if (this._yearControl) {
                                this._yearControl.dataSource = this._information.years;
                            }

                            this._updateDisplay();
                        }
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.DatePicker.maxYear" helpKeyword="WinJS.UI.DatePicker.maxYear">
                /// Gets or sets the maximum Gregorian year available for picking.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                maxYear: {
                    get: function () {
                        var index = {
                            year: this._information.years.getLength() - 1
                        };
                        index.month = this._information.months(index.year).getLength() - 1;
                        index.date = this._information.dates(index.year, index.month).getLength() - 1;
                        return this._information.getDate(index).getFullYear();
                    },
                    set: function (value) {
                        if (this._maxYear !== value) {
                            this._maxYear = value;
                            if (value < this._minYear) {
                                this._minYear = value;
                            }
                            this._updateInformation();
                            if (this._yearControl) {
                                this._yearControl.dataSource = this._information.years;
                            }

                            this._updateDisplay();
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.DatePicker.monthPattern" helpKeyword="WinJS.UI.DatePicker.monthPattern">
                /// Gets or sets the display pattern for the month.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                monthPattern: {
                    get: function () { return this._datePatterns.month; },
                    set: function (value) {
                        if (this._datePatterns.month !== value) {
                            this._datePatterns.month = value;
                            this._init();
                        }
                    }
                },

                _updateInformation: function () {
                    // since "year" in the date ctor can be two digit (85 == 1985), we need
                    // to force "full year" to capture dates < 100 a.d.
                    //
                    var min = new Date(this._minYear, 0, 1, 12, 0, 0);
                    var max = new Date(this._maxYear, 11, 31, 12, 0, 0);
                    min.setFullYear(this._minYear);
                    max.setFullYear(this._maxYear);

                    this._information = DatePicker.getInformation(min, max, this._calendar, this._datePatterns);
                },

                _init: function (element) {
                    this._setElement(element);
                },

                _updateDisplay: function () {
                    if (!this._domElement) {
                        return;
                    }

                    // all controls get populated at the same time, so any check is OK
                    //
                    if (this._yearControl) {
                        //Render display index based on constraints (minYear and maxYear constraints)
                        //Will not modify current date
                        var index = this._information.getIndex(this.current);

                        this._yearControl.index = index.year;
                        this._monthControl.dataSource = this._information.months(index.year);
                        this._monthControl.index = index.month;
                        this._dateControl.dataSource = this._information.dates(index.year, index.month);
                        this._dateControl.index = index.date;
                    }
                },

                _wireupEvents: function () {
                    var that = this;
                    function changed() {
                        that._currentDate = that._information.getDate({ year: that._yearControl.index, month: that._monthControl.index, date: that._dateControl.index }, that._currentDate);
                        var index = that._information.getIndex(that._currentDate);

                        // Changing the month (or year, if the current date is 2/29) changes the day range, and could have made the day selection invalid
                        that._monthControl.dataSource = that._information.months(index.year);
                        that._monthControl.index = index.month;
                        that._dateControl.dataSource = that._information.dates(index.year, index.month);
                        that._dateControl.index = index.date;
                    }

                    this._dateElement.addEventListener("change", changed, false);
                    this._monthElement.addEventListener("change", changed, false);
                    this._yearElement.addEventListener("change", changed, false);
                },

                /// <field type="String" locid="WinJS.UI.DatePicker.yearPattern" helpKeyword="WinJS.UI.DatePicker.yearPattern">
                /// Gets or sets the display pattern for year.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                yearPattern: {
                    get: function () { return this._datePatterns.year; },
                    set: function (value) {
                        if (this._datePatterns.year !== value) {
                            this._datePatterns.year = value;
                            this._init();
                        }
                    }
                },
            }, {
                _getInformationWinRT: function (startDate, endDate, calendar, datePatterns) {
                    datePatterns = datePatterns || { date: DEFAULT_DAY_PATTERN, month: DEFAULT_MONTH_PATTERN, year: DEFAULT_YEAR_PATTERN };

                    var tempCal = newCal(calendar);
                    var monthCal = newCal(calendar);
                    var dayCal = newCal(calendar);

                    tempCal.setToMin();
                    var minDateTime = tempCal.getDateTime();
                    tempCal.setToMax();
                    var maxDateTime = tempCal.getDateTime();

                    function clamp(date) {
                        return new Date(Math.min(new Date(Math.max(minDateTime, date)), maxDateTime));
                    }

                    tempCal.hour = 12;

                    startDate = clamp(startDate);
                    endDate = clamp(endDate);

                    tempCal.setDateTime(endDate);
                    var end = { year: tempCal.year, era: tempCal.era };

                    tempCal.setDateTime(startDate);
                    var yearLen = 0;

                    yearLen = yearDiff(tempCal, end) + 1;

                    // Explicity use a template that's equivalent to a longdate template
                    // as longdate/shortdate can be overriden by the user
                    var dateformat = formatCacheLookup("day month.full year", calendar).formatter;
                    var localdatepattern = dateformat.patterns[0];
                    var isRTL = localdatepattern.charCodeAt(0) === 8207;
                    var order = ["date", "month", "year"];

                    var indexes = {
                        month: localdatepattern.indexOf("{month"),
                        date: localdatepattern.indexOf("{day"),
                        year: localdatepattern.indexOf("{year")
                    };
                    order.sort(function (a, b) {
                        if (indexes[a] < indexes[b]) {
                            return -1;
                        } else if (indexes[a] > indexes[b]) {
                            return 1;
                        } else {
                            return 0;
                        }
                    });

                    var yearSource = (function () {
                        return {
                            getLength: function () { return yearLen; },
                            getValue: function (index) {
                                tempCal.setDateTime(startDate);
                                tempCal.addYears(index);

                                return formatYear(datePatterns.year, calendar, DEFAULT_YEAR_PATTERN, datePatterns, order, tempCal);
                            }
                        };
                    })();

                    var monthSource = function (yearIndex) {
                        monthCal.setDateTime(startDate);
                        monthCal.addYears(yearIndex);

                        return {
                            getLength: function () { return monthCal.numberOfMonthsInThisYear; },
                            getValue: function (index) {
                                monthCal.month = monthCal.firstMonthInThisYear;
                                monthCal.addMonths(index);
                                return formatMonth(datePatterns.month, calendar, DEFAULT_MONTH_PATTERN, monthCal);
                            }
                        };
                    };

                    var dateSource = function (yearIndex, monthIndex) {
                        dayCal.setDateTime(startDate);
                        dayCal.addYears(yearIndex);
                        dayCal.month = dayCal.firstMonthInThisYear;
                        dayCal.addMonths(monthIndex);
                        dayCal.day = dayCal.firstDayInThisMonth;

                        return {
                            getLength: function () { return dayCal.numberOfDaysInThisMonth; },
                            getValue: function (index) {
                                dayCal.day = dayCal.firstDayInThisMonth;
                                dayCal.addDays(index);
                                return formatDay(datePatterns.date, calendar, DEFAULT_DAY_PATTERN, dayCal);
                            }
                        };
                    };

                    return {
                        isRTL: isRTL,
                        forceLanguage: dateformat.resolvedLanguage,

                        order: order,

                        getDate: function (index, lastDate) {
                            var lastCal;

                            if (lastDate) {
                                tempCal.setDateTime(lastDate);
                                lastCal = { year: tempCal.year, month: tempCal.month, day: tempCal.day };
                            }

                            var c = tempCal;
                            c.setDateTime(startDate);
                            c.addYears(index.year);

                            var guessMonth;
                            if (c.firstMonthInThisYear > c.lastMonthInThisYear) {
                                if (index.month + c.firstMonthInThisYear > c.numberOfMonthsInThisYear) {
                                    guessMonth = index.month + c.firstMonthInThisYear - c.numberOfMonthsInThisYear;
                                } else {
                                    guessMonth = index.month + c.firstMonthInThisYear;
                                }
                                if (lastCal && lastCal.year !== c.year) {
                                    // Year has changed in some transitions in Thai Calendar, this will change the first month, and last month indices of the year.
                                    guessMonth = Math.max(Math.min(lastCal.month, c.numberOfMonthsInThisYear), 1);
                                }
                            } else {
                                if (lastCal && lastCal.year !== c.year) {
                                    // Year has changed in some transitions in Thai Calendar, this will change the first month, and last month indices of the year.
                                    guessMonth = Math.max(Math.min(lastCal.month, c.firstMonthInThisYear + c.numberOfMonthsInThisYear - 1), c.firstMonthInThisYear);
                                } else {
                                    guessMonth = Math.max(Math.min(index.month + c.firstMonthInThisYear, c.firstMonthInThisYear + c.numberOfMonthsInThisYear - 1), c.firstMonthInThisYear);
                                }
                            }
                            c.month = guessMonth;

                            var guessDay = Math.max(Math.min(index.date + c.firstDayInThisMonth, c.firstDayInThisMonth + c.numberOfDaysInThisMonth - 1), c.firstDayInThisMonth);
                            if (lastCal && (lastCal.year !== c.year || lastCal.month !== c.month)) {
                                guessDay = Math.max(Math.min(lastCal.day, c.firstDayInThisMonth + c.numberOfDaysInThisMonth - 1), c.firstDayInThisMonth);
                            }
                            c.day = c.firstDayInThisMonth;
                            c.addDays(guessDay - c.firstDayInThisMonth);
                            return c.getDateTime();
                        },
                        getIndex: function (date) {
                            var curDate = clamp(date);
                            tempCal.setDateTime(curDate);
                            var cur = { year: tempCal.year, era: tempCal.era };

                            var yearIndex = 0;

                            tempCal.setDateTime(startDate);
                            tempCal.month = 1;
                            yearIndex = yearDiff(tempCal, cur);

                            tempCal.setDateTime(curDate);
                            var monthIndex = tempCal.month - tempCal.firstMonthInThisYear;
                            if (monthIndex < 0) {
                                // A special case is in some ThaiCalendar years first month
                                // of the year is April, last month is March and month flow is wrap-around
                                // style; April, March .... November, December, January, February, March. So the first index
                                // will be 4 and last index will be 3. We are handling the case to convert this wraparound behavior
                                // into selected index.
                                monthIndex = tempCal.month - tempCal.firstMonthInThisYear + tempCal.numberOfMonthsInThisYear;
                            }
                            var dateIndex = tempCal.day - tempCal.firstDayInThisMonth;

                            var index = {
                                year: yearIndex,
                                month: monthIndex,
                                date: dateIndex
                            };

                            return index;
                        },
                        years: yearSource,
                        months: monthSource,
                        dates: dateSource
                    };

                },

                _getInformationJS: function (startDate, endDate) {
                    var minYear = startDate.getFullYear();
                    var maxYear = endDate.getFullYear();
                    var yearSource = {
                        getLength: function () { return Math.max(0, maxYear - minYear + 1); },
                        getValue: function (index) { return minYear + index; }
                    };

                    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    var monthSource = function () {
                        return {
                            getLength: function () { return months.length; },
                            getValue: function (index) { return months[index]; },
                            getMonthNumber: function (index) { return Math.min(index, months.length - 1); }
                        };
                    };

                    var dateSource = function (yearIndex, monthIndex) {
                        var temp = new Date();
                        var year = yearSource.getValue(yearIndex);
                        // The +1 is needed to make using a day of 0 work correctly
                        var month = monthIndex + 1; // index is always correct, unlike getMonth which changes when the date is invalid
                        temp.setFullYear(year, month, 0);

                        var maxValue = temp.getDate();

                        return {
                            getLength: function () { return maxValue; },
                            getValue: function (index) { return "" + (index + 1); },
                            getDateNumber: function (index) { return Math.min(index + 1, maxValue); }
                        };
                    };

                    return {
                        order: ["month", "date", "year"],

                        getDate: function (index) {
                            return new Date(
                                yearSource.getValue(index.year),
                                monthSource(index.year).getMonthNumber(index.month),
                                dateSource(index.year, index.month).getDateNumber(index.date),
                                12, 0
                            );
                        },
                        getIndex: function (date) {
                            var yearIndex = 0;
                            var year = date.getFullYear();
                            if (year < minYear) {
                                yearIndex = 0;
                            } else if (year > this.maxYear) {
                                yearIndex = yearSource.getLength() - 1;
                            } else {
                                yearIndex = date.getFullYear() - minYear;
                            }

                            var monthIndex = Math.min(date.getMonth(), monthSource(yearIndex).getLength());

                            var dateIndex = Math.min(date.getDate() - 1, dateSource(yearIndex, monthIndex).getLength());

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
                }
            });
            if (_WinRT.Windows.Globalization.Calendar && _WinRT.Windows.Globalization.DateTimeFormatting) {
                DatePicker.getInformation = DatePicker._getInformationWinRT;
            } else {
                DatePicker.getInformation = DatePicker._getInformationJS;
            }
            _Base.Class.mix(DatePicker, _Events.createEventProperties("change"));
            _Base.Class.mix(DatePicker, _Control.DOMEventMixin);
            return DatePicker;
        })
    });


});
