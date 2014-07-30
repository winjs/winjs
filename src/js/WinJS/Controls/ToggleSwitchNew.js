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
                var classClick = 'win-toggleswitch-clickregion-new';
                var classTrack = 'win-toggleswitch-track-new';
                var classFill = 'win-toggleswitch-fill-new';
                var classFillLower = 'win-toggleswitch-fill-lower-new';
                var classFillUpper = 'win-toggleswitch-fill-upper-new';
                var classThumb = 'win-toggleswitch-thumb-new';
                var classValue = 'win-toggleswitch-value-new';
                var classDescription = 'win-toggleswitch-description-new';
                var classOn = 'win-toggleswitch-on-new';
                var classOff = 'win-toggleswitch-off-new';
                var classDisabled = 'win-toggleswitch-disabled-new';
                var classDragging = 'win-toggleswitch-dragging-new';
                var classPressed = 'win-toggleswitch-pressed-new';

                // Define the ToggleSwitch class
                var Toggle = _Base.Class.define(function ToggleSwitchNew_ctor(element, options) {
                    // Constructor

                    // Set up DOM elements

                    // Main container
                    element = element || _Global.document.createElement('div');
                    this._domElement = element;
                    _ElementUtilities.addClass(this._domElement, classContainer);
                    this._domElement.setAttribute('tabindex', 0);

                    // Header/Title text
                    this._headerElement = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._headerElement, classHeader);
                    this._domElement.appendChild(this._headerElement);

                    // Clickable region
                    this._clickElement = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._clickElement, classClick);
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
                    this._labelOnElement = _Global.document.createElement('div');
                    this._labelOffElement = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._labelOnElement, classValue);
                    _ElementUtilities.addClass(this._labelOffElement, classValue);
                    this._clickElement.appendChild(this._labelOnElement);
                    this._clickElement.appendChild(this._labelOffElement);

                    // Description text
                    this._descriptionElement = _Global.document.createElement('div');
                    _ElementUtilities.addClass(this._descriptionElement, classDescription);
                    this._domElement.appendChild(this._descriptionElement);

                    // Some initialization of main element
                    element.winControl = this;
                    _ElementUtilities.addClass(element, 'win-disposable');

                    // Current x coord while being dragged
                    var dragX = 0;

                    // Event handlers
                    var keyDownHandler = function(e) {
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

                    }.bind(this);

                    var pointerDownHandler = function(e) {                        
                        e.preventDefault();

                        if (this.disabled) {
                            return;
                        }

                        this._mousedown = true;
                        _ElementUtilities.addClass(this._domElement, classPressed);
                    }.bind(this);

                    var pointerUpHandler = function(e) {
                        // Since up is a global event we should only take action
                        // if a mousedown was registered on us initially
                        if (!this._mousedown) {
                            return;
                        }

                        e.preventDefault();

                        // If the thumb is being dragged, pick a new value based on what the thumb
                        // was closest to
                        if (this._dragging) {
                            var maxX = this._trackElement.offsetWidth - this._thumbElement.offsetWidth;
                            this.checked = dragX >= maxX / 2;
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
                    }.bind(this);

                    var pointerMoveHandler = function(e) {
                        // Not dragging if mouse isn't down
                        if (!this._mousedown) {
                            return;
                        }

                        e.preventDefault();

                        // Always seem to get one move event even on a simple click
                        // so we will eat the first move event
                        if (!this._ateFirstDragEvent) {
                            this._ateFirstDragEvent = true;
                            return;
                        }

                        // On the first drag event, set dragging state
                        if (!this._dragging) {
                            _ElementUtilities.addClass(this._domElement, classDragging);
                            this._dragging = true;
                        }

                        // Get pointer x coord relative to control
                        var pageX = 'touches' in e ? e.touches[0].pageX : e.pageX;
                        var localMouseX = pageX - this._trackElement.offsetLeft - this._thumbElement.offsetWidth / 2;

                        // Calculate a new width for the fill elements and position for
                        // the thumb
                        var maxX = this._trackElement.offsetWidth - this._thumbElement.offsetWidth;
                        var trackOffset = this._fillLowerElement.offsetLeft + this._trackElement.clientLeft;
                        dragX = Math.min(maxX, localMouseX);
                        dragX = Math.max(0, dragX);

                        this._thumbElement.style.left = dragX + 'px';
                        this._fillLowerElement.style.width = (dragX - trackOffset) + 'px';
                        this._fillUpperElement.style.width = (maxX - dragX - trackOffset) + 'px';
                    }.bind(this);

                    // Add listeners
                    this._domElement.addEventListener('keydown', keyDownHandler);
                    this._clickElement.addEventListener('mousedown', pointerDownHandler);
                    this._clickElement.addEventListener('touchstart', pointerDownHandler);
                    window.addEventListener('mousemove', pointerMoveHandler);
                    window.addEventListener('touchmove', pointerMoveHandler);
                    window.addEventListener('mouseup', pointerUpHandler);
                    window.addEventListener('touchend', pointerUpHandler);

                    // Default state
                    this.checked = false;
                    this.disabled = false;
                    this.labelOn = 'On';
                    this.labelOff = 'Off';

                    // Apply options
                    _Control.setOptions(this, options);
                }, {
                    // Properties
                    element: {
                        get: function() {return this._domElement;}
                    },
                    checked: {
                        get: function() {return this._checked;},
                        set: function(value) {this._setChecked(value);}
                    },
                    disabled: {
                        get: function() {return this._disabled;},
                        set: function(value) {this._setDisabled(value);}
                    },
                    labelOn: {
                        get: function() {return this._labelOnElement.innerHTML;},
                        set: function(value) {this._labelOnElement.innerHTML = value;}
                    },
                    labelOff: {
                        get: function() {return this._labelOffElement.innerHTML;},
                        set: function(value) {this._labelOffElement.innerHTML = value;}
                    },
                    title: {
                        get: function() {return this._headerElement.innerHTML;},
                        set: function(value) {this._headerElement.innerHTML = value;}
                    },

                    // Events
                    onchange: _Events._createEventProperty('change'),

                    // Public methods
                    dispose: function() {
                        if (this._disposed) {
                            return;
                        }

                        this._disposed = true;
                    },

                    // Private methods
                    _setChecked: function(value) {
                        if (this.disabled) {
                            return;
                        }

                        value = !!value;
                        if (value === this.checked) {
                            return;
                        }

                        this._checked = value;
                        if (value) {
                            this._labelOnElement.style.display = '';
                            this._labelOffElement.style.display = 'none';
                            _ElementUtilities.addClass(this._domElement, classOn);
                            _ElementUtilities.removeClass(this._domElement, classOff);
                        } else {
                            this._labelOnElement.style.display = 'none';
                            this._labelOffElement.style.display = '';
                            _ElementUtilities.addClass(this._domElement, classOff);
                            _ElementUtilities.removeClass(this._domElement, classOn);
                        }
                    },
                    _setDisabled: function(value) {
                        value = !!value;
                        if (value === this._disabled) {
                            return;
                        }

                        if (value) {
                            _ElementUtilities.addClass(this._domElement, classDisabled);
                        } else {
                            _ElementUtilities.removeClass(this._domElement, classDisabled);
                        }

                        this._disabled = value;
                    }
                });

                // addEventListener, removeEventListener, dispatchEvent
                _Base.Class.mix(Toggle, _Control.DOMEventMixin);

                return Toggle;
            })
        });
    }
);