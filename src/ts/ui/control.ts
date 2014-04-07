// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function controlInit(global, WinJS) {
    "use strict";

    // not supported in WebWorker
    if (!global.document) {
        return;
    }

    function setOptions(control, options) {
        /// <signature helpKeyword="WinJS.UI.DOMEventMixin.setOptions">
        /// <summary locid="WinJS.UI.DOMEventMixin.setOptions">
        /// Adds the set of declaratively specified options (properties and events) to the specified control.
        /// If name of the options property begins with "on", the property value is a function and the control
        /// supports addEventListener. The setOptions method calls the addEventListener method on the control.
        /// </summary>
        /// <param name="control" type="Object" domElement="false" locid="WinJS.UI.DOMEventMixin.setOptions_p:control">
        /// The control on which the properties and events are to be applied.
        /// </param>
        /// <param name="options" type="Object" domElement="false" locid="WinJS.UI.DOMEventMixin.setOptions_p:options">
        /// The set of options that are specified declaratively.
        /// </param>
        /// </signature>
        _setOptions(control, options);
    };

    function _setOptions(control, options, eventsOnly?) {
        if (typeof options === "object") {
            var keys = Object.keys(options);
            for (var i = 0, len = keys.length; i < len; i++) {
                var key = keys[i];
                var value = options[key];
                if (key.length > 2) {
                    var ch1 = key[0];
                    var ch2 = key[1];
                    if ((ch1 === 'o' || ch1 === 'O') && (ch2 === 'n' || ch2 === 'N')) {
                        if (typeof value === "function") {
                            if (control.addEventListener) {
                                control.addEventListener(key.substr(2), value);
                                continue;
                            }
                        }
                    }
                }

                if (!eventsOnly) {
                    control[key] = value;
                }
            }
        }
    };

    WinJS.Namespace.define("WinJS.UI", {
        DOMEventMixin: WinJS.Namespace._lazy(function () {
            return {
                _domElement: null,

                addEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI.DOMEventMixin.addEventListener">
                    /// <summary locid="WinJS.UI.DOMEventMixin.addEventListener">
                    /// Adds an event listener to the control.
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.DOMEventMixin.addEventListener_p:type">
                    /// The type (name) of the event.
                    /// </param>
                    /// <param name="listener" type="Function" locid="WinJS.UI.DOMEventMixin.addEventListener_p:listener">
                    /// The listener to invoke when the event gets raised.
                    /// </param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI.DOMEventMixin.addEventListener_p:useCapture">
                    /// true to initiate capture; otherwise, false.
                    /// </param>
                    /// </signature>
                    (this.element || this._domElement).addEventListener(type, listener, useCapture || false);
                },
                dispatchEvent: function (type, eventProperties) {
                    /// <signature helpKeyword="WinJS.UI.DOMEventMixin.dispatchEvent">
                    /// <summary locid="WinJS.UI.DOMEventMixin.dispatchEvent">
                    /// Raises an event of the specified type, adding the specified additional properties.
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.DOMEventMixin.dispatchEvent_p:type">
                    /// The type (name) of the event.
                    /// </param>
                    /// <param name="eventProperties" type="Object" locid="WinJS.UI.DOMEventMixin.dispatchEvent_p:eventProperties">
                    /// The set of additional properties to be attached to the event object when the event is raised.
                    /// </param>
                    /// <returns type="Boolean" locid="WinJS.UI.DOMEventMixin.dispatchEvent_returnValue">
                    /// true if preventDefault was called on the event, otherwise false.
                    /// </returns>
                    /// </signature>
                    var eventValue = document.createEvent("Event");
                    eventValue.initEvent(type, false, false);
                    eventValue.detail = eventProperties;
                    if (typeof eventProperties === "object") {
                        Object.keys(eventProperties).forEach(function (key) {
                            eventValue[key] = eventProperties[key];
                        });
                    }
                    return (this.element || this._domElement).dispatchEvent(eventValue);
                },
                removeEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI.DOMEventMixin.removeEventListener">
                    /// <summary locid="WinJS.UI.DOMEventMixin.removeEventListener">
                    /// Removes an event listener from the control.
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.DOMEventMixin.removeEventListener_p:type">
                    /// The type (name) of the event.
                    /// </param>
                    /// <param name="listener" type="Function" locid="WinJS.UI.DOMEventMixin.removeEventListener_p:listener">
                    /// The listener to remove.
                    /// </param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI.DOMEventMixin.removeEventListener_p:useCapture">
                    /// true to initiate capture; otherwise, false.
                    /// </param>
                    /// </signature>
                    (this.element || this._domElement).removeEventListener(type, listener, useCapture || false);
                }
            };
        }),

        setOptions: setOptions,

        _setOptions: _setOptions
    });

})(this, WinJS);

