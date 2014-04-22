﻿// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <dictionary>appbar,Flyout,Flyouts,Statics</dictionary>
(function flyoutInit(WinJS) {
    "use strict";

    WinJS.Namespace.define("WinJS.UI", {
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
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        Flyout: WinJS.Namespace._lazy(function () {
            var thisWinUI = WinJS.UI;
            var Key = WinJS.Utilities.Key;

            // Class Names
            var appBarCommandClass = "win-command";
            var flyoutClass = "win-flyout";
            var flyoutLightClass = "win-ui-light";
            var menuClass = "win-menu";
            var scrollsClass = "win-scrolls";

            var finalDivClass = "win-finaldiv";
            var firstDivClass = "win-firstdiv";

            function getDimension(element, property) {
                return parseFloat(element, window.getComputedStyle(element, null)[property]);
            }

            var strings = {
                get ariaLabel() { return WinJS.Resources._getWinJSString("ui/flyoutAriaLabel").value; },
                get noAnchor() { return WinJS.Resources._getWinJSString("ui/noAnchor").value; },
                get badPlacement() { return WinJS.Resources._getWinJSString("ui/badPlacement").value; },
                get badAlignment() { return WinJS.Resources._getWinJSString("ui/badAlignment").value; }
            };

            var Flyout = WinJS.Class.derive(WinJS.UI._Overlay, function Flyout_ctor(element, options) {
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
                this._element = element || document.createElement("div");
                this._id = this._element.id || WinJS.Utilities._uniqueID(this._element);
                this._writeProfilerMark("constructor,StartTM");

                this._baseFlyoutConstructor(this._element, options);

                var _elms = this._element.getElementsByTagName("*");
                var firstDiv = this._addFirstDiv();
                firstDiv.tabIndex = WinJS.Utilities._getLowestTabIndexInList(_elms);
                var finalDiv = this._addFinalDiv();
                finalDiv.tabIndex = WinJS.Utilities._getHighestTabIndexInList(_elms);

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

                    // Make a click eating div
                    thisWinUI._Overlay._createClickEatingDivFlyout();

                    // Start flyouts hidden
                    this._element.style.visibilty = "hidden";
                    this._element.style.display = "none";

                    // Attach our css class
                    WinJS.Utilities.addClass(this._element, flyoutClass);
                    WinJS.Utilities.addClass(this._element, flyoutLightClass);

                    // Make sure we have an ARIA role
                    var role = this._element.getAttribute("role");
                    if (role === null || role === "" || role === undefined) {
                        if (WinJS.Utilities.hasClass(this._element, menuClass)) {
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

                    // Make sure _Overlay event handlers are hooked up
                    this._addOverlayEventHandlers(true);
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
                        if (value !== "top" && value !== "bottom" && value !== "left" && value !== "right" && value !== "auto") {
                            // Not a legal placement value
                            throw new WinJS.ErrorFromName("WinJS.UI.Flyout.BadPlacement", strings.badPlacement);
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
                            throw new WinJS.ErrorFromName("WinJS.UI.Flyout.BadAlignment", strings.badAlignment);
                        }
                        this._alignment = value;
                    }
                },

                _dispose: function Flyout_dispose() {
                    WinJS.Utilities.disposeSubTree(this.element);
                    this._hide();
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
                    // Just call private version to make appbar flags happy
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
                    this._keyboardInvoked = false;
                    this._hide();
                },

                _hide: function Flyout_hide() {
                    if (this._baseHide()) {
                        // Return focus if this or the flyout CED has focus
                        var active = document.activeElement;
                        if (this._previousFocus
                           && active
                           && (this._element.contains(active)
                               || WinJS.Utilities.hasClass(active, thisWinUI._Overlay._clickEatingFlyoutClass))
                           && this._previousFocus.focus !== undefined) {

                            // _isAppBarOrChild may return a CED or sentinal
                            var appBar = thisWinUI.AppBar._isAppBarOrChild(this._previousFocus);
                            if (!appBar || (appBar.winControl && !appBar.winControl.hidden && !appBar.winAnimating)) {
                                // Don't move focus back to a appBar that is hidden
                                // We cannot rely on element.style.visibility because it will be visible while animating
                                var role = this._previousFocus.getAttribute("role");
                                var fHideRole = thisWinUI._Overlay._keyboardInfo._visible && !this._keyboardWasUp;
                                if (fHideRole) {
                                    // Convince IHM to dismiss because it only came up after the flyout was up.
                                    // Change aria role and back to get IHM to dismiss.
                                    this._previousFocus.setAttribute("role", "");
                                }

                                if (this._keyboardInvoked) {
                                    this._previousFocus.focus();
                                } else {
                                    thisWinUI._Overlay._trySetActive(this._previousFocus);
                                }
                                active = document.activeElement;

                                if (fHideRole) {
                                    // Restore the role so that css is applied correctly
                                    var previousFocus = this._previousFocus;
                                    if (previousFocus) {
                                        WinJS.Utilities._yieldForDomModification(function () {
                                            previousFocus.setAttribute("role", role);
                                        });
                                    }
                                }
                            }

                            // If the anchor gained focus we want to hide the focus in the non-keyboarding scenario
                            if (!this._keyboardInvoked && (this._previousFocus === active) && appBar && active) {
                                thisWinUI._Overlay._addHideFocusClass(active);
                            }
                        }

                        this._previousFocus = null;

                        // Need click-eating div to be hidden if there are no other visible flyouts
                        if (!this._isThereVisibleFlyout()) {
                            thisWinUI._Overlay._hideClickEatingDivFlyout();
                        }
                    }
                },

                _baseFlyoutShow: function Flyout_baseFlyoutShow(anchor, placement, alignment) {
                    // Don't do anything if disabled
                    if (this.disabled) {
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
                        anchor = document.getElementById(anchor);
                    } else if (anchor && anchor.element) {
                        anchor = anchor.element;
                    }

                    // We expect an anchor
                    if (!anchor) {
                        // If we have _nextLeft, etc., then we were continuing an old animation, so that's OK
                        if (!this._retryLast) {
                            throw new WinJS.ErrorFromName("WinJS.UI.Flyout.NoAnchor", strings.noAnchor);
                        }
                        // Last call was incomplete, so use the previous _current values.
                        this._retryLast = null;
                    } else {
                        // Remember the anchor so that if we lose focus we can go back
                        this._currentAnchor = anchor;
                        // Remember current values
                        this._currentPlacement = placement;
                        this._currentAlignment = alignment;
                    }

                    // Need click-eating div to be visible, no matter what
                    if (!this._sticky) {
                        thisWinUI._Overlay._showClickEatingDivFlyout();
                    }

                    // If we're animating (eg baseShow is going to fail), then don't mess up our current state.
                    // Queue us up to wait for current animation to finish first.
                    if (this._element.winAnimating) {
                        this._doNext = "show";
                        this._retryLast = true;
                        return;
                    }

                    // We call our base _baseShow to handle the actual animation
                    if (this._baseShow()) {
                        // (_baseShow shouldn't ever fail because we tested winAnimating above).
                        if (!WinJS.Utilities.hasClass(this.element, "win-menu")) {
                            // Verify that the firstDiv is in the correct location.
                            // Move it to the correct location or add it if not.
                            var _elms = this._element.getElementsByTagName("*");
                            var firstDiv = this.element.querySelectorAll(".win-first");
                            if (this.element.children.length && !WinJS.Utilities.hasClass(this.element.children[0], firstDivClass)) {
                                if (firstDiv && firstDiv.length > 0) {
                                    firstDiv.item(0).parentNode.removeChild(firstDiv.item(0));
                                }

                                firstDiv = this._addFirstDiv();
                            }
                            firstDiv.tabIndex = WinJS.Utilities._getLowestTabIndexInList(_elms);

                            // Verify that the finalDiv is in the correct location.
                            // Move it to the correct location or add it if not.
                            var finalDiv = this.element.querySelectorAll(".win-final");
                            if (!WinJS.Utilities.hasClass(this.element.children[this.element.children.length - 1], finalDivClass)) {
                                if (finalDiv && finalDiv.length > 0) {
                                    finalDiv.item(0).parentNode.removeChild(finalDiv.item(0));
                                }

                                finalDiv = this._addFinalDiv();
                            }
                            finalDiv.tabIndex = WinJS.Utilities._getHighestTabIndexInList(_elms);
                        }

                        // Hide all other flyouts
                        this._hideAllOtherFlyouts(this);

                        // Store what had focus before showing the Flyout.
                        // This must happen after we hide all other flyouts so that we store the correct element.
                        this._previousFocus = document.activeElement;
                    }
                },

                _endShow: function Flyout_endShow() {
                    // Remember if the IHM was up since we may need to hide it when the flyout hides.
                    // This check needs to happen after the IHM has a chance to hide itself after we force hide
                    // all other visible Flyouts.
                    this._keyboardWasUp = thisWinUI._Overlay._keyboardInfo._visible;

                    if (!WinJS.Utilities.hasClass(this.element, "win-menu")) {
                        // Put focus on the first child in the Flyout
                        this._focusOnFirstFocusableElementOrThis();

                        // Prevent what is gaining focus from showing that it has focus
                        thisWinUI._Overlay._addHideFocusClass(document.activeElement);
                    } else {
                        // Make sure the menu has focus, but don't show a focus rect
                        thisWinUI._Overlay._trySetActive(this._element);
                    }
                },

                // Find our new flyout position.
                _findPosition: function Flyout_findPosition() {
                    this._nextHeight = null;
                    this._keyboardMovedUs = false;
                    this._hasScrolls = false;
                    this._keyboardSquishedUs = 0;

                    // Make sure menu toggles behave
                    if (this._checkToggle) {
                        this._checkToggle();
                    }

                    // Update margins for this alignment and remove old scrolling
                    this._updateAdjustments(this._currentAlignment);

                    // Set up the new position, and prep the offset for showPopup
                    this._getTopLeft();
                    // Panning top offset is calculated top
                    this._scrollTop = this._nextTop;

                    // Adjust position
                    if (this._nextTop < 0) {
                        // Need to attach to bottom
                        this._element.style.bottom = "0px";
                        this._element.style.top = "auto";
                    } else {
                        // Normal, attach to top
                        this._element.style.top = this._nextTop + "px";
                        this._element.style.bottom = "auto";
                    }
                    if (this._nextLeft < 0) {
                        // Overran right, attach to right
                        this._element.style.right = "0px";
                        this._element.style.left = "auto";
                    } else {
                        // Normal, attach to left
                        this._element.style.left = this._nextLeft + "px";
                        this._element.style.right = "auto";
                    }

                    // Adjust height/scrollbar
                    if (this._nextHeight !== null) {
                        WinJS.Utilities.addClass(this._element, scrollsClass);
                        this._lastMaxHeight = this._element.style.maxHeight;
                        this._element.style.maxHeight = this._nextHeight + "px";
                        this._nextBottom = this._nextTop + this._nextHeight;
                        this._hasScrolls = true;
                    }
                    
                    // May need to adjust if the IHM is showing.
                    if (thisWinUI._Overlay._keyboardInfo._visible) {
                        // Use keyboard logic
                        this._checkKeyboardFit();

                        if (this._keyboardMovedUs) {
                            this._adjustForKeyboard();
                        }
                    }
                },

                // This determines our positioning.  We have 5 modes, the 1st four are explicit, the last is automatic:
                // * top - position explicitly on the top of the anchor, shrinking and adding scrollbar as needed.
                // * bottom - position explicitly below the anchor, shrinking and adding scrollbar as needed.
                // * left - position left of the anchor, shrinking and adding a vertical scrollbar as needed.
                // * right - position right of the anchor, shrinking and adding a vertical scroolbar as needed.
                // * auto - Automatic placement.
                // Auto tests the height of the anchor and the flyout.  For consistency in orientation, we imagine
                // that the anchor is placed in the vertical center of the display.  If the flyout would fit above
                // that centered anchor, then we will place the flyout vertically in relation to the anchor, otherwise
                // placement will be horizontal.
                // Vertical auto placement will be positioned on top of the anchor if room, otherwise below the anchor.
                //   - this is because touch users would be more likely to obscure flyouts below the anchor.
                // Horizontal auto placement will be positioned to the left of the anchor if room, otherwise to the right.
                //   - this is because right handed users would be more likely to obscure a flyout on the right of the anchor.
                // Auto placement will add a vertical scrollbar if necessary.
                _getTopLeft: function Flyout_getTopLeft() {
                    var anchorRawRectangle = this._currentAnchor.getBoundingClientRect(),
                        flyout = {},
                        anchor = {};

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
                    flyout.width = WinJS.Utilities.getTotalWidth(this._element);
                    flyout.height = WinJS.Utilities.getTotalHeight(this._element);
                    flyout.innerWidth = WinJS.Utilities.getContentWidth(this._element);
                    flyout.innerHeight = WinJS.Utilities.getContentHeight(this._element);
                    this._nextMarginPadding = (flyout.height - flyout.innerHeight);

                    // Check fit for requested this._currentPlacement, doing fallback if necessary
                    switch (this._currentPlacement) {
                        case "top":
                            if (!this._fitTop(anchor, flyout)) {
                                // Didn't fit, needs scrollbar
                                this._nextTop = 0;
                                this._nextHeight = anchor.top - this._nextMarginPadding;
                            }
                            this._centerHorizontally(anchor, flyout, this._currentAlignment);
                            break;
                        case "bottom":
                            if (!this._fitBottom(anchor, flyout)) {
                                // Didn't fit, needs scrollbar
                                this._nextTop = -1;
                                this._nextHeight = thisWinUI._Overlay._keyboardInfo._visibleDocHeight - anchor.bottom - this._nextMarginPadding;
                            }
                            this._centerHorizontally(anchor, flyout, this._currentAlignment);
                            break;
                        case "left":
                            if (!this._fitLeft(anchor, flyout)) {
                                // Didn't fit, just shove it to edge
                                this._nextLeft = 0;
                            }
                            this._centerVertically(anchor, flyout);
                            break;
                        case "right":
                            if (!this._fitRight(anchor, flyout)) {
                                // Didn't fit,just shove it to edge
                                this._nextLeft = -1;
                            }
                            this._centerVertically(anchor, flyout);
                            break;
                        case "auto":
                            // Auto, if the anchor was in the vertical center of the display would we fit above it?
                            if ((this._sometimesFitsAbove(anchor, flyout) && this._fitTop(anchor, flyout)) || this._fitBottom(anchor, flyout)) {
                                this._centerHorizontally(anchor, flyout, this._currentAlignment);
                            } else {
                                // Won't fit above or below, try a side
                                if (!this._fitLeft(anchor, flyout) &&
                                    !this._fitRight(anchor, flyout)) {
                                    // Didn't fit left or right either, is top or bottom bigger?
                                    if (this._topHasMoreRoom(anchor)) {
                                        // Top, won't fit, needs scrollbar
                                        this._nextTop = 0;
                                        this._nextHeight = anchor.top - this._nextMarginPadding;
                                    } else {
                                        // Bottom, won't fit, needs scrollbar
                                        this._nextTop = -1;
                                        this._nextHeight = thisWinUI._Overlay._keyboardInfo._visibleDocHeight - anchor.bottom - this._nextMarginPadding;
                                    }
                                    this._centerHorizontally(anchor, flyout, this._currentAlignment);
                                } else {
                                    this._centerVertically(anchor, flyout);
                                }
                            }
                            break;
                        default:
                            // Not a legal this._currentPlacement value
                            throw new WinJS.ErrorFromName("WinJS.UI.Flyout.BadPlacement", strings.badPlacement);
                    }

                    // Remember "bottom" in case we need to consider keyboard later, only tested for top-pinned bars
                    this._nextBottom = this._nextTop + flyout.height;
                },

                // If the anchor is centered vertically, would the flyout fit above it?
                _sometimesFitsAbove: function Flyout_sometimesFitsAbove(anchor, flyout) {
                    return ((thisWinUI._Overlay._keyboardInfo._visibleDocHeight - anchor.height) / 2) >= flyout.height;
                },

                _topHasMoreRoom: function Flyout_topHasMoreRoom(anchor) {
                    return anchor.top > thisWinUI._Overlay._keyboardInfo._visibleDocHeight - anchor.bottom;
                },

                // See if we can fit in various places, fitting in the main view,
                // ignoring viewport changes, like for the IHM.
                _fitTop: function Flyout_fitTop(anchor, flyout) {
                    this._nextTop = anchor.top - flyout.height;
                    this._nextAnimOffset = { top: "50px", left: "0px", keyframe: "WinJS-showFlyoutTop" };
                    return (this._nextTop >= 0 &&
                            this._nextTop + flyout.height <= thisWinUI._Overlay._keyboardInfo._visibleDocBottom);
                },

                _fitBottom: function Flyout_fitBottom(anchor, flyout) {
                    this._nextTop = anchor.bottom;
                    this._nextAnimOffset = { top: "-50px", left: "0px", keyframe: "WinJS-showFlyoutBottom" };
                    return (this._nextTop >= 0 &&
                            this._nextTop + flyout.height <= thisWinUI._Overlay._keyboardInfo._visibleDocBottom);
                },

                _fitLeft: function Flyout_fitLeft(anchor, flyout) {
                    this._nextLeft = anchor.left - flyout.width;
                    this._nextAnimOffset = { top: "0px", left: "50px", keyframe: "WinJS-showFlyoutLeft" };
                    return (this._nextLeft >= 0 && this._nextLeft + flyout.width <= thisWinUI._Overlay._keyboardInfo._visualViewportWidth);
                },

                _fitRight: function Flyout_fitRight(anchor, flyout) {
                    this._nextLeft = anchor.right;
                    this._nextAnimOffset = { top: "0px", left: "-50px", keyframe: "WinJS-showFlyoutRight" };
                    return (this._nextLeft >= 0 && this._nextLeft + flyout.width <= thisWinUI._Overlay._keyboardInfo._visualViewportWidth);
                },

                _centerVertically: function Flyout_centerVertically(anchor, flyout) {
                    this._nextTop = anchor.top + anchor.height / 2 - flyout.height / 2;
                    if (this._nextTop < 0) {
                        this._nextTop = 0;
                    } else if (this._nextTop + flyout.height >= thisWinUI._Overlay._keyboardInfo._visibleDocBottom) {
                        // Flag to put on bottom
                        this._nextTop = -1;
                    }
                },

                _centerHorizontally: function Flyout_centerHorizontally(anchor, flyout, alignment) {
                    if (alignment === "center") {
                        this._nextLeft = anchor.left + anchor.width / 2 - flyout.width / 2;
                    } else if (alignment === "left") {
                        this._nextLeft = anchor.left;
                    } else if (alignment === "right") {
                        this._nextLeft = anchor.right - flyout.width;
                    } else {
                        throw new WinJS.ErrorFromName("WinJS.UI.Flyout.BadAlignment", strings.badAlignment);
                    }
                    if (this._nextLeft < 0) {
                        this._nextLeft = 0;
                    } else if (this._nextLeft + flyout.width >= document.documentElement.clientWidth) {
                        // flag to put on right
                        this._nextLeft = -1;
                    }
                },

                _updateAdjustments: function Flyout_updateAdjustments(alignment) {
                    // Move to 0,0 in case it is off screen, so that it lays out at a reasonable size
                    this._element.style.top = "0px";
                    this._element.style.bottom = "auto";
                    this._element.style.left = "0px";
                    this._element.style.right = "auto";

                    // Scrolling may not be necessary
                    WinJS.Utilities.removeClass(this._element, scrollsClass);
                    if (this._lastMaxHeight !== null) {
                        this._element.style.maxHeight = this._lastMaxHeight;
                        this._lastMaxHeight = null;
                    }
                    // Alignment
                    if (alignment === "center") {
                        WinJS.Utilities.removeClass(this._element, "win-leftalign");
                        WinJS.Utilities.removeClass(this._element, "win-rightalign");
                    } else if (alignment === "left") {
                        WinJS.Utilities.addClass(this._element, "win-leftalign");
                        WinJS.Utilities.removeClass(this._element, "win-rightalign");
                    } else if (alignment === "right") {
                        WinJS.Utilities.addClass(this._element, "win-rightalign");
                        WinJS.Utilities.removeClass(this._element, "win-leftalign");
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
                        setTimeout(function () { that._adjustForKeyboard(); that._baseAnimateIn(); }, thisWinUI._Overlay._keyboardInfo._animationShowLength);
                    }
                },

                _resize: function Flyout_resize(event) {
                    // If hidden and not busy animating, then nothing to do
                    if (this.hidden && !this._animating) {
                        return;
                    }

                    // This should only happen if the IHM is dismissing,
                    // the only other way is for viewstate changes, which
                    // would dismiss any flyout.
                    if (this._keyboardHiding) {
                        // Hiding keyboard, update our position, giving the anchor a chance to update first.
                        var that = this;
                        WinJS.Utilities._setImmediate(function () { that._findPosition(); });
                        this._keyboardHiding = false;
                    }
                },

                _checkKeyboardFit: function Flyout_checkKeyboardFit() {
                    // Check for moving to fit keyboard:
                    // - Too Tall, above top, or below bottom.
                    var height = WinJS.Utilities.getTotalHeight(this._element);
                    var viewportHeight = thisWinUI._Overlay._keyboardInfo._visibleDocHeight - this._nextMarginPadding;
                    if (height > viewportHeight) {
                        // Too Tall, pin to top with max height
                        this._keyboardMovedUs = true;
                        this._scrollTop = 0;
                        this._keyboardSquishedUs = viewportHeight;
                    } else if (this._nextTop === -1) {
                        // Pinned to bottom counts as moved
                        this._keyboardMovedUs = true;
                    } else if (this._nextTop < 0) {
                        // Above the top of the viewport
                        this._scrollTop = 0;
                        this._keyboardMovedUs = true;
                    } else if (this._nextBottom > thisWinUI._Overlay._keyboardInfo._visibleDocBottom) {
                        // Below the bottom of the viewport
                        this._scrollTop = -1;
                        this._keyboardMovedUs = true;
                    }
                },

                _adjustForKeyboard: function Flyout_adjustForKeyboard() {
                    // Keyboard moved us, update our metrics as needed
                    if (this._keyboardSquishedUs) {
                        // Add scrollbar if we didn't already have scrollsClass
                        if (!this._hasScrolls) {
                            WinJS.Utilities.addClass(this._element, scrollsClass);
                            this._lastMaxHeight = this._element.style.maxHeight;
                        }
                        // Adjust height
                        this._element.style.maxHeight = this._keyboardSquishedUs + "px";
                    }

                    // Update top/bottom
                    this._checkScrollPosition(true);
                },

                _hidingKeyboard: function Flyout_hidingKeyboard(event) {
                    // If we aren't visible and not animating, or haven't been repositioned, then nothing to do
                    // We don't know if the keyboard moved the anchor, so _keyboardMovedUs doesn't help here
                    if (this.hidden && !this._animating) {
                        return;
                    }

                    // Snap to the final position
                    // We'll either just reveal the current space or resize the window
                    if (thisWinUI._Overlay._keyboardInfo._isResized) {
                        // Flag resize that we'll need an updated position
                        this._keyboardHiding = true;
                    } else {
                        // Not resized, update our final position, giving the anchor a chance to update first.
                        var that = this;
                        WinJS.Utilities._setImmediate(function () { that._findPosition(); });
                    }
                },

                _checkScrollPosition: function Flyout_checkScrollPosition(showing) {
                    if (this.hidden && !showing) {
                        return;
                    }

                    // May need to adjust top by viewport offset
                    if (this._scrollTop < 0) {
                        // Need to attach to bottom
                        this._element.style.bottom = thisWinUI._Overlay._keyboardInfo._visibleDocBottomOffset + "px";
                        this._element.style.top = "auto";
                    } else {
                        // Normal, attach to top
                        this._element.style.top = "0px";
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
                        return WinJS.UI.Animation.showPopup(this._element, this._nextAnimOffset);
                    }
                },

                _flyoutAnimateOut: function Flyout_flyoutAnimateOut() {
                    if (this._keyboardMovedUs) {
                        return this._baseAnimateOut();
                    } else {
                        this._element.style.opacity = 0;
                        return WinJS.UI.Animation.hidePopup(this._element, this._nextAnimOffset);
                    }
                },

                // Hide all other flyouts besides this one
                _hideAllOtherFlyouts: function Flyout_hideAllOtherFlyouts(thisFlyout) {
                    var flyouts = document.querySelectorAll(".win-flyout");
                    for (var i = 0; i < flyouts.length; i++) {
                        var flyoutControl = flyouts[i].winControl;
                        if (flyoutControl && !flyoutControl.hidden && (flyoutControl !== thisFlyout)) {
                            flyoutControl.hide();
                        }
                    }
                },

                // Returns true if there is a flyout in the DOM that is not hidden
                _isThereVisibleFlyout: function Flyout_isThereVisibleFlyout() {
                    var flyouts = document.querySelectorAll(".win-flyout");
                    for (var i = 0; i < flyouts.length; i++) {
                        var flyoutControl = flyouts[i].winControl;
                        if (flyoutControl && !flyoutControl.hidden) {
                            return true;
                        }
                    }

                    return false;
                },

                _handleKeyDown: function Flyout_handleKeyDown(event) {
                    // Escape closes flyouts but if the user has a text box with an IME candidate 
                    // window open, we want to skip the ESC key event since it is handled by the IME.
                    // When the IME handles a key it sets event.keyCode === Key.IME for an easy check.
                    if (event.keyCode === Key.escape && event.keyCode !== Key.IME) {
                        // Show a focus rect on what we move focus to
                        event.preventDefault();
                        event.stopPropagation();
                        this.winControl._keyboardInvoked = true;
                        this.winControl._hide();
                    } else if ((event.keyCode === Key.space || event.keyCode === Key.enter)
                         && (this === document.activeElement)) {
                        event.preventDefault();
                        event.stopPropagation();
                        this.winControl.hide();
                    } else if (event.shiftKey && event.keyCode === Key.tab
                          && this === document.activeElement
                          && !event.altKey && !event.ctrlKey && !event.metaKey) {
                        event.preventDefault();
                        event.stopPropagation();
                        this.winControl._focusOnLastFocusableElementOrThis();
                    }
                },

                // Create and add a new first div as the first child
                _addFirstDiv: function Flyout_addFirstDiv() {
                    var firstDiv = document.createElement("div");
                    firstDiv.className = firstDivClass;
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
                    WinJS.Utilities._addEventListener(firstDiv, "focusin", function () { that._focusOnLastFocusableElementOrThis(); }, false);

                    return firstDiv;
                },

                // Create and add a new final div as the last child
                _addFinalDiv: function Flyout_addFinalDiv() {
                    var finalDiv = document.createElement("div");
                    finalDiv.className = finalDivClass;
                    finalDiv.style.display = "inline";
                    finalDiv.setAttribute("role", "menuitem");
                    finalDiv.setAttribute("aria-hidden", "true");

                    this._element.appendChild(finalDiv);
                    var that = this;
                    WinJS.Utilities._addEventListener(finalDiv, "focusin", function () { that._focusOnFirstFocusableElementOrThis(); }, false);

                    return finalDiv;
                },

                _writeProfilerMark: function Flyout_writeProfilerMark(text) {
                    WinJS.Utilities._writeProfilerMark("WinJS.UI.Flyout:" + this._id + ":" + text);
                }
            });
            return Flyout;
        })
    });

})(WinJS);
