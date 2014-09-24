// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <dictionary>animatable,appbar,appbars,divs,Flyout,Flyouts,iframe,Statics,unfocus,unselectable</dictionary>
define([
    'exports',
    '../../Core/_Global',
    '../../Core/_WinRT',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Core/_ErrorFromName',
    '../../Core/_Events',
    '../../Core/_Resources',
    '../../Core/_WriteProfilerMark',
    '../../Animations',
    '../../Application',
    '../../ControlProcessor',
    '../../Promise',
    '../../Scheduler',
    '../../Utilities/_Control',
    '../../Utilities/_ElementUtilities',
    '../AppBar/_Constants'
], function overlayInit(exports, _Global, _WinRT, _Base, _BaseUtils, _ErrorFromName, _Events, _Resources, _WriteProfilerMark, Animations, Application, ControlProcessor, Promise, Scheduler, _Control, _ElementUtilities, _Constants) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _Overlay: _Base.Namespace._lazy(function () {

            // Helper for Global Event listeners. Invokes the specified callback member function on each _Overlay in the DOM.
            function _allOverlaysCallback(event, nameOfFunctionCall, stopImmediatePropagationWhenHandled) {
                var elements = _Global.document.querySelectorAll("." + _Constants.overlayClass);
                if (elements) {
                    var len = elements.length;
                    for (var i = 0; i < len; i++) {
                        var element = elements[i];
                        var overlay = element.winControl;
                        if (!overlay._disposed) {
                            if (overlay) {
                                var handled = overlay[nameOfFunctionCall](event);
                                if (stopImmediatePropagationWhenHandled && handled) {
                                    // The caller has indicated we should exit as soon as the event is handled.
                                    return handled;
                                }
                            }
                        }
                    }
                }
            }

            // _Overlay Global Events Listener Class. We hang a singleton instance of this class off of a static _Overlay property.
            var _GlobalListener = _Base.Class.define(function _GlobalListener_ctor() {
                this._currentState = _GlobalListener.states.off;

                this._windowBlur = this._windowBlur.bind(this);
                this._inputPaneShowing = this._inputPaneShowing.bind(this);
                this._inputPaneHiding = this._inputPaneHiding.bind(this);
                this._documentScroll = this._documentScroll.bind(this);
                this._edgyStarting = this._edgyStarting.bind(this);
                this._edgyCompleted = this._edgyCompleted.bind(this);
                this._backClicked = this._backClicked.bind(this);
                this._windowResized = this._windowResized.bind(this);
            }, {
                initialize: function _GlobalListener_initialize() {
                    this._toggleListeners(_GlobalListener.states.on);
                },
                // Expose this for unit tests.
                reset: function _GlobalListener_reset() {
                    this._toggleListeners(_GlobalListener.states.off);
                    this._toggleListeners(_GlobalListener.states.on);
                },
                _windowBlur: function _GlobalListener_windowBlur(event) {
                    // Want to lightdismiss _Overlays on window blur.
                    // We get blur if we click off the window, including into an iframe within our window.
                    // Both blurs call this function, but fortunately document.hasFocus is true if either
                    // the document window or our iframe window has focus.
                    if (!_Global.document.hasFocus()) {
                        // The document doesn't have focus, so they clicked off the app, so light dismiss.
                        _Overlay._lightDismissOverlays(false);
                    } else {
                        if ((_Overlay._clickEatingFlyoutDiv &&
                             _Overlay._clickEatingFlyoutDiv.style.display === "block") ||
                            (_Overlay._clickEatingAppBarDiv &&
                             _Overlay._clickEatingAppBarDiv.style.display === "block")) {
                            // We were trying to unfocus the window, but document still has focus,
                            // so make sure the iframe that took the focus will check for blur next time.
                            // We don't have to do this if the click eating div is hidden because then
                            // there would be no flyout or appbar needing light dismiss.
                            var active = _Global.document.activeElement;
                            if (active && active.tagName === "IFRAME" && !active.msLightDismissBlur) {
                                // - This will go away when the IFRAME goes away, and we only create one.
                                // - This only works in IE because other browsers don't fire focus events on iframe elements.
                                // - Can't use WinJS.Utilities._addEventListener's focusout because it doesn't fire when an
                                //   iframe loses focus due to changing windows.
                                active.addEventListener("blur", this._windowBlur, false);
                                active.msLightDismissBlur = true;
                            }
                        }
                    }
                },
                _inputPaneShowing: function _GlobalListener_inputePaneShowing(event) {
                    _WriteProfilerMark(_GlobalListener.profilerString + "_showingKeyboard,StartTM");
                    _allOverlaysCallback(event, "_showingKeyboard");
                    _WriteProfilerMark(_GlobalListener.profilerString + "_showingKeyboard,StopTM");
                },
                _inputPaneHiding: function _GlobalListener_inputPaneHiding(event) {
                    _WriteProfilerMark(_GlobalListener.profilerString + "_hidingKeyboard,StartTM");
                    _allOverlaysCallback(event, "_hidingKeyboard");
                    _WriteProfilerMark(_GlobalListener.profilerString + "_hidingKeyboard,StopTM");
                },
                _documentScroll: function _GlobalListener_documentScroll(event) {
                    _WriteProfilerMark(_GlobalListener.profilerString + "_checkScrollPosition,StartTM");
                    _allOverlaysCallback(event, "_checkScrollPosition");
                    _WriteProfilerMark(_GlobalListener.profilerString + "_checkScrollPosition,StopTM");
                },
                _edgyStarting: function _GlobalListener_edgyStarting(event) {
                    _Overlay._lightDismissAllFlyouts();
                },
                _edgyCompleted: function _GlobalListener_edgyCompleted(event) {
                    // Right mouse clicks in WWA will trigger the edgy "completed" event.
                    // Flyouts and SettingsFlyouts should not light dismiss if they are the target of that right click.
                    if (!_Overlay._containsRightMouseClick) {
                        _Overlay._lightDismissAllFlyouts();
                    }
                },
                _backClicked: function _GlobalListener_backClicked(event) {
                    _WriteProfilerMark(_GlobalListener.profilerString + "_backClick,StartTM");
                    // Pass true as the 3rd parameter to _allOverlaysCallback to ensure that we stop processing once an _Overlay has handled the event.
                    // A failure to do so can lead to a chain reaction of light dismiss in scenarios where a SettingsFlyout or AppBar had invoked a Flyout or Menu.
                    var handled = _allOverlaysCallback(event, "_backClick", true);
                    _WriteProfilerMark(_GlobalListener.profilerString + "_backClick,StopTM");
                    return handled;
                },
                _windowResized: function _GlobalListener_windowResized(event) {
                    _WriteProfilerMark(_GlobalListener.profilerString + "_baseResize,StartTM");
                    _allOverlaysCallback(event, "_baseResize");
                    _WriteProfilerMark(_GlobalListener.profilerString + "_baseResize,StopTM");
                },
                _toggleListeners: function _GlobalListener_toggleListeners(newState) {
                    // Add/Remove global event listeners for all _Overlays
                    var listenerOperation;
                    if (this._currentState !== newState) {
                        if (newState === _GlobalListener.states.on) {
                            listenerOperation = "addEventListener";
                        } else if (newState === _GlobalListener.states.off) {
                            listenerOperation = "removeEventListener";
                        }

                        // Dismiss on blur & resize
                        // Focus handlers generally use WinJS.Utilities._addEventListener with focusout/focusin. This
                        // uses the browser's blur event directly beacuse _addEventListener doesn't support focusout/focusin
                        // on window.
                        _Global[listenerOperation]("blur", this._windowBlur, false);

                        // Be careful so it behaves in designer as well.
                        if (_WinRT.Windows.UI.Input.EdgeGesture) {
                            // Catch edgy events too
                            var edgy = _WinRT.Windows.UI.Input.EdgeGesture.getForCurrentView();
                            edgy[listenerOperation]("starting", this._edgyStarting);
                            edgy[listenerOperation]("completed", this._edgyCompleted);
                        }

                        if (_WinRT.Windows.UI.ViewManagement.InputPane) {
                            // React to Soft Keyboard events
                            var inputPane = _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView();
                            inputPane[listenerOperation]("showing", this._inputPaneShowing, false);
                            inputPane[listenerOperation]("hiding", this._inputPaneHiding, false);

                            _Global.document[listenerOperation]("scroll", this._documentScroll, false);
                        }

                        // React to Hardware BackButton event
                        Application[listenerOperation]("backclick", this._backClicked, false);

                        // Window resize event
                        _Global.addEventListener("resize", this._windowResized, false);

                        this._currentState = newState;
                    }
                },
            }, {
                // Statics
                profilerString: {
                    get: function () {
                        return "WinJS.UI._Overlay Global Listener:";
                    }
                },
                states: {
                    get: function () {
                        return {
                            off: 0,
                            on: 1,
                        };
                    },
                },
            });

            var createEvent = _Events._createEventProperty;

            // Event Names
            var BEFORESHOW = "beforeshow";
            var AFTERSHOW = "aftershow";
            var BEFOREHIDE = "beforehide";
            var AFTERHIDE = "afterhide";

            // Helper to get DOM elements from input single object or array or IDs/toolkit/dom elements
            function _resolveElements(elements) {
                // No input is just an empty array
                if (!elements) {
                    return [];
                }

                // Make sure it's in array form.
                if (typeof elements === "string" || !elements || !elements.length) {
                    elements = [elements];
                }

                // Make sure we have a DOM element for each one, (could be string id name or toolkit object)
                var i,
                    realElements = [];
                for (i = 0; i < elements.length; i++) {
                    if (elements[i]) {
                        if (typeof elements[i] === "string") {
                            var element = _Global.document.getElementById(elements[i]);
                            if (element) {
                                realElements.push(element);
                            }
                        } else if (elements[i].element) {
                            realElements.push(elements[i].element);
                        } else {
                            realElements.push(elements[i]);
                        }
                    }
                }

                return realElements;
            }

            var strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get mustContainCommands() { return "Invalid HTML: AppBars/Menus must contain only AppBarCommands/MenuCommands"; },
                get closeOverlay() { return _Resources._getWinJSString("ui/closeOverlay").value; },
            };

            var _Overlay = _Base.Class.define(function _Overlay_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI._Overlay">
                /// <summary locid="WinJS.UI._Overlay">
                /// Constructs the Overlay control and associates it with the underlying DOM element.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI._Overlay_p:element">
                /// The DOM element to be associated with the Overlay control.
                /// </param>
                /// <param name="options" type="Object" domElement="false" locid="WinJS.UI._Overlay_p:options">
                /// The set of options to be applied initially to the Overlay control.
                /// </param>
                /// <returns type="WinJS.UI._Overlay" locid="WinJS.UI._Overlay_returnValue">A fully constructed Overlay control.</returns>
                /// </signature>
                this._baseOverlayConstructor(element, options);
            }, {
                // Functions/properties
                _baseOverlayConstructor: function _Overlay_baseOverlayConstructor(element, options) {

                    _Overlay._addMixin();

                    this._disposed = false;

                    // Make sure there's an input element
                    if (!element) {
                        element = _Global.document.createElement("div");
                    }

                    // Check to make sure we weren't duplicated
                    var overlay = element.winControl;
                    if (overlay) {
                        throw new _ErrorFromName("WinJS.UI._Overlay.DuplicateConstruction", strings.duplicateConstruction);
                    }

                    if (!this._element) {
                        this._element = element;
                    }

                    if (!this._element.hasAttribute("tabIndex")) {
                        this._element.tabIndex = -1;
                    }

                    this._sticky = false;
                    this._doNext = "";

                    this._element.style.visibility = "hidden";
                    this._element.style.opacity = 0;

                    // Remember ourselves
                    element.winControl = this;

                    // Attach our css class
                    _ElementUtilities.addClass(this._element, _Constants.overlayClass);
                    _ElementUtilities.addClass(this._element, "win-disposable");

                    // We don't want to be selectable, set UNSELECTABLE
                    var unselectable = this._element.getAttribute("unselectable");
                    if (unselectable === null || unselectable === undefined) {
                        this._element.setAttribute("unselectable", "on");
                    }

                    // Base animation is popIn/popOut
                    this._currentAnimateIn = this._baseAnimateIn;
                    this._currentAnimateOut = this._baseAnimateOut;
                    this._animationPromise = Promise.as();

                    // Command Animations to Queue
                    this._queuedToShow = [];
                    this._queuedToHide = [];
                    this._queuedCommandAnimation = false;

                    if (options) {
                        _Control.setOptions(this, options);
                    }

                    // Make sure _Overlay event handlers are hooked up (this aids light dismiss)
                    _Overlay._globalEventListeners.initialize();
                },

                /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI._Overlay.element" helpKeyword="WinJS.UI._Overlay.element">The DOM element the Overlay is attached to</field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI._Overlay.disabled" helpKeyword="WinJS.UI._Overlay.disabled">Disable an Overlay, setting or getting the HTML disabled attribute.  When disabled the Overlay will no longer display with show(), and will hide if currently visible.</field>
                disabled: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return !!this._element.disabled;
                    },
                    set: function (value) {
                        // Force this check into a boolean because our current state could be a bit confused since we tie to the DOM element
                        value = !!value;
                        var oldValue = !!this._element.disabled;
                        if (oldValue !== value) {
                            this._element.disabled = value;
                            if (!this.hidden && this._element.disabled) {
                                this._hideOrDismiss();
                            }
                        }
                    }
                },

                /// <field type="Function" locid="WinJS.UI._Overlay.onbeforeshow" helpKeyword="WinJS.UI._Overlay.onbeforeshow">
                /// Occurs immediately before the control is shown.
                /// </field>
                onbeforeshow: createEvent(BEFORESHOW),

                /// <field type="Function" locid="WinJS.UI._Overlay.onaftershow" helpKeyword="WinJS.UI._Overlay.onaftershow">
                /// Occurs immediately after the control is shown.
                /// </field>
                onaftershow: createEvent(AFTERSHOW),

                /// <field type="Function" locid="WinJS.UI._Overlay.onbeforehide" helpKeyword="WinJS.UI._Overlay.onbeforehide">
                /// Occurs immediately before the control is hidden.
                /// </field>
                onbeforehide: createEvent(BEFOREHIDE),

                /// <field type="Function" locid="WinJS.UI._Overlay.onafterhide" helpKeyword="WinJS.UI._Overlay.onafterhide">
                /// Occurs immediately after the control is hidden.
                /// </field>
                onafterhide: createEvent(AFTERHIDE),

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.Overlay.dispose">
                    /// <summary locid="WinJS.UI.Overlay.dispose">
                    /// Disposes this Overlay.
                    /// </summary>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }

                    this._disposed = true;
                    this._dispose();
                },

                _dispose: function _Overlay_dispose() {
                    // To be overridden by subclasses
                },

                show: function () {
                    /// <signature helpKeyword="WinJS.UI._Overlay.show">
                    /// <summary locid="WinJS.UI._Overlay.show">
                    /// Shows the Overlay, if hidden, regardless of other state
                    /// </summary>
                    /// </signature>
                    // call private show to distinguish it from public version
                    this._show();
                },

                _show: function _Overlay_show() {
                    // We call our base _baseShow because AppBar may need to override show
                    this._baseShow();
                },

                hide: function () {
                    /// <signature helpKeyword="WinJS.UI._Overlay.hide">
                    /// <summary locid="WinJS.UI._Overlay.hide">
                    /// Hides the Overlay, if visible, regardless of other state
                    /// </summary>
                    /// </signature>
                    // call private hide to distinguish it from public version
                    this._hide();
                },

                _hide: function _Overlay_hide() {
                    // We call our base _baseHide because AppBar may need to override hide
                    this._baseHide();
                },

                // Is the overlay "hidden"?
                /// <field type="Boolean" hidden="true" locid="WinJS.UI._Overlay.hidden" helpKeyword="WinJS.UI._Overlay.hidden">Read only, true if an overlay is currently not visible.</field>
                hidden: {
                    get: function () {
                        return (this._element.style.visibility === "hidden" ||
                                this._element.winAnimating === "hiding" ||
                                this._doNext === "hide");
                    }
                },

                addEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI._Overlay.addEventListener">
                    /// <summary locid="WinJS.UI._Overlay.addEventListener">
                    /// Add an event listener to the DOM element for this Overlay
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI._Overlay.addEventListener_p:type">Required. Event type to add, "beforehide", "afterhide", "beforeshow", or "aftershow"</param>
                    /// <param name="listener" type="Function" locid="WinJS.UI._Overlay.addEventListener_p:listener">Required. The event handler function to associate with this event.</param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI._Overlay.addEventListener_p:useCapture">Optional. True, register for the event capturing phase.  False for the event bubbling phase.</param>
                    /// </signature>
                    return this._element.addEventListener(type, listener, useCapture);
                },

                removeEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI._Overlay.removeEventListener">
                    /// <summary locid="WinJS.UI._Overlay.removeEventListener">
                    /// Remove an event listener to the DOM element for this Overlay
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI._Overlay.removeEventListener_p:type">Required. Event type to remove, "beforehide", "afterhide", "beforeshow", or "aftershow"</param>
                    /// <param name="listener" type="Function" locid="WinJS.UI._Overlay.removeEventListener_p:listener">Required. The event handler function to associate with this event.</param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI._Overlay.removeEventListener_p:useCapture">Optional. True, register for the event capturing phase.  False for the event bubbling phase.</param>
                    /// </signature>
                    return this._element.removeEventListener(type, listener, useCapture);
                },

                _baseShow: function _Overlay_baseShow() {
                    // If we are already animating, just remember this for later
                    if (this._animating || this._needToHandleShowingKeyboard || this._needToHandleHidingKeyboard) {
                        this._doNext = "show";
                        return false;
                    }

                    // Each overlay tracks the size of the <HTML> element for triggering light-dismiss in the window resize handler.
                    this._cachedDocumentSize = this._cachedDocumentSize || _Overlay._sizeOfDocument();

                    // "hiding" would need to cancel.
                    if (this._element.style.visibility !== "visible") {
                        // Let us know we're showing.
                        this._element.winAnimating = "showing";

                        // Hiding, but not none
                        this._element.style.display = "";
                        this._element.style.visibility = "hidden";

                        // In case their event is going to manipulate commands, see if there are
                        // any queued command animations we can handle while we're still hidden.
                        if (this._queuedCommandAnimation) {
                            this._showAndHideFast(this._queuedToShow, this._queuedToHide);
                            this._queuedToShow = [];
                            this._queuedToHide = [];
                        }

                        // Send our "beforeShow" event
                        this._sendEvent(_Overlay.beforeShow);

                        // Need to measure
                        this._findPosition();

                        // Make sure it's visible, and fully opaque.
                        // Do the popup thing, sending event afterward.
                        var that = this;
                        this._animationPromise = this._currentAnimateIn().
                        then(function () {
                            that._baseEndShow();
                        }, function () {
                            that._baseEndShow();
                        });
                        return true;
                    }
                    return false;
                },

                // Flyout in particular will need to measure our positioning.
                _findPosition: function _Overlay_findPosition() {
                },

                _baseEndShow: function _Overlay_baseEndShow() {
                    if (this._disposed) {
                        return;
                    }

                    // Make sure it's visible after showing
                    this._element.setAttribute("aria-hidden", "false");

                    this._element.winAnimating = "";

                    // Do our derived classes show stuff
                    this._endShow();

                    // We're shown now
                    if (this._doNext === "show") {
                        this._doNext = "";
                    }

                    // After showing, send the after showing event
                    this._sendEvent(_Overlay.afterShow);
                    this._writeProfilerMark("show,StopTM"); // Overlay writes the stop profiler mark for all of its derived classes.

                    // If we had something queued, do that
                    Scheduler.schedule(this._checkDoNext, Scheduler.Priority.normal, this, "WinJS.UI._Overlay._checkDoNext");

                },

                _endShow: function _Overlay_endShow() {
                    // Nothing by default
                },

                _baseHide: function _Overlay_baseHide() {
                    // If we are already animating, just remember this for later
                    if (this._animating || this._needToHandleShowingKeyboard) {
                        this._doNext = "hide";
                        return false;
                    }

                    // In the unlikely event we're between the hiding keyboard and the resize events, just snap it away:
                    if (this._needToHandleHidingKeyboard) {
                        // use the "uninitialized" flag
                        this._element.style.visibility = "";
                    }

                    // "showing" would need to queue up.
                    if (this._element.style.visibility !== "hidden") {
                        // Let us know we're hiding, accessibility as well.
                        this._element.winAnimating = "hiding";
                        this._element.setAttribute("aria-hidden", "true");

                        // Send our "beforeHide" event
                        this._sendEvent(_Overlay.beforeHide);

                        // If our visibility is empty, then this is the first time, just hide it
                        if (this._element.style.visibility === "") {
                            // Initial hiding, just hide it
                            this._element.style.opacity = 0;
                            this._baseEndHide();
                        } else {
                            // Make sure it's hidden, and fully transparent.
                            var that = this;
                            this._animationPromise = this._currentAnimateOut().
                            then(function () {
                                that._baseEndHide();
                            }, function () {
                                that._baseEndHide();
                            });
                        }
                        return true;
                    }

                    return false;
                },

                _baseEndHide: function _Overlay_baseEndHide() {
                    if (this._disposed) {
                        return;
                    }

                    // Make sure animation is finished.
                    this._element.style.visibility = "hidden";
                    this._element.style.display = "none";
                    this._element.winAnimating = "";

                    // In case their event is going to manipulate commands, see if there
                    // are any queued command animations we can handle now we're hidden.
                    if (this._queuedCommandAnimation) {
                        this._showAndHideFast(this._queuedToShow, this._queuedToHide);
                        this._queuedToShow = [];
                        this._queuedToHide = [];
                    }

                    // We're hidden now
                    if (this._doNext === "hide") {
                        this._doNext = "";
                    }

                    // After hiding, send our "afterHide" event
                    this._sendEvent(_Overlay.afterHide);
                    this._writeProfilerMark("hide,StopTM"); // Overlay writes the stop profiler mark for all of its derived classes.


                    // If we had something queued, do that.  This has to be after
                    // the afterHide event in case it triggers a show() and they
                    // have something to do in beforeShow that requires afterHide first.
                    Scheduler.schedule(this._checkDoNext, Scheduler.Priority.normal, this, "WinJS.UI._Overlay._checkDoNext");
                },

                _checkDoNext: function _Overlay_checkDoNext() {
                    // Do nothing if we're still animating
                    if (this._animating || this._needToHandleShowingKeyboard || this._needToHandleHidingKeyboard || this._disposed) {
                        return;
                    }

                    if (this._doNext === "hide") {
                        // Do hide first because animating commands would be easier
                        this._hide();
                        this._doNext = "";
                    } else if (this._queuedCommandAnimation) {
                        // Do queued commands before showing if possible
                        this._showAndHideQueue();
                    } else if (this._doNext === "show") {
                        // Show last so that we don't unnecessarily animate commands
                        this._show();
                        this._doNext = "";
                    }
                },

                // Default animations
                _baseAnimateIn: function _Overlay_baseAnimateIn() {
                    this._element.style.opacity = 0;
                    this._element.style.visibility = "visible";
                    // touch opacity so that IE fades from the 0 we just set to 1
                    _Global.getComputedStyle(this._element, null).opacity;
                    return Animations.fadeIn(this._element);
                },

                _baseAnimateOut: function _Overlay_baseAnimateOut() {
                    this._element.style.opacity = 1;
                    // touch opacity so that IE fades from the 1 we just set to 0
                    _Global.getComputedStyle(this._element, null).opacity;
                    return Animations.fadeOut(this._element);
                },

                _animating: {
                    get: function _Overlay_animating_get() {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return !!this._element.winAnimating;
                    }
                },

                // Send one of our events
                _sendEvent: function _Overlay_sendEvent(eventName, detail) {
                    if (this._disposed) {
                        return;
                    }
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initEvent(eventName, true, true, (detail || {}));
                    this._element.dispatchEvent(event);
                },

                // Show commands
                _showCommands: function _Overlay_showCommands(commands, immediate) {
                    var showHide = this._resolveCommands(commands);
                    this._showAndHideCommands(showHide.commands, [], immediate);
                },

                // Hide commands
                _hideCommands: function _Overlay_hideCommands(commands, immediate) {
                    var showHide = this._resolveCommands(commands);
                    this._showAndHideCommands([], showHide.commands, immediate);
                },

                // Hide commands
                _showOnlyCommands: function _Overlay_showOnlyCommands(commands, immediate) {
                    var showHide = this._resolveCommands(commands);
                    this._showAndHideCommands(showHide.commands, showHide.others, immediate);
                },

                _showAndHideCommands: function _Overlay_showAndHideCommands(showCommands, hideCommands, immediate) {
                    // Immediate is "easy"
                    if (immediate || (this.hidden && !this._animating)) {
                        // Immediate mode (not animated)
                        this._showAndHideFast(showCommands, hideCommands);
                        // Need to remove them from queues, but others could be queued
                        this._removeFromQueue(showCommands, this._queuedToShow);
                        this._removeFromQueue(hideCommands, this._queuedToHide);
                    } else {

                        // Queue Commands
                        this._updateAnimateQueue(showCommands, this._queuedToShow, this._queuedToHide);
                        this._updateAnimateQueue(hideCommands, this._queuedToHide, this._queuedToShow);
                    }
                },

                _removeFromQueue: function _Overlay_removeFromQueue(commands, queue) {
                    // remove commands from queue.
                    var count;
                    for (count = 0; count < commands.length; count++) {
                        // Remove if it was in queue
                        var countQ;
                        for (countQ = 0; countQ < queue.length; countQ++) {
                            if (queue[countQ] === commands[count]) {
                                queue.splice(countQ, 1);
                                break;
                            }
                        }
                    }
                },

                _updateAnimateQueue: function _Overlay_updateAnimateQueue(addCommands, toQueue, fromQueue) {
                    if (this._disposed) {
                        return;
                    }

                    // Add addCommands to toQueue and remove addCommands from fromQueue.
                    var count;
                    for (count = 0; count < addCommands.length; count++) {
                        // See if it's already in toQueue
                        var countQ;
                        for (countQ = 0; countQ < toQueue.length; countQ++) {
                            if (toQueue[countQ] === addCommands[count]) {
                                break;
                            }
                        }
                        if (countQ === toQueue.length) {
                            // Not found, add it
                            toQueue[countQ] = addCommands[count];
                        }
                        // Remove if it was in fromQueue
                        for (countQ = 0; countQ < fromQueue.length; countQ++) {
                            if (fromQueue[countQ] === addCommands[count]) {
                                fromQueue.splice(countQ, 1);
                                break;
                            }
                        }
                    }
                    // If we haven't queued the actual animation
                    if (!this._queuedCommandAnimation) {
                        // If not already animating, we'll need to call _checkDoNext
                        if (!this._animating) {
                            Scheduler.schedule(this._checkDoNext, Scheduler.Priority.normal, this, "WinJS.UI._Overlay._checkDoNext");
                        }
                        this._queuedCommandAnimation = true;
                    }
                },

                // show/hide commands without doing any animation.
                _showAndHideFast: function _Overlay_showAndHideFast(showCommands, hideCommands) {
                    var count;
                    var command;
                    for (count = 0; count < showCommands.length; count++) {
                        command = showCommands[count];
                        if (command && command.style) {
                            command.style.visibility = "";
                            command.style.display = "";
                        }
                    }
                    for (count = 0; count < hideCommands.length; count++) {
                        command = hideCommands[count];
                        if (command && command.style) {
                            command.style.visibility = "hidden";
                            command.style.display = "none";
                        }
                    }

                    this._commandsUpdated();

                },

                // show and hide the queued commands, perhaps animating if overlay isn't hidden.
                _showAndHideQueue: function _Overlay_showAndHideQueue() {
                    // Only called if not currently animating.
                    // We'll be done with the queued stuff when we return.
                    this._queuedCommandAnimation = false;

                    // Shortcut if hidden
                    if (this.hidden) {
                        this._showAndHideFast(this._queuedToShow, this._queuedToHide);
                        // Might be something else to do
                        Scheduler.schedule(this._checkDoNext, Scheduler.Priority.normal, this, "WinJS.UI._Overlay._checkDoNext");
                    } else {
                        // Animation has 3 parts:  "hiding", "showing", and "moving"
                        // PVL has "addToList" and "deleteFromList", both of which allow moving parts.
                        // So we'll set up "add" for showing, and use "delete" for "hiding" + moving,
                        // then trigger both at the same time.
                        var showCommands = this._queuedToShow;
                        var hideCommands = this._queuedToHide;
                        var siblings = this._findSiblings(showCommands.concat(hideCommands));

                        // Filter out the commands queued for animation that don't need to be animated.
                        var count;
                        for (count = 0; count < showCommands.length; count++) {
                            // If this one's not real or not attached, skip it
                            if (!showCommands[count] ||
                                !showCommands[count].style ||
                                !_Global.document.body.contains(showCommands[count])) {
                                // Not real, skip it
                                showCommands.splice(count, 1);
                                count--;
                            } else if (showCommands[count].style.visibility !== "hidden" && showCommands[count].style.opacity !== "0") {
                                // Don't need to animate showing this one, already visible, so now it's a sibling
                                siblings.push(showCommands[count]);
                                showCommands.splice(count, 1);
                                count--;
                            }
                        }
                        for (count = 0; count < hideCommands.length; count++) {
                            // If this one's not real or not attached, skip it
                            if (!hideCommands[count] ||
                                !hideCommands[count].style ||
                                !_Global.document.body.contains(hideCommands[count]) ||
                                hideCommands[count].style.visibility === "hidden" ||
                                hideCommands[count].style.opacity === "0") {
                                // Don't need to animate hiding this one, not real, or it's hidden,
                                // so don't even need it as a sibling.
                                hideCommands.splice(count, 1);
                                count--;
                            }
                        }

                        // Start command animations.
                        var commandsAnimationPromise = this._baseBeginAnimateCommands(showCommands, hideCommands, siblings);

                        // Hook end animations
                        var that = this;
                        if (commandsAnimationPromise) {
                            // Needed to animate
                            commandsAnimationPromise.done(
                                function () { that._baseEndAnimateCommands(hideCommands); },
                                function () { that._baseEndAnimateCommands(hideCommands); }
                                );
                        } else {
                            // Already positioned correctly
                            Scheduler.schedule(function Overlay_async_baseEndAnimationCommands() { that._baseEndAnimateCommands([]); },
                                Scheduler.Priority.normal, null,
                                "WinJS.UI._Overlay._endAnimateCommandsWithoutAnimation");
                        }
                    }

                    // Done, clear queues
                    this._queuedToShow = [];
                    this._queuedToHide = [];
                },

                _baseBeginAnimateCommands: function _Overlay_baseBeginAnimateCommands(showCommands, hideCommands, siblings) {
                    // The parameters are 3 mutually exclusive arrays of win-command elements contained in this Overlay.
                    // 1) showCommands[]: All of the HIDDEN win-command elements that ARE scheduled to show.
                    // 2) hideCommands[]: All of the VISIBLE win-command elements that ARE shceduled to hide.
                    // 3) siblings[]: i. All VISIBLE win-command elements that ARE NOT scheduled to hide.
                    //               ii. All HIDDEN win-command elements that ARE NOT scheduled to hide OR show.
                    this._beginAnimateCommands(showCommands, hideCommands, this._getVisibleCommands(siblings));

                    var showAnimated = null,
                        hideAnimated = null;

                    // Hide commands first, with siblings if necessary,
                    // so that the showing commands don't disrupt the hiding commands position.
                    if (hideCommands.length > 0) {
                        hideAnimated = Animations.createDeleteFromListAnimation(hideCommands, showCommands.length === 0 ? siblings : undefined);
                    }
                    if (showCommands.length > 0) {
                        showAnimated = Animations.createAddToListAnimation(showCommands, siblings);
                    }

                    // Update hiding commands
                    for (var count = 0, len = hideCommands.length; count < len; count++) {
                        // Need to fix our position
                        var rectangle = hideCommands[count].getBoundingClientRect(),
                            style = _Global.getComputedStyle(hideCommands[count]);

                        // Use the bounding box, adjusting for margins
                        hideCommands[count].style.top = (rectangle.top - parseFloat(style.marginTop)) + "px";
                        hideCommands[count].style.left = (rectangle.left - parseFloat(style.marginLeft)) + "px";
                        hideCommands[count].style.opacity = 0;
                        hideCommands[count].style.position = "fixed";
                    }

                    // Mark as animating
                    this._element.winAnimating = "rearranging";

                    // Start hiding animations
                    // Hide needs extra cleanup when done
                    var promise = null;
                    if (hideAnimated) {
                        promise = hideAnimated.execute();
                    }

                    // Update showing commands,
                    // After hiding commands so that the hiding ones fade in the right place.
                    for (count = 0; count < showCommands.length; count++) {
                        showCommands[count].style.visibility = "";
                        showCommands[count].style.display = "";
                        showCommands[count].style.opacity = 1;
                    }

                    // Start showing animations
                    if (showAnimated) {
                        var newPromise = showAnimated.execute();
                        if (promise) {
                            promise = Promise.join([promise, newPromise]);
                        } else {
                            promise = newPromise;
                        }
                    }

                    return promise;
                },

                _beginAnimateCommands: function _Overlay_beginAnimateCommands() {
                    // Nothing by default
                },

                _getVisibleCommands: function _Overlay_getVisibleCommands(commandSubSet) {
                    var command,
                        commands = commandSubSet,
                        visibleCommands = [];

                    if (!commands) {
                        // Crawl the inner HTML for the commands.
                        commands = this.element.querySelectorAll(".win-command");
                    }

                    for (var i = 0, len = commands.length; i < len; i++) {
                        command = commands[i].winControl || commands[i];
                        if (!command.hidden) {
                            visibleCommands.push(command);
                        }
                    }

                    return visibleCommands;
                },

                // Once animation is complete, ensure that the commands are display:none
                // and check if there's another animation to start.
                _baseEndAnimateCommands: function _Overlay_baseEndAnimateCommands(hideCommands) {
                    if (this._disposed) {
                        return;
                    }

                    // Update us
                    var count;
                    for (count = 0; count < hideCommands.length; count++) {
                        // Force us back into our appbar so that we can show again correctly
                        hideCommands[count].style.position = "";
                        hideCommands[count].getBoundingClientRect();
                        // Now make us really hidden
                        hideCommands[count].style.visibility = "hidden";
                        hideCommands[count].style.display = "none";
                        hideCommands[count].style.opacity = 1;
                    }
                    // Done animating
                    this._element.winAnimating = "";

                    this._endAnimateCommands();

                    // Might be something else to do
                    this._checkDoNext();
                },

                _endAnimateCommands: function _Overlay_endAnimateCommands() {
                    // Nothing by default
                },

                // Resolves our commands
                _resolveCommands: function _Overlay_resolveCommands(commands) {
                    // First make sure they're all DOM elements.
                    commands = _resolveElements(commands);

                    // Now make sure they're all in this container
                    var result = {};
                    result.commands = [];
                    result.others = [];
                    var allCommands = this.element.querySelectorAll(".win-command");
                    var countAll, countIn;
                    for (countAll = 0; countAll < allCommands.length; countAll++) {
                        var found = false;
                        for (countIn = 0; countIn < commands.length; countIn++) {
                            if (commands[countIn] === allCommands[countAll]) {
                                result.commands.push(allCommands[countAll]);
                                commands.splice(countIn, 1);
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            result.others.push(allCommands[countAll]);
                        }
                    }
                    return result;
                },

                // Find siblings, all DOM elements now.
                // Returns all .win-commands in this Overlay that are NOT in the passed in 'commands' array.
                _findSiblings: function _Overlay_findSiblings(commands) {
                    // Now make sure they're all in this container
                    var siblings = [];
                    var allCommands = this.element.querySelectorAll(".win-command");
                    var countAll, countIn;
                    for (countAll = 0; countAll < allCommands.length; countAll++) {
                        var found = false;
                        for (countIn = 0; countIn < commands.length; countIn++) {
                            if (commands[countIn] === allCommands[countAll]) {
                                commands.splice(countIn, 1);
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            siblings.push(allCommands[countAll]);
                        }
                    }
                    return siblings;
                },

                _baseResize: function _Overlay_baseResize(event) {
                    // Avoid the cost of a resize if the Overlay is hidden.
                    if (this._cachedDocumentSize) {
                        if (this.hidden) {
                            this._cachedDocumentSize = null;
                        } else {
                            // Overlays will light dismiss on <HTML> resize.
                            var newDocSize = _Overlay._sizeOfDocument();
                            if (this._cachedDocumentSize.width !== newDocSize.width || this._cachedDocumentSize.height !== newDocSize.height) {
                                this._cachedDocumentSize = newDocSize;
                                if (!this._sticky) {
                                    this._hideOrDismiss();
                                }
                            }
                        }
                    }

                    // Call specific resize
                    this._resize(event);
                },

                _isLightDismissible: function _Overlay_isLightDismissible() {
                    return (!this._sticky && !this.hidden);
                },

                _lightDismiss: function _Overlay_lightDismiss(keyboardInvoked) {
                    if (this._isLightDismissible()) {
                        _Overlay._lightDismissOverlays(keyboardInvoked);
                    }
                },

                _backClick: function _Overlay_backClick() {
                    if (this._element.contains(_Global.document.activeElement) && this._isLightDismissible()) {
                        this._lightDismiss(false); //  dismiss this transient UI control.
                        return true; // indicate that we've handled the event to cancel its propagation.
                    }
                },

                _hideOrDismiss: function _Overlay_hideOrDismiss() {
                    var element = this._element;
                    if (element && _ElementUtilities.hasClass(element, _Constants.settingsFlyoutClass)) {
                        this._dismiss();
                    } else {
                        this.hide();
                    }
                },

                _resize: function _Overlay_resize() {
                    // Nothing by default
                },

                _commandsUpdated: function _Overlay_commandsUpdated() {
                    // Nothing by default
                },

                _checkScrollPosition: function _Overlay_checkScrollPosition() {
                    // Nothing by default
                },

                _showingKeyboard: function _Overlay_showingKeyboard() {
                    // Nothing by default
                },

                _hidingKeyboard: function _Overlay_hidingKeyboard() {
                    // Nothing by default
                },

                // Verify that this HTML AppBar only has AppBar/MenuCommands.
                _verifyCommandsOnly: function _Overlay_verifyCommandsOnly(element, type) {
                    var children = element.children;
                    var commands = new Array(children.length);
                    for (var i = 0; i < children.length; i++) {
                        // If constructed they have win-command class, otherwise they have data-win-control
                        if (!_ElementUtilities.hasClass(children[i], "win-command") &&
                        children[i].getAttribute("data-win-control") !== type) {
                            // Wasn't tagged with class or AppBar/MenuCommand, not an AppBar/MenuCommand
                            throw new _ErrorFromName("WinJS.UI._Overlay.MustContainCommands", strings.mustContainCommands);
                        } else {
                            // Instantiate the commands.
                            ControlProcessor.processAll(children[i]);
                            commands[i] = children[i].winControl;
                        }
                    }
                    return commands;
                },

                // Sets focus on what we think is the last tab stop. If nothing is focusable will
                // try to set focus on itself.
                _focusOnLastFocusableElementOrThis: function _Overlay_focusOnLastFocusableElementOrThis() {
                    if (!this._focusOnLastFocusableElement()) {
                        // Nothing is focusable.  Set focus to this.
                        _Overlay._trySetActive(this._element);
                    }
                },

                // Sets focus to what we think is the last tab stop. This element must have
                // a firstDiv with tabIndex equal to the lowest tabIndex in the element
                // and a finalDiv with tabIndex equal to the highest tabIndex in the element.
                // Also the firstDiv must be its first child and finalDiv be its last child.
                // Returns true if successful, false otherwise.
                _focusOnLastFocusableElement: function _Overlay_focusOnLastFocusableElement() {
                    if (this._element.firstElementChild) {
                        var oldFirstTabIndex = this._element.firstElementChild.tabIndex;
                        var oldLastTabIndex = this._element.lastElementChild.tabIndex;
                        this._element.firstElementChild.tabIndex = -1;
                        this._element.lastElementChild.tabIndex = -1;

                        var tabResult = _ElementUtilities._focusLastFocusableElement(this._element);

                        if (tabResult) {
                            _Overlay._trySelect(_Global.document.activeElement);
                        }

                        this._element.firstElementChild.tabIndex = oldFirstTabIndex;
                        this._element.lastElementChild.tabIndex = oldLastTabIndex;

                        return tabResult;
                    } else {
                        return false;
                    }
                },


                // Sets focus on what we think is the first tab stop. If nothing is focusable will
                // try to set focus on itself.
                _focusOnFirstFocusableElementOrThis: function _Overlay_focusOnFirstFocusableElementOrThis() {
                    if (!this._focusOnFirstFocusableElement()) {
                        // Nothing is focusable.  Set focus to this.
                        _Overlay._trySetActive(this._element);
                    }
                },

                // Sets focus to what we think is the first tab stop. This element must have
                // a firstDiv with tabIndex equal to the lowest tabIndex in the element
                // and a finalDiv with tabIndex equal to the highest tabIndex in the element.
                // Also the firstDiv must be its first child and finalDiv be its last child.
                // Returns true if successful, false otherwise.
                _focusOnFirstFocusableElement: function _Overlay__focusOnFirstFocusableElement() {
                    if (this._element.firstElementChild) {
                        var oldFirstTabIndex = this._element.firstElementChild.tabIndex;
                        var oldLastTabIndex = this._element.lastElementChild.tabIndex;
                        this._element.firstElementChild.tabIndex = -1;
                        this._element.lastElementChild.tabIndex = -1;

                        var tabResult = _ElementUtilities._focusFirstFocusableElement(this._element);

                        if (tabResult) {
                            _Overlay._trySelect(_Global.document.activeElement);
                        }

                        this._element.firstElementChild.tabIndex = oldFirstTabIndex;
                        this._element.lastElementChild.tabIndex = oldLastTabIndex;

                        return tabResult;
                    } else {
                        return false;
                    }
                },

                _handleOverlayEventsForFlyoutOrSettingsFlyout: function _Overlay_handleOverlayEventsForFlyoutOrSettingsFlyout() {
                    var that = this;
                    // Need to hide ourselves if we lose focus
                    _ElementUtilities._addEventListener(this._element, "focusout", function (e) { _Overlay._hideIfLostFocus(that, e); }, false);

                    // Need to handle right clicks that trigger edgy events in WWA
                    _ElementUtilities._addEventListener(this._element, "pointerdown", _Overlay._checkRightClickDown, true);
                    _ElementUtilities._addEventListener(this._element, "pointerup", _Overlay._checkRightClickUp, true);
                },

                _writeProfilerMark: function _Overlay_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI._Overlay:" + this._id + ":" + text);
                }
            },
            {
                // Statics
                _clickEatingAppBarDiv: false,
                _clickEatingFlyoutDiv: false,

                _lightDismissFlyouts: function _Overlay_lightDismissFlyouts() {
                    _Overlay._hideClickEatingDivFlyout();
                    var elements = _Global.document.body.querySelectorAll("." + _Constants.flyoutClass);
                    var len = elements.length;
                    for (var i = 0; i < len; i++) {
                        var element = elements[i];
                        if (element.style.visibility !== "hidden") {
                            var flyout = element.winControl;
                            if (flyout && (!flyout._sticky)) {
                                flyout._hideOrDismiss();
                            }
                        }
                    }
                },

                _lightDismissSettingsFlyouts: function _Overlay_lightDismissSettingsFlyouts() {
                    var elements = _Global.document.body.querySelectorAll("." + _Constants.settingsFlyoutClass);
                    var len = elements.length;
                    for (var i = 0; i < len; i++) {
                        var element = elements[i];
                        if (element.style.visibility !== "hidden") {
                            var settingsFlyout = element.winControl;
                            if (settingsFlyout && (!settingsFlyout._sticky)) {
                                settingsFlyout._hideOrDismiss();
                            }
                        }
                    }
                },

                _lightDismissAllFlyouts: function _Overlay_lightDismissAllFlyouts() {
                    _Overlay._lightDismissFlyouts();
                    _Overlay._lightDismissSettingsFlyouts();
                },

                _lightDismissOverlays: function _Overlay_lightDismissOverlays(keyBoardInvoked) {
                    // Light Dismiss All _Overlays
                    _Overlay._lightDismissAppBars(keyBoardInvoked);
                    _Overlay._lightDismissAllFlyouts();
                },

                _lightDismissAppBars: function _Overlay_lightDismissAppBars(keyboardInvoked) {
                    var elements = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                    var len = elements.length;
                    var appBars = [];
                    for (var i = 0; i < len; i++) {
                        var appBar = elements[i].winControl;
                        if (appBar && !appBar.sticky && !appBar.hidden) {
                            appBars.push(appBar);
                        }
                    }

                    _Overlay._hideAppBars(appBars, keyboardInvoked);
                    _Overlay._hideClickEatingDivAppBar();
                },

                _createClickEatingDivTemplate: function (divClass, hideClickEatingDivFunction) {
                    var clickEatingDiv = _Global.document.createElement("section");
                    clickEatingDiv._winHideClickEater = hideClickEatingDivFunction;
                    _ElementUtilities.addClass(clickEatingDiv, divClass);
                    _ElementUtilities._addEventListener(clickEatingDiv, "pointerup", function (event) { _Overlay._checkSameClickEatingPointerUp(event, true); }, true);
                    _ElementUtilities._addEventListener(clickEatingDiv, "pointerdown", function (event) { _Overlay._checkClickEatingPointerDown(event, true); }, true);
                    clickEatingDiv.addEventListener("click", function (event) { clickEatingDiv._winHideClickEater(event); }, true);
                    // Tell Aria that it's clickable
                    clickEatingDiv.setAttribute("role", "menuitem");
                    clickEatingDiv.setAttribute("aria-label", strings.closeOverlay);
                    // Prevent CED from removing any current selection
                    clickEatingDiv.setAttribute("unselectable", "on");
                    _Global.document.body.appendChild(clickEatingDiv);
                    return clickEatingDiv;
                },

                // Used by AppBar, and Settings Pane
                _createClickEatingDivAppBar: function () {
                    if (!_Overlay._clickEatingAppBarDiv) {
                        _Overlay._clickEatingAppBarDiv = _Overlay._createClickEatingDivTemplate(_Constants._clickEatingAppBarClass, _Overlay._handleAppBarClickEatingClick);
                    }
                },

                // Used by Flyout and Menu
                _createClickEatingDivFlyout: function () {
                    if (!_Overlay._clickEatingFlyoutDiv) {
                        _Overlay._clickEatingFlyoutDiv = _Overlay._createClickEatingDivTemplate(_Constants._clickEatingFlyoutClass, _Overlay._handleFlyoutClickEatingClick);
                    }
                },

                // All click-eaters eat "down" clicks so that we can still eat
                // the "up" click that'll come later.
                _checkClickEatingPointerDown: function (event, stopPropagation) {
                    var target = event.currentTarget;
                    if (target) {
                        try {
                            // Remember pointer id and remember right mouse
                            target._winPointerId = event.pointerId;
                            // Cache right mouse if that was what happened
                            target._winRightMouse = (event.button === 2);
                        } catch (e) { }
                    }

                    if (stopPropagation && !target._winRightMouse) {
                        event.stopPropagation();
                        event.preventDefault();
                    }
                },

                // Make sure that if we have an up we had an earlier down of the same kind
                _checkSameClickEatingPointerUp: function (event, stopPropagation) {
                    var result = false,
                        rightMouse = false,
                        target = event.currentTarget;

                    // Same pointer we were watching?
                    try {
                        if (target && target._winPointerId === event.pointerId) {
                            // Same pointer
                            result = true;
                            rightMouse = target._winRightMouse;
                            // For click-eaters, don't count right click the same because edgy will dismiss
                            if (rightMouse && stopPropagation) {
                                result = false;
                            }
                        }
                    } catch (e) { }

                    if (stopPropagation && !rightMouse) {
                        event.stopPropagation();
                        event.preventDefault();
                        target._winHideClickEater(event);
                    }

                    return result;
                },

                // If they click on a click eating div, even with a right click,
                // touch or anything, then we want to light dismiss that layer.
                _handleAppBarClickEatingClick: function _Overlay_handleAppBarClickEatingClick(event) {
                    event.stopPropagation();
                    event.preventDefault();

                    // Light Dismiss everything.
                    _Overlay._lightDismissOverlays(false);
                },

                // If they click on a click eating div, even with a right click,
                // touch or anything, then we want to light dismiss that layer.
                _handleFlyoutClickEatingClick: function _Overlay__handleFlyoutClickEatingClick(event) {
                    event.stopPropagation();
                    event.preventDefault();

                    // Don't light dismiss AppBars because edgy will do that as needed,
                    // so flyouts only.
                    _Overlay._lightDismissFlyouts();
                },

                _checkRightClickDown: function (event) {
                    _Overlay._checkClickEatingPointerDown(event, false);
                },

                _checkRightClickUp: function (event) {
                    if (_Overlay._checkSameClickEatingPointerUp(event, false)) {
                        // Right clicks will trigger the edgy 'completed' event in WWA.
                        // Set a flag now and and process it later in our edgy event handler.
                        _Overlay._containsRightMouseClick = true;
                        _BaseUtils._yieldForEvents(function () { _Overlay._containsRightMouseClick = false; });
                    }
                },

                _showClickEatingDivAppBar: function () {
                    Scheduler.schedule(function Overlay_async_showClickEatingDivAppBar() {
                        if (_Overlay._clickEatingAppBarDiv) {
                            _Overlay._clickEatingAppBarDiv.style.display = "block";
                        }
                    }, Scheduler.Priority.high, null, "WinJS.UI._Overlay._showClickEatingDivAppBar");
                },

                _hideClickEatingDivAppBar: function () {
                    Scheduler.schedule(function Overlay_async_hideClickEatingDivAppBar() {
                        if (_Overlay._clickEatingAppBarDiv) {
                            _Overlay._clickEatingAppBarDiv.style.display = "none";
                        }
                    }, Scheduler.Priority.high, null, "WinJS.UI._Overlay._hideClickEatingDivAppBar");
                },

                _showClickEatingDivFlyout: function () {
                    Scheduler.schedule(function Overlay_async_showClickEatingDivFlyout() {
                        if (_Overlay._clickEatingFlyoutDiv) {
                            _Overlay._clickEatingFlyoutDiv.style.display = "block";
                        }
                    }, Scheduler.Priority.high, null, "WinJS.UI._Overlay._showClickEatingDivFlyout");
                },

                _hideClickEatingDivFlyout: function () {
                    Scheduler.schedule(function Overlay_async_hideClickEatingDivFlyout() {
                        if (_Overlay._clickEatingFlyoutDiv) {
                            _Overlay._clickEatingFlyoutDiv.style.display = "none";
                        }
                    }, Scheduler.Priority.high, null, "WinJS.UI._Overlay._hideClickEatingDivFlyout");
                },

                _isFlyoutVisible: function () {
                    if (!_Overlay._clickEatingFlyoutDiv) {
                        return false;
                    }
                    return (_Overlay._clickEatingFlyoutDiv.style.display === "block");
                },

                _hideIfLostFocus: function (overlay) {
                    // If we're still showing we haven't really lost focus
                    if (overlay.hidden || overlay.element.winAnimating === "showing" || overlay._sticky) {
                        return;
                    }
                    // If the active thing is within our element, we haven't lost focus
                    var active = _Global.document.activeElement;
                    if (overlay._element && overlay._element.contains(active)) {
                        return;
                    }
                    // SettingFlyouts don't dismiss if they spawned a flyout
                    if (_ElementUtilities.hasClass(overlay._element, _Constants.settingsFlyoutClass)) {
                        var settingsFlyout = overlay;
                        var flyoutControl = _Overlay._getParentControlUsingClassName(active, "win-flyout");
                        if (flyoutControl && flyoutControl._previousFocus && settingsFlyout.element.contains(flyoutControl._previousFocus)) {
                            _ElementUtilities._addEventListener(flyoutControl.element, 'focusout', function focusOut(event) {
                                // When the Flyout closes, hide the SetingsFlyout if it didn't regain focus.
                                _Overlay._hideIfLostFocus(settingsFlyout, event);
                                _ElementUtilities._removeEventListener(flyoutControl.element, 'focusout', focusOut, false);
                            }, false);
                            return;
                        }
                    }
                    // Do not hide focus if focus moved to a CED. Let the click handler on the CED take care of hiding us.
                    if (active &&
                            (_ElementUtilities.hasClass(active, _Constants._clickEatingFlyoutClass) ||
                             _ElementUtilities.hasClass(active, _Constants._clickEatingAppBarClass))) {
                        return;
                    }

                    overlay._hideOrDismiss();
                },

                // Try to set us as active
                _trySetActive: function (element) {
                    if (!element || !_Global.document.body || !_Global.document.body.contains(element)) {
                        return false;
                    }
                    if (!_ElementUtilities._setActive(element)) {
                        return false;
                    }
                    return (element === _Global.document.activeElement);
                },

                // Try to select the text so keyboard can be used.
                _trySelect: function (element) {
                    try {
                        if (element && element.select) {
                            element.select();
                        }
                    } catch (e) { }
                },

                // Prevent the document.activeElement from showing focus
                _addHideFocusClass: function (element) {
                    if (element) {
                        _ElementUtilities.addClass(element, _Constants.hideFocusClass);
                        _ElementUtilities._addEventListener(element, "focusout", _Overlay._removeHideFocusClass, false);
                    }
                },

                // Allow the event.target (element that is losing focus) to show focus next time it gains focus
                _removeHideFocusClass: function (event) {
                    // Make sure we really lost focus and was not just an App switch
                    var target = event.target;
                    if (target && target !== _Global.document.activeElement) {
                        _ElementUtilities.removeClass(target, _Constants.hideFocusClass);
                        _ElementUtilities._removeEventListener(event.target, "focusout", _Overlay._removeHideFocusClass, false);
                    }
                },

                _sizeOfDocument: function () {
                    return {
                        width: _Global.document.documentElement.offsetWidth,
                        height: _Global.document.documentElement.offsetHeight,
                    };
                },

                _getParentControlUsingClassName: function (element, className) {
                    while (element && element !== _Global.document.body) {
                        if (_ElementUtilities.hasClass(element, className)) {
                            return element.winControl;
                        }
                        element = element.parentNode;
                    }
                    return null;
                },

                // Static controller for _Overlay global events registering/unregistering.
                _globalEventListeners: new _GlobalListener(),

                // Hide all light dismiss AppBars if what has focus is not part of a AppBar or flyout.
                _hideIfAllAppBarsLostFocus: function _Overlay_hideIfAllAppBarsLostFocus() {
                    if (!_Overlay._isAppBarOrChild(_Global.document.activeElement)) {
                        _Overlay._lightDismissAppBars(false);
                        // Ensure that sticky appbars clear cached focus after light dismiss are dismissed, which moved focus.
                        _Overlay._ElementWithFocusPreviousToAppBar = null;
                    }
                },

                // Show/Hide all bars
                _hideAppBars: function _Overlay_hideAppBars(bars, keyboardInvoked) {
                    var allBarsAnimationPromises = bars.map(function (bar) {
                        bar._keyboardInvoked = keyboardInvoked;
                        bar.hide();
                        return bar._animationPromise;
                    });
                    return Promise.join(allBarsAnimationPromises);
                },

                _showAppBars: function _Overlay_showAppBars(bars, keyboardInvoked) {
                    var allBarsAnimationPromises = bars.map(function (bar) {
                        bar._keyboardInvoked = keyboardInvoked;
                        bar._doNotFocus = false;
                        bar._show();
                        return bar._animationPromise;
                    });
                    return Promise.join(allBarsAnimationPromises);
                },

                // Returns appbar element (or CED/sentinal) if the element or what had focus before the element (if a Flyout) is either:
                //   1) an AppBar,
                //   2) OR in the subtree of an AppBar,
                //   3) OR an AppBar click eating div.
                // Returns null otherwise.
                _isAppBarOrChild: function (element) {
                    // If it's null, we can't do this
                    if (!element) {
                        return null;
                    }

                    // Intrinsic components of the AppBar count as the AppBar
                    if (_ElementUtilities.hasClass(element, _Constants._clickEatingAppBarClass) ||
                        _ElementUtilities.hasClass(element, _Constants._clickEatingFlyoutClass) ||
                        _ElementUtilities.hasClass(element, _Constants.firstDivClass) ||
                        _ElementUtilities.hasClass(element, _Constants.finalDivClass) ||
                        _ElementUtilities.hasClass(element, _Constants.invokeButtonClass)) {
                        return element;
                    }

                    while (element && element !== _Global.document) {
                        if (_ElementUtilities.hasClass(element, _Constants.appBarClass)) {
                            return element;
                        }
                        if (_ElementUtilities.hasClass(element, "win-flyout")
                         && element !== element.winControl._previousFocus) {
                            var flyoutControl = element.winControl;
                            // If _previousFocus was in a light dismissible AppBar, then this Flyout is considered of an extension of it and that AppBar should not hide.
                            // Hook up a 'focusout' listener to this Flyout element to make sure that light dismiss AppBars hide if focus moves anywhere other than back to an AppBar.
                            var appBarElement = _Overlay._isAppBarOrChild(flyoutControl._previousFocus);
                            if (appBarElement) {
                                _ElementUtilities._addEventListener(flyoutControl.element, 'focusout', function focusOut() {
                                    // Hides any shown AppBars if the new activeElement is not in an AppBar.
                                    _Overlay._hideIfAllAppBarsLostFocus();
                                    _ElementUtilities._removeEventListener(flyoutControl.element, 'focusout', focusOut, false);
                                }, false);
                            }
                            return appBarElement;
                        }

                        element = element.parentNode;
                    }

                    return null;
                },

                // WWA Soft Keyboard offsets
                _keyboardInfo: {
                    // Determine if the keyboard is visible or not.
                    get _visible() {

                        try {
                            return (
                                _WinRT.Windows.UI.ViewManagement.InputPane &&
                                _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView().occludedRect.height > 0
                            );
                        } catch (e) {
                            return false;
                        }

                    },

                    // See if we have to reserve extra space for the IHM
                    get _extraOccluded() {
                        var occluded;
                        if (_WinRT.Windows.UI.ViewManagement.InputPane) {
                            try {
                                occluded = _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView().occludedRect.height;
                            } catch (e) {
                            }
                        }

                        // Nothing occluded if not visible.
                        if (occluded && !_Overlay._keyboardInfo._isResized) {
                            // View hasn't been resized, need to return occluded height.
                            return occluded;
                        }

                        // View already has space for keyboard or there's no keyboard
                        return 0;

                    },

                    // See if the view has been resized to fit a keyboard
                    get _isResized() {
                        // Compare ratios.  Very different includes IHM space.
                        var heightRatio = _Global.document.documentElement.clientHeight / _Global.innerHeight,
                            widthRatio = _Global.document.documentElement.clientWidth / _Global.innerWidth;

                        // If they're nearly identical, then the view hasn't been resized for the IHM
                        // Only check one bound because we know the IHM will make it shorter, not skinnier.
                        return (widthRatio / heightRatio < 0.99);

                    },

                    // Get the bottom of our visible area.
                    get _visibleDocBottom() {
                        return _Overlay._keyboardInfo._visibleDocTop + _Overlay._keyboardInfo._visibleDocHeight;

                    },

                    // Get the height of the visible document, e.g. the height of the visual viewport minus any IHM occlusion.
                    get _visibleDocHeight() {
                        return _Overlay._keyboardInfo._visualViewportHeight - _Overlay._keyboardInfo._extraOccluded;

                    },

                    // Get total length of the IHM showPanel animation
                    get _animationShowLength() {
                        if (_WinRT.Windows.UI.Core.AnimationMetrics) {
                            var a = _WinRT.Windows.UI.Core.AnimationMetrics,
                            animationDescription = new a.AnimationDescription(a.AnimationEffect.showPanel, a.AnimationEffectTarget.primary);
                            var animations = animationDescription.animations;
                            var max = 0;
                            for (var i = 0; i < animations.size; i++) {
                                var animation = animations[i];
                                max = Math.max(max, animation.delay + animation.duration);
                            }
                            return max;
                        } else {
                            return 0;
                        }
                    },
                },

                _ElementWithFocusPreviousToAppBar: null,

                // for tests
                _clickEatingAppBarClass: _Constants._clickEatingAppBarClass,
                _clickEatingFlyoutClass: _Constants._clickEatingFlyoutClass,

                // Padding for IHM timer to allow for first scroll event
                _scrollTimeout: 150,

                // Events
                beforeShow: BEFORESHOW,
                beforeHide: BEFOREHIDE,
                afterShow: AFTERSHOW,
                afterHide: AFTERHIDE,

                commonstrings: {
                    get cannotChangeCommandsWhenVisible() { return "Invalid argument: You must call hide() before changing {0} commands"; },
                    get cannotChangeHiddenProperty() { return "Unable to set hidden property while parent {0} is visible."; }
                },

                _addMixin: function () {
                    if (_Overlay._keyboardInfo._visibleDocTop === undefined) {


                        // Mixin for WWA's Soft Keyboard offsets when -ms-device-fixed CSS positioning is supported, or for general _Overlay positioning whenever we are in a web browser outside of WWA.
                        // If we are in an instance of WWA, all _Overlay elements will use -ms-device-fixed positioning which fixes them to the visual viewport directly.
                        var _keyboardInfo_Mixin = {

                            // Get the top offset of our visible area, aka the top of the visual viewport.
                            // This is always 0 when _Overlay elements use -ms-device-fixed positioning.
                            _visibleDocTop: function _visibleDocTop() {
                                return 0;
                            },

                            // Get the bottom offset of the visual viewport, plus any IHM occlusion.
                            _visibleDocBottomOffset: function _visibleDocBottomOffset() {
                                // For -ms-device-fixed positioned elements, the bottom is just 0 when there's no IHM.
                                // When the IHM appears, the text input that invoked it may be in a position on the page that is occluded by the IHM.
                                // In that instance, the default browser behavior is to resize the visual viewport and scroll the input back into view.
                                // However, if the viewport resize is prevented by an IHM event listener, the keyboard will still occlude
                                // -ms-device-fixed elements, so we adjust the bottom offset of the appbar by the height of the occluded rect of the IHM.
                                return (_Overlay._keyboardInfo._isResized) ? 0 : _Overlay._keyboardInfo._extraOccluded;
                            },

                            // Get the visual viewport height. window.innerHeight doesn't return floating point values which are present with high DPI.
                            _visualViewportHeight: function _visualViewportHeight() {
                                var boundingRect = _Overlay._keyboardInfo._visualViewportSpace;
                                return boundingRect.bottom - boundingRect.top;
                            },

                            // Get the visual viewport width. window.innerWidth doesn't return floating point values which are present with high DPI.
                            _visualViewportWidth: function _visualViewportWidth() {
                                var boundingRect = _Overlay._keyboardInfo._visualViewportSpace;
                                return boundingRect.right - boundingRect.left;
                            },

                            _visualViewportSpace: function _visualViewportSpace() {
                                var visualViewportSpace = _Global.document.body.querySelector("." + _Constants._visualViewportClass);
                                if (!visualViewportSpace) {
                                    visualViewportSpace = _Global.document.createElement("DIV");
                                    visualViewportSpace.className = _Constants._visualViewportClass;
                                    _Global.document.body.appendChild(visualViewportSpace);
                                }
                                return visualViewportSpace.getBoundingClientRect();
                            },
                        };

                        // Mixin for WWA's Soft Keyboard offsets in IE10 mode, where -ms-device-fixed positioning is not available.
                        // In that instance, all _Overlay elements fall back to using CSS fixed positioning.
                        // This is for backwards compatibility with Apache Cordova Apps targeting WWA since they target IE10.
                        // This is essentially the original logic for WWA _Overlay / Soft Keyboard interactions we used when windows 8 first launched.
                        var _keyboardInfo_Windows8WWA_Mixin = {
                            // Get the top of our visible area in terms of its absolute distance from the top of document.documentElement.
                            // Normalizes any offsets which have have occured between the visual viewport and the layout viewport due to resizing the viewport to fit the IHM and/or optical zoom.
                            _visibleDocTop: function _visibleDocTop_Windows8WWA() {
                                return _Global.window.pageYOffset - _Global.document.documentElement.scrollTop;
                            },

                            // Get the bottom offset of the visual viewport from the bottom of the layout viewport, plus any IHM occlusion.
                            _visibleDocBottomOffset: function _visibleDocBottomOffset_Windows8WWA() {
                                return _Global.document.documentElement.clientHeight - _Overlay._keyboardInfo._visibleDocBottom;
                            },

                            _visualViewportHeight: function _visualViewportHeight_Windows8WWA() {
                                return _Global.window.innerHeight;
                            },

                            _visualViewportWidth: function _visualViewportWidth_Windows8WWA() {
                                return _Global.window.innerWidth;
                            },
                        };

                        // Feature detect for -ms-device-fixed positioning and fill out the
                        // remainder of our WWA Soft KeyBoard handling logic with mixins.
                        var visualViewportSpace = _Global.document.createElement("DIV");
                        visualViewportSpace.className = _Constants._visualViewportClass;
                        _Global.document.body.appendChild(visualViewportSpace);

                        var propertiesMixin,
                            hasDeviceFixed = _Global.getComputedStyle(visualViewportSpace).position === "-ms-device-fixed";
                        if (!hasDeviceFixed && _WinRT.Windows.UI.ViewManagement.InputPane) {
                            // If we are in WWA with IE 10 mode, use special keyboard handling knowledge for IE10 IHM.
                            propertiesMixin = _keyboardInfo_Windows8WWA_Mixin;
                            _Global.document.body.removeChild(visualViewportSpace);
                        } else {
                            // If we are in WWA on IE 11 or outside of WWA on any web browser use general positioning logic.
                            propertiesMixin = _keyboardInfo_Mixin;
                        }

                        for (var propertyName in propertiesMixin) {
                            Object.defineProperty(_Overlay._keyboardInfo, propertyName, {
                                get: propertiesMixin[propertyName],
                            });
                        }
                    }
                }
            });

            _Base.Class.mix(_Overlay, _Control.DOMEventMixin);

            return _Overlay;
        })
    });

});

