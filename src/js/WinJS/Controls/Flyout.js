// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <dictionary>appbar,Flyout,Flyouts,Statics</dictionary>
define([
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Log',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations',
    '../_Signal',
    '../_LightDismissService',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities',
    '../Utilities/_KeyboardBehavior',
    '../Utilities/_Hoverable',
    './_LegacyAppBar/_Constants',
    './Flyout/_Overlay'
], function flyoutInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Events, _Log, _Resources, _WriteProfilerMark, Animations, _Signal, _LightDismissService, _Dispose, _ElementUtilities, _KeyboardBehavior, _Hoverable, _Constants, _Overlay) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.Flyout">
        /// Displays lightweight UI that is either informational, or requires user interaction.
        /// Unlike a dialog, a Flyout can be light dismissed by clicking or tapping off of it.
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        /// <name locid="WinJS.UI.Flyout_name">Flyout</name>
        /// <icon src="ui_winjs.ui.flyout.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.flyout.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.Flyout"></div>]]></htmlSnippet>
        /// <event name="beforeshow" locid="WinJS.UI.Flyout_e:beforeshow">Raised just before showing a flyout.</event>
        /// <event name="aftershow" locid="WinJS.UI.Flyout_e:aftershow">Raised immediately after a flyout is fully shown.</event>
        /// <event name="beforehide" locid="WinJS.UI.Flyout_e:beforehide">Raised just before hiding a flyout.</event>
        /// <event name="afterhide" locid="WinJS.UI.Flyout_e:afterhide">Raised immediately after a flyout is fully hidden.</event>
        /// <part name="flyout" class="win-flyout" locid="WinJS.UI.Flyout_part:flyout">The Flyout control itself.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        Flyout: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            function getDimension(element, property) {
                return _ElementUtilities.convertToPixels(element, _Global.getComputedStyle(element, null)[property]);
            }

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/flyoutAriaLabel").value; },
                get noAnchor() { return "Invalid argument: Flyout anchor element not found in DOM."; },
                get badPlacement() { return "Invalid argument: Flyout placement should be 'top' (default), 'bottom', 'left', 'right', 'auto', 'autohorizontal', or 'autovertical'."; },
                get badAlignment() { return "Invalid argument: Flyout alignment should be 'center' (default), 'left', or 'right'."; }
            };

            var createEvent = _Events._createEventProperty;

            // _LightDismissableLayer is an ILightDismissable which manages a set of ILightDismissables.
            // It acts as a proxy between the LightDismissService and the light dismissables it manages.
            // It enables multiple dismissables to be above the click eater at the same time.
            var _LightDismissableLayer = _Base.Class.define(function _LightDismissableLayer_ctor(onLightDismiss) {
                this._onLightDismiss = onLightDismiss;
                this._currentlyFocusedClient = null;
                this._clients = []; // Array of ILightDismissables
            }, {
                // Dismissables should call this as soon as they are ready to be shown. More specifically, they should call this:
                //   - After they are in the DOM and ready to receive focus (e.g. style.display cannot be "none")
                //   - Before their entrance animation is played
                shown: function _LightDismissableLayer_shown(client /*: ILightDismissable */) {
                    client._focusable = true;
                    var index = this._clients.indexOf(client);
                    if (index === -1) {
                        this._clients.push(client);
                        client.onShow(this);
                        if (!_LightDismissService.isShown(this)) {
                            _LightDismissService.shown(this);
                        } else {
                            _LightDismissService.updated(this);
                            this._activateTopFocusableClientIfNeeded();
                        }
                    }
                },

                // Dismissables should call this at the start of their exit animation. A "hiding",
                // dismissable will still be rendered with the proper z-index but it will no
                // longer be given focus. Also, focus is synchronously moved out of this dismissable.
                hiding: function _LightDismissableLayer_hiding(client /*: ILightDismissable */) {
                    var index = this._clients.indexOf(client);
                    if (index !== -1) {
                        this._clients[index]._focusable = false;
                        this._activateTopFocusableClientIfNeeded();
                    }
                },

                // Dismissables should call this when they are done being dismissed (i.e. after their exit animation has finished)
                hidden: function _LightDismissableLayer_hidden(client /*: ILightDismissable */) {
                    var index = this._clients.indexOf(client);
                    if (index !== -1) {
                        this._clients.splice(index, 1);
                        client.setZIndex("");
                        client.onHide();
                        if (this._clients.length === 0) {
                            _LightDismissService.hidden(this);
                        } else {
                            _LightDismissService.updated(this);
                            this._activateTopFocusableClientIfNeeded();
                        }
                    }
                },

                keyDown: function _LightDismissableLayer_keyDown(client /*: ILightDismissable */, eventObject) {
                    _LightDismissService.keyDown(this, eventObject);
                },
                keyUp: function _LightDismissableLayer_keyUp(client /*: ILightDismissable */, eventObject) {
                    _LightDismissService.keyUp(this, eventObject);
                },
                keyPress: function _LightDismissableLayer_keyPress(client /*: ILightDismissable */, eventObject) {
                    _LightDismissService.keyPress(this, eventObject);
                },

                // Used by tests.
                clients: {
                    get: function _LightDismissableLayer_clients_get() {
                        return this._clients;
                    }
                },

                _clientForElement: function _LightDismissableLayer_clientForElement(element) {
                    for (var i = this._clients.length - 1; i >= 0; i--) {
                        if (this._clients[i].containsElement(element)) {
                            return this._clients[i];
                        }
                    }
                    return null;
                },

                _focusableClientForElement: function _LightDismissableLayer_focusableClientForElement(element) {
                    for (var i = this._clients.length - 1; i >= 0; i--) {
                        if (this._clients[i]._focusable && this._clients[i].containsElement(element)) {
                            return this._clients[i];
                        }
                    }
                    return null;
                },

                _getTopmostFocusableClient: function _LightDismissableLayer_getTopmostFocusableClient() {
                    for (var i = this._clients.length - 1; i >= 0; i--) {
                        var client = this._clients[i];
                        if (client && client._focusable) {
                            return client;
                        }
                    }
                    return null;
                },

                _activateTopFocusableClientIfNeeded: function _LightDismissableLayer_activateTopFocusableClientIfNeeded() {
                    var topClient = this._getTopmostFocusableClient();
                    if (topClient && _LightDismissService.isTopmost(this)) {
                        // If the last input type was keyboard, use focus() so a keyboard focus visual is drawn.
                        // Otherwise, use setActive() so no focus visual is drawn.
                        var useSetActive = !_KeyboardBehavior._keyboardSeenLast;
                        topClient.onTakeFocus(useSetActive);
                    }
                },

                // ILightDismissable
                //

                setZIndex: function _LightDismissableLayer_setZIndex(zIndex) {
                    this._clients.forEach(function (client, index) {
                        client.setZIndex(zIndex + index);
                    }, this);
                },
                getZIndexCount: function _LightDismissableLayer_getZIndexCount() {
                    return this._clients.length;
                },
                containsElement: function _LightDismissableLayer_containsElement(element) {
                    return !!this._clientForElement(element);
                },
                onTakeFocus: function _LightDismissableLayer_onTakeFocus(useSetActive) {
                    // Prefer the client that has focus
                    var client = this._focusableClientForElement(_Global.document.activeElement);

                    if (!client && this._clients.indexOf(this._currentlyFocusedClient) !== -1 && this._currentlyFocusedClient._focusable) {
                        // Next try the client that had focus most recently
                        client = this._currentlyFocusedClient;
                    }

                    if (!client) {
                        // Finally try the client at the top of the stack
                        client = this._getTopmostFocusableClient();
                    }

                    this._currentlyFocusedClient = client;
                    client && client.onTakeFocus(useSetActive);
                },
                onFocus: function _LightDismissableLayer_onFocus(element) {
                    this._currentlyFocusedClient = this._clientForElement(element);
                    this._currentlyFocusedClient && this._currentlyFocusedClient.onFocus(element);
                },
                onShow: function _LightDismissableLayer_onShow(service /*: ILightDismissService */) { },
                onHide: function _LightDismissableLayer_onHide() {
                    this._currentlyFocusedClient = null;
                },
                onKeyInStack: function _LightDismissableLayer_onKeyInStack(info /*: IKeyboardInfo*/) {
                    // A keyboard event occurred in the light dismiss stack. Notify the flyouts to
                    // give them the opportunity to handle this evnet.
                    var index = this._clients.indexOf(this._currentlyFocusedClient);
                    if (index !== -1) {
                        var clients = this._clients.slice(0, index + 1);
                        for (var i = clients.length - 1; i >= 0 && !info.propagationStopped; i--) {
                            if (clients[i]._focusable) {
                                clients[i].onKeyInStack(info);
                            }
                        }
                    }
                },
                onShouldLightDismiss: function _LightDismissableLayer_onShouldLightDismiss(info) {
                    return _LightDismissService.DismissalPolicies.light(info);
                },
                onLightDismiss: function _LightDismissableLayer_onLightDismiss(info) {
                    this._onLightDismiss(info);
                }
            });

            // Singleton class for managing cascading flyouts
            var _CascadeManager = _Base.Class.define(function _CascadeManager_ctor() {
                var that = this;
                this._dismissableLayer = new _LightDismissableLayer(function _CascadeManager_onLightDismiss(info) {
                    if (info.reason === _LightDismissService.LightDismissalReasons.escape) {
                        that.collapseFlyout(that.getAt(that.length - 1));
                    } else {
                        that.collapseAll();
                    }
                });
                this._cascadingStack = [];
                this._handleKeyDownInCascade_bound = this._handleKeyDownInCascade.bind(this);
                this._inputType = null;
            },
            {
                appendFlyout: function _CascadeManager_appendFlyout(flyoutToAdd) {
                    // PRECONDITION: this.reentrancyLock must be false. appendFlyout should only be called from baseFlyoutShow() which is the function responsible for preventing reentrancy.
                    _Log.log && this.reentrancyLock && _Log.log('_CascadeManager is attempting to append a Flyout through reentrancy.', "winjs _CascadeManager", "error");

                    if (this.indexOf(flyoutToAdd) < 0) {
                        // IF the anchor element for flyoutToAdd is contained within another flyout,
                        // && that flyout is currently in the cascadingStack, consider that flyout to be the parent of flyoutToAdd:
                        //  Remove from the cascadingStack, any subflyout descendants of the parent flyout.
                        // ELSE flyoutToAdd isn't anchored to any of the Flyouts in the existing cascade
                        //  Collapse the entire cascadingStack to start a new cascade.
                        // FINALLY:
                        //  add flyoutToAdd to the end of the cascading stack. Monitor it for events.
                        var indexOfParentFlyout = this.indexOfElement(flyoutToAdd._currentAnchor);
                        if (indexOfParentFlyout >= 0) {
                            this.collapseFlyout(this.getAt(indexOfParentFlyout + 1));
                        } else {
                            this.collapseAll();
                        }

                        flyoutToAdd.element.addEventListener("keydown", this._handleKeyDownInCascade_bound, false);
                        this._cascadingStack.push(flyoutToAdd);
                    }
                },
                collapseFlyout: function _CascadeManager_collapseFlyout(flyout) {
                    // Synchronously removes flyout param and its subflyout descendants from the _cascadingStack.
                    // Synchronously calls hide on all removed flyouts.

                    if (!this.reentrancyLock && flyout && this.indexOf(flyout) >= 0) {
                        this.reentrancyLock = true;
                        var signal = new _Signal();
                        this.unlocked = signal.promise;

                        var subFlyout;
                        while (this.length && flyout !== subFlyout) {
                            subFlyout = this._cascadingStack.pop();
                            subFlyout.element.removeEventListener("keydown", this._handleKeyDownInCascade_bound, false);
                            subFlyout._hide(); // We use the reentrancyLock to prevent reentrancy here.
                        }

                        if (this._cascadingStack.length === 0) {
                            // The cascade is empty so clear the input type. This gives us the opportunity
                            // to recalculate the input type when the next cascade starts.
                            this._inputType = null;
                        }

                        this.reentrancyLock = false;
                        this.unlocked = null;
                        signal.complete();
                    }
                },
                flyoutShown: function _CascadeManager_flyoutShown(flyout) {
                    this._dismissableLayer.shown(flyout._dismissable);
                },
                flyoutHiding: function _CascadeManager_flyoutHiding(flyout) {
                    this._dismissableLayer.hiding(flyout._dismissable);
                },
                flyoutHidden: function _CascadeManager_flyoutHidden(flyout) {
                    this._dismissableLayer.hidden(flyout._dismissable);
                },
                collapseAll: function _CascadeManager_collapseAll() {
                    // Empties the _cascadingStack and hides all flyouts.
                    var headFlyout = this.getAt(0);
                    if (headFlyout) {
                        this.collapseFlyout(headFlyout);
                    }
                },
                indexOf: function _CascadeManager_indexOf(flyout) {
                    return this._cascadingStack.indexOf(flyout);
                },
                indexOfElement: function _CascadeManager_indexOfElement(el) {
                    // Returns an index cooresponding to the Flyout in the cascade whose element contains the element in question.
                    // Returns -1 if the element is not contained by any Flyouts in the cascade.
                    var indexOfAssociatedFlyout = -1;
                    for (var i = 0, len = this.length; i < len; i++) {
                        var currentFlyout = this.getAt(i);
                        if (currentFlyout.element.contains(el)) {
                            indexOfAssociatedFlyout = i;
                            break;
                        }
                    }
                    return indexOfAssociatedFlyout;
                },
                length: {
                    get: function _CascadeManager_getLength() {
                        return this._cascadingStack.length;
                    }
                },
                getAt: function _CascadeManager_getAt(index) {
                    return this._cascadingStack[index];
                },
                handleFocusIntoFlyout: function _CascadeManager_handleFocusIntoFlyout(event) {
                    // When a flyout in the cascade recieves focus, we close all subflyouts beneath it.
                    var index = this.indexOfElement(event.target);
                    if (index >= 0) {
                        var subFlyout = this.getAt(index + 1);
                        this.collapseFlyout(subFlyout);
                    }
                },
                // Compute the input type that is associated with the cascading stack on demand. Allows
                // each Flyout in the cascade to adjust its sizing based on the current input type
                // and to do it in a way that is consistent with the rest of the Flyouts in the cascade.
                inputType: {
                    get: function _CascadeManager_inputType_get() {
                        if (!this._inputType) {
                            this._inputType = _KeyboardBehavior._lastInputType;
                        }
                        return this._inputType;
                    }
                },
                // Used by tests.
                dismissableLayer: {
                    get: function _CascadeManager_dismissableLayer_get() {
                        return this._dismissableLayer;
                    }
                },
                _handleKeyDownInCascade: function _CascadeManager_handleKeyDownInCascade(event) {
                    var rtl = _Global.getComputedStyle(event.target).direction === "rtl",
                        leftKey = rtl ? Key.rightArrow : Key.leftArrow,
                        target = event.target;

                    if (event.keyCode === leftKey) {
                        // Left key press in a SubFlyout will close that subFlyout and any subFlyouts cascading from it.
                        var index = this.indexOfElement(target);
                        if (index >= 1) {
                            var subFlyout = this.getAt(index);
                            this.collapseFlyout(subFlyout);
                            // Prevent document scrolling
                            event.preventDefault();
                        }
                    } else if (event.keyCode === Key.alt || event.keyCode === Key.F10) {
                        this.collapseAll();
                    }
                }
            });

            var AnimationOffsets = {
                top: { top: "50px", left: "0px", keyframe: "WinJS-showFlyoutTop" },
                bottom: { top: "-50px", left: "0px", keyframe: "WinJS-showFlyoutBottom" },
                left: { top: "0px", left: "50px", keyframe: "WinJS-showFlyoutLeft" },
                right: { top: "0px", left: "-50px", keyframe: "WinJS-showFlyoutRight" },
            };

            var Flyout = _Base.Class.derive(_Overlay._Overlay, function Flyout_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.Flyout.Flyout">
                /// <summary locid="WinJS.UI.Flyout.constructor">
                /// Creates a new Flyout control.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.Flyout.constructor_p:element">
                /// The DOM element that hosts the control.
                /// </param>
                /// <param name="options" type="Object" domElement="false" locid="WinJS.UI.Flyout.constructor_p:options">
                /// The set of properties and values to apply to the new Flyout.
                /// </param>
                /// <returns type="WinJS.UI.Flyout" locid="WinJS.UI.Flyout.constructor_returnValue">The new Flyout control.</returns>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>

                // Simplify checking later
                options = options || {};

                // Make sure there's an input element
                this._element = element || _Global.document.createElement("div");
                this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
                this._writeProfilerMark("constructor,StartTM");

                this._baseFlyoutConstructor(this._element, options);

                var _elms = this._element.getElementsByTagName("*");
                var firstDiv = this._addFirstDiv();
                firstDiv.tabIndex = _ElementUtilities._getLowestTabIndexInList(_elms);
                var finalDiv = this._addFinalDiv();
                finalDiv.tabIndex = _ElementUtilities._getHighestTabIndexInList(_elms);

                // Handle "esc" & "tab" key presses
                this._element.addEventListener("keydown", this._handleKeyDown, true);

                this._writeProfilerMark("constructor,StopTM");
                return this;
            }, {
                _lastMaxHeight: null,

                _baseFlyoutConstructor: function Flyout_baseFlyoutContstructor(element, options) {
                    // Flyout constructor

                    // We have some options with defaults
                    this._placement = "auto";
                    this._alignment = "center";

                    // Call the base overlay constructor helper
                    this._baseOverlayConstructor(element, options);

                    // Start flyouts hidden
                    this._element.style.visibilty = "hidden";
                    this._element.style.display = "none";

                    // Attach our css class
                    _ElementUtilities.addClass(this._element, _Constants.flyoutClass);

                    var that = this;
                    // Each flyout has an ILightDismissable that is managed through the
                    // CascasdeManager rather than by the _LightDismissService directly.
                    this._dismissable = new _LightDismissService.LightDismissableElement({
                        element: this._element,
                        tabIndex: this._element.hasAttribute("tabIndex") ? this._element.tabIndex : -1,
                        onLightDismiss: function () {
                            that.hide();
                        },
                        onTakeFocus: function (useSetActive) {
                            if (!that._dismissable.restoreFocus()) {
                                if (!_ElementUtilities.hasClass(that.element, _Constants.menuClass)) {
                                    // Put focus on the first child in the Flyout
                                    that._focusOnFirstFocusableElementOrThis();
                                } else {
                                    // Make sure the menu has focus, but don't show a focus rect
                                    _Overlay._Overlay._trySetActive(that._element);
                                }
                            }
                        }
                    });

                    // Make sure we have an ARIA role
                    var role = this._element.getAttribute("role");
                    if (role === null || role === "" || role === undefined) {
                        if (_ElementUtilities.hasClass(this._element, _Constants.menuClass)) {
                            this._element.setAttribute("role", "menu");
                        } else {
                            this._element.setAttribute("role", "dialog");
                        }
                    }
                    var label = this._element.getAttribute("aria-label");
                    if (label === null || label === "" || label === undefined) {
                        this._element.setAttribute("aria-label", strings.ariaLabel);
                    }

                    // Base animation is popIn, but our flyout has different arguments
                    this._currentAnimateIn = this._flyoutAnimateIn;
                    this._currentAnimateOut = this._flyoutAnimateOut;

                    _ElementUtilities._addEventListener(this.element, "focusin", this._handleFocusIn.bind(this), false);
                },

                /// <field type="String" locid="WinJS.UI.Flyout.anchor" helpKeyword="WinJS.UI.Flyout.anchor">
                /// Gets or sets the Flyout control's anchor. The anchor element is the HTML element which the Flyout originates from and is positioned relative to.
                /// (This setting can be overridden when you call the show method.)
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                anchor: {
                    get: function () {
                        return this._anchor;
                    },
                    set: function (value) {
                        this._anchor = value;
                    }
                },

                /// <field type="String" defaultValue="auto" oamOptionsDatatype="WinJS.UI.Flyout.placement" locid="WinJS.UI.Flyout.placement" helpKeyword="WinJS.UI.Flyout.placement">
                /// Gets or sets the default placement of this Flyout. (This setting can be overridden when you call the show method.)
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                placement: {
                    get: function () {
                        return this._placement;
                    },
                    set: function (value) {
                        if (value !== "top" && value !== "bottom" && value !== "left" && value !== "right" && value !== "auto" && value !== "autohorizontal" && value !== "autovertical") {
                            // Not a legal placement value
                            throw new _ErrorFromName("WinJS.UI.Flyout.BadPlacement", strings.badPlacement);
                        }
                        this._placement = value;
                    }
                },

                /// <field type="String" defaultValue="center" oamOptionsDatatype="WinJS.UI.Flyout.alignment" locid="WinJS.UI.Flyout.alignment" helpKeyword="WinJS.UI.Flyout.alignment">
                /// Gets or sets the default alignment for this Flyout. (This setting can be overridden when you call the show method.)
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                alignment: {
                    get: function () {
                        return this._alignment;
                    },
                    set: function (value) {
                        if (value !== "right" && value !== "left" && value !== "center") {
                            // Not a legal alignment value
                            throw new _ErrorFromName("WinJS.UI.Flyout.BadAlignment", strings.badAlignment);
                        }
                        this._alignment = value;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.Flyout.disabled" helpKeyword="WinJS.UI.Flyout.disabled">Disable a Flyout, setting or getting the HTML disabled attribute.  When disabled the Flyout will no longer display with show(), and will hide if currently visible.</field>
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
                                this.hide();
                            }
                        }
                    }
                },

                /// <field type="Function" locid="WinJS.UI.Flyout.onbeforeshow" helpKeyword="WinJS.UI.Flyout.onbeforeshow">
                /// Occurs immediately before the control is shown.
                /// </field>
                onbeforeshow: createEvent(_Overlay._Overlay.beforeShow),

                /// <field type="Function" locid="WinJS.UI.Flyout.onaftershow" helpKeyword="WinJS.UI.Flyout.onaftershow">
                /// Occurs immediately after the control is shown.
                /// </field>
                onaftershow: createEvent(_Overlay._Overlay.afterShow),

                /// <field type="Function" locid="WinJS.UI.Flyout.onbeforehide" helpKeyword="WinJS.UI.Flyout.onbeforehide">
                /// Occurs immediately before the control is hidden.
                /// </field>
                onbeforehide: createEvent(_Overlay._Overlay.beforeHide),

                /// <field type="Function" locid="WinJS.UI.Flyout.onafterhide" helpKeyword="WinJS.UI.Flyout.onafterhide">
                /// Occurs immediately after the control is hidden.
                /// </field>
                onafterhide: createEvent(_Overlay._Overlay.afterHide),

                _dispose: function Flyout_dispose() {
                    _Dispose.disposeSubTree(this.element);
                    this._hide();
                    Flyout._cascadeManager.flyoutHidden(this);
                    this.anchor = null;
                },

                show: function (anchor, placement, alignment) {
                    /// <signature helpKeyword="WinJS.UI.Flyout.show">
                    /// <summary locid="WinJS.UI.Flyout.show">
                    /// Shows the Flyout, if hidden, regardless of other states.
                    /// </summary>
                    /// <param name="anchor" type="HTMLElement" domElement="true" locid="WinJS.UI.Flyout.show_p:anchor">
                    /// The DOM element, or ID of a DOM element to anchor the Flyout, overriding the anchor property for this time only.
                    /// </param>
                    /// <param name="placement" type="Object" domElement="false" locid="WinJS.UI.Flyout.show_p:placement">
                    /// The placement of the Flyout to the anchor: 'auto' (default), 'top', 'bottom', 'left', or 'right'.  This parameter overrides the placement property for this show only.
                    /// </param>
                    /// <param name="alignment" type="Object" domElement="false" locid="WinJS.UI.Flyout.show:alignment">
                    /// For 'top' or 'bottom' placement, the alignment of the Flyout to the anchor's edge: 'center' (default), 'left', or 'right'.
                    /// This parameter overrides the alignment property for this show only.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    this._writeProfilerMark("show,StartTM"); // The corresponding "stop" profiler mark is handled in _Overlay._baseEndShow().
                    this._show(anchor, placement, alignment);
                },

                _show: function Flyout_show(anchor, placement, alignment) {
                    this._baseFlyoutShow(anchor, placement, alignment);
                },

                hide: function () {
                    /// <signature helpKeyword="WinJS.UI.Flyout.hide">
                    /// <summary locid="WinJS.UI.Flyout.hide">
                    /// Hides the Flyout, if visible, regardless of other states.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    // Just wrap the private one, turning off keyboard invoked flag
                    this._writeProfilerMark("hide,StartTM"); // The corresponding "stop" profiler mark is handled in _Overlay._baseEndHide().
                    this._hide();
                },

                _hide: function Flyout_hide() {

                    // First close all subflyout descendants in the cascade.
                    // Any calls to collapseFlyout through reentrancy should nop.
                    Flyout._cascadeManager.collapseFlyout(this);

                    if (this._baseHide()) {
                        Flyout._cascadeManager.flyoutHiding(this);
                    }
                },

                _beforeEndHide: function Flyout_beforeEndHide() {
                    Flyout._cascadeManager.flyoutHidden(this);
                },

                _baseFlyoutShow: function Flyout_baseFlyoutShow(anchor, placement, alignment) {
                    if (this.disabled || this._disposed) {
                        // Don't do anything.
                        return;
                    }

                    // Pick up defaults
                    if (!anchor) {
                        anchor = this._anchor;
                    }
                    if (!placement) {
                        placement = this._placement;
                    }
                    if (!alignment) {
                        alignment = this._alignment;
                    }

                    // Dereference the anchor if necessary
                    if (typeof anchor === "string") {
                        anchor = _Global.document.getElementById(anchor);
                    } else if (anchor && anchor.element) {
                        anchor = anchor.element;
                    }

                    // We expect an anchor
                    if (!anchor) {
                        // If we have _nextLeft, etc., then we were continuing an old animation, so that's OK
                        if (!this._reuseCurrent) {
                            throw new _ErrorFromName("WinJS.UI.Flyout.NoAnchor", strings.noAnchor);
                        }
                        // Last call was incomplete, so reuse the previous _current values.
                        this._reuseCurrent = null;
                    } else {
                        // Remember the anchor so that if we lose focus we can go back
                        this._currentAnchor = anchor;
                        // Remember current values
                        this._currentPlacement = placement;
                        this._currentAlignment = alignment;
                    }

                    // Add this flyout to the correct position in the cascadingStack, first collapsing flyouts 
                    // in the current stack that are not anchored ancestors to this flyout.
                    Flyout._cascadeManager.appendFlyout(this);

                    // If we're animating (eg baseShow is going to fail), or the cascadeManager is in the 
                    // middle of updating the cascade, then we have to try again later.
                    if (this._element.winAnimating) {
                        this._reuseCurrent = true;
                        // Queue us up to wait for the current animation to finish.
                        // _checkDoNext() is always scheduled after the current animation completes.
                        this._doNext = "show";
                    } else if (Flyout._cascadeManager.reentrancyLock) {
                        this._reuseCurrent = true;
                        // Queue us up to wait for the current animation to finish.
                        // Schedule a call to _checkDoNext() for when the cascadeManager unlocks.
                        this._doNext = "show";
                        var that = this;
                        Flyout._cascadeManager.unlocked.then(function () { that._checkDoNext(); });
                    } else {
                        // We call our base _baseShow to handle the actual animation
                        if (this._baseShow()) {
                            // (_baseShow shouldn't ever fail because we tested winAnimating above).
                            if (!_ElementUtilities.hasClass(this.element, "win-menu")) {
                                // Verify that the firstDiv is in the correct location.
                                // Move it to the correct location or add it if not.
                                var _elms = this._element.getElementsByTagName("*");
                                var firstDiv = this.element.querySelectorAll(".win-first");
                                if (this.element.children.length && !_ElementUtilities.hasClass(this.element.children[0], _Constants.firstDivClass)) {
                                    if (firstDiv && firstDiv.length > 0) {
                                        firstDiv.item(0).parentNode.removeChild(firstDiv.item(0));
                                    }

                                    firstDiv = this._addFirstDiv();
                                }
                                firstDiv.tabIndex = _ElementUtilities._getLowestTabIndexInList(_elms);

                                // Verify that the finalDiv is in the correct location.
                                // Move it to the correct location or add it if not.
                                var finalDiv = this.element.querySelectorAll(".win-final");
                                if (!_ElementUtilities.hasClass(this.element.children[this.element.children.length - 1], _Constants.finalDivClass)) {
                                    if (finalDiv && finalDiv.length > 0) {
                                        finalDiv.item(0).parentNode.removeChild(finalDiv.item(0));
                                    }

                                    finalDiv = this._addFinalDiv();
                                }
                                finalDiv.tabIndex = _ElementUtilities._getHighestTabIndexInList(_elms);
                            }

                            Flyout._cascadeManager.flyoutShown(this);
                        }
                    }
                },

                _lightDismiss: function Flyout_lightDismiss() {
                    Flyout._cascadeManager.collapseAll();
                },

                // Find our new flyout position.
                _findPosition: function Flyout_findPosition() {
                    this._adjustedHeight = 0;
                    this._nextTop = 0;
                    this._nextLeft = 0;
                    this._keyboardMovedUs = false;
                    this._doesScroll = false;

                    // Make sure menu commands display correctly
                    if (this._checkMenuCommands) {
                        this._checkMenuCommands();
                    }

                    // Remove old height restrictions and scrolling.
                    this._clearAdjustedStyles();

                    this._setAlignment(this._currentAlignment);

                    // Set up the new position, and prep the offset for showPopup.
                    this._getTopLeft();

                    // Adjust position
                    if (this._nextTop < 0) {
                        // Overran bottom, attach to bottom.
                        this._element.style.bottom = _Overlay._Overlay._keyboardInfo._visibleDocBottomOffset + "px";
                        this._element.style.top = "auto";
                    } else {
                        // Normal, set top
                        this._element.style.top = this._nextTop + "px";
                        this._element.style.bottom = "auto";
                    }
                    if (this._nextLeft < 0) {
                        // Overran right, attach to right
                        this._element.style.right = "0px";
                        this._element.style.left = "auto";
                    } else {
                        // Normal, set left
                        this._element.style.left = this._nextLeft + "px";
                        this._element.style.right = "auto";
                    }

                    // Adjust height/scrollbar
                    if (this._doesScroll) {
                        _ElementUtilities.addClass(this._element, _Constants.scrollsClass);
                        this._lastMaxHeight = this._element.style.maxHeight;
                        this._element.style.maxHeight = this._adjustedHeight + "px";
                    }

                    // May need to adjust if the IHM is showing.
                    if (_Overlay._Overlay._keyboardInfo._visible) {
                        // Use keyboard logic
                        this._checkKeyboardFit();

                        if (this._keyboardMovedUs) {
                            this._adjustForKeyboard();
                        }
                    }
                },

                // This determines our positioning.  We have 8 modes, the 1st four are explicit, the last 4 are automatic:
                // * top - position explicitly on the top of the anchor, shrinking and adding scrollbar as needed.
                // * bottom - position explicitly below the anchor, shrinking and adding scrollbar as needed.
                // * left - position left of the anchor, shrinking and adding a vertical scrollbar as needed.
                // * right - position right of the anchor, shrinking and adding a vertical scroolbar as needed.
                // * auto - Automatic placement.
                // * autohorizontal - Automatic placement (only left or right).
                // * autovertical - Automatic placement (only top or bottom).
                // * _cascasde - Private placement used by MenuCommand._activateFlyoutCommand
                // Auto tests the height of the anchor and the flyout.  For consistency in orientation, we imagine
                // that the anchor is placed in the vertical center of the display.  If the flyout would fit above
                // that centered anchor, then we will place the flyout vertically in relation to the anchor, otherwise
                // placement will be horizontal.
                // Vertical auto or autovertical placement will be positioned on top of the anchor if room, otherwise below the anchor.
                //   - this is because touch users would be more likely to obscure flyouts below the anchor.
                // Horizontal auto or autohorizontal placement will be positioned to the left of the anchor if room, otherwise to the right.
                //   - this is because right handed users would be more likely to obscure a flyout on the right of the anchor.
                // All three auto placements will add a vertical scrollbar if necessary.
                // 
                _getTopLeft: function Flyout_getTopLeft() {

                    var that = this;

                    function configureVerticalWithScroll(anchor) {
                        // Won't fit top or bottom. Pick the one with the most space and add a scrollbar.
                        if (topHasMoreRoom(anchor)) {
                            // Top
                            that._adjustedHeight = spaceAbove(anchor) - that._verticalMarginBorderPadding;
                            that._nextTop = _Overlay._Overlay._keyboardInfo._visibleDocTop;
                            that._nextAnimOffset = AnimationOffsets.top;
                        } else {
                            // Bottom
                            that._adjustedHeight = spaceBelow(anchor) - that._verticalMarginBorderPadding;
                            that._nextTop = _Constants.pinToBottomEdge;
                            that._nextAnimOffset = AnimationOffsets.bottom;
                        }
                        that._doesScroll = true;
                    }

                    // If the anchor is centered vertically, would the flyout fit above it?
                    function fitsVerticallyWithCenteredAnchor(anchor, flyout) {
                        // Returns true if the flyout would always fit at least top 
                        // or bottom of its anchor, regardless of the position of the anchor, 
                        // as long as the anchor never changed its height, nor did the height of 
                        // the visualViewport change.
                        return ((_Overlay._Overlay._keyboardInfo._visibleDocHeight - anchor.height) / 2) >= flyout.totalHeight;
                    }

                    function spaceAbove(anchor) {
                        return anchor.top - _Overlay._Overlay._keyboardInfo._visibleDocTop;
                    }

                    function spaceBelow(anchor) {
                        return _Overlay._Overlay._keyboardInfo._visibleDocBottom - anchor.bottom;
                    }

                    function topHasMoreRoom(anchor) {
                        return spaceAbove(anchor) > spaceBelow(anchor);
                    }

                    // See if we can fit in various places, fitting in the main view,
                    // ignoring viewport changes, like for the IHM.
                    function fitTop(bottomConstraint, flyout) {
                        that._nextTop = bottomConstraint - flyout.totalHeight;
                        that._nextAnimOffset = AnimationOffsets.top;
                        return (that._nextTop >= _Overlay._Overlay._keyboardInfo._visibleDocTop &&
                                that._nextTop + flyout.totalHeight <= _Overlay._Overlay._keyboardInfo._visibleDocBottom);
                    }

                    function fitBottom(topConstraint, flyout) {
                        that._nextTop = topConstraint;
                        that._nextAnimOffset = AnimationOffsets.bottom;
                        return (that._nextTop >= _Overlay._Overlay._keyboardInfo._visibleDocTop &&
                                that._nextTop + flyout.totalHeight <= _Overlay._Overlay._keyboardInfo._visibleDocBottom);
                    }

                    function fitLeft(leftConstraint, flyout) {
                        that._nextLeft = leftConstraint - flyout.totalWidth;
                        that._nextAnimOffset = AnimationOffsets.left;
                        return (that._nextLeft >= 0 && that._nextLeft + flyout.totalWidth <= _Overlay._Overlay._keyboardInfo._visualViewportWidth);
                    }

                    function fitRight(rightConstraint, flyout) {
                        that._nextLeft = rightConstraint;
                        that._nextAnimOffset = AnimationOffsets.right;
                        return (that._nextLeft >= 0 && that._nextLeft + flyout.totalWidth <= _Overlay._Overlay._keyboardInfo._visualViewportWidth);
                    }

                    function centerVertically(anchor, flyout) {
                        that._nextTop = anchor.top + anchor.height / 2 - flyout.totalHeight / 2;
                        if (that._nextTop < _Overlay._Overlay._keyboardInfo._visibleDocTop) {
                            that._nextTop = _Overlay._Overlay._keyboardInfo._visibleDocTop;
                        } else if (that._nextTop + flyout.totalHeight >= _Overlay._Overlay._keyboardInfo._visibleDocBottom) {
                            // Flag to pin to bottom edge of visual document.
                            that._nextTop = _Constants.pinToBottomEdge;
                        }
                    }

                    function alignHorizontally(anchor, flyout, alignment) {
                        if (alignment === "center") {
                            that._nextLeft = anchor.left + anchor.width / 2 - flyout.totalWidth / 2;
                        } else if (alignment === "left") {
                            that._nextLeft = anchor.left;
                        } else if (alignment === "right") {
                            that._nextLeft = anchor.right - flyout.totalWidth;
                        } else {
                            throw new _ErrorFromName("WinJS.UI.Flyout.BadAlignment", strings.badAlignment);
                        }
                        if (that._nextLeft < 0) {
                            that._nextLeft = 0;
                        } else if (that._nextLeft + flyout.totalWidth >= _Overlay._Overlay._keyboardInfo._visualViewportWidth) {
                            // Flag to pin to right edge of visible document.
                            that._nextLeft = _Constants.pinToRightEdge;
                        }
                    }

                    var anchorRawRectangle,
                        flyout = {},
                        anchor = {};

                    try {
                        anchorRawRectangle = this._currentAnchor.getBoundingClientRect();
                    }
                    catch (e) {
                        throw new _ErrorFromName("WinJS.UI.Flyout.NoAnchor", strings.noAnchor);
                    }

                    // Adjust for the anchor's margins.
                    anchor.top = anchorRawRectangle.top;
                    anchor.bottom = anchorRawRectangle.bottom;
                    anchor.left = anchorRawRectangle.left;
                    anchor.right = anchorRawRectangle.right;
                    anchor.height = anchor.bottom - anchor.top;
                    anchor.width = anchor.right - anchor.left;

                    // Get our flyout and margins, note that getDimension calls
                    // window.getComputedStyle, which ensures layout is updated.
                    flyout.marginTop = getDimension(this._element, "marginTop");
                    flyout.marginBottom = getDimension(this._element, "marginBottom");
                    flyout.marginLeft = getDimension(this._element, "marginLeft");
                    flyout.marginRight = getDimension(this._element, "marginRight");
                    flyout.totalWidth = _ElementUtilities.getTotalWidth(this._element);
                    flyout.totalHeight = _ElementUtilities.getTotalHeight(this._element);
                    flyout.contentWidth = _ElementUtilities.getContentWidth(this._element);
                    flyout.contentHeight = _ElementUtilities.getContentHeight(this._element);
                    this._verticalMarginBorderPadding = (flyout.totalHeight - flyout.contentHeight);
                    this._adjustedHeight = flyout.contentHeight;

                    // Check fit for requested this._currentPlacement, doing fallback if necessary
                    switch (this._currentPlacement) {
                        case "top":
                            if (!fitTop(anchor.top, flyout)) {
                                // Didn't fit, needs scrollbar
                                this._nextTop = _Overlay._Overlay._keyboardInfo._visibleDocTop;
                                this._doesScroll = true;
                                this._adjustedHeight = spaceAbove(anchor) - this._verticalMarginBorderPadding;
                            }
                            alignHorizontally(anchor, flyout, this._currentAlignment);
                            break;
                        case "bottom":
                            if (!fitBottom(anchor.bottom, flyout)) {
                                // Didn't fit, needs scrollbar
                                this._nextTop = _Constants.pinToBottomEdge;
                                this._doesScroll = true;
                                this._adjustedHeight = spaceBelow(anchor) - this._verticalMarginBorderPadding;
                            }
                            alignHorizontally(anchor, flyout, this._currentAlignment);
                            break;
                        case "left":
                            if (!fitLeft(anchor.left, flyout)) {
                                // Didn't fit, just shove it to edge
                                this._nextLeft = 0;
                            }
                            centerVertically(anchor, flyout);
                            break;
                        case "right":
                            if (!fitRight(anchor.right, flyout)) {
                                // Didn't fit, just shove it to edge
                                this._nextLeft = _Constants.pinToRightEdge;
                            }
                            centerVertically(anchor, flyout);
                            break;
                        case "autovertical":
                            if (!fitTop(anchor.top, flyout)) {
                                // Didn't fit above (preferred), so go below.
                                if (!fitBottom(anchor.bottom, flyout)) {
                                    // Didn't fit, needs scrollbar
                                    configureVerticalWithScroll(anchor);
                                }
                            }
                            alignHorizontally(anchor, flyout, this._currentAlignment);
                            break;
                        case "autohorizontal":
                            if (!fitLeft(anchor.left, flyout)) {
                                // Didn't fit left (preferred), so go right.
                                if (!fitRight(anchor.right, flyout)) {
                                    // Didn't fit,just shove it to edge
                                    this._nextLeft = _Constants.pinToRightEdge;
                                }
                            }
                            centerVertically(anchor, flyout);
                            break;
                        case "auto":
                            // Auto, if the anchor was in the vertical center of the display would we fit above it?
                            if (fitsVerticallyWithCenteredAnchor(anchor, flyout)) {
                                // It will fit above or below the anchor
                                if (!fitTop(anchor.top, flyout)) {
                                    // Didn't fit above (preferred), so go below.
                                    fitBottom(anchor.bottom, flyout);
                                }
                                alignHorizontally(anchor, flyout, this._currentAlignment);
                            } else {
                                // Won't fit above or below, try a side
                                if (!fitLeft(anchor.left, flyout) &&
                                    !fitRight(anchor.right, flyout)) {
                                    // Didn't fit left or right either
                                    configureVerticalWithScroll(anchor);
                                    alignHorizontally(anchor, flyout, this._currentAlignment);
                                } else {
                                    centerVertically(anchor, flyout);
                                }
                            }
                            break;
                        case "_cascade":
                            // Align vertically
                            // PREFERRED: When there is enough room to align a subMenu to either the top or the bottom of its
                            // anchor element, the subMenu prefers to be top aligned.
                            // FALLBACK: When there is enough room to bottom align a subMenu but not enough room to top align it, 
                            // then the subMenu will align to the bottom of its anchor element.
                            // LASTRESORT: When there is not enough room to top align or bottom align the subMenu to its anchor,
                            // then the subMenu will be center aligned to it's anchor's vertical midpoint.
                            if (!fitBottom(anchor.top - flyout.marginTop, flyout) && !fitTop(anchor.bottom + flyout.marginBottom, flyout)) {
                                centerVertically(anchor, flyout);
                            }
                            // Determine horizontal direction
                            // PREFERRED: When there is enough room to fit a subMenu on either side of the anchor,
                            // the subMenu prefers to go on the right hand side.
                            // FALLBACK: When there is only enough room to fit a subMenu on the left side of the anchor,
                            // the subMenu is placed to the left of the parent menu.
                            // LASTRESORT: When there is not enough room to fit a subMenu on either side of the anchor,
                            // the subMenu is pinned to the right edge of the window.
                            var rtl = _Global.getComputedStyle(this._element).direction === "rtl";

                            // Cascading Menus should overlap their ancestor menu by 4 pixels and we have a unit test to 
                            // verify that behavior. Because we don't have access to the ancestor flyout we need to specify
                            // the overlap in terms of our anchor element. There is a 1px border around the menu that 
                            // contains our anchor we need to overlap our anchor by 3px to ensure that we overlap the containing 
                            // Menu by 4px.
                            var pixelsToOverlapAnchor = 3;

                            var beginRight = anchor.right - flyout.marginLeft - pixelsToOverlapAnchor;
                            var beginLeft = anchor.left + flyout.marginRight + pixelsToOverlapAnchor;

                            if (rtl) {
                                if (!fitLeft(beginLeft, flyout) && !fitRight(beginRight, flyout)) {
                                    // Doesn't fit on either side, pin to the left edge.
                                    that._nextLeft = 0;
                                    that._nextAnimOffset = AnimationOffsets.left;
                                }
                            } else {
                                if (!fitRight(beginRight, flyout) && !fitLeft(beginLeft, flyout)) {
                                    // Doesn't fit on either side, pin to the right edge of the visible document.
                                    that._nextLeft = _Constants.pinToRightEdge;
                                    that._nextAnimOffset = AnimationOffsets.right;
                                }
                            }

                            break;
                        default:
                            // Not a legal this._currentPlacement value
                            throw new _ErrorFromName("WinJS.UI.Flyout.BadPlacement", strings.badPlacement);
                    }
                },

                _clearAdjustedStyles: function Flyout_clearAdjustedStyles() {
                    // Move to 0,0 in case it is off screen, so that it lays out at a reasonable size
                    this._element.style.top = "0px";
                    this._element.style.bottom = "auto";
                    this._element.style.left = "0px";
                    this._element.style.right = "auto";

                    // Clear height restrictons and scrollbar class
                    _ElementUtilities.removeClass(this._element, _Constants.scrollsClass);
                    if (this._lastMaxHeight !== null) {
                        this._element.style.maxHeight = this._lastMaxHeight;
                        this._lastMaxHeight = null;
                    }

                    // Clear Alignment
                    _ElementUtilities.removeClass(this._element, "win-rightalign");
                    _ElementUtilities.removeClass(this._element, "win-leftalign");
                },

                _setAlignment: function Flyout_setAlignment(alignment) {
                    // Alignment
                    switch (alignment) {
                        case "left":
                            _ElementUtilities.addClass(this._element, "win-leftalign");
                            break;
                        case "right":
                            _ElementUtilities.addClass(this._element, "win-rightalign");
                            break;
                        case "center":
                        case "none":
                            break;
                    }
                },

                _showingKeyboard: function Flyout_showingKeyboard(event) {
                    if (this.hidden) {
                        return;
                    }

                    // The only way that we can be showing a keyboard when a flyout is up is because the input was
                    // in the flyout itself, in which case we'll be moving ourselves.  There is no practical way
                    // for the application to override this as the focused element is in our flyout.
                    event.ensuredFocusedElementInView = true;

                    // See if the keyboard is going to force us to move
                    this._checkKeyboardFit();

                    if (this._keyboardMovedUs) {
                        // Pop out immediately, then move to new spot
                        this._element.style.opacity = 0;
                        var that = this;
                        _Global.setTimeout(function () { that._adjustForKeyboard(); that._baseAnimateIn(); }, _Overlay._Overlay._keyboardInfo._animationShowLength);
                    }
                },

                _resize: function Flyout_resize() {
                    // If hidden and not busy animating, then nothing to do
                    if (!this.hidden || this._animating) {

                        // This should only happen if the IHM is dismissing,
                        // the only other way is for viewstate changes, which
                        // would dismiss any flyout.
                        if (this._needToHandleHidingKeyboard) {
                            // Hiding keyboard, update our position, giving the anchor a chance to update first.
                            var that = this;
                            _BaseUtils._setImmediate(function () {
                                if (!that.hidden || that._animating) {
                                    that._findPosition();
                                }
                            });
                            this._needToHandleHidingKeyboard = false;
                        }
                    }
                },

                // If you were not pinned to the bottom, you might have to be now.
                _checkKeyboardFit: function Flyout_checkKeyboardFit() {
                    // Special Flyout positioning rules to determine if the Flyout needs to adjust its
                    // position because of the IHM. If the Flyout needs to adjust for the IHM, it will reposition
                    // itself to be pinned to either the top or bottom edge of the visual viewport.
                    // - Too Tall, above top, or below bottom.

                    var keyboardMovedUs = false;
                    var viewportHeight = _Overlay._Overlay._keyboardInfo._visibleDocHeight;
                    var adjustedMarginBoxHeight = this._adjustedHeight + this._verticalMarginBorderPadding;
                    if (adjustedMarginBoxHeight > viewportHeight) {
                        // The Flyout is now too tall to fit in the viewport, pin to top and adjust height.
                        keyboardMovedUs = true;
                        this._nextTop = _Constants.pinToBottomEdge;
                        this._adjustedHeight = viewportHeight - this._verticalMarginBorderPadding;
                        this._doesScroll = true;
                    } else if (this._nextTop >= 0 &&
                        this._nextTop + adjustedMarginBoxHeight > _Overlay._Overlay._keyboardInfo._visibleDocBottom) {
                        // Flyout clips the bottom of the viewport. Pin to bottom.
                        this._nextTop = _Constants.pinToBottomEdge;
                        keyboardMovedUs = true;
                    } else if (this._nextTop === _Constants.pinToBottomEdge) {
                        // We were already pinned to the bottom, so our position on screen will change
                        keyboardMovedUs = true;
                    }

                    // Signals use of basic fadein animation
                    this._keyboardMovedUs = keyboardMovedUs;
                },

                _adjustForKeyboard: function Flyout_adjustForKeyboard() {
                    // Keyboard moved us, update our metrics as needed
                    if (this._doesScroll) {
                        // Add scrollbar if we didn't already have scrollsClass
                        if (!this._lastMaxHeight) {
                            _ElementUtilities.addClass(this._element, _Constants.scrollsClass);
                            this._lastMaxHeight = this._element.style.maxHeight;
                        }
                        // Adjust height
                        this._element.style.maxHeight = this._adjustedHeight + "px";
                    }

                    // Update top/bottom
                    this._checkScrollPosition(true);
                },

                _hidingKeyboard: function Flyout_hidingKeyboard() {
                    // If we aren't visible and not animating, or haven't been repositioned, then nothing to do
                    // We don't know if the keyboard moved the anchor, so _keyboardMovedUs doesn't help here
                    if (!this.hidden || this._animating) {

                        // Snap to the final position
                        // We'll either just reveal the current space or resize the window
                        if (_Overlay._Overlay._keyboardInfo._isResized) {
                            // Flag resize that we'll need an updated position
                            this._needToHandleHidingKeyboard = true;
                        } else {
                            // Not resized, update our final position, giving the anchor a chance to update first.
                            var that = this;
                            _BaseUtils._setImmediate(function () {
                                if (!that.hidden || that._animating) {
                                    that._findPosition();
                                }
                            });
                        }
                    }
                },

                _checkScrollPosition: function Flyout_checkScrollPosition(showing) {
                    if (this.hidden && !showing) {
                        return;
                    }

                    // May need to adjust top by viewport offset
                    if (this._nextTop < 0) {
                        // Need to attach to bottom
                        this._element.style.bottom = _Overlay._Overlay._keyboardInfo._visibleDocBottomOffset + "px";
                        this._element.style.top = "auto";
                    } else {
                        // Normal, attach to top
                        this._element.style.top = this._nextTop + "px";
                        this._element.style.bottom = "auto";
                    }
                },

                // AppBar flyout animations
                _flyoutAnimateIn: function Flyout_flyoutAnimateIn() {
                    if (this._keyboardMovedUs) {
                        return this._baseAnimateIn();
                    } else {
                        this._element.style.opacity = 1;
                        this._element.style.visibility = "visible";
                        return Animations.showPopup(this._element, this._nextAnimOffset);
                    }
                },

                _flyoutAnimateOut: function Flyout_flyoutAnimateOut() {
                    if (this._keyboardMovedUs) {
                        return this._baseAnimateOut();
                    } else {
                        this._element.style.opacity = 0;
                        return Animations.hidePopup(this._element, this._nextAnimOffset);
                    }
                },

                // Hide all other flyouts besides this one
                _hideAllOtherFlyouts: function Flyout_hideAllOtherFlyouts(thisFlyout) {
                    var flyouts = _Global.document.querySelectorAll("." + _Constants.flyoutClass);
                    for (var i = 0; i < flyouts.length; i++) {
                        var flyoutControl = flyouts[i].winControl;
                        if (flyoutControl && !flyoutControl.hidden && (flyoutControl !== thisFlyout)) {
                            flyoutControl.hide();
                        }
                    }
                },

                _handleKeyDown: function Flyout_handleKeyDown(event) {
                    if ((event.keyCode === Key.space || event.keyCode === Key.enter)
                         && (this === _Global.document.activeElement)) {
                        event.preventDefault();
                        event.stopPropagation();
                        this.winControl.hide();
                    } else if (event.shiftKey && event.keyCode === Key.tab
                          && this === _Global.document.activeElement
                          && !event.altKey && !event.ctrlKey && !event.metaKey) {
                        event.preventDefault();
                        event.stopPropagation();
                        this.winControl._focusOnLastFocusableElementOrThis();
                    }
                },

                _handleFocusIn: function Flyout_handleFocusIn(event) {
                    if (!this.element.contains(event.relatedTarget)) {
                        Flyout._cascadeManager.handleFocusIntoFlyout(event);
                    }
                    // Else focus is only moving between elements in the flyout.
                    // Doesn't need to be handled by cascadeManager.
                },

                // Create and add a new first div as the first child
                _addFirstDiv: function Flyout_addFirstDiv() {
                    var firstDiv = _Global.document.createElement("div");
                    firstDiv.className = _Constants.firstDivClass;
                    firstDiv.style.display = "inline";
                    firstDiv.setAttribute("role", "menuitem");
                    firstDiv.setAttribute("aria-hidden", "true");

                    // add to beginning
                    if (this._element.children[0]) {
                        this._element.insertBefore(firstDiv, this._element.children[0]);
                    } else {
                        this._element.appendChild(firstDiv);
                    }

                    var that = this;
                    _ElementUtilities._addEventListener(firstDiv, "focusin", function () { that._focusOnLastFocusableElementOrThis(); }, false);

                    return firstDiv;
                },

                // Create and add a new final div as the last child
                _addFinalDiv: function Flyout_addFinalDiv() {
                    var finalDiv = _Global.document.createElement("div");
                    finalDiv.className = _Constants.finalDivClass;
                    finalDiv.style.display = "inline";
                    finalDiv.setAttribute("role", "menuitem");
                    finalDiv.setAttribute("aria-hidden", "true");

                    this._element.appendChild(finalDiv);
                    var that = this;
                    _ElementUtilities._addEventListener(finalDiv, "focusin", function () { that._focusOnFirstFocusableElementOrThis(); }, false);

                    return finalDiv;
                },

                _writeProfilerMark: function Flyout_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI.Flyout:" + this._id + ":" + text);
                }
            },
            {
                _cascadeManager: new _CascadeManager(),
            });
            return Flyout;
        })
    });

});