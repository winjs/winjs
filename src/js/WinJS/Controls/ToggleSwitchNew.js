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
    ], 
    function toggleNewInit(_Global, _Base, _BaseUtils, _Events, _Resources, _Control, _ElementUtilities) {
        "use strict";

        _Base.Namespace.define("WinJS.UI", {
            ToggleSwitchNew: _Base.Namespace._lazy(function() {

                // Store some class names
                var classContainer = 'win-toggleswitch-new';
                var classHeader = 'win-toggleswitch-header-new';
                var classTrack = 'win-toggleswitch-track-new';
                var classFill = 'win-toggleswitch-fill-new';
                var classFillLower = 'win-toggleswitch-fill-lower-new';
                var classFillUpper = 'win-toggleswitch-fill-upper-new';
                var classThumb = 'win-toggleswitch-thumb-new';
                var classValue = 'win-toggleswitch-value-new';
                var classDescription = 'win-toggleswitch-description-new';
                var classOn = 'win-toggleswitch-on-new';
                var classOff = 'win-toggleswitch-off-new';

                // Define the ToggleSwitch class
                var Toggle = _Base.Class.define(function ToggleSwitchNew_ctor(element, options) {
                    // Constructor

                    // Set up DOM elements

                    // Main container
                    element = element || _Global.document.createElement('div');
                    this._domElement = element;
                    _ElementUtilities.addClass(this._domElement, classContainer);

                    // Header/Title text
                    this._headerElement = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._headerElement, classHeader);
                    this._domElement.appendChild(this._headerElement);

                    // Clickable region
                    this._clickElement = _Global.document.createElement('div');
                    this._domElement.appendChild(this._clickElement);

                    // Slider track
                    this._trackElement = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._trackElement, classTrack);
                    this._clickElement.appendChild(this._trackElement);

                    // Lower portion of slider
                    this._fillLowerElement = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._fillLowerElement, classFill);
                    _ElementUtilities.addClass(this._fillLowerElement, classFillLower);
                    this._trackElement.appendChild(this._fillLowerElement);

                    // Thumb element
                    this._thumbElement = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._thumbElement, classThumb);
                    this._trackElement.appendChild(this._thumbElement);

                    // Upper portion of slider
                    this._fillUpperElement = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._fillUpperElement, classFill);
                    _ElementUtilities.addClass(this._fillUpperElement, classFillUpper);
                    this._trackElement.appendChild(this._fillUpperElement);

                    // Current value label
                    this._valueElement = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._valueElement, classValue);
                    this._clickElement.appendChild(this._valueElement);

                    // Description text
                    this._descriptionElement = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._descriptionElement, classDescription);
                    this._domElement.appendChild(this._descriptionElement);

                    // Some initialization of main element
                    element.winControl = this;
                    _ElementUtilities.addClass(element, 'win-disposable');

                    this._setChecked(false);
                }, {
                    // Properties
                    element: {
                        get: function() {return this._domElement;}
                    },
                    checked: {
                        get: function () {return this._checked;},
                        set: function (value) {this._setChecked(value);}
                    },

                    // Methods
                    _setChecked: function(value) {
                        value = !!value;
                        if (value === this.checked) {
                            return;
                        }

                        this._checked = value;
                        if (value) {
                            _ElementUtilities.addClass(this._domElement, classOn);
                            _ElementUtilities.removeClass(this._domElement, classOff);
                        } else {
                            _ElementUtilities.addClass(this._domElement, classOff);
                            _ElementUtilities.removeClass(this._domElement, classOn);
                        }
                    }
                });

                // addEventListener, removeEventListener, dispatchEvent
                _Base.Class.mix(Toggle, _Control.DOMEventMixin);

                return Toggle;
            })
        });
    }
);