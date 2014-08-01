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
                    // Main container
                    element = element || _Global.document.createElement('div');
                    this._domElement = element;
                    _ElementUtilities.addClass(this._domElement, classContainer);
                    this._domElement.setAttribute('tabindex', 0);

                    // Set up DOM elements
                    this._domElement.innerHTML = 
                      '<div class="' + classHeader + '"></div>'
                    + '<div class="' + classClick + '">'
                    + '   <div class="' + classTrack + '">'
                    + '       <div class="' + classFill + ' ' + classFillLower + '"></div>'
                    + '       <div class="' + classThumb + '"></div>'
                    + '       <div class="' + classFill + ' ' + classFillUpper + '"></div>'
                    + '   </div>'
                    + '   <div class="' + classValue + '"></div>'
                    + '   <div class="' + classValue + '"></div>'
                    + '</div>'
                    + '<div class="' + classDescription + '"></div>';

                    // Get references to elements
                    this._headerElement = this._domElement.firstElementChild;
                    this._clickElement = this._headerElement.nextElementSibling;
                    this._trackElement = this._clickElement.firstElementChild;
                    this._fillLowerElement = this._trackElement.firstElementChild;
                    this._thumbElement = this._fillLowerElement.nextElementSibling;
                    this._fillUpperElement = this._thumbElement.nextElementSibling;
                    this._labelOnElement = this._trackElement.nextElementSibling;
                    this._labelOffElement = this._labelOnElement.nextElementSibling;
                    this._descriptionElement = this._clickElement.nextElementSibling;

                    // Some initialization of main element
                    element.winControl = this;
                    _ElementUtilities.addClass(element, 'win-disposable');

                    // Add listeners
                    this._domElement.addEventListener('keydown', this._keyDownHandler.bind(this));
                    this._clickElement.addEventListener('mousedown', this._pointerDownHandler.bind(this));
                    this._clickElement.addEventListener('touchstart', this._pointerDownHandler.bind(this));
                    window.addEventListener('mousemove', this._pointerMoveHandler.bind(this));
                    window.addEventListener('touchmove', this._pointerMoveHandler.bind(this));
                    window.addEventListener('mouseup', this._pointerUpHandler.bind(this));
                    window.addEventListener('touchend', this._pointerUpHandler.bind(this));

                    // Current x coord while being dragged
                    this._dragX = 0;

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
                    dispose: function ToggleSwitchNew_dispose() {
                        if (this._disposed) {
                            return;
                        }

                        this._disposed = true;
                    },

                    // Private methods
                    _setChecked: function ToggleSwitchNew_setChecked(value) {
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
                    _setDisabled: function ToggleSwitchNew_setDisabled(value) {
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
                    },

                    // Event handlers
                    _keyDownHandler: function(e) {
                        e.preventDefault();
                        
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
                    _pointerDownHandler: function(e) {                        
                        e.preventDefault();

                        if (this.disabled) {
                            return;
                        }

                        this._mousedown = true;
                        _ElementUtilities.addClass(this._domElement, classPressed);
                    },
                    _pointerUpHandler: function(e) {
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
                            this.checked = this._dragX >= maxX / 2;
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
                    _pointerMoveHandler: function(e) {
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
                        this._dragX = Math.min(maxX, localMouseX);
                        this._dragX = Math.max(0, this._dragX);

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