// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_Events',
    '../Core/_Resources',
    '../Utilities/_Control',
    '../Utilities/_ElementUtilities',
    'require-style!less/controls'
    ],
    function toggleInit(_Global, _Base, _BaseUtils, _Events, _Resources, _Control, _ElementUtilities) {
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
            /// <part name="toggle" class="win-toggleswitch" locid="WinJS.UI.ToggleSwitch_part:toggle">The entire ToggleSwitch control.</part>
            /// <part name="track" class="win-toggleswitch-track" locid="WinJS.UI.ToggleSwitch_part:track">The slider portion of the toggle.</part>
            /// <part name="lower-fill" class="win-toggleswitch-fill-lower" locid="WinJS.UI.ToggleSwitch_part:fill-lower">The lower fill of the slider.</part>
            /// <part name="upper-fill" class="win-toggleswitch-fill-upper" locid="WinJS.UI.ToggleSwitch_part:fill-upper">The upper fill of the slider.</part>
            /// <part name="thumb" class="win-toggleswitch-thumb" locid="WinJS.UI.ToggleSwitch_part:thumb">The thumb of the slider.</part>
            /// <part name="title" class="win-toggleswitch-header" locid="WinJS.UI.ToggleSwitch_part:title">The main text for the ToggleSwitch control.</part>
            /// <part name="label-on" class="win-toggleswitch-value" locid="WinJS.UI.ToggleSwitch_part:label-on">The text for when the switch is on.</part>
            /// <part name="label-off" class="win-toggleswitch-value" locid="WinJS.UI.ToggleSwitch_part:label-off:">The text for when the switch is off.</part>
            /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
            /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
            /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
            ToggleSwitch: _Base.Namespace._lazy(function () {

                // Store some class names
                var classContainer = 'win-toggleswitch';
                var classHeader = 'win-toggleswitch-header';
                var classClick = 'win-toggleswitch-clickregion';
                var classTrack = 'win-toggleswitch-track';
                var classFill = 'win-toggleswitch-fill';
                var classFillLower = 'win-toggleswitch-fill-lower';
                var classFillUpper = 'win-toggleswitch-fill-upper';
                var classThumb = 'win-toggleswitch-thumb';
                var classValues = 'win-toggleswitch-values';
                var classValue = 'win-toggleswitch-value';
                var classValueOn = 'win-toggleswitch-value-on';
                var classValueOff = 'win-toggleswitch-value-off';
                var classDescription = 'win-toggleswitch-description';
                var classOn = 'win-toggleswitch-on';
                var classOff = 'win-toggleswitch-off';
                var classDisabled = 'win-toggleswitch-disabled';
                var classEnabled = 'win-toggleswitch-enabled';
                var classDragging = 'win-toggleswitch-dragging';
                var classPressed = 'win-toggleswitch-pressed';

                // Localized  strings
                var strings = {
                    get on() {
                        return _Resources._getWinJSString("ui/on").value;
                    },
                    get off() {
                        return _Resources._getWinJSString("ui/off").value;
                    },
                };

                // Define the ToggleSwitch class
                var Toggle = _Base.Class.define(function ToggleSwitch_ctor(element, options) {
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

                    // Main container
                    element = element || _Global.document.createElement('div');
                    this._domElement = element;
                    _ElementUtilities.addClass(this._domElement, classContainer);

                    // Set up DOM elements
                    this._domElement.innerHTML = [
                        '<div class="' + classHeader + '"></div>',
                        '<div class="' + classValues + '">',
                        '   <div class="' + classValue + ' ' + classValueOn + '"></div>',
                        '   <div class="' + classValue + ' ' + classValueOff + '"></div>',
                        '</div>',
                        '<div class="' + classClick + '">',
                        '   <div class="' + classTrack + '">',
                        '       <div class="' + classFill + ' ' + classFillLower + '"></div>',
                        '       <div class="' + classThumb + '"></div>',
                        '       <div class="' + classFill + ' ' + classFillUpper + '"></div>',
                        '   </div>',
                        '</div>',
                        '<div class="' + classDescription + '"></div>'
                    ].join('\n');

                    // Get references to elements
                    this._headerElement = this._domElement.firstElementChild;
                    this._labelsElement = this._headerElement.nextElementSibling;
                    this._labelOnElement = this._labelsElement.firstElementChild;
                    this._labelOffElement = this._labelOnElement.nextElementSibling;
                    this._clickElement = this._labelsElement.nextElementSibling;
                    this._trackElement = this._clickElement.firstElementChild;
                    this._fillLowerElement = this._trackElement.firstElementChild;
                    this._thumbElement = this._fillLowerElement.nextElementSibling;
                    this._fillUpperElement = this._thumbElement.nextElementSibling;
                    this._descriptionElement = this._clickElement.nextElementSibling;

                    // Set aria label info
                    this._headerElement.setAttribute('aria-hidden', true);
                    this._labelsElement.setAttribute('aria-hidden', true);
                    this._headerElement.setAttribute('id', _ElementUtilities._uniqueID(this._headerElement));
                    this._domElement.setAttribute('aria-labelledby', this._headerElement.id);
                    this._domElement.setAttribute('role', 'checkbox');

                    // Some initialization of main element
                    this._domElement.winControl = this;
                    _ElementUtilities.addClass(this._domElement, 'win-disposable');

                    // Add listeners
                    this._domElement.addEventListener('keydown', this._keyDownHandler.bind(this));
                    _ElementUtilities._addEventListener(this._clickElement, 'pointerdown', this._pointerDownHandler.bind(this));
                    _ElementUtilities._globalListener.addEventListener(this._domElement, 'pointermove', this._pointerMoveHandler.bind(this));
                    _ElementUtilities._globalListener.addEventListener(this._domElement, 'pointerup', this._pointerUpHandler.bind(this));

                    // Need mutation observer to listen for aria checked change
                    this._mutationObserver = new _ElementUtilities._MutationObserver(this._ariaChangedHandler.bind(this));
                    this._mutationObserver.observe(this._domElement, {attributes: true, attributeFilter: ['aria-checked']});

                    // Current x coord while being dragged
                    this._dragX = 0;
                    this._dragging = false;

                    // Default state
                    this.checked = false;
                    this.disabled = false;
                    this.labelOn = strings.on;
                    this.labelOff = strings.off;

                    // Apply options
                    _Control.setOptions(this, options);
                }, {
                    // Properties

                    /// <field type='HTMLElement' domElement='true' hidden='true' locid="WinJS.UI.ToggleSwitch.element" helpKeyword="WinJS.UI.ToggleSwitch.element">
                    /// The DOM element that hosts the ToggleSwitch control.
                    /// </field>
                    element: {
                        get: function () {
                            return this._domElement;
                        }
                    },
                    /// <field type="Boolean" locid="WinJS.UI.ToggleSwitch.checked" helpKeyword="WinJS.UI.ToggleSwitch.checked">
                    /// Gets or sets whether the control is on (checked is set to true) or off (checked is set to false).
                    /// </field>
                    checked: {
                        get: function () {
                            return this._checked;
                        },
                        set: function (value) {
                            value = !!value;
                            if (value === this.checked) {
                                return;
                            }

                            this._checked = value;
                            this._domElement.setAttribute('aria-checked', value);
                            if (value) {
                                _ElementUtilities.addClass(this._domElement, classOn);
                                _ElementUtilities.removeClass(this._domElement, classOff);
                            } else {
                                _ElementUtilities.addClass(this._domElement, classOff);
                                _ElementUtilities.removeClass(this._domElement, classOn);
                            }
                            this.dispatchEvent("change");
                        }
                    },
                    /// <field type="Boolean" locid="WinJS.UI.ToggleSwitch.disabled" helpKeyword="WinJS.UI.ToggleSwitch.disabled">
                    /// Gets or sets a value that specifies whether the control is disabled.
                    /// </field>
                    disabled: {
                        get: function () {
                            return this._disabled;
                        },
                        set: function (value) {
                            value = !!value;
                            if (value === this._disabled) {
                                return;
                            }

                            if (value) {
                                _ElementUtilities.addClass(this._domElement, classDisabled);
                                _ElementUtilities.removeClass(this._domElement, classEnabled);
                            } else {
                                _ElementUtilities.removeClass(this._domElement, classDisabled);
                                _ElementUtilities.addClass(this._domElement, classEnabled);
                            }

                            this._disabled = value;
                            this._domElement.setAttribute('aria-disabled', value);
                            this._domElement.setAttribute('tabIndex', value ? -1 : 0);
                        }
                    },
                    /// <field type="String" locid="WinJS.UI.ToggleSwitch.labelOn" helpKeyword="WinJS.UI.ToggleSwitch.labelOn">
                    /// Gets or sets the text that displays when the control is on (checked is set to true). The default value is "On".
                    /// </field>
                    labelOn: {
                        get: function () {
                            return this._labelOnElement.innerHTML;
                        },
                        set: function (value) {
                            this._labelOnElement.innerHTML = value;
                        }
                    },
                    /// <field type="String" locid="WinJS.UI.ToggleSwitch.labelOff" helpKeyword="WinJS.UI.ToggleSwitch.labelOff">
                    /// Gets or sets the text that displays when the control is off (checked is set to false). The default value is "Off".
                    /// </field>
                    labelOff: {
                        get: function () {
                            return this._labelOffElement.innerHTML;
                        },
                        set: function (value) {
                            this._labelOffElement.innerHTML = value;
                        }
                    },
                    /// <field type='String' locid="WinJS.UI.ToggleSwitch.title" helpKeyword="WinJS.UI.ToggleSwitch.title">
                    /// Gets or sets the main text for the ToggleSwitch control. This text is always displayed, regardless of whether
                    /// the control is switched on or off.
                    /// </field>
                    title: {
                        get: function () {
                            return this._headerElement.innerHTML;
                        },
                        set: function (value) {
                            this._headerElement.innerHTML = value;
                        }
                    },

                    // Events

                    /// <field type="Function" locid="WinJS.UI.ToggleSwitch.onchange" helpKeyword="WinJS.UI.ToggleSwitch.onchange">
                    /// Occurs when the ToggleSwitch control is flipped to on (checked == true) or off (checked == false).
                    /// </field>
                    onchange: _Events._createEventProperty('change'),

                    // Public methods
                    dispose: function ToggleSwitch_dispose() {
                        if (this._disposed) {
                            return;
                        }

                        this._disposed = true;
                    },

                    // Private event handlers
                    _ariaChangedHandler: function ToggleSwitch_ariaChanged() {
                        var value = this._domElement.getAttribute('aria-checked');
                        value = (value === 'true') ? true : false;
                        this.checked = value;
                    },
                    _keyDownHandler: function ToggleSwitch_keyDown(e) {
                        if (this.disabled) {
                            return;
                        }

                        // Toggle checked on spacebar
                        if (e.keyCode === _ElementUtilities.Key.space) {
                            this.checked = !this.checked;
                        }

                        // Arrow keys set value
                        if (e.keyCode === _ElementUtilities.Key.rightArrow ||
                            e.keyCode === _ElementUtilities.Key.upArrow) {
                            this.checked = true;
                        }
                        if (e.keyCode === _ElementUtilities.Key.leftArrow ||
                            e.keyCode === _ElementUtilities.Key.downArrow) {
                            this.checked = false;
                        }

                    },
                    _pointerDownHandler: function ToggleSwitch_pointerDown(e) {
                        if (this.disabled) {
                            return;
                        }

                        e.preventDefault();

                        this._mousedown = true;
                        this._dragXStart = e.pageX - this._trackElement.offsetLeft - this._thumbElement.offsetWidth / 2;
                        this._dragX = this._dragXStart;
                        this._dragging = false;
                        _ElementUtilities.addClass(this._domElement, classPressed);
                    },
                    _pointerUpHandler: function ToggleSwitch_pointerUp(e) {
                        if (this.disabled) {
                            return;
                        }

                        // Since up is a global event we should only take action
                        // if a mousedown was registered on us initially
                        if (!this._mousedown) {
                            return;
                        }

                        e = e.detail.originalEvent;
                        e.preventDefault();

                        // If the thumb is being dragged, pick a new value based on what the thumb
                        // was closest to
                        var isRTL = _Global.getComputedStyle(this._domElement).direction === 'rtl';
                        if (this._dragging) {
                            var maxX = this._trackElement.offsetWidth - this._thumbElement.offsetWidth;
                            this.checked = isRTL ? this._dragX < maxX / 2 : this._dragX >= maxX / 2;
                            this._dragging = false;
                            _ElementUtilities.removeClass(this._domElement, classDragging);
                        } else {
                            // Otherwise, just toggle the value as the up constitutes a
                            // click event
                            this.checked = !this.checked;
                        }

                        // Reset tracking variables and intermediate styles
                        this._mousedown = false;
                        this._thumbElement.style.left = '';
                        this._fillLowerElement.style.width = '';
                        this._fillUpperElement.style.width = '';
                        _ElementUtilities.removeClass(this._domElement, classPressed);
                    },
                    _pointerMoveHandler: function ToggleSwitch_pointerMove(e) {
                        if (this.disabled) {
                            return;
                        }

                        // Not dragging if mouse isn't down
                        if (!this._mousedown) {
                            return;
                        }

                        e = e.detail.originalEvent;
                        e.preventDefault();

                        // Get pointer x coord relative to control
                        var localMouseX = e.pageX - this._trackElement.offsetLeft - this._thumbElement.offsetWidth / 2;

                        // Calculate a new width for the fill elements and position for
                        // the thumb
                        var maxX = this._trackElement.offsetWidth - this._thumbElement.offsetWidth;
                        var trackOffset = this._fillLowerElement.offsetLeft + this._trackElement.clientLeft;
                        this._dragX = Math.min(maxX, localMouseX);
                        this._dragX = Math.max(0, this._dragX);

                        // Calculate if this pointermove constitutes switching to drag mode
                        if (!this._dragging && Math.abs(this._dragX - this._dragXStart) > 3) {
                            this._dragging = true;
                            _ElementUtilities.addClass(this._domElement, classDragging);
                        }

                        this._thumbElement.style.left = this._dragX + 'px';
                        this._fillLowerElement.style.width = (this._dragX - trackOffset) + 'px';
                        this._fillUpperElement.style.width = (maxX - this._dragX - trackOffset) + 'px';
                    }
                });

                // addEventListener, removeEventListener, dispatchEvent
                _Base.Class.mix(Toggle, _Control.DOMEventMixin);

                return Toggle;
            })
        });
    }
);