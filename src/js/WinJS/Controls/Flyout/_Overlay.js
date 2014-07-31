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
    '../../ControlProcessor',
    '../../Promise',
    '../../Scheduler',
    '../../Utilities/_Control',
    '../../Utilities/_ElementUtilities',
    '../AppBar/_Constants'
], function overlayInit(exports, _Global, _WinRT, _Base, _BaseUtils, _ErrorFromName, _Events, _Resources, _WriteProfilerMark, Animations, ControlProcessor, Promise, Scheduler, _Control, _ElementUtilities, _Constants) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _Overlay: _Base.Namespace._lazy(function () {
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

            // Helpers for keyboard showing related events
            function _allOverlaysCallback(event, command) {
                var elements = _Global.document.querySelectorAll("." + _Constants.overlayClass);
                if (elements) {
                    var len = elements.length;
                    for (var i = 0; i < len; i++) {
                        var element = elements[i];
                        var control = element.winControl;
                        if (!control._disposed) {
                            if (control) {
                                control[command](event);
                            }
                        }
                    }
                }
            }

            function _edgyMayHideFlyouts() {
                if (!_Overlay._rightMouseMightEdgy) {
                    _Overlay._hideAllFlyouts();
                }
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

                    // Each overlay tracks the window width for detecting resizes in the resize handler.
                    this._currentDocumentWidth = this._currentDocumentWidth || _Global.document.documentElement.offsetWidth;

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
                    if (this._currentDocumentWidth !== undefined) {
                        if (this.hidden) {
                            this._currentDocumentWidth = undefined;
                        } else {
                            // Overlays can light dismiss on horizontal resize.
                            var newWidth = _Global.document.documentElement.offsetWidth;
                            if (this._currentDocumentWidth !== newWidth) {
                                this._currentDocumentWidth = newWidth;
                                if (!this._sticky) {
                                    this._hideOrDismiss();
                                }
                            }
                        }
                    }

                    // Call specific resize
                    this._resize(event);
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

                _addOverlayEventHandlers: function _Overlay_addOverlayEventHandlers(isFlyoutOrSettingsFlyout) {
                    // Set up global event handlers for all overlays
                    if (!_Overlay._flyoutEdgeLightDismissEvent) {
                        // Dismiss on blur & resize
                        // Focus handlers generally use WinJS.Utilities._addEventListener with focusout/focusin. This
                        // uses the browser's blur event directly beacuse _addEventListener doesn't support focusout/focusin
                        // on window.
                        _Global.addEventListener("blur", _Overlay._checkBlur, false);

                        var that = this;

                        // Be careful so it behaves in designer as well.
                        if (_WinRT.Windows.UI.Input.EdgeGesture) {
                            // Catch edgy events too
                            var commandUI = _WinRT.Windows.UI.Input.EdgeGesture.getForCurrentView();
                            commandUI.addEventListener("starting", _Overlay._hideAllFlyouts);
                            commandUI.addEventListener("completed", _edgyMayHideFlyouts);
                        }

                        if (_WinRT.Windows.UI.ViewManagement.InputPane) {
                            // React to Soft Keyboard events
                            var inputPane = _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView();
                            inputPane.addEventListener("showing", function (event) {
                                that._writeProfilerMark("_showingKeyboard,StartTM");
                                _allOverlaysCallback(event, "_showingKeyboard");
                                that._writeProfilerMark("_showingKeyboard,StopTM");
                            });
                            inputPane.addEventListener("hiding", function (event) {
                                that._writeProfilerMark("_hidingKeyboard,StartTM");
                                _allOverlaysCallback(event, "_hidingKeyboard");
                                that._writeProfilerMark("_hidingKeyboard,StopTM");
                            });
                            // Document scroll event
                            _Global.document.addEventListener("scroll", function (event) {
                                that._writeProfilerMark("_checkScrollPosition,StartTM");
                                _allOverlaysCallback(event, "_checkScrollPosition");
                                that._writeProfilerMark("_checkScrollPosition,StopTM");
                            });
                        }

                        // Window resize event
                        _Global.addEventListener("resize", function (event) {
                            that._writeProfilerMark("_baseResize,StartTM");
                            _allOverlaysCallback(event, "_baseResize");
                            that._writeProfilerMark("_baseResize,StopTM");
                        });

                        _Overlay._flyoutEdgeLightDismissEvent = true;
                    }

                    // Individual handlers for Flyouts only
                    if (isFlyoutOrSettingsFlyout) {
                        this._handleEventsForFlyoutOrSettingsFlyout();
                    }
                },

                _handleEventsForFlyoutOrSettingsFlyout: function _Overlay_handleEventsForFlyoutOrSettingsFlyout() {
                    var that = this;
                    // Need to hide ourselves if we lose focus
                    _ElementUtilities._addEventListener(this._element, "focusout", function (e) { _Overlay._hideIfLostFocus(that, e); }, false);

                    // Attempt to flag right clicks that may turn into edgy
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
                _flyoutEdgeLightDismissEvent: false,

                _hideFlyouts: function (testElement, notSticky) {
                    var elements = testElement.querySelectorAll("." + _Constants.flyoutClass);
                    var len = elements.length;
                    for (var i = 0; i < len; i++) {
                        var element = elements[i];
                        if (element.style.visibility !== "hidden") {
                            var flyout = element.winControl;
                            if (flyout && (!notSticky || !flyout._sticky)) {
                                flyout._hideOrDismiss();
                            }
                        }
                    }
                },

                _hideSettingsFlyouts: function (testElement, notSticky) {
                    var elements = testElement.querySelectorAll("." + _Constants.settingsFlyoutClass);
                    var len = elements.length;
                    for (var i = 0; i < len; i++) {
                        var element = elements[i];
                        if (element.style.visibility !== "hidden") {
                            var settingsFlyout = element.winControl;
                            if (settingsFlyout && (!notSticky || !settingsFlyout._sticky)) {
                                settingsFlyout._hideOrDismiss();
                            }
                        }
                    }
                },

                _hideAllFlyouts: function () {
                    _Overlay._hideFlyouts(_Global.document, true);
                    _Overlay._hideSettingsFlyouts(_Global.document, true);
                },

                _createClickEatingDivTemplate: function (divClass, hideClickEatingDivFunction) {
                    var clickEatingDiv = _Global.document.createElement("section");
                    _ElementUtilities.addClass(clickEatingDiv, divClass);
                    _ElementUtilities._addEventListener(clickEatingDiv, "pointerup", function (event) { _Overlay._checkSameClickEatingPointerUp(event, true); }, true);
                    _ElementUtilities._addEventListener(clickEatingDiv, "pointerdown", function (event) { _Overlay._checkClickEatingPointerDown(event, true); }, true);
                    clickEatingDiv.addEventListener("click", hideClickEatingDivFunction, true);
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
                _checkClickEatingPointerDown: function (event, stopPropogation) {
                    var target = event.currentTarget;
                    if (target) {
                        try {
                            // Remember pointer id and remember right mouse
                            target._winPointerId = event.pointerId;
                            // Cache right mouse if that was what happened
                            target._winRightMouse = (event.button === 2);
                        } catch (e) { }
                    }

                    if (stopPropogation && !target._winRightMouse) {
                        event.stopPropagation();
                        event.preventDefault();
                    }
                },

                // Make sure that if we have an up we had an earlier down of the same kind
                _checkSameClickEatingPointerUp: function (event, stopPropogation) {
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
                            if (rightMouse && stopPropogation) {
                                result = false;
                            }
                        }
                    } catch (e) { }


                    if (stopPropogation && !rightMouse) {
                        event.stopPropagation();
                        event.preventDefault();
                    }

                    return result;
                },

                // If they click on a click eating div, even with a right click,
                // touch or anything, then we want to light dismiss that layer.
                _handleAppBarClickEatingClick: function (event) {
                    event.stopPropagation();
                    event.preventDefault();

                    _Overlay._hideLightDismissAppBars(null, false);
                    _Overlay._hideClickEatingDivAppBar();
                    _Overlay._hideAllFlyouts();
                },

                // If they click on a click eating div, even with a right click,
                // touch or anything, then we want to light dismiss that layer.
                _handleFlyoutClickEatingClick: function (event) {
                    event.stopPropagation();
                    event.preventDefault();

                    // Don't light dismiss AppBars because edgy will do that as needed,
                    // so flyouts only.
                    _Overlay._hideClickEatingDivFlyout();
                    _Overlay._hideFlyouts(_Global.document, true);
                },

                _checkRightClickDown: function (event) {
                    _Overlay._checkClickEatingPointerDown(event, false);
                },

                _checkRightClickUp: function (event) {
                    if (_Overlay._checkSameClickEatingPointerUp(event, false)) {
                        // It was a right click we may want to eat.
                        _Overlay._rightMouseMightEdgy = true;
                        _BaseUtils._yieldForEvents(function () { _Overlay._rightMouseMightEdgy = false; });
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

                // Want to hide flyouts on blur.
                // We get blur if we click off the window, including to an iframe within our window.
                // Both blurs call this function, but fortunately document.hasFocus is true if either
                // the document window or our iframe window has focus.
                _checkBlur: function () {
                    if (!_Global.document.hasFocus()) {
                        // The document doesn't have focus, so they clicked off the app, so light dismiss.
                        _Overlay._hideAllFlyouts();
                        _Overlay._hideLightDismissAppBars(null, false);
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
                                active.addEventListener("blur", _Overlay._checkBlur, false);
                                active.msLightDismissBlur = true;
                            }
                        }
                    }
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

                _getParentControlUsingClassName: function (element, className) {
                    while (element && element !== _Global.document.body) {
                        if (_ElementUtilities.hasClass(element, className)) {
                            return element.winControl;
                        }
                        element = element.parentNode;
                    }
                    return null;
                },

                // Hide all light dismiss AppBars if what has focus is not part of a AppBar or flyout.
                _hideIfAllAppBarsLostFocus: function _hideIfAllAppBarsLostFocus() {
                    if (!_Overlay._isAppBarOrChild(_Global.document.activeElement)) {
                        _Overlay._hideLightDismissAppBars(null, false);
                        // Ensure that sticky appbars clear cached focus after light dismiss are dismissed, which moved focus.
                        _Overlay._ElementWithFocusPreviousToAppBar = null;
                    }
                },

                _hideLightDismissAppBars: function (event, keyboardInvoked) {
                    var elements = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                    var len = elements.length;
                    var AppBars = [];
                    for (var i = 0; i < len; i++) {
                        var AppBar = elements[i].winControl;
                        if (AppBar && !AppBar.sticky && !AppBar.hidden) {
                            AppBars.push(AppBar);
                        }
                    }

                    _Overlay._hideAllBars(AppBars, keyboardInvoked);
                },

                // Show/Hide all bars
                _hideAllBars: function _Overlay_hideAllBars(bars, keyboardInvoked) {
                    var allBarsAnimationPromises = bars.map(function (bar) {
                        bar._keyboardInvoked = keyboardInvoked;
                        bar.hide();
                        return bar._animationPromise;
                    });
                    return Promise.join(allBarsAnimationPromises);
                },

                _showAllBars: function _Overlay_showAllBars(bars, keyboardInvoked) {
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
                            // If _previousFocus was in a light dismissable AppBar, then this Flyout is considered of an extension of it and that AppBar should not hide.
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

            // Global keyboard hiding offset
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

                // Get the top of our visible area in terms of its absolute distance from the top of document.documentElement. 
                // Normalizes any offsets which have have occured between the visual viewport and the layout viewport due to resizing the viewport to fit the IHM and/or optical zoom.
                get _visibleDocTop() {
                    return _Global.pageYOffset - _Global.document.documentElement.scrollTop;
                },

                // Get the bottom of our visible area.
                get _visibleDocBottom() {
                    return _Overlay._keyboardInfo._visibleDocTop + _Overlay._keyboardInfo._visibleDocHeight;
                },

                // Get the height of the visible document, e.g. the height of the visual viewport minus any IHM occlusion.
                get _visibleDocHeight() {
                    return _Overlay._keyboardInfo._visualViewportHeight - _Overlay._keyboardInfo._extraOccluded;
                },

                // Get the visual viewport height. window.innerHeight doesn't return floating point values which are present with high DPI.
                get _visualViewportHeight() {
                    var boundingRect = _Overlay._keyboardInfo._visualViewportSpace;
                    return boundingRect.bottom - boundingRect.top;
                },

                // Get the visual viewport width. window.innerHeight doesn't return floating point values which are present with high DPI.
                get _visualViewportWidth() {
                    var boundingRect = _Overlay._keyboardInfo._visualViewportSpace;
                    return boundingRect.right - boundingRect.left;
                },

                get _visualViewportSpace() {
                    var className = "win-visualviewport-space";
                    var visualViewportSpace = _Global.document.body.querySelector("." + className);
                    if (!visualViewportSpace) {
                        visualViewportSpace = _Global.document.createElement("DIV");
                        visualViewportSpace.className = className;
                        _Global.document.body.appendChild(visualViewportSpace);
                    }

                    return visualViewportSpace.getBoundingClientRect();
                },

                // Get offset of visible window from bottom.
                get _visibleDocBottomOffset() {
                    // If the view resizes we can return 0 and rely on appbar's -ms-device-fixed css positioning. 
                    return (_Overlay._keyboardInfo._isResized) ? 0 : _Overlay._keyboardInfo._extraOccluded;
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
                }
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
            }
        });

    _Base.Class.mix(_Overlay, _Control.DOMEventMixin);

    return _Overlay;
})
});

});

