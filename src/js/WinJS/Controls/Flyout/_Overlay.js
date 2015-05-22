﻿// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
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
    '../../_Accents',
    '../../Animations',
    '../../Application',
    '../../ControlProcessor',
    '../../Promise',
    '../../Scheduler',
    '../../Utilities/_Control',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_KeyboardInfo',
    '../_LegacyAppBar/_Constants',
    'require-style!less/styles-overlay',
    'require-style!less/colors-overlay'
], function overlayInit(exports, _Global, _WinRT, _Base, _BaseUtils, _ErrorFromName, _Events, _Resources, _WriteProfilerMark, _Accents, Animations, Application, ControlProcessor, Promise, Scheduler, _Control, _ElementUtilities, _KeyboardInfo, _Constants) {
    "use strict";

    _Accents.createAccentRule(
        "button[aria-checked=true].win-command:before,\
         .win-menu-containsflyoutcommand button.win-command-flyout-activated:before", [
        { name: "background-color", value: _Accents.ColorTypes.accent },
        { name: "border-color", value: _Accents.ColorTypes.accent },
    ]);

    _Accents.createAccentRule(".win-flyout, .win-settingsflyout", [{ name: "border-color", value: _Accents.ColorTypes.accent }]);

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

                this._inputPaneShowing = this._inputPaneShowing.bind(this);
                this._inputPaneHiding = this._inputPaneHiding.bind(this);
                this._documentScroll = this._documentScroll.bind(this);
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

                        if (_WinRT.Windows.UI.ViewManagement.InputPane) {
                            // React to Soft Keyboard events
                            var inputPane = _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView();
                            inputPane[listenerOperation]("showing", this._inputPaneShowing, false);
                            inputPane[listenerOperation]("hiding", this._inputPaneHiding, false);

                            _Global.document[listenerOperation]("scroll", this._documentScroll, false);
                        }

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

                _show: function _Overlay_show() {
                    // We call our base _baseShow because AppBar may need to override show
                    this._baseShow();
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
                    if (this._animating || this._needToHandleHidingKeyboard) {
                        this._doNext = "show";
                        return false;
                    }

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
                    if (this._animating) {
                        this._doNext = "hide";
                        return false;
                    }

                    // In the unlikely event we're between the hiding keyboard and the resize events, just snap it away:
                    if (this._needToHandleHidingKeyboard) {
                        // use the "uninitialized" flag
                        this._element.style.visibility = "";
                    }

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

                    // Do our derived classes hide stuff
                    this._beforeEndHide();

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

                // Called after the animation but while the Overlay is still visible. It's
                // important that this runs while the Overlay is visible because hiding
                // a DOM element (e.g. visibility="hidden", display="none") while it contains
                // focus has the side effect of moving focus to the body or null and triggering
                // focus move events. _beforeEndHide is a good hook for the Overlay to move focus
                // elsewhere before its DOM element gets hidden.
                _beforeEndHide: function _Overlay_beforeEndHide() {
                    // Nothing by default
                },

                _checkDoNext: function _Overlay_checkDoNext() {
                    // Do nothing if we're still animating
                    if (this._animating || this._needToHandleHidingKeyboard || this._disposed) {
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
                        hideCommands[count].style.top = "";
                        hideCommands[count].style.left = "";
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
                    // Call specific resize
                    this._resize(event);
                },

                _hideOrDismiss: function _Overlay_hideOrDismiss() {
                    var element = this._element;
                    if (element && _ElementUtilities.hasClass(element, _Constants.settingsFlyoutClass)) {
                        this._dismiss();
                    } else if (element && _ElementUtilities.hasClass(element, _Constants.appBarClass)) {
                        this.close();
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
                _focusOnFirstFocusableElement: function _Overlay__focusOnFirstFocusableElement(useSetActive, scroller) {
                    if (this._element.firstElementChild) {
                        var oldFirstTabIndex = this._element.firstElementChild.tabIndex;
                        var oldLastTabIndex = this._element.lastElementChild.tabIndex;
                        this._element.firstElementChild.tabIndex = -1;
                        this._element.lastElementChild.tabIndex = -1;

                        var tabResult = _ElementUtilities._focusFirstFocusableElement(this._element, useSetActive, scroller);

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

                _writeProfilerMark: function _Overlay_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI._Overlay:" + this._id + ":" + text);
                }
            },
            {
                // Statics

                _isFlyoutVisible: function () {
                    var flyouts = _Global.document.querySelectorAll("." + _Constants.flyoutClass);
                    for (var i = 0; i < flyouts.length; i++) {
                        var flyoutControl = flyouts[i].winControl;
                        if (flyoutControl && !flyoutControl.hidden) {
                            return true;
                        }
                    }

                    return false;
                },

                // Try to set us as active
                _trySetActive: function (element, scroller) {
                    if (!element || !_Global.document.body || !_Global.document.body.contains(element)) {
                        return false;
                    }
                    if (!_ElementUtilities._setActive(element, scroller)) {
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

                // Show/Hide all bars
                _hideAppBars: function _Overlay_hideAppBars(bars, keyboardInvoked) {
                    var allBarsAnimationPromises = bars.map(function (bar) {
                        bar.close();
                        return bar._animationPromise;
                    });
                    return Promise.join(allBarsAnimationPromises);
                },

                _showAppBars: function _Overlay_showAppBars(bars, keyboardInvoked) {
                    var allBarsAnimationPromises = bars.map(function (bar) {
                        bar._show();
                        return bar._animationPromise;
                    });
                    return Promise.join(allBarsAnimationPromises);
                },

                // WWA Soft Keyboard offsets
                _keyboardInfo: _KeyboardInfo._KeyboardInfo,

                // Padding for IHM timer to allow for first scroll event
                _scrollTimeout: _KeyboardInfo._KeyboardInfo._scrollTimeout,

                // Events
                beforeShow: "beforeshow",
                beforeHide: "beforehide",
                afterShow: "aftershow",
                afterHide: "afterhide",

                commonstrings: {
                    get cannotChangeCommandsWhenVisible() { return "Invalid argument: You must call hide() before changing {0} commands"; },
                    get cannotChangeHiddenProperty() { return "Unable to set hidden property while parent {0} is visible."; }
                },
            });

            _Base.Class.mix(_Overlay, _Control.DOMEventMixin);

            return _Overlay;
        })
    });

});

