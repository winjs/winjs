// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define([
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Resources',
    '../_Accents',
    '../Utilities/_Control',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    '../Utilities/_SafeHtml',
    './Tooltip',
    'require-style!less/styles-rating',
    'require-style!less/colors-rating'
], function ratingInit(_Global, _Base, _ErrorFromName, _Events, _Resources, _Accents, _Control, _ElementUtilities, _Hoverable, _SafeHtml, Tooltip) {
    "use strict";

    _Accents.createAccentRule(".win-rating .win-star.win-user.win-full, .win-rating .win-star.win-user.win-full.win-disabled", [{ name: "color", value: _Accents.ColorTypes.accent }]);

    // Rating control implementation
    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.Rating">
        /// The Rating control allows users to give a number on a scale of 1 to maxRating (5 is the default).
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        /// <icon src="ui_winjs.ui.rating.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.rating.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<div data-win-control="WinJS.UI.Rating"></div>]]></htmlSnippet>
        /// <event name="previewchange" bubbles="false" locid="WinJS.UI.Rating_e:previewchange">Raised when the user chooses a new tentative rating but hasn't commited the change.</event>
        /// <event name="cancel" bubbles="false" locid="WinJS.UI.Rating_e:cancel">Raised when the user finishes interacting with the rating control without committing a tentative rating.</event>
        /// <event name="change" bubbles="false" locid="WinJS.UI.Rating_e:change">Raised when the user commits a change to the userRating.</event>
        /// <part name="rating" class="win-rating" locid="WinJS.UI.Rating_part:rating">The entire Rating control.</part>
        /// <part name="average-empty" class="win-star win-average win-empty" locid="WinJS.UI.Rating_part:average-empty">The empty star when the Rating control shows the average rating.</part>
        /// <part name="average-full" class="win-star win-average win-full" locid="WinJS.UI.Rating_part:average-full">The full star when the Rating control shows the average rating.</part>
        /// <part name="user-empty" class="win-star win-user win-empty" locid="WinJS.UI.Rating_part:user-empty">The empty star when the Rating control shows the user rating.</part>
        /// <part name="user-full" class="win-star win-user win-full" locid="WinJS.UI.Rating_part:user-full">The full star when the Rating control shows the user rating.</part>
        /// <part name="tentative-empty" class="win-star win-tentative win-empty" locid="WinJS.UI.Rating_part:tentative-empty">The empty star when the Rating control shows the tentative rating.</part>
        /// <part name="tentative-full" class="win-star win-tentative win-full" locid="WinJS.UI.Rating_part:tentative-full">The full star when the Rating control shows the tentative rating.</part>
        /// <part name="disabled-empty" class="win-star win-disabled win-empty" locid="WinJS.UI.Rating_part:disabled-empty">The empty star when the control is disabled.</part>
        /// <part name="disabled-full" class="win-star win-disabled win-full" locid="WinJS.UI.Rating_part:disabled-full">The full star when the control is disabled.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        Rating: _Base.Namespace._lazy(function () {
            var createEvent = _Events._createEventProperty;

            var strings = {
                get averageRating() { return _Resources._getWinJSString("ui/averageRating").value; },
                get clearYourRating() { return _Resources._getWinJSString("ui/clearYourRating").value; },
                get tentativeRating() { return _Resources._getWinJSString("ui/tentativeRating").value; },
                get tooltipStringsIsInvalid() { return "Invalid argument: tooltipStrings must be null or an array of strings."; },
                get unrated() { return _Resources._getWinJSString("ui/unrated").value; },
                get userRating() { return _Resources._getWinJSString("ui/userRating").value; },
            };

            // Constants definition
            var DEFAULT_MAX_RATING = 5,
                DEFAULT_DISABLED = false,
                CANCEL = "cancel",
                CHANGE = "change",
                PREVIEW_CHANGE = "previewchange",
                MOUSE_LBUTTON = 0, // Event attribute to indicate a mouse left click
                PT_TOUCH = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_TOUCH || "touch", // Pointer type to indicate a touch event
                PT_PEN = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_PEN || "pen", // Pointer type to indicate a pen event
                PT_MOUSE = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_MOUSE || "mouse"; // Pointer type to indicate a mouse event

            var hiddenAverageRatingCss = "padding-left: 0px; padding-right: 0px; border-left: 0px; border-right: 0px; -ms-flex: none; -webkit-flex: none; flex: none; display: none";

            // CSS class names
            var msRating = "win-rating",
                msRatingEmpty = "win-star win-empty",
                msRatingAverageEmpty = "win-star win-average win-empty",
                msRatingAverageFull = "win-star win-average win-full",
                msRatingUserEmpty = "win-star win-user win-empty",
                msRatingUserFull = "win-star win-user win-full",
                msRatingTentativeEmpty = "win-star win-tentative win-empty",
                msRatingTentativeFull = "win-star win-tentative win-full",
                msRatingDisabled = "win-disabled",
                msAverage = "win-average",
                msUser = "win-user";

            return _Base.Class.define(function Rating_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.Rating.Rating">
                /// <summary locid="WinJS.UI.Rating.constructor">
                /// Creates a new Rating.
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.Rating.constructor_p:element">
                /// The DOM element that hosts the new Rating.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.Rating.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on". For example, to provide a handler for the cancel event,
                /// add a property named "oncancel" to the options object and set its value to the event handler.
                /// This parameter is optional.
                /// </param>
                /// <returns type="WinJS.UI.Rating" locid="WinJS.UI.Rating.constructor_returnValue">
                /// The new Rating.
                /// </returns>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>
                this._disposed = false;

                element = element || _Global.document.createElement("div");
                options = options || {};
                this._element = element;
                _ElementUtilities.addClass(this._element, "win-disposable");

                //initialize properties with default value
                this._userRating = 0;
                this._averageRating = 0;
                this._disabled = DEFAULT_DISABLED;
                this._enableClear = true;
                this._tooltipStrings = [];

                this._controlUpdateNeeded = false;
                this._setControlSize(options.maxRating);
                if (!options.tooltipStrings) {
                    this._updateTooltips(null);
                }
                _Control.setOptions(this, options);
                this._controlUpdateNeeded = true;
                this._forceLayout();

                // Register for notification when we are added to DOM
                _ElementUtilities._addInsertedNotifier(this._element);

                // Remember ourselves
                element.winControl = this;
                this._events();
            }, {
                /// <field type="Number" integer="true" locid="WinJS.UI.Rating.maxRating" helpKeyword="WinJS.UI.Rating.maxRating">
                /// Gets or sets the maximum possible rating value. The default is 5.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                maxRating: {
                    get: function () {
                        return this._maxRating;
                    },
                    set: function (value) {
                        this._setControlSize(value);
                        this._forceLayout();
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.Rating.userRating" helpKeyword="WinJS.UI.Rating.userRating">
                /// Gets or sets the user's rating. This value must be between greater than or equal to zero and less than or equal to the maxRating.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                userRating: {
                    get: function () {
                        return this._userRating;
                    },
                    set: function (value) {
                        // Coerce value to a positive integer between 0 and maxRating
                        this._userRating = Math.max(0, Math.min(Number(value) >> 0, this._maxRating));
                        this._updateControl();
                    }
                },

                /// <field type="Number" locid="WinJS.UI.Rating.averageRating" helpKeyword="WinJS.UI.Rating.averageRating">
                /// Gets or sets the average rating as a float value. This value must be [equal to zero] OR [greater than or equal to 1 AND less than or equal to the maxRating].
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                averageRating: {
                    get: function () {
                        return this._averageRating;
                    },
                    set: function (value) {
                        // Coerce value to either 0 or a positive float between 1 and maxRating
                        this._averageRating = (Number(value) < 1) ? 0 : Math.min(Number(value) || 0, this._maxRating);
                        if (this._averageRatingElement) { // After the control has been created..
                            this._ensureAverageMSStarRating(); // ..ensure correct msStarRating is given to 'average-rating' star.
                        }
                        this._updateControl();
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.Rating.disabled" helpKeyword="WinJS.UI.Rating.disabled">
                /// Gets or sets a value that specifies whether the control is disabled. When the control is disabled, the user can't specify a
                /// new rating or modify an existing rating.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                disabled: {
                    get: function () {
                        return this._disabled;
                    },
                    set: function (value) {
                        this._disabled = !!value;
                        if (this._disabled) {
                            this._clearTooltips();
                        }
                        this._updateTabIndex();
                        this._updateControl();
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.Rating.enableClear" helpKeyword="WinJS.UI.Rating.enableClear">
                /// Gets or sets whether the control lets the user clear the rating.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                enableClear: {
                    get: function () {
                        return this._enableClear;
                    },
                    set: function (value) {
                        this._enableClear = !!value;
                        this._setAriaValueMin();
                        this._updateControl();
                    }
                },

                /// <field type="Array" locid="WinJS.UI.Rating.tooltipStrings" helpKeyword="WinJS.UI.Rating.tooltipStrings">
                /// Gets or sets a set of descriptions to show for rating values in the tooltip. The array must
                /// contain a string for each available rating value, and it can contain an optional string
                /// (at the end of the array) for the clear rating option.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                tooltipStrings: {
                    get: function () {
                        return this._tooltipStrings;
                    },
                    set: function (value) {
                        if (typeof value !== "object") {
                            throw new _ErrorFromName("WinJS.UI.Rating.TooltipStringsIsInvalid", strings.tooltipStringsIsInvalid);
                        }
                        this._updateTooltips(value);
                        this._updateAccessibilityRestState();
                    }
                },

                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.Rating.element" helpKeyword="WinJS.UI.Rating.element">
                /// Gets the DOM element that hosts the Rating.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="Function" locid="WinJS.UI.Rating.oncancel" helpKeyword="WinJS.UI.Rating.oncancel">
                /// Raised when the user finishes interacting with the rating control without committing a tentative rating.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                oncancel: createEvent(CANCEL),

                /// <field type="Function" locid="WinJS.UI.Rating.onchange" helpKeyword="WinJS.UI.Rating.onchange">
                /// Raised when the user commits a change to the userRating.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                onchange: createEvent(CHANGE),

                /// <field type="Function" locid="WinJS.UI.Rating.onpreviewchange" helpKeyword="WinJS.UI.Rating.onpreviewchange">
                /// Raised when the user is choosing a new tentative Rating.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                onpreviewchange: createEvent(PREVIEW_CHANGE),

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.Rating.dispose">
                    /// <summary locid="WinJS.UI.Rating.dispose">
                    /// Disposes this Rating.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;

                    for (var i = 0; i < this._toolTips.length; i++) {
                        this._toolTips[i].dispose();
                    }
                    this._toolTips = null;
                },

                addEventListener: function (eventName, eventCallBack, capture) {
                    /// <signature helpKeyword="WinJS.UI.Rating.addEventListener">
                    /// <summary locid="WinJS.UI.Rating.addEventListener">
                    /// Registers an event handler for the specified event.
                    /// </summary>
                    /// <param name="eventName" type="String" locid="WinJS.UI.Rating.addEventListener_p:eventName">The name of the event.</param>
                    /// <param name="eventCallback" type="Function" locid="WinJS.UI.Rating.addEventListener_p:eventCallback">The event handler function to associate with this event.</param>
                    /// <param name="capture" type="Boolean" locid="WinJS.UI.Rating.addEventListener_p:capture">Set to true to register the event handler for the capturing phase; set to false to register for the bubbling phase.</param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>

                    this._element.addEventListener(eventName, eventCallBack, capture);
                },

                removeEventListener: function (eventName, eventCallBack, capture) {
                    /// <signature helpKeyword="WinJS.UI.Rating.removeEventListener">
                    /// <summary locid="WinJS.UI.Rating.removeEventListener">
                    /// Unregisters an event handler for the specified event.
                    /// </summary>
                    /// <param name="eventName" type="String" locid="WinJS.UI.Rating.removeEventListener_p:eventName">The name of the event.</param>
                    /// <param name="eventCallback" type="Function" locid="WinJS.UI.Rating.removeEventListener_p:eventCallback">The event handler function to remove.</param>
                    /// <param name="capture" type="Boolean" locid="WinJS.UI.Rating.removeEventListener_p:capture">Set to true to unregister the event handler for the capturing phase; otherwise, set to false to unregister the event handler for the bubbling phase.</param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>

                    return this._element.removeEventListener(eventName, eventCallBack, capture);
                },

                _forceLayout: function () {
                    if (!this._controlUpdateNeeded) {
                        return;
                    }

                    // Disable incremental update during redraw, postpone till all properties set
                    var updateNeeded = false;
                    this._updateControl = function () {
                        updateNeeded = true;
                    };

                    // Coerce userRating and averageRating to conform to maxRating
                    this.userRating = this._userRating;
                    this.averageRating = this._averageRating;

                    // Reset properties
                    this._lastEventWasChange = false;
                    this._lastEventWasCancel = false;
                    this._tentativeRating = -1;
                    this._captured = false;
                    this._pointerDownFocus = false;
                    this._elements = [];
                    this._toolTips = [];
                    this._clearElement = null;

                    // Element that is used for showing average rating
                    this._averageRatingElement = null;
                    this._elementWidth = null;
                    this._elementPadding = null;
                    this._elementBorder = null;
                    this._floatingValue = 0;

                    this._createControl();
                    this._setAccessibilityProperties();

                    delete this._updateControl;
                    if (updateNeeded) {
                        this._updateControl();
                    }

                },

                // Hide the help star if the control is not showing average rating
                _hideAverageRating: function () {
                    if (!this._averageRatingHidden) {
                        this._averageRatingHidden = true;
                        this._averageRatingElement.style.cssText = hiddenAverageRatingCss;
                    }
                },

                _createControl: function () {
                    // rating control could have more than one class name
                    _ElementUtilities.addClass(this._element, msRating);

                    var html = "";
                    this._averageRatingHidden = true;
                    // create control
                    for (var i = 0; i <= this._maxRating; i++) {
                        if (i === this._maxRating) {
                            html = html + "<div class='" + msRatingAverageFull + "' style='" + hiddenAverageRatingCss + "'></div>";
                        } else {
                            html = html + "<div class='" + msRatingUserEmpty + "'></div>";
                        }
                    }
                    _SafeHtml.setInnerHTMLUnsafe(this._element, html);
                    var oneStar = this._element.firstElementChild;
                    var i = 0;
                    while (oneStar) {
                        this._elements[i] = oneStar;
                        if (i < this._maxRating) {
                            _ElementUtilities.data(oneStar).msStarRating = i + 1;
                        }
                        oneStar = oneStar.nextElementSibling;
                        i++;
                    }
                    this._averageRatingElement = this._elements[this._maxRating];
                    this._ensureAverageMSStarRating();

                    // add focus capability relative to element's position in the document
                    this._updateTabIndex();
                },

                _setAriaValueMin: function () {
                    this._element.setAttribute("aria-valuemin", this._enableClear ? 0 : 1);
                },

                _setAccessibilityProperties: function () {
                    this._element.setAttribute("role", "slider");
                    this._element.setAttribute("aria-valuemax", this._maxRating);
                    this._setAriaValueMin();
                    this._updateAccessibilityRestState();
                },

                _getText: function (number) {
                    var string = this._tooltipStrings[number];
                    if (string) {
                        var tempDiv = _Global.document.createElement("div");
                        tempDiv.innerHTML = string;
                        return tempDiv.textContent;
                    } else if (number === this._maxRating) {
                        return strings.clearYourRating;
                    } else {
                        return number + 1;
                    }
                },

                _updateAccessibilityRestState: function () {
                    var element = this._element;
                    this._ariaValueNowMutationObserver && this._ariaValueNowMutationObserver.disconnect();
                    element.setAttribute("aria-readOnly", this._disabled);

                    if (this._userRating !== 0) {
                        element.setAttribute("aria-valuenow", this._userRating);
                        element.setAttribute("aria-label", strings.userRating);
                        element.setAttribute("aria-valuetext", this._getText(this._userRating - 1));
                    } else if (this._averageRating !== 0) {
                        element.setAttribute("aria-valuenow", this._averageRating);
                        element.setAttribute("aria-label", strings.averageRating);
                        element.setAttribute("aria-valuetext", this._averageRating);
                    } else {
                        element.setAttribute("aria-valuenow", strings.unrated);
                        element.setAttribute("aria-label", strings.userRating);
                        element.setAttribute("aria-valuetext", strings.unrated);
                    }

                    this._ariaValueNowMutationObserver && this._ariaValueNowMutationObserver.observe(this._element, { attributes: true, attributeFilter: ["aria-valuenow"] });
                },

                _updateAccessibilityHoverState: function () {
                    var element = this._element;
                    this._ariaValueNowMutationObserver && this._ariaValueNowMutationObserver.disconnect();
                    element.setAttribute("aria-readOnly", this._disabled);

                    if (this._tentativeRating > 0) {
                        element.setAttribute("aria-label", strings.tentativeRating);
                        element.setAttribute("aria-valuenow", this._tentativeRating);
                        element.setAttribute("aria-valuetext", this._getText(this._tentativeRating - 1));
                    } else if (this._tentativeRating === 0) {
                        element.setAttribute("aria-valuenow", strings.unrated);
                        element.setAttribute("aria-label", strings.tentativeRating);
                        element.setAttribute("aria-valuetext", this._getText(this._maxRating));
                    } else {
                        //shouldn't get here
                        element.setAttribute("aria-valuenow", strings.unrated);
                        element.setAttribute("aria-label", strings.tentativeRating);
                        element.setAttribute("aria-valuetext", strings.unrated);
                    }

                    this._ariaValueNowMutationObserver && this._ariaValueNowMutationObserver.observe(this._element, { attributes: true, attributeFilter: ["aria-valuenow"] });
                },

                _ensureTooltips: function () {
                    if (this.disabled) {
                        return;
                    }

                    if (this._toolTips.length === 0) {
                        for (var i = 0; i < this._maxRating; i++) {
                            this._toolTips[i] = new Tooltip.Tooltip(this._elements[i]);
                        }
                    }
                },

                // decrement tentative rating by one
                _decrementRating: function () {
                    this._closeTooltip();
                    var firePreviewChange = true;
                    if (this._tentativeRating <= 0) {
                        firePreviewChange = false;
                    } else {
                        if (this._tentativeRating > 0) {
                            this._tentativeRating--;
                        } else if (this._tentativeRating === -1) {
                            if (this._userRating !== 0) {
                                if (this._userRating > 0) {
                                    this._tentativeRating = this._userRating - 1;
                                } else {
                                    this._tentativeRating = 0;
                                }
                            } else {
                                this._tentativeRating = 0;
                            }
                        }

                        if ((this._tentativeRating === 0) && !this._enableClear) {
                            this._tentativeRating = 1;
                            firePreviewChange = false;
                        }
                    }

                    this._showTentativeRating(firePreviewChange, "keyboard");
                },

                _events: function () {
                    var that = this;
                    function ratingHandler(eventName) {
                        return {
                            name: eventName,
                            lowerCaseName: eventName.toLowerCase(),
                            handler: function (event) {
                                var fn = that["_on" + eventName];
                                if (fn) {
                                    fn.apply(that, [event]);
                                }
                            }
                        };
                    }

                    var eventsRegisteredInLowerCase = [
                            ratingHandler("KeyDown"),
                            ratingHandler("FocusOut"),
                            ratingHandler("FocusIn"),
                            ratingHandler("PointerCancel"),
                            ratingHandler("PointerDown"),
                            ratingHandler("PointerMove"),
                            ratingHandler("PointerOver"),
                            ratingHandler("PointerUp"),
                            ratingHandler("PointerOut")
                    ];
                    var events = [
                        ratingHandler("WinJSNodeInserted")
                    ];

                    var i;
                    for (i = 0; i < eventsRegisteredInLowerCase.length; ++i) {
                        _ElementUtilities._addEventListener(this._element, eventsRegisteredInLowerCase[i].lowerCaseName, eventsRegisteredInLowerCase[i].handler, false);
                    }
                    for (i = 0; i < events.length; ++i) {
                        this._element.addEventListener(events[i].name, events[i].handler, false);
                    }

                    this._ariaValueNowMutationObserver = new _ElementUtilities._MutationObserver(this._ariaValueNowChanged.bind(this));
                    this._ariaValueNowMutationObserver.observe(this._element, { attributes: true, attributeFilter: ["aria-valuenow"] });
                },

                _onWinJSNodeInserted: function () {
                    this._recalculateStarProperties();
                    this._updateControl();
                },

                _recalculateStarProperties: function () {
                    var j = 0;
                    // If the average rating is 1 we do not have correct padding on the first star so we are reading it from the second star
                    // When we create average rating star we are creating it from 2 divs - stars. The first one is the average rating star the second one is the regular rating star.
                    // If the average rating is 1 we are creating that rating on the following way - The first part of star
                    // (without right padding, right border) is average rating star - the second part is regular star that does not have left padding and left border anymore
                    // (we set on 0 to create average rating star). In that situation the average rating star has correct left padding and left border.
                    if (this._averageRating === 1) {
                        j = 1;
                    }
                    var style = _ElementUtilities._getComputedStyle(this._elements[j]);
                    this._elementWidth = style.width;
                    if (_ElementUtilities._getComputedStyle(this._element).direction === "rtl") {
                        this._elementPadding = style.paddingRight;
                        this._elementBorder = style.borderRight;
                    } else {
                        this._elementPadding = style.paddingLeft;
                        this._elementBorder = style.borderLeft;
                    }
                },

                // Hide the help star if the control is not showing average rating
                _hideAverageStar: function () {
                    // check if this average rating control
                    if (this._averageRating !== 0) {
                        // hide the empty star
                        this._resetAverageStar(false);
                    }
                },

                // increase tentative rating by one
                _incrementRating: function () {
                    this._closeTooltip();
                    var firePreviewChange = true;
                    if (this._tentativeRating < 0 || this._tentativeRating >= this._maxRating) {
                        firePreviewChange = false;
                    }

                    if (this._tentativeRating !== -1) {
                        if (this._tentativeRating < this._maxRating) {
                            this._tentativeRating++;
                        }
                    } else {
                        if (this._userRating !== 0) {
                            if (this._userRating < this._maxRating) {
                                this._tentativeRating = this._userRating + 1;
                            } else {
                                this._tentativeRating = this._maxRating;
                            }
                        } else {
                            this._tentativeRating = 1;
                        }
                    }
                    this._showTentativeRating(firePreviewChange, "keyboard");
                },

                _ariaValueNowChanged: function () {
                    if (!this._disabled) {
                        var attrNode = this._element.getAttributeNode("aria-valuenow");
                        if (attrNode !== null) {
                            var value = Number(attrNode.nodeValue);
                            if (this.userRating !== value) {
                                this.userRating = value;
                                this._tentativeRating = this._userRating;
                                this._raiseEvent(CHANGE, this._userRating);
                            }
                        }
                    }
                },

                _onPointerCancel: function () {
                    this._showCurrentRating();
                    if (!this._lastEventWasChange) {
                        this._raiseEvent(CANCEL, null);
                    }
                    this._captured = false;
                },

                _onPointerDown: function (eventObject) {
                    if (eventObject.pointerType === PT_MOUSE && eventObject.button !== MOUSE_LBUTTON) {
                        return; // Ignore any mouse clicks that are not left clicks.
                    }
                    if (!this._captured) { // Rating Control does not support multi-touch, ignore mspointerdown messages if the control already has capture.
                        this._pointerDownAt = { x: eventObject.clientX, y: eventObject.clientY };
                        this._pointerDownFocus = true;
                        if (!this._disabled) {
                            // Only capture the event when active to support block panning
                            _ElementUtilities._setPointerCapture(this._element, eventObject.pointerId);
                            this._captured = true;

                            if (eventObject.pointerType === PT_TOUCH) {
                                this._tentativeRating = _ElementUtilities.data(eventObject.target).msStarRating || 0;
                                // change states for all stars
                                this._setStarClasses(msRatingTentativeFull, this._tentativeRating, msRatingTentativeEmpty);
                                this._hideAverageStar();
                                this._updateAccessibilityHoverState();
                                this._openTooltip("touch");
                                this._raiseEvent(PREVIEW_CHANGE, this._tentativeRating);
                            } else {
                                this._openTooltip("mousedown");
                            }
                        }
                    }
                },

                _onCapturedPointerMove: function (eventObject, tooltipType) {
                    // Manual hit-test because we capture the pointer
                    // If the pointer is already down, we use its information.
                    var pointerAt = this._pointerDownAt || { x: eventObject.clientX, y: eventObject.clientY };

                    var star;
                    var hit = _ElementUtilities._elementsFromPoint(eventObject.clientX, pointerAt.y);
                    if (hit) {
                        for (var i = 0, len = hit.length; i < len; i++) {
                            var item = hit[i];
                            if (item.getAttribute("role") === "tooltip") {
                                return;
                            }
                            if (_ElementUtilities.hasClass(item, "win-star")) {
                                star = item;
                                break;
                            }
                        }
                    }
                    var starNum;
                    if (star && (star.parentElement === this._element)) {
                        starNum = _ElementUtilities.data(star).msStarRating || 0;
                    } else {
                        var left = 0, right = this.maxRating;
                        if (_ElementUtilities._getComputedStyle(this._element).direction === "rtl") {
                            left = right;
                            right = 0;
                        }
                        if (eventObject.clientX < pointerAt.x) {
                            starNum = left;
                        } else {
                            starNum = right;
                        }
                    }

                    var firePreviewChange = false;
                    var newTentativeRating = Math.min(Math.ceil(starNum), this._maxRating);
                    if ((newTentativeRating === 0) && !this._enableClear) {
                        newTentativeRating = 1;
                    }
                    if (newTentativeRating !== this._tentativeRating) {
                        this._closeTooltip();
                        firePreviewChange = true;
                    }

                    this._tentativeRating = newTentativeRating;
                    this._showTentativeRating(firePreviewChange, tooltipType);
                    eventObject.preventDefault();
                },

                _onPointerMove: function (eventObject) {
                    if (this._captured) {
                        if (eventObject.pointerType === PT_TOUCH) {
                            this._onCapturedPointerMove(eventObject, "touch");
                        } else {
                            this._onCapturedPointerMove(eventObject, "mousedown");
                        }
                    }
                },

                _onPointerOver: function (eventObject) {
                    if (!this._disabled && (eventObject.pointerType === PT_PEN || eventObject.pointerType === PT_MOUSE)) {
                        this._onCapturedPointerMove(eventObject, "mouseover");
                    }
                },

                _onPointerUp: function (eventObject) {
                    if (this._captured) {
                        _ElementUtilities._releasePointerCapture(this._element, eventObject.pointerId);
                        this._captured = false;
                        this._onUserRatingChanged();
                    }
                    this._pointerDownAt = null;
                },

                _onFocusOut: function () {
                    if (!this._captured) {
                        this._onUserRatingChanged();
                        if (!this._lastEventWasChange && !this._lastEventWasCancel) {
                            this._raiseEvent(CANCEL, null);
                        }
                    }
                },

                _onFocusIn: function () {
                    if (!this._pointerDownFocus) {
                        // if the control is read only don't hover stars
                        if (!this._disabled) {
                            // change states for all previous stars
                            // but only if user didnt vote
                            if (this._userRating === 0) {
                                for (var i = 0; i < this._maxRating; i++) {
                                    this._elements[i].className = msRatingTentativeEmpty;
                                }
                            }
                            // hide the help star
                            this._hideAverageStar();
                        }

                        if (this._userRating !== 0) {
                            this._raiseEvent(PREVIEW_CHANGE, this._userRating);
                        } else {
                            this._raiseEvent(PREVIEW_CHANGE, 0);
                        }
                        this._tentativeRating = this._userRating;
                    }
                    this._pointerDownFocus = false;
                },

                _onKeyDown: function (eventObject) {
                    var Key = _ElementUtilities.Key;
                    var keyCode = eventObject.keyCode;
                    var rtlString = _ElementUtilities._getComputedStyle(this._element).direction;
                    var handled = true;
                    switch (keyCode) {
                        case Key.enter: // Enter
                            this._onUserRatingChanged();
                            break;
                        case Key.tab: //Tab
                            this._onUserRatingChanged();
                            handled = false;
                            break;
                        case Key.escape: // escape
                            this._showCurrentRating();

                            if (!this._lastEventWasChange) {
                                this._raiseEvent(CANCEL, null);
                            }

                            break;
                        case Key.leftArrow: // Arrow Left
                            if (rtlString === "rtl" && this._tentativeRating < this.maxRating) {
                                this._incrementRating();
                            } else if (rtlString !== "rtl" && this._tentativeRating > 0) {
                                this._decrementRating();
                            } else {
                                handled = false;
                            }
                            break;
                        case Key.upArrow: // Arrow Up
                            if (this._tentativeRating < this.maxRating) {
                                this._incrementRating();
                            } else {
                                handled = false;
                            }
                            break;
                        case Key.rightArrow: // Arrow Right
                            if (rtlString === "rtl" && this._tentativeRating > 0) {
                                this._decrementRating();
                            } else if (rtlString !== "rtl" && this._tentativeRating < this.maxRating) {
                                this._incrementRating();
                            } else {
                                handled = false;
                            }
                            break;
                        case Key.downArrow: // Arrow Down
                            if (this._tentativeRating > 0) {
                                this._decrementRating();
                            } else {
                                handled = false;
                            }
                            break;
                        default:
                            var number = 0;
                            if ((keyCode >= Key.num0) && (keyCode <= Key.num9)) {
                                number = Key.num0;
                            } else if ((keyCode >= Key.numPad0) && (keyCode <= Key.numPad9)) {
                                number = Key.numPad0;
                            }

                            if (number > 0) {
                                var firePreviewChange = false;
                                var newTentativeRating = Math.min(keyCode - number, this._maxRating);
                                if ((newTentativeRating === 0) && !this._enableClear) {
                                    newTentativeRating = 1;
                                }
                                if (newTentativeRating !== this._tentativeRating) {
                                    this._closeTooltip();
                                    firePreviewChange = true;
                                }
                                this._tentativeRating = newTentativeRating;
                                this._showTentativeRating(firePreviewChange, "keyboard");
                            } else {
                                handled = false;
                            }
                            break;
                    }

                    if (handled) {
                        eventObject.stopPropagation();
                        eventObject.preventDefault();
                    }
                },

                _onPointerOut: function (eventObject) {
                    if (!this._captured && !_ElementUtilities.eventWithinElement(this._element, eventObject)) {
                        this._showCurrentRating();
                        if (!this._lastEventWasChange) {
                            // only fire cancel event if we move out of the rating control, and if
                            // user did not change rating on the control
                            this._raiseEvent(CANCEL, null);
                        }
                    }
                },

                _onUserRatingChanged: function () {
                    if (!this._disabled) {
                        this._closeTooltip();
                        // Only submit a change event if the user has altered the rating control value via PREVIEWCHANGE event.
                        if (this._userRating !== this._tentativeRating && !this._lastEventWasCancel && !this._lastEventWasChange) {
                            this.userRating = this._tentativeRating;
                            this._raiseEvent(CHANGE, this._userRating);
                        } else {
                            this._updateControl();
                        }
                    }
                },

                _raiseEvent: function (eventName, tentativeRating) {
                    if (!this._disabled) {
                        this._lastEventWasChange = (eventName === CHANGE);
                        this._lastEventWasCancel = (eventName === CANCEL);
                        if (_Global.document.createEvent) {
                            var event = _Global.document.createEvent("CustomEvent");
                            event.initCustomEvent(eventName, false, false, { tentativeRating: tentativeRating });
                            this._element.dispatchEvent(event);
                        }
                    }
                },

                _resetNextElement: function (prevState) {
                    if (this._averageRatingElement.nextSibling !== null) {
                        _ElementUtilities._setFlexStyle(this._averageRatingElement.nextSibling, { grow: 1, shrink: 1 });
                        var style = this._averageRatingElement.nextSibling.style;
                        var direction = _ElementUtilities._getComputedStyle(this._element).direction;
                        if (prevState) {
                            if (direction === "rtl") {
                                direction = "ltr";
                            } else {
                                direction = "rtl";
                            }
                        }
                        if (direction === "rtl") {
                            style.paddingRight = this._elementPadding;
                            style.borderRight = this._elementBorder;
                            style.direction = "rtl";
                        } else {
                            style.paddingLeft = this._elementPadding;
                            style.borderLeft = this._elementBorder;
                            style.direction = "ltr";
                        }
                        style.backgroundPosition = "left";
                        style.backgroundSize = "100% 100%";
                        style.width = this._resizeStringValue(this._elementWidth, 1, style.width);
                    }
                },

                _resetAverageStar: function (prevState) {
                    this._resetNextElement(prevState);
                    this._hideAverageRating();
                },

                _resizeStringValue: function (string, factor, curString) {
                    var number = parseFloat(string);
                    if (isNaN(number)) {
                        if (curString !== null) {
                            return curString;
                        } else {
                            return string;
                        }
                    }
                    var unit = string.substring(number.toString(10).length);
                    number = number * factor;
                    return (number + unit);
                },

                _setControlSize: function (value) {
                    // Coerce value to a positive integer between 0 and maxRating
                    // if negative default to DEFAULT_MAX_RATING
                    var maxRating = (Number(value) || DEFAULT_MAX_RATING) >> 0;
                    this._maxRating = maxRating > 0 ? maxRating : DEFAULT_MAX_RATING;
                },

                _updateTooltips: function (value) {
                    var i, max = 0;
                    if (value !== null) {
                        max = ((value.length <= this._maxRating + 1) ? value.length : this._maxRating + 1);
                        for (i = 0; i < max; i++) {
                            this._tooltipStrings[i] = value[i];
                        }
                    } else {
                        for (i = 0; i < this._maxRating; i++) {
                            this._tooltipStrings[i] = i + 1;
                        }
                        this._tooltipStrings[this._maxRating] = strings.clearYourRating;
                    }
                },

                _updateTabIndex: function () {
                    this._element.tabIndex = (this._disabled ? "-1" : "0");
                },

                _setStarClasses: function (classNameBeforeThreshold, threshold, classNameAfterThreshold) {
                    for (var i = 0; i < this._maxRating; i++) {
                        if (i < threshold) {
                            this._elements[i].className = classNameBeforeThreshold;
                        } else {
                            this._elements[i].className = classNameAfterThreshold;
                        }
                    }
                },

                // Average rating star is created from 2 divs:
                // In the first div the glyph starts from the beginning in the direction of the control
                // In the second div the glyph starts from the beginning in the opposite direction
                // That way we are making the average star look like one glyph
                _updateAverageStar: function () {
                    var style = this._averageRatingElement.style;
                    var nextStyle = this._averageRatingElement.nextSibling.style;
                    if (_ElementUtilities._getComputedStyle(this._element).direction === "rtl") {
                        style.backgroundPosition = "right";
                        style.paddingRight = this._elementPadding;
                        style.borderRight = this._elementBorder;
                        nextStyle.paddingRight = "0px";
                        nextStyle.borderRight = "0px";
                        nextStyle.direction = "ltr";
                    } else {
                        style.backgroundPosition = "left";
                        nextStyle.backgroundPosition = "right";
                        style.paddingLeft = this._elementPadding;
                        style.borderLeft = this._elementBorder;
                        nextStyle.paddingLeft = "0px";
                        nextStyle.borderLeft = "0px";
                        nextStyle.direction = "rtl";
                    }
                    _ElementUtilities._setFlexStyle(this._averageRatingElement, { grow: this._floatingValue, shrink: this._floatingValue });
                    style.width = this._resizeStringValue(this._elementWidth, this._floatingValue, style.width);
                    style.backgroundSize = (100 / this._floatingValue) + "% 100%";
                    style.display = _ElementUtilities._getComputedStyle(this._averageRatingElement.nextSibling).display;
                    this._averageRatingHidden = false;
                    _ElementUtilities._setFlexStyle(this._averageRatingElement.nextSibling, { grow: 1 - this._floatingValue, shrink: 1 - this._floatingValue });
                    nextStyle.width = this._resizeStringValue(this._elementWidth, 1 - this._floatingValue, nextStyle.width);
                    nextStyle.backgroundSize = (100 / (1 - this._floatingValue)) + "% 100%";
                },

                // show current rating
                _showCurrentRating: function () {
                    this._closeTooltip();
                    // reset tentative rating
                    this._tentativeRating = -1;
                    // if the control is read only then we didn't change anything on hover
                    if (!this._disabled) {
                        this._updateControl();
                    }
                    this._updateAccessibilityRestState();
                },

                _showTentativeRating: function (firePreviewChange, tooltipType) {
                    // if the control is read only don't hover stars
                    if ((!this._disabled) && (this._tentativeRating >= 0)) {
                        this._setStarClasses(msRatingTentativeFull, this._tentativeRating, msRatingTentativeEmpty);

                        // hide the empty star
                        this._hideAverageStar();
                    }

                    this._updateAccessibilityHoverState();

                    if (firePreviewChange) {
                        this._openTooltip(tooltipType);
                        this._raiseEvent(PREVIEW_CHANGE, this._tentativeRating);
                    }
                },

                _openTooltip: function (tooltipType) {
                    if (this.disabled) {
                        return;
                    }

                    this._ensureTooltips();
                    if (this._tentativeRating > 0) {
                        this._toolTips[this._tentativeRating - 1].innerHTML = this._tooltipStrings[this._tentativeRating - 1];
                        this._toolTips[this._tentativeRating - 1].open(tooltipType);
                    } else if (this._tentativeRating === 0) {
                        this._clearElement = _Global.document.createElement("div");
                        var distance = this._elements[0].offsetWidth + parseInt(this._elementPadding, 10);
                        if (_ElementUtilities._getComputedStyle(this._element).direction === "ltr") {
                            distance *= -1;
                        }
                        this._clearElement.style.cssText = "visiblity:hidden; position:absolute; width:0px; height:100%; left:" + distance + "px; top:0px;";
                        this._elements[0].appendChild(this._clearElement);
                        this._toolTips[this._maxRating] = new Tooltip.Tooltip(this._clearElement);
                        this._toolTips[this._maxRating].innerHTML = this._tooltipStrings[this._maxRating];
                        this._toolTips[this._maxRating].open(tooltipType);
                    }
                },

                _closeTooltip: function () {
                    if (this._toolTips.length !== 0) {
                        if (this._tentativeRating > 0) {
                            this._toolTips[this._tentativeRating - 1].close();
                        } else if (this._tentativeRating === 0) {
                            if (this._clearElement !== null) {
                                this._toolTips[this._maxRating].close();
                                this._elements[0].removeChild(this._clearElement);
                                this._clearElement = null;
                            }
                        }
                    }
                },

                _clearTooltips: function () {
                    if (this._toolTips && this._toolTips.length !== 0) {
                        for (var i = 0; i < this._maxRating; i++) {
                            this._toolTips[i].innerHTML = null;
                        }
                    }
                },

                _appendClass: function (classNameToBeAdded) {
                    for (var i = 0; i <= this._maxRating; i++) {
                        _ElementUtilities.addClass(this._elements[i], classNameToBeAdded);
                    }
                },

                _setClasses: function (classNameBeforeThreshold, threshold, classNameAfterThreshold) {
                    for (var i = 0; i < this._maxRating; i++) {
                        if (i < threshold) {
                            this._elements[i].className = classNameBeforeThreshold;
                        } else {
                            this._elements[i].className = classNameAfterThreshold;
                        }
                    }
                },

                _ensureAverageMSStarRating: function () {
                    _ElementUtilities.data(this._averageRatingElement).msStarRating = Math.ceil(this._averageRating);
                },

                _updateControl: function () {
                    if (!this._controlUpdateNeeded) {
                        return;
                    }

                    // check for average rating (if user rating is specified then we are not showing average rating)
                    if ((this._averageRating !== 0) && (this._userRating === 0)) {
                        if ((this._averageRating >= 1) && (this._averageRating <= this._maxRating)) { // Display average rating
                            this._setClasses(msRatingAverageFull, this._averageRating - 1, msRatingAverageEmpty);
                            this._averageRatingElement.className = msRatingAverageFull;

                            for (var i = 0; i < this._maxRating; i++) {
                                // check if it is average star
                                if ((i < this._averageRating) && ((i + 1) >= this._averageRating)) {
                                    this._resetNextElement(false);

                                    this._element.insertBefore(this._averageRatingElement, this._elements[i]);

                                    this._floatingValue = this._averageRating - i;
                                    var elementStyle = _ElementUtilities._getComputedStyle(this._elements[i]);
                                    this._elementWidth = elementStyle.width;

                                    if (_ElementUtilities._getComputedStyle(this._element).direction === "rtl") {
                                        this._elementPadding = elementStyle.paddingRight;
                                        this._elementBorder = elementStyle.borderRight;
                                    } else {
                                        this._elementPadding = elementStyle.paddingLeft;
                                        this._elementBorder = elementStyle.borderLeft;
                                    }

                                    this._updateAverageStar();
                                }
                            }
                        }
                    }

                    // check if it is user rating control
                    if (this._userRating !== 0) {
                        if ((this._userRating >= 1) && (this._userRating <= this._maxRating)) { // Display user rating.
                            this._setClasses(msRatingUserFull, this._userRating, msRatingUserEmpty);

                            // hide average star
                            this._resetAverageStar(false);
                        }
                    }

                    // update stars if the rating is not set
                    if ((this._userRating === 0) && (this._averageRating === 0)) { // Display empty rating
                        this._setClasses(msRatingEmpty, this._maxRating);

                        // hide average star
                        this._resetAverageStar(false);
                    }

                    if (this.disabled) { // Display disabled rating.
                        this._appendClass(msRatingDisabled);
                    }

                    // update classes to differentiate average rating vs user rating
                    // If the userRating is 0 and averageRating is 0 we would like to treat that rating control as user rating control (not as average rating control).
                    if ((this._averageRating !== 0) && (this._userRating === 0)) {
                        this._appendClass(msAverage);
                    } else {
                        this._appendClass(msUser);
                    }

                    this._updateAccessibilityRestState();
                }
            });
        })
    });

});
