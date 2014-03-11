(function tooltipInit(global) {
    "use strict";

    // Tooltip control implementation
    WinJS.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.Tooltip">
        /// Displays a tooltip that can contain images and formatting.
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        /// <icon src="ui_winjs.ui.tooltip.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.tooltip.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div style="display:inline-block;" data-win-control="WinJS.UI.Tooltip" data-win-options="{innerHTML:'Tooltip content goes here'}"></div>]]></htmlSnippet>
        /// <event name="beforeopen" bubbles="false" locid="WinJS.UI.Tooltip_e:beforeopen">Raised when the tooltip is about to appear.</event>
        /// <event name="opened" bubbles="false" locid="WinJS.UI.Tooltip_e:opened">Raised when the tooltip is showing.</event>
        /// <event name="beforeclose" bubbles="false" locid="WinJS.UI.Tooltip_e:beforeclose">Raised when the tooltip is about to become hidden.</event>
        /// <event name="closed" bubbles="false" locid="WinJS.UI.Tooltip_e:close">Raised when the tooltip is hidden.</event>
        /// <part name="tooltip" class="win-tooltip" locid="WinJS.UI.Tooltip_e:tooltip">The entire Tooltip control.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        Tooltip: WinJS.Namespace._lazy(function () {
            var lastCloseTime = 0;
            var utilities = WinJS.Utilities;
            var animation = WinJS.UI.Animation;

            // Constants definition
            var DEFAULT_PLACEMENT = "top";
            var DELAY_INITIAL_TOUCH_SHORT = 400;
            var DELAY_INITIAL_TOUCH_LONG = 1200;
            var DEFAULT_MOUSE_HOVER_TIME = 400; // 0.4 second
            var DEFAULT_MESSAGE_DURATION = 5000; // 5 secs
            var DELAY_RESHOW_NONINFOTIP_TOUCH = 0;
            var DELAY_RESHOW_NONINFOTIP_NONTOUCH = 600;
            var DELAY_RESHOW_INFOTIP_TOUCH = 400;
            var DELAY_RESHOW_INFOTIP_NONTOUCH = 600;
            var RESHOW_THRESHOLD = 200;
            var HIDE_DELAY_MAX = 300000; // 5 mins
            var OFFSET_KEYBOARD = 12;
            var OFFSET_MOUSE = 20;
            var OFFSET_TOUCH = 45;
            var OFFSET_PROGRAMMATIC_TOUCH = 20;
            var OFFSET_PROGRAMMATIC_NONTOUCH = 12;
            var SAFETY_NET_GAP = 1; // We set a 1-pixel gap between the right or bottom edge of the tooltip and the viewport to avoid possible re-layout
            var PT_TOUCH = MSPointerEvent.MSPOINTER_TYPE_TOUCH || "touch"; // pointer type to indicate a touch event

            var EVENTS_INVOKE = { "keyup": "", "pointerover": "" },
                EVENTS_UPDATE = { "pointermove": "" },
            EVENTS_DISMISS = { "pointerdown": "", "keydown": "", "blur": "", "pointerout": "", "pointercancel": "", "pointerup": "" },
            EVENTS_BY_CHILD = { "pointerover": "", "pointerout": "" };

            // CSS class names
            var msTooltip = "win-tooltip",
            msTooltipPhantom = "win-tooltip-phantom";

            // Global attributes
            var mouseHoverTime = DEFAULT_MOUSE_HOVER_TIME,
                nonInfoTooltipNonTouchShowDelay = 2 * mouseHoverTime,
                infoTooltipNonTouchShowDelay = 2.5 * mouseHoverTime,
                messageDuration = DEFAULT_MESSAGE_DURATION,
                isLeftHanded = false;

            var hasInitWinRTSettings = false;

            var createEvent = WinJS.Utilities._createEventProperty;

            return WinJS.Class.define(function Tooltip_ctor(anchorElement, options) {
                /// <signature helpKeyword="WinJS.UI.Tooltip.Tooltip">
                /// <summary locid="WinJS.UI.Tooltip.constructor">
                /// Creates a new Tooltip.
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.Tooltip.constructor_p:element">
                /// The DOM element that hosts the Tooltip.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.Tooltip.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on". For example, to provide a handler for the opened event,
                /// add a property named "onopened" to the options object and set its value to the event handler.
                /// This parameter is optional.
                /// </param>
                /// <returns type="WinJS.UI.Tooltip" locid="WinJS.UI.Tooltip.constructor_returnValue">
                /// The new Tooltip.
                /// </returns>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>
                anchorElement = anchorElement || document.createElement("div");

                var tooltip = utilities.data(anchorElement).tooltip;
                if (tooltip) {
                    return tooltip;
                }

                // Set system attributes if it is in WWA, otherwise, use the default values
                if (!hasInitWinRTSettings && WinJS.Utilities.hasWinRT) { // in WWA
                    var uiSettings = new Windows.UI.ViewManagement.UISettings();
                    mouseHoverTime = uiSettings.mouseHoverTime;
                    nonInfoTooltipNonTouchShowDelay = 2 * mouseHoverTime;
                    infoTooltipNonTouchShowDelay = 2.5 * mouseHoverTime;
                    messageDuration = uiSettings.messageDuration * 1000;  // uiSettings.messageDuration is in seconds.
                    var handedness = uiSettings.handPreference;
                    isLeftHanded = (handedness == Windows.UI.ViewManagement.HandPreference.leftHanded);
                }
                hasInitWinRTSettings = true;

                // Need to initialize properties
                this._disposed = false;
                this._placement = DEFAULT_PLACEMENT;
                this._infotip = false;
                this._innerHTML = null;
                this._contentElement = null;
                this._extraClass = null;
                this._lastContentType = "html";
                this._anchorElement = anchorElement;
                this._domElement = null;
                this._phantomDiv = null;
                this._triggerByOpen = false;
                this._eventListenerRemoveStack = [];

                // To handle keyboard navigation
                this._lastKeyOrBlurEvent = null;
                this._currentKeyOrBlurEvent = null;

                // Remember ourselves
                anchorElement.winControl = this;
                WinJS.Utilities.addClass(anchorElement, "win-disposable");

                // If anchor element's title is defined, set as the default tooltip content
                if (anchorElement.title) {
                    this._innerHTML = this._anchorElement.title;
                    this._anchorElement.removeAttribute("title");
                }

                WinJS.UI.setOptions(this, options);
                this._events();
                utilities.data(anchorElement).tooltip = this;
            }, {
                /// <field type="String" locid="WinJS.UI.Tooltip.innerHTML" helpKeyword="WinJS.UI.Tooltip.innerHTML">
                /// Gets or sets the HTML content of the Tooltip.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                innerHTML: {
                    get: function () {
                        return this._innerHTML;
                    },
                    set: function (value) {
                        this._innerHTML = value;
                        if (this._domElement) {
                            // If we set the innerHTML to null or "" while tooltip is up, we should close it
                            if (!this._innerHTML || this._innerHTML === "") {
                                this._onDismiss();
                                return;
                            }
                            this._domElement.innerHTML = value;
                            this._position();
                        }
                        this._lastContentType = "html";
                    }
                },

                /// <field type="HTMLElement" hidden="true" locid="WinJS.UI.Tooltip.element" helpKeyword="WinJS.UI.Tooltip.element">
                /// Gets or sets the DOM element that hosts the Tooltip.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                element: {
                    get: function () {
                        return this._anchorElement;
                    }
                },

                /// <field type="HTMLElement" locid="WinJS.UI.Tooltip.contentElement" helpKeyword="WinJS.UI.Tooltip.contentElement" potentialValueSelector="div[style='display: none;']>div[id], div[style='display: none;']>div[class]">
                /// Gets or sets the DOM element that is the content for the ToolTip.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                contentElement: {
                    get: function () {
                        return this._contentElement;
                    },
                    set: function (value) {
                        this._contentElement = value;
                        if (this._domElement) {
                            // If we set the contentElement to null while tooltip is up, we should close it
                            if (!this._contentElement) {
                                this._onDismiss();
                                return;
                            }
                            this._domElement.innerHTML = "";
                            this._domElement.appendChild(this._contentElement);
                            this._position();
                        }
                        this._lastContentType = "element";
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.Tooltip.placement" locid="WinJS.UI.Tooltip.placement" helpKeyword="WinJS.UI.Tooltip.placement">
                /// Gets or sets the position for the Tooltip relative to its target element: top, bottom, left or right.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                placement: {
                    get: function () {
                        return this._placement;
                    },
                    set: function (value) {
                        if (value !== "top" && value !== "bottom" && value !== "left" && value !== "right") {
                            value = DEFAULT_PLACEMENT;
                        }
                        this._placement = value;
                        if (this._domElement) {
                            this._position();
                        }
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.Tooltip.infotip" helpKeyword="WinJS.UI.Tooltip.infotip">
                /// Gets or sets a value that specifies whether the Tooltip is an infotip, a tooltip that contains
                /// a lot of info and should be displayed for longer than a typical Tooltip.
                /// The default value is false.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                infotip: {
                    get: function () {
                        return this._infotip;
                    },
                    set: function (value) {
                        this._infotip = !!value; //convert the value to boolean
                    }
                },

                /// <field type="String" locid="WinJS.UI.Tooltip.extraClass" helpKeyword="WinJS.UI.Tooltip.extraClass" isAdvanced="true">
                /// Gets or sets additional CSS classes to apply to the Tooltip control's host element.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                extraClass: {
                    get: function () {
                        return this._extraClass;
                    },
                    set: function (value) {
                        this._extraClass = value;
                    }
                },

                /// <field type="Function" locid="WinJS.UI.Tooltip.onbeforeopen" helpKeyword="WinJS.UI.Tooltip.onbeforeopen">
                /// Raised just before the Tooltip appears.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                onbeforeopen: createEvent("beforeopen"),

                /// <field type="Function" locid="WinJS.UI.Tooltip.onopened" helpKeyword="WinJS.UI.Tooltip.onopened">
                /// Raised when the Tooltip is shown.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                onopened: createEvent("opened"),

                /// <field type="Function" locid="WinJS.UI.Tooltip.onbeforeclose" helpKeyword="WinJS.UI.Tooltip.onbeforeclose">
                /// Raised just before the Tooltip is hidden.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                onbeforeclose: createEvent("beforeclose"),

                /// <field type="Function" locid="WinJS.UI.Tooltip.onclosed" helpKeyword="WinJS.UI.Tooltip.onclosed">
                /// Raised when the Tooltip is no longer displayed.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                onclosed: createEvent("closed"),

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.Tooltip.dispose">
                    /// <summary locid="WinJS.UI.Tooltip.dispose">
                    /// Disposes this Tooltip.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }

                    this._disposed = true;
                    WinJS.Utilities.disposeSubTree(this.element);
                    for (var i = 0, len = this._eventListenerRemoveStack.length; i < len; i++) {
                        this._eventListenerRemoveStack[i]();
                    }
                    this._onDismiss();
                    var data = utilities.data(this._anchorElement);
                    if (data) {
                        delete data.tooltip;
                    }
                },

                addEventListener: function (eventName, eventCallBack, capture) {
                    /// <signature helpKeyword="WinJS.UI.Tooltip.addEventListener">
                    /// <summary locid="WinJS.UI.Tooltip.addEventListener">
                    /// Registers an event handler for the specified event.
                    /// </summary>
                    /// <param name="eventName" type="String" locid="WinJS.UI.Tooltip.addEventListener_p:eventName">The name of the event.</param>
                    /// <param name="eventCallback" type="Function" locid="WinJS.UI.Tooltip.addEventListener_p:eventCallback">The event handler function to associate with this event.</param>
                    /// <param name="capture" type="Boolean" locid="WinJS.UI.Tooltip.addEventListener_p:capture">Set to true to register the event handler for the capturing phase; set to false to register for the bubbling phase.</param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>

                    if (this._anchorElement) {
                        this._anchorElement.addEventListener(eventName, eventCallBack, capture);

                        var that = this;
                        this._eventListenerRemoveStack.push(function () {
                            that._anchorElement.removeEventListener(eventName, eventCallBack, capture);
                        });
                    }
                },

                removeEventListener: function (eventName, eventCallBack, capture) {
                    /// <signature helpKeyword="WinJS.UI.Tooltip.removeEventListener">
                    /// <summary locid="WinJS.UI.Tooltip.removeEventListener">
                    /// Unregisters an event handler for the specified event.
                    /// </summary>
                    /// <param name="eventName" type="String" locid="WinJS.UI.Tooltip.removeEventListener:eventName">The name of the event.</param>
                    /// <param name="eventCallback" type="Function" locid="WinJS.UI.Tooltip.removeEventListener:eventCallback">The event handler function to remove.</param>
                    /// <param name="capture" type="Boolean" locid="WinJS.UI.Tooltip.removeEventListener:capture">Set to true to unregister the event handler for the capturing phase; otherwise, set to false to unregister the event handler for the bubbling phase.</param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>

                    if (this._anchorElement) {
                        this._anchorElement.removeEventListener(eventName, eventCallBack, capture);
                    }
                },

                open: function (type) {
                    /// <signature helpKeyword="WinJS.UI.Tooltip.open">
                    /// <summary locid="WinJS.UI.Tooltip.open">
                    /// Shows the Tooltip.
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.Tooltip.open_p:type">The type of tooltip to show: "touch", "mouseover", "mousedown", or "keyboard". The default value is "mousedown".</param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>

                    // Open takes precedence over other triggering events
                    // Once tooltip is opened using open(), it can only be closed by time out(mouseover or keyboard) or explicitly by close().
                    this._triggerByOpen = true;

                    if (type !== "touch" && type !== "mouseover" && type !== "mousedown" && type !== "keyboard") {
                        type = "default";
                    }

                    switch (type) {
                        case "touch":
                            this._onInvoke("touch", "never");
                            break;
                        case "mouseover":
                            this._onInvoke("mouse", "auto");
                            break;
                        case "keyboard":
                            this._onInvoke("keyboard", "auto");
                            break;
                        case "mousedown":
                        case "default":
                            this._onInvoke("nodelay", "never");
                            break;
                    }

                },

                close: function () {
                    /// <signature helpKeyword="WinJS.UI.Tooltip.close">
                    /// <summary locid="WinJS.UI.Tooltip.close">
                    /// Hids the Tooltip.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>

                    this._onDismiss();
                },

                _cleanUpDOM: function () {
                    if (this._domElement) {
                        WinJS.Utilities.disposeSubTree(this._domElement);
                        document.body.removeChild(this._domElement);
                        this._domElement = null;

                        document.body.removeChild(this._phantomDiv);
                        this._phantomDiv = null;
                    }
                },

                _createTooltipDOM: function () {
                    this._cleanUpDOM();

                    this._domElement = document.createElement("div");

                    var id = WinJS.Utilities._uniqueID(this._domElement);
                    this._domElement.setAttribute("id", id);

                    // Set the direction of tooltip according to anchor element's
                    var computedStyle = document.defaultView.getComputedStyle(this._anchorElement, null);
                    var elemStyle = this._domElement.style;
                    elemStyle.direction = computedStyle.direction;
                    elemStyle.writingMode = computedStyle["writing-mode"]; // must use CSS name, not JS name

                    // Make the tooltip non-focusable
                    this._domElement.setAttribute("tabindex", -1);

                    // Set the aria tags for accessibility
                    this._domElement.setAttribute("role", "tooltip");
                    this._anchorElement.setAttribute("aria-describedby", id);

                    // Set the tooltip content
                    if (this._lastContentType === "element") { // Last update through contentElement option
                        this._domElement.appendChild(this._contentElement);
                    } else { // Last update through innerHTML option
                        this._domElement.innerHTML = this._innerHTML;
                    }

                    document.body.appendChild(this._domElement);
                    utilities.addClass(this._domElement, msTooltip);

                    // In the event of user-assigned classes, add those too
                    if (this._extraClass) {
                        utilities.addClass(this._domElement, this._extraClass);
                    }

                    // Create a phantom div on top of the tooltip div to block all interactions
                    this._phantomDiv = document.createElement("div");
                    this._phantomDiv.setAttribute("tabindex", -1);
                    document.body.appendChild(this._phantomDiv);
                    utilities.addClass(this._phantomDiv, msTooltipPhantom);
                    var zIndex = document.defaultView.getComputedStyle(this._domElement, null).zIndex + 1;
                    this._phantomDiv.style.zIndex = zIndex;
                },

                _raiseEvent: function (type, eventProperties) {
                    if (this._anchorElement) {
                        var customEvent = document.createEvent("CustomEvent");
                        customEvent.initCustomEvent(type, false, false, eventProperties);
                        this._anchorElement.dispatchEvent(customEvent);
                    }
                },

                // Support for keyboard navigation
                _captureLastKeyBlurOrPointerOverEvent: function (event, listener) {
                    listener._lastKeyOrBlurEvent = listener._currentKeyOrBlurEvent;
                    switch (event.type) {
                        case "keyup":
                            if (event.key === "Shift") {
                                listener._currentKeyOrBlurEvent = null;
                            } else {
                                listener._currentKeyOrBlurEvent = "keyboard";
                            }
                            break;
                        case "blur":
                            //anchor elment no longer in focus, clear up the stack
                            listener._currentKeyOrBlurEvent = null;
                            break;
                        default:
                            break;

                    }
                },

                _registerEventToListener: function (element, eventType, listener) {
                    var handler = function (event) {
                        listener._captureLastKeyBlurOrPointerOverEvent(event, listener);
                        listener._handleEvent(event);
                    };
                    element.addEventListener(eventType, handler, false);

                    this._eventListenerRemoveStack.push(function () {
                        element.removeEventListener(eventType, handler, false);
                    });
                },

                _events: function () {
                    for (var eventType in EVENTS_INVOKE) {
                        this._registerEventToListener(this._anchorElement, eventType, this);
                    }
                    for (var eventType in EVENTS_UPDATE) {
                        this._registerEventToListener(this._anchorElement, eventType, this);
                    }
                    for (eventType in EVENTS_DISMISS) {
                        this._registerEventToListener(this._anchorElement, eventType, this);
                    }


                },

                _handleEvent: function (event) {
                    var eventType = event.type;
                    if (!this._triggerByOpen) {
                        // If the anchor element has children, we should ignore events that are caused within the anchor element
                        // Please note that we are not using event.target here as in bubbling phases from the child, the event target
                        // is usually the child
                        if (eventType in EVENTS_BY_CHILD) {
                            var elem = event.relatedTarget;

                            while (elem && elem !== this._anchorElement && elem !== document.body) {
                                try {
                                    elem = elem.parentNode;
                                }
                                catch (e) {
                                    if (e instanceof Error && e.message === 'Permission denied') {
                                        //Permission denied error, if we can't access the node's
                                        //information, we should not handle the event
                                        //Put this guard prior Bug 484666 is fixed
                                        return;
                                    }
                                    else {
                                        throw e;
                                    }
                                }
                            }
                            if (elem === this._anchorElement) {
                                return;
                            }
                        }
                        if (eventType in EVENTS_INVOKE) {
                            if (event.pointerType == PT_TOUCH) {
                                this._onInvoke("touch", "never", event);
                                this._showTrigger = "touch";
                            } else {
                                var type = eventType.substring(0, 3) === "key" ? "keyboard" : "mouse";
                                this._onInvoke(type, "auto", event);
                                this._showTrigger = type;
                            }
                        } else if (eventType in EVENTS_UPDATE) {
                            this._contactPoint = { x: event.clientX, y: event.clientY };
                        } else if (eventType in EVENTS_DISMISS) {
                            var eventTrigger;
                            if (event.pointerType == PT_TOUCH) {
                                if (eventType == "pointerdown") {
                                    return;
                                }
                                eventTrigger = "touch";
                            }
                            else {
                                eventTrigger = eventType.substring(0, 3) === "key" ? "keyboard" : "mouse";
                            }
                            if (eventType != "blur" && eventTrigger != this._showTrigger) {
                                return;
                            }
                            this._onDismiss();
                        }
                    }
                },

                _onShowAnimationEnd: function () {
                    if (this._shouldDismiss || this._disposed) {
                        return;
                    }
                    this._raiseEvent("opened");
                    if (this._domElement) {
                        if (this._hideDelay !== "never") {
                            var that = this;
                            var delay = this._infotip ? Math.min(3 * messageDuration, HIDE_DELAY_MAX) : messageDuration;
                            this._hideDelayTimer = setTimeout(function () {
                                that._onDismiss();
                            }, delay);
                        }
                    }
                },


                _onHideAnimationEnd: function () {
                    document.body.removeEventListener("DOMNodeRemoved", this._removeTooltip, false);
                    this._cleanUpDOM();
                    // Once we remove the tooltip from the DOM, we should remove the aria tag from the anchor
                    if (this._anchorElement) {
                        this._anchorElement.removeAttribute("aria-describedby");
                    }
                    lastCloseTime = (new Date()).getTime();
                    this._triggerByOpen = false;
                    if (!this._disposed) {
                        this._raiseEvent("closed");
                    }
                },

                _decideOnDelay: function (type) {
                    var value;
                    this._useAnimation = true;

                    if (type == "nodelay") {
                        value = 0;
                        this._useAnimation = false;
                    }
                    else {
                        var curTime = (new Date()).getTime();
                        // If the mouse is moved immediately from another anchor that has
                        // tooltip open, we should use a shorter delay
                        if (curTime - lastCloseTime <= RESHOW_THRESHOLD) {
                            if (type == "touch") {
                                value = this._infotip ? DELAY_RESHOW_INFOTIP_TOUCH : DELAY_RESHOW_NONINFOTIP_TOUCH;
                            }
                            else {
                                value = this._infotip ? DELAY_RESHOW_INFOTIP_NONTOUCH : DELAY_RESHOW_NONINFOTIP_NONTOUCH;
                            }
                            this._useAnimation = false;
                        } else if (type == "touch") {
                            value = this._infotip ? DELAY_INITIAL_TOUCH_LONG : DELAY_INITIAL_TOUCH_SHORT;
                        } else {
                            value = this._infotip ? infoTooltipNonTouchShowDelay : nonInfoTooltipNonTouchShowDelay;
                        }
                    }
                    return value;
                },

                // This function returns the anchor element's position in the Window coordinates.
                _getAnchorPositionFromElementWindowCoord: function () {
                    var rect = this._anchorElement.getBoundingClientRect();

                    return {
                        x: rect.left,
                        y: rect.top,
                        width: rect.width,
                        height: rect.height
                    };
                },

                _getAnchorPositionFromPointerWindowCoord: function (contactPoint) {
                    return {
                        x: contactPoint.x,
                        y: contactPoint.y,
                        width: 1,
                        height: 1
                    };
                },

                _canPositionOnSide: function (placement, viewport, anchor, tip) {
                    var availWidth = 0, availHeight = 0;

                    switch (placement) {
                        case "top":
                            availWidth = tip.width + this._offset;
                            availHeight = anchor.y;
                            break;
                        case "bottom":
                            availWidth = tip.width + this._offset;
                            availHeight = viewport.height - anchor.y - anchor.height;
                            break;
                        case "left":
                            availWidth = anchor.x;
                            availHeight = tip.height + this._offset;
                            break;
                        case "right":
                            availWidth = viewport.width - anchor.x - anchor.width;
                            availHeight = tip.height + this._offset;
                            break;
                    }
                    return ((availWidth >= tip.width + this._offset) && (availHeight >= tip.height + this._offset));
                },

                _positionOnSide: function (placement, viewport, anchor, tip) {
                    var left = 0, top = 0;

                    switch (placement) {
                        case "top":
                        case "bottom":
                            // Align the tooltip to the anchor's center horizontally
                            left = anchor.x + anchor.width / 2 - tip.width / 2;

                            // If the left boundary is outside the window, set it to 0
                            // If the right boundary is outside the window, set it to align with the window right boundary
                            left = Math.min(Math.max(left, 0), viewport.width - tip.width - SAFETY_NET_GAP);

                            top = (placement == "top") ? anchor.y - tip.height - this._offset : anchor.y + anchor.height + this._offset;
                            break;
                        case "left":
                        case "right":
                            // Align the tooltip to the anchor's center vertically
                            top = anchor.y + anchor.height / 2 - tip.height / 2;

                            // If the top boundary is outside the window, set it to 0
                            // If the bottom boundary is outside the window, set it to align with the window bottom boundary
                            top = Math.min(Math.max(top, 0), viewport.height - tip.height - SAFETY_NET_GAP);

                            left = (placement == "left") ? anchor.x - tip.width - this._offset : anchor.x + anchor.width + this._offset;
                            break;
                    }

                    // Actually set the position
                    this._domElement.style.left = left + "px";
                    this._domElement.style.top = top + "px";

                    // Set the phantom's position and size
                    this._phantomDiv.style.left = left + "px";
                    this._phantomDiv.style.top = top + "px";
                    this._phantomDiv.style.width = tip.width + "px";
                    this._phantomDiv.style.height = tip.height + "px";
                },

                _position: function (contactType) {
                    var viewport = { width: 0, height: 0 };
                    var anchor = { x: 0, y: 0, width: 0, height: 0 };
                    var tip = { width: 0, height: 0 };

                    viewport.width = document.documentElement.clientWidth;
                    viewport.height = document.documentElement.clientHeight;
                    if (document.defaultView.getComputedStyle(document.body, null)["writing-mode"] === "tb-rl") {
                        viewport.width = document.documentElement.clientHeight;
                        viewport.height = document.documentElement.clientWidth;
                    }

                    if (this._contactPoint && (contactType === "touch" || contactType === "mouse")) {
                        anchor = this._getAnchorPositionFromPointerWindowCoord(this._contactPoint);
                    }
                    else {
                        // keyboard or programmatic is relative to element
                        anchor = this._getAnchorPositionFromElementWindowCoord();
                    }
                    tip.width = this._domElement.offsetWidth;
                    tip.height = this._domElement.offsetHeight;
                    var fallback_order = {
                        "top": ["top", "bottom", "left", "right"],
                        "bottom": ["bottom", "top", "left", "right"],
                        "left": ["left", "right", "top", "bottom"],
                        "right": ["right", "left", "top", "bottom"]
                    };
                    if (isLeftHanded) {
                        fallback_order.top[2] = "right";
                        fallback_order.top[3] = "left";
                        fallback_order.bottom[2] = "right";
                        fallback_order.bottom[3] = "left";
                    }

                    // Try to position the tooltip according to the placement preference
                    // We use this order:
                    // 1. Try the preferred placement
                    // 2. Try the opposite placement
                    // 3. If the preferred placement is top or bottom, we should try left
                    // and right (or right and left if left handed)
                    // If the preferred placement is left or right, we should try top and bottom
                    var order = fallback_order[this._placement];
                    var length = order.length;
                    for (var i = 0; i < length; i++) {
                        if (i == length - 1 || this._canPositionOnSide(order[i], viewport, anchor, tip)) {
                            this._positionOnSide(order[i], viewport, anchor, tip);
                            break;
                        }
                    }
                    return order[i];
                },

                _showTooltip: function (contactType) {
                    // Give a chance to dismiss the tooltip before it starts to show
                    if (this._shouldDismiss) {
                        return;
                    }
                    this._isShown = true;
                    this._raiseEvent("beforeopen");

                    // If the anchor is not in the DOM tree, we don't create the tooltip
                    if (!document.body.contains(this._anchorElement)) {
                        return;
                    }
                    if (this._shouldDismiss) {
                        return;
                    }

                    // If the contentElement is set to null or innerHTML set to null or "", we should NOT show the tooltip
                    if (this._lastContentType === "element") { // Last update through contentElement option
                        if (!this._contentElement) {
                            this._isShown = false;
                            return;
                        }
                    } else { // Last update through innerHTML option
                        if (!this._innerHTML || this._innerHTML === "") {
                            this._isShown = false;
                            return;
                        }
                    }

                    var that = this;
                    this._removeTooltip = function (event) {
                        var current = that._anchorElement;
                        while (current) {
                            if (event.target == current) {
                                document.body.removeEventListener("DOMNodeRemoved", that._removeTooltip, false);
                                that._cleanUpDOM();
                                break;
                            }
                            current = current.parentNode;
                        }
                    };

                    document.body.addEventListener("DOMNodeRemoved", this._removeTooltip, false);
                    this._createTooltipDOM();
                    var pos = this._position(contactType);
                    var that = this;
                    if (this._useAnimation) {
                        animation.fadeIn(this._domElement)
                            .then(this._onShowAnimationEnd.bind(this));
                    } else {
                        this._onShowAnimationEnd();
                    }
                },

                _onInvoke: function (type, hide, event) {
                    // Reset the dismiss flag
                    this._shouldDismiss = false;

                    // If the tooltip is already shown, ignore the current event
                    if (this._isShown) {
                        return;
                    }

                    // To handle keyboard support, we only want to display tooltip on the first tab key event only
                    if (event && event.type === "keyup") {
                        if (this._lastKeyOrBlurEvent == "keyboard" ||
                            !this._lastKeyOrBlurEvent && event.key !== "Tab") {
                            return;
                        }
                    }

                    // Set the hide delay,
                    this._hideDelay = hide;

                    this._contactPoint = null;
                    if (event) { // Open through interaction
                        this._contactPoint = { x: event.clientX, y: event.clientY };
                        // Tooltip display offset differently for touch events and non-touch events
                        if (type == "touch") {
                            this._offset = OFFSET_TOUCH;
                        } else if (type === "keyboard") {
                            this._offset = OFFSET_KEYBOARD;
                        } else {
                            this._offset = OFFSET_MOUSE;
                        }
                    } else { // Open Programmatically
                        if (type == "touch") {
                            this._offset = OFFSET_PROGRAMMATIC_TOUCH;
                        } else {
                            this._offset = OFFSET_PROGRAMMATIC_NONTOUCH;
                        }
                    }

                    clearTimeout(this._delayTimer);
                    clearTimeout(this._hideDelayTimer);

                    // Set the delay time
                    var delay = this._decideOnDelay(type);
                    if (delay > 0) {
                        var that = this;
                        this._delayTimer = setTimeout(function () {
                            that._showTooltip(type);
                        }, delay);
                    } else {
                        this._showTooltip(type);
                    }
                },

                _onDismiss: function () {
                    // Set the dismiss flag so that we don't miss dismiss events
                    this._shouldDismiss = true;

                    // If the tooltip is already dismissed, ignore the current event
                    if (!this._isShown) {
                        return;
                    }

                    this._isShown = false;

                    // Reset tooltip state
                    this._showTrigger = "mouse";

                    if (this._domElement) {
                        this._raiseEvent("beforeclose");
                        if (this._useAnimation) {
                            animation.fadeOut(this._domElement)
                                .then(this._onHideAnimationEnd.bind(this));
                        } else {
                            this._onHideAnimationEnd();
                        }
                    } else {
                        this._raiseEvent("beforeclose");
                        this._raiseEvent("closed");
                    }
                }
            });
        })
    });

})(this, WinJS);