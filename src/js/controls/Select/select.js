(function selectInit(WinJS, undefined) {
    "use strict";

    WinJS.Namespace.define("WinJS.UI", {
        _Select: WinJS.Namespace._lazy(function () {
            var encodeHtmlRegEx = /[&<>'"]/g;
            var encodeHtmlEscapeMap = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;"
            };
            var stringDirectionRegEx = /[\u200e\u200f]/g;
            function encodeHtml(str) {
                return str.replace(encodeHtmlRegEx, function (m) {
                    return encodeHtmlEscapeMap[m] || "";
                });
            };
            function stripDirectionMarker(str) {
                return str.replace(stringDirectionRegEx, "");
            }
            function stockGetValue(index) { return this[index]; }
            function stockGetLength() { return this.length; }
            function fixDataSource(dataSource) {
                if (!dataSource.getValue) {
                    dataSource.getValue = stockGetValue
                }

                if (!dataSource.getLength) {
                    dataSource.getLength = stockGetLength
                }
                return dataSource;
            }

            return WinJS.Class.define(function _Select_ctor(element, options) {
                // This is an implementation detail of the TimePicker and DatePicker, designed
                // to provide a primitive "data bound" select control. This is not designed to
                // be used outside of the TimePicker and DatePicker controls.
                //

                this._dataSource = fixDataSource(options.dataSource);
                this._index = options.index || 0;

                this._domElement = element;
                // Mark this as a tab stop
                this._domElement.tabIndex = 0;

                if (options.disabled) {
                    this.setDisabled(options.disabled);
                }

                var that = this;
                this._domElement.addEventListener("change", function (e) {
                    //Should be set to _index to prevent events from firing twice
                    that._index = that._domElement.selectedIndex;
                }, false);

                //update runtime accessibility value after initialization
                this._createSelectElement();
            }, {
                _index: 0,
                _dataSource: null,

                dataSource: {
                    get: function () { return this._dataSource; },
                    set: function (value) {
                        this._dataSource = fixDataSource(value);

                        //Update layout as data source change
                        if (this._domElement) {
                            this._createSelectElement();
                        }
                    }
                },

                setDisabled: function (disabled) {
                    if (disabled) {
                        this._domElement.setAttribute("disabled", "disabled");
                    }
                    else {
                        this._domElement.removeAttribute("disabled");
                    }
                },

                _createSelectElement: function () {
                    var dataSourceLength = this._dataSource.getLength();
                    var text = "";
                    for (var i = 0; i < dataSourceLength; i++) {
                        var value = "" + this._dataSource.getValue(i);
                        var escaped = encodeHtml(value);
                        // WinRT localization often tags the strings with reading direction. We want this
                        // for display text (escaped), but don't want this in the value space, as it
                        // only present for display.
                        //
                        var stripped = stripDirectionMarker(escaped);
                        text += "<option value='" + stripped + "'>" + escaped + "</option>";
                    }
                    WinJS.Utilities.setInnerHTMLUnsafe(this._domElement, text);
                    this._domElement.selectedIndex = this._index;
                },

                index: {
                    get: function () {
                        return Math.max(0, Math.min(this._index, this._dataSource.getLength() - 1));
                    },
                    set: function (value) {
                        if (this._index !== value) {
                            this._index = value;

                            var d = this._domElement;
                            if (d && d.selectedIndex !== value) {
                                d.selectedIndex = value;
                            }
                        }
                    }
                },

                value: {
                    get: function () {
                        return this._dataSource.getValue(this.index);
                    }
                }
            });
        })
    })
})(WinJS);
