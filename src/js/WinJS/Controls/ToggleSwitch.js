// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_Events',
    '../Core/_Resources',
    '../Utilities/_Control',
    '../Utilities/_ElementUtilities',
    'require-style!less/desktop/controls',
    'require-style!less/phone/controls'
    ], function toggleInit(_Global, _Base, _BaseUtils, _Events, _Resources, _Control, _ElementUtilities) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.ToggleSwitch">
        /// A control that lets the user switch an option on or off.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.toggleswitch.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.toggleswitch.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<div data-win-control="WinJS.UI.ToggleSwitch"></div>]]></htmlSnippet>
        /// <event name="change" bubbles="true" locid="WinJS.UI.ToggleSwitch_e:change">Raised when the switch is flipped to on (checked is set to true) or off (checked is set to false). </event>
        /// <part name="toggle" class="win-toggleSwitch" locid="WinJS.UI.ToggleSwitch_part:toggle">The entire ToggleSwitch control.</part>
        /// <part name="switch" class="win-switch" locid="WinJS.UI.ToggleSwitch_part:switch">The slider that enables the user to switch the state of the ToggleSwitch.</part>
        /// <part name="title" class="win-title" locid="WinJS.UI.ToggleSwitch_part:title">The main text for the ToggleSwitch control.</part>
        /// <part name="label-on" class="win-on" locid="WinJS.UI.ToggleSwitch_part:label-on">The text for when the switch is on.</part>
        /// <part name="label-off" class="win-off" locid="WinJS.UI.ToggleSwitch_part:label-off:">The text for when the switch is off.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        ToggleSwitch: _Base.Namespace._lazy(function () {
            // Constants
            var MOUSE_LBUTTON = 0;

            var strings = {
                get on() { return _Resources._getWinJSString("ui/on").value; },
                get off() { return _Resources._getWinJSString("ui/off").value; },
            };

            // CSS class names
            var msToggle = "win-toggleswitch";
            var msToggleSwitch = "win-switch";
            var msToggleTitle = "win-title";
            var msToggleLabel = "win-label";
            var msToggleOn = "win-on";
            var msToggleOff = "win-off";
            var msToggleDisabled = "win-disabled";
            var msToggleHidden = "win-hidden";
            var msFocusHide = "win-focus-hide";

            var Control = _Base.Class.define(null, {
                raiseEvent: function (type, eventProperties) {
                    this.dispatchEvent(type, eventProperties);
                }
            });

            function reloadChangeHandler(list) {
                var that = list[0].target.winControl;
                that.checked = that._switchElement.valueAsNumber;
            }

            _Base.Class.mix(Control, _Control.DOMEventMixin);

            return _Base.Class.derive(Control, function (element, options) {
                /// <signature helpKeyword="WinJS.UI.ToggleSwitch.ToggleSwitch">
                /// <summary locid="WinJS.UI.ToggleSwitch.constructor">
                /// Creates a new ToggleSwitch.
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.ToggleSwitch.constructor_p:element">
                /// The DOM element that hosts the ToggleSwitch.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.ToggleSwitch.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on". For example, to provide a handler for the change event,
                /// add a property named "onchange" to the options object and set its value to the event handler.
                /// This parameter is optional.
                /// </param>
                /// <returns type="WinJS.UI.ToggleSwitch" locid="WinJS.UI.ToggleSwitch.constructor_returnValue">
                /// The new ToggleSwitch.
                /// </returns>
                /// </signature>

                element = element || _Global.document.createElement("div");

                var toggle = _ElementUtilities.data(element).toggle;
                if (toggle) {
                    return toggle;
                }

                // Elements
                this._domElement = null;
                this._switchElement = null;
                this._titleElement = null;
                this._labelGridElement = null;
                this._labelOnElement = null;
                this._labelOffElement = null;


                // Strings
                this._labelOn = strings.on;
                this._labelOff = strings.off;

                // Variable
                this._disposed = false;
                this._spaceKeyDown = false;

                this._shouldHideFocus = false; // This variable is needed to prevent focus rect from showing between the time during pointer down and focus happens.
                this._pointerId = 0;
                this._hasCapture = false;

                this._setElement(element);
                this._setDefaultOptions();
                _Control.setOptions(this, options);
                element.winControl = this;
                _ElementUtilities.addClass(element, "win-disposable");
                _ElementUtilities.data(element).toggle = this;
            }, {
                // Properties

                /// <field type="Boolean" locid="WinJS.UI.ToggleSwitch.checked" helpKeyword="WinJS.UI.ToggleSwitch.checked">
                /// Gets or sets whether the control is on (checked is set to true) or off (checked is set to false).
                /// </field>
                checked: {
                    get: function () {
                        return this._checked;
                    },
                    set: function (value) {
                        this._setChecked(value);
                    }
                },
                /// <field type="Boolean" locid="WinJS.UI.ToggleSwitch.disabled" helpKeyword="WinJS.UI.ToggleSwitch.disabled">
                /// Gets or sets a value that specifies whether the control is disabled.
                /// </field>
                disabled: {
                    get: function () {
                        return this._switchElement.disabled;
                    },
                    set: function (value) {
                        var disabled = !!value; // Sanitize for a bool
                        this._switchElement.disabled = disabled; // This is necessary to apply the css to the toggle 'switch'
                        if (disabled) { // This is necessary to apply the css to the toggle 'label' and 'title'
                            _ElementUtilities.addClass(this._labelOnElement, msToggleDisabled);
                            _ElementUtilities.addClass(this._labelOffElement, msToggleDisabled);
                            _ElementUtilities.addClass(this._titleElement, msToggleDisabled);
                        } else {
                            _ElementUtilities.removeClass(this._labelOnElement, msToggleDisabled);
                            _ElementUtilities.removeClass(this._labelOffElement, msToggleDisabled);
                            _ElementUtilities.removeClass(this._titleElement, msToggleDisabled);
                        }
                        this._switchElement.setAttribute("aria-disabled", disabled);
                    }
                },
                /// <field type='HTMLElement' domElement='true' hidden='true' locid="WinJS.UI.ToggleSwitch.element" helpKeyword="WinJS.UI.ToggleSwitch.element">
                /// The DOM element that hosts the ToggleSwitch control.
                /// </field>
                element: {
                    get: function () { return this._domElement; }
                },
                /// <field type="String" locid="WinJS.UI.ToggleSwitch.labelOn" helpKeyword="WinJS.UI.ToggleSwitch.labelOn">
                /// Gets or sets the text that displays when the control is on (checked is set to true). The default value is "On".
                /// </field>
                labelOn: {
                    get: function () {
                        return this._labelOn;
                    },
                    set: function (value) {
                        this._labelOn = value;
                        this._labelOnElement.innerHTML = this._labelOn;
                    }
                },
                /// <field type="String" locid="WinJS.UI.ToggleSwitch.labelOff" helpKeyword="WinJS.UI.ToggleSwitch.labelOff">
                /// Gets or sets the text that displays when the control is off (checked is set to false). The default value is "Off".
                /// </field>
                labelOff: {
                    get: function () {
                        return this._labelOff;
                    },
                    set: function (value) {
                        this._labelOff = value;
                        this._labelOffElement.innerHTML = this._labelOff;
                    }
                },

                /// <field type='String' locid="WinJS.UI.ToggleSwitch.title" helpKeyword="WinJS.UI.ToggleSwitch.title">
                /// Gets or sets the main text for the ToggleSwitch control. This text is always displayed, regardless of whether
                /// the control is switched on or off.
                /// </field>
                title: {
                    get: function () {
                        return this._titleElement.innerHTML;
                    },
                    set: function (value) {
                        this._titleElement.innerHTML = value;
                    }
                },

                /// <field type="Function" locid="WinJS.UI.ToggleSwitch.onchange" helpKeyword="WinJS.UI.ToggleSwitch.onchange">
                /// Occurs when the ToggleSwitch control is flipped to on (checked == true) or off (checked == false).
                /// </field>
                onchange: _Events._createEventProperty("change"),

                _addControlsInOrder: function () {
                    this._domElement.appendChild(this._titleElement);
                    this._labelGridElement.appendChild(this._labelOnElement);
                    this._labelGridElement.appendChild(this._labelOffElement);
                    this._labelGridElement.appendChild(this._switchElement);
                    this._domElement.appendChild(this._labelGridElement);
                },

                _setChecked: function (value) {
                    value = !!value; // Sanitize the value
                    if (value !== this._checked) {
                        this._checked = value;
                        if (this._checked) { // On state
                            _ElementUtilities.removeClass(this._domElement, msToggleOff);
                            _ElementUtilities.addClass(this._domElement, msToggleOn);
                            _ElementUtilities.addClass(this._labelOffElement, msToggleHidden);
                            _ElementUtilities.removeClass(this._labelOnElement, msToggleHidden);
                            this._switchElement.valueAsNumber = 1; // Update the slider visual
                        } else { // Off state
                            _ElementUtilities.removeClass(this._domElement, msToggleOn);
                            _ElementUtilities.addClass(this._domElement, msToggleOff);
                            _ElementUtilities.addClass(this._labelOnElement, msToggleHidden);
                            _ElementUtilities.removeClass(this._labelOffElement, msToggleHidden);
                            this._switchElement.valueAsNumber = 0; // Update the slider visual
                        }
                        this._switchElement.setAttribute("aria-checked", this._checked); // Update accessibility information
                    }
                },

                _setDefaultOptions: function () {
                    this.labelOn = strings.on;
                    this.labelOff = strings.off;
                    this.title = "";
                    this.checked = false;
                    this.disabled = false;
                },

                _setElement: function (element) {
                    this._domElement = element;
                    _ElementUtilities.addClass(this._domElement, msToggle);
                    _ElementUtilities.addClass(this._domElement, msToggleOff);

                    this._titleElement = _Global.document.createElement("div");
                    this._titleElement.setAttribute("id", _ElementUtilities._uniqueID(this._titleElement));
                    this._titleElement.setAttribute("role", "note");
                    _ElementUtilities.addClass(this._titleElement, msToggleTitle);

                    this._switchElement = _Global.document.createElement("input");
                    this._switchElement.type = "range";
                    this._switchElement.max = 1;
                    this._switchElement.step = 1;
                    this._switchElement.setAttribute("role", "checkbox");
                    this._switchElement.setAttribute("aria-labelledby", this._titleElement.id);
                    _ElementUtilities.addClass(this._switchElement, msToggleSwitch);

                    this._labelGridElement = _Global.document.createElement("div");
                    this._labelGridElement.style.display = "-ms-grid";

                    if (_BaseUtils.isPhone) {
                        this._labelGridElement.style.msGridColumns = "1fr auto";
                    }

                    this._labelOnElement = _Global.document.createElement("div");
                    _ElementUtilities.addClass(this._labelOnElement, msToggleLabel);

                    this._labelOffElement = _Global.document.createElement("div");
                    _ElementUtilities.addClass(this._labelOffElement, msToggleLabel);

                    this._addControlsInOrder();

                    this._wireupEvents();
                },


                _valueHandler: function (fTapped) {
                    var oldValue = this._checked;
                    if (fTapped) {
                        this.checked = !this.checked;
                    } else {
                        this.checked = this._switchElement.valueAsNumber;
                    }

                    if (oldValue !== this._checked) {
                        this.raiseEvent("change");
                    }
                },

                _wireupEvents: function () {
                    var that = this;

                    var keyDownHandler = function (event) {
                        if (event.keyCode === _ElementUtilities.Key.space) { // Spacebar
                            if (!that._spaceKeyDown) {
                                that._switchElement.valueAsNumber = (that._switchElement.valueAsNumber + 1) % 2;
                                that._spaceKeyDown = true;
                            }
                            event.preventDefault();
                        }
                    };
                    var keyUpHandler = function (event) {
                        if (event.keyCode === _ElementUtilities.Key.space || (event.keyCode >= _ElementUtilities.Key.end && event.keyCode <= _ElementUtilities.Key.downArrow)) { // Spacebar and arrow, home/end key
                            that._valueHandler(false);
                            if (event.keyCode === _ElementUtilities.Key.space) { //  Additional step for spacebar
                                that._spaceKeyDown = false;
                            }
                        }
                    };
                    var cancelHandler = function () {
                        that._switchElement.valueAsNumber = that.checked;
                        that._spaceKeyDown = false; // Reset flag on spaceKey
                    };
                    var onDOMAttrModified = function (event) {
                        if (event.attrName === "aria-checked") {
                            var attrNode = that._switchElement.getAttributeNode("aria-checked");
                            if (attrNode !== null) {
                                var oldValue = that._checked;

                                if (attrNode.nodeValue === "true") { // "nodeValue" is a string
                                    that._setChecked(true);
                                }
                                else {
                                    that._setChecked(false);
                                }

                                if (oldValue !== that._checked) {
                                    that.raiseEvent("change");
                                }
                            }
                        }
                    };
                    var switchFocus = function () {
                        that._switchElement.focus();
                        that._shouldHideFocus = false;
                    };
                    var dismissFocusRect = function () {
                        _ElementUtilities.addClass(that._switchElement, msFocusHide);
                        that._shouldHideFocus = true;
                    };
                    var enableFocusRect = function () {
                        if (!that._shouldHideFocus) {
                            _ElementUtilities.removeClass(that._switchElement, msFocusHide);
                        }
                    };

                    var pointerDownHandler = function(e) {
                        if (that._switchElement.disabled || ("button" in e && e.button !== MOUSE_LBUTTON)) {
                            return;
                        }

                        that._tapping = true;
                        that._pointerDown = true;
                        _Global.setTimeout(function() {
                            that._tapping = false;
                        }, 200);
                        if (that._switchElement.setPointerCapture) {
                            e.preventDefault();
                        }
                        switchFocus();
                    };

                    var pointerUpHandler = function() {
                        if (that._switchElement.disabled) {
                            return;
                        }

                        that._pointerDown = false;
                        that._valueHandler(that._tapping);
                        that._hasCapture = false;
                    };

                    var pointerMoveHandler = function(e) {
                        if (that._switchElement.disabled) {
                            return;
                        }

                        if (that._pointerDown && !that._hasCapture) {
                            _ElementUtilities._setPointerCapture(that._switchElement, e.pointerId);
                            that._hasCapture = true;
                        }
                    };

                    _ElementUtilities._addEventListener(this._domElement, "pointerdown", dismissFocusRect, true);
                    _ElementUtilities._addEventListener(this._domElement, "focusin", switchFocus, false);

                    this._switchElement.addEventListener("lostpointercapture", cancelHandler, false);
                    this._switchElement.addEventListener("DOMAttrModified", onDOMAttrModified, false); // Listen to DOMAttrModified for aria-checked change
                    this._switchElement.addEventListener("change", function (ev) { ev.stopPropagation(); }, true); // Stop the change event from bubbling up and fire our own change event when the user interaction is done.
                    this._switchElement.addEventListener("keydown", keyDownHandler, false);
                    this._switchElement.addEventListener("keyup", keyUpHandler, false);
                    _ElementUtilities._addEventListener(this._switchElement, "pointercancel", cancelHandler, false);
                    _ElementUtilities._addEventListener(this._switchElement, "pointerdown", pointerDownHandler, false);
                    _ElementUtilities._addEventListener(this._switchElement, "pointerup", pointerUpHandler, false);
                    _ElementUtilities._addEventListener(this._switchElement, "pointermove", pointerMoveHandler, false);
                    _ElementUtilities._addEventListener(this._switchElement, "focusout", function () { enableFocusRect(); cancelHandler(); }, false);

                    new _ElementUtilities._MutationObserver(reloadChangeHandler).observe(this._switchElement, { attributes: true, attributeFilter: ["value"] });
                },

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.ToggleSwitch.dispose">
                    /// <summary locid="WinJS.UI.ToggleSwitch.dispose">
                    /// Disposes this ToggleSwitch.
                    /// </summary>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }

                    this._disposed = true;
                },

                addEventListener: function (eventName, eventCallBack, capture) {
                    /// <signature helpKeyword="WinJS.UI.ToggleSwitch.addEventListener">
                    /// <summary locid="WinJS.UI.ToggleSwitch.addEventListener">
                    /// Registers an event handler for the specified event.
                    /// </summary>
                    /// <param name="eventName" type="String" locid="WinJS.UI.ToggleSwitch.addEventListener_p:eventName">The name of the event.</param>
                    /// <param name="eventCallback" type="Function" locid="WinJS.UI.ToggleSwitch.addEventListener_p:eventCallback">The event handler function to associate with this event.</param>
                    /// <param name="capture" type="Boolean" locid="WinJS.UI.ToggleSwitch.addEventListener_p:capture">Set to true to register the event handler for the capturing phase; set to false to register for the bubbling phase.</param>
                    /// </signature>
                    if (eventName === "change") {
                        // Set the capture to be false explicitly because we want the change events for Toggle to be listened only in bubble up phase
                        // Therefore, the change events would only happen when users have finished their actions.
                        capture = false;
                    }
                    this._domElement.addEventListener(eventName, eventCallBack, capture);

                },

                removeEventListener: function (eventName, eventCallBack, capture) {
                    /// <signature helpKeyword="WinJS.UI.ToggleSwitch.removeEventListener">
                    /// <summary locid="WinJS.UI.ToggleSwitch.removeEventListener">
                    /// Unregisters an event handler for the specified event.
                    /// </summary>
                    /// <param name="eventName" type="String" locid="WinJS.UI.ToggleSwitch.removeEventListener_p:eventName">The name of the event.</param>
                    /// <param name="eventCallback" type="Function" locid="WinJS.UI.ToggleSwitch.removeEventListener_p:eventCallback">The event handler function to remove.</param>
                    /// <param name="capture" type="Boolean" locid="WinJS.UI.ToggleSwitch.removeEventListener_p:capture">Set to true to unregister the event handler for the capturing phase; otherwise, set to false to unregister the event handler for the bubbling phase.</param>
                    /// </signature>
                    if (eventName === "change") {
                        // Set the capture to be false explicitly because we only allow the user to add change events that are listened to in bubble up phase.
                        // Therefore it is not possible to remove a change event that is listened to in the capture phase.
                        capture = false;
                    }
                    return this._domElement.removeEventListener(eventName, eventCallBack, capture);
                }
            });
        })
    });

});
