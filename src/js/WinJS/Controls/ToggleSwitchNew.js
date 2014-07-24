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

                // Define the ToggleSwitch class
                var Toggle = _Base.Class.define(function ToggleSwitchNew_ctor(element, options) {
                    // Constructor

                    // Set up DOM elements

                    // Main container
                    element = element || _Global.document.createElement('div');
                    this._domElement = element;

                    // Header/Title text
                    this._headerElement = _Global.document.createElement('div');

                    // Clickable region
                    this._clickElement = _Global.document.createElement('div');

                    // Slider track
                    this._trackElement = _Global.document.createElement('div');

                    // Lower portion of slider
                    this._fillLowerElement = _Global.document.createElement('div');

                    // Thumb element
                    this._thumbElement = _Global.document.createElement('div');

                    // Upper portion of slider
                    this._fillUpperElement = _Global.document.createElement('div');

                    // Current value label
                    this._valueElement = _Global.document.createElement('div');

                    // Description text
                    this._descriptionElement = _Global.document.createElement('div');

                    // Some initialization of main element
                    element.winControl = this;
                    _ElementUtilities.addClass(element, 'win-disposable');

                }, {
                    // Properties
                    element: {
                        get: function() {return this._domElement;}
                    }
                });

                // addEventListener, removeEventListener, dispatchEvent
                _Base.Class.mix(Toggle, _Control.DOMEventMixin);

                return Toggle;
            })
        });
    }
);