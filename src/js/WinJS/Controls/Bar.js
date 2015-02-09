// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <dictionary>animatable,bar,appbars,divs,Flyout,Flyouts,iframe,Statics,unfocus,unselectable</dictionary>
define([
    'exports',
    '../Core/_Global',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations',
    '../Application',
    '../ControlProcessor',
    '../Promise',
    '../Scheduler',
    '../Utilities/_Control',
    '../Utilities/_ElementUtilities',
    'AppBar/_Constants',
    'require-style!less/styles-overlay',
    'require-style!less/colors-overlay'
], function barInit(exports, _Global, _WinRT, _Base, _BaseUtils, _ErrorFromName, _Events, _Resources, _WriteProfilerMark, Animations, Application, ControlProcessor, Promise, Scheduler, _Control, _ElementUtilities, _Constants) {
    "use strict";

    var _Constants = {
        barClass: "win-appbar",
        ihmClass: "win-overlay",
        barPlacementTop: "top",
        barPlacementBottom: "bottom",
        topClass: "win-top",
        bottomClass: "win-bottom",
        _visualViewportClass: "win-visualviewport-space",
    };

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _Bar: _Base.Namespace._lazy(function () {

            function _allManipulationChanged(event) {
                var elements = _Global.document.querySelectorAll("." + _Constants.barClass);
                if (elements) {
                    var len = elements.length;
                    for (var i = 0; i < len; i++) {
                        var element = elements[i];
                        var bar = element.winControl;
                        if (bar && !element.disabled) {
                            bar._manipulationChanged(event);
                        }
                    }
                }
            }

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/appBarAriaLabel").value; },
            };

            var _Bar = _Base.Class.define(function _Bar_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI._Bar">
                /// <summary locid="WinJS.UI._Bar">
                /// Constructs the Bar control and associates it with the underlying DOM element.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI._Bar_p:element">
                /// The DOM element to be associated with the Bar control.
                /// </param>
                /// <param name="options" type="Object" domElement="false" locid="WinJS.UI._Bar_p:options">
                /// The set of options to be applied initially to the Bar control.
                /// </param>
                /// <returns type="WinJS.UI._Bar" locid="WinJS.UI._Bar_returnValue">A fully constructed Bar control.</returns>
                /// </signature>
                this._baseBarConstructor(element, options);
            }, {
                // Functions/properties
                _baseBarConstructor: function _Bar_baseBarConstructor(element, options) {

                    this._initializing = true;

                    // Simplify checking later
                    options = options || {};

                    // Make sure there's an element
                    this._element = element || _Global.document.createElement("div");
                    this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
                    this._writeProfilerMark("constructor,StartTM");

                    // Remember ourselves
                    element.winControl = this;

                    // Attach our css class.
                    _ElementUtilities.addClass(this._element, _Constants.barClass);
                    _ElementUtilities.addClass(this._element, _Constants.ihmClass);
                    _ElementUtilities.addClass(this._element, "win-disposable");

                    // Make sure we have an ARIA role
                    var role = this._element.getAttribute("role");
                    if (!role) {
                        this._element.setAttribute("role", "menubar");
                    }
                    var label = this._element.getAttribute("aria-label");
                    if (!label) {
                        this._element.setAttribute("aria-label", strings.ariaLabel);
                    }

                    _Bar._addMixin();

                    this._inputPaneShowing = this._inputPaneShowing.bind(this);
                    this._inputPaneHiding = this._inputPaneHiding.bind(this);
                    this._documentScroll = this._documentScroll.bind(this);

                    if (_WinRT.Windows.UI.ViewManagement.InputPane) {
                        // React to Soft Keyboard events
                        var inputPane = _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView();
                        inputPane.addEventListener("showing", this._inputPaneShowing, false);
                        inputPane.addEventListener("hiding", this._inputPaneHiding, false);

                        _Global.document.addEventListener("scroll", this._documentScroll, false);
                    }

                    // Need to know if the IHM is done scrolling
                    _Global.document.addEventListener("MSManipulationStateChanged", _allManipulationChanged, false);

                    this._disposed = false;

                    if (!this._element.hasAttribute("tabIndex")) {
                        this._element.tabIndex = -1;
                    }

                    // We don't want to be selectable, set UNSELECTABLE
                    var unselectable = this._element.getAttribute("unselectable");
                    if (unselectable === null || unselectable === undefined) {
                        this._element.setAttribute("unselectable", "on");
                    }

                    _Control.setOptions(this, options);

                    this._initializing = false;

                },


                /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI._Bar.element" helpKeyword="WinJS.UI._Bar.element">The DOM element the Bar is attached to</field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="String" defaultValue="bottom" oamOptionsDatatype="WinJS.UI.Bar.placement" locid="WinJS.UI.Bar.placement" helpKeyword="WinJS.UI.Bar.placement">The placement of the Bar on the display.  Values are "top" or "bottom".</field>
                placement: {
                    get: function Bar_get_placement() {
                        return this._placement;
                    },
                    set: function Bar_set_placement(value) {
                        this._placement = (value === _Constants.barPlacementTop) ? _Constants.barPlacementTop : _Constants.barPlacementBottom;

                        // Clean up win-top, win-bottom styles
                        if (this._placement === _Constants.barPlacementTop) {
                            _ElementUtilities.addClass(this._element, _Constants.topClass);
                            _ElementUtilities.removeClass(this._element, _Constants.bottomClass);
                        } else if (this._placement === _Constants.barPlacementBottom) {
                            _ElementUtilities.removeClass(this._element, _Constants.topClass);
                            _ElementUtilities.addClass(this._element, _Constants.bottomClass);
                        }

                        // Update our position on screen.
                        this._ensurePosition();
                    }
                },

                // Get the top offset for top bars.
                _getTopOfVisualViewport: function Bar_getTopOfVisualViewPort() {
                    return _Bar._Bar._keyboardInfo._visibleDocTop;
                },

                // Get the bottom offset for bottom bars.
                _getAdjustedBottom: function bar_getAdjustedBottom() {
                    // Need the distance the IHM moved as well.
                    return _Bar._Bar._keyboardInfo._visibleDocBottomOffset;
                },

                _inputPaneShowing: function Bar_inputPaneShowing(event) {
                    this._needToHandleInputPaneHiding = false;

                    // If we're already moved, then ignore the whole thing
                    if (_Bar._Bar._keyboardInfo._visible && this._alreadyInPlace()) {
                        return;
                    }

                    this._needToHandleInputPaneShowing = true;
                    // If focus is in the bar, don't cause scrolling.
                    if (!this.hidden && this._element.contains(_Global.document.activeElement)) {
                        event.ensuredFocusedElementInView = true;
                    }

                    // Don't be obscured, clear _scrollHappened flag to give us inference later on when to re-show ourselves.
                    this._scrollHappened = false;

                    // Also set timeout regardless, so we can clean up our _inputPaneShowing flag.
                    var that = this;
                    _Global.setTimeout(function (e) { that._checkKeyboardTimer(e); }, _Bar._Bar._keyboardInfo._animationShowLength + _Bar._Bar._scrollTimeout);
                },

                _inputPaneHiding: function bar_inputPaneHiding() {
                    // We'll either just reveal the current space under the IHM or restore the window height.

                    // We won't be obscured
                    this._needToHandleInputPaneHiding = false;
                    this._needToHandleInputPaneHiding = true;

                    // We'll either just reveal the current space or resize the window
                    if (!_Bar._Bar._keyboardInfo._isResized) {
                        // If we're not completely hidden, only fake hiding under keyboard, or already animating,
                        // then snap us to our final position.
                        if (this._visible || this._animating) {
                            // Not resized, update our final position immediately
                            this._checkScrollPosition();
                            this._element.style.display = "";
                        }
                        this._needToHandleInputPaneHiding = false;
                    }
                    // Else resize should clear keyboardHiding.
                },

                _resize: function Bar_resize(event) {
                    // If we're hidden by the keyboard, then hide bottom bar so it doesn't pop up twice when it scrolls
                    if (this._needToHandleInputPaneHiding) {
                        // Top is allowed to scroll off the top, but we don't want bottom to peek up when
                        // scrolled into view since we'll show it ourselves and don't want a stutter effect.
                        if (this._visible) {
                            if (this._placement !== _Constants.barPlacementTop) {
                                // If viewport doesn't match window, need to vanish momentarily so it doesn't scroll into view,
                                // however we don't want to toggle the visibility="hidden" hidden flag.
                                this._element.style.display = "none";
                            }
                        }
                        // else if we're top we stay, and if there's a flyout, stay obscured by the keyboard.
                    } else if (this._needToHandleInputPaneHiding) {
                        this._needToHandleInputPaneHiding = false;
                        if (this._visible || this._animating) {
                            // Snap to final position
                            this._checkScrollPosition();
                            this._element.style.display = "";
                        }
                    }

                    // Make sure everything still fits.
                    if (!this._initializing) {
                        this._layout.resize(event);
                    }
                },

                _checkKeyboardTimer: function Bar_checkKeyboardTimer() {
                    if (!this._scrollHappened) {
                        this._mayEdgeBackIn();
                    }
                },

                _manipulationChanged: function Bar_manipulationChanged(event) {
                    // See if we're at the not manipulating state, and we had a scroll happen,
                    // which is implicitly after the keyboard animated.
                    if (event.currentState === 0 && this._scrollHappened) {
                        this._mayEdgeBackIn();
                    }
                },

                _mayEdgeBackIn: function Bar_mayEdgeBackIn() {
                    // May need to react to IHM being resized event
                    if (this._needToHandleInputPaneHiding) {
                        // If not top bar or viewport isn't still at top, then need to show again
                        this._needToHandleInputPaneHiding = false;
                        // If obscured (IHM + flyout showing), it's ok to stay obscured.
                        // If bottom we have to move, or if top scrolled off screen.
                        if ((this._placement !== _Constants.barPlacementTop || _Bar._Bar._keyboardInfo._visibleDocTop !== 0)) {
                            var toPosition = this._visiblePosition;
                            this._lastPositionVisited = displayModeVisiblePositions.hidden;
                            this._changeVisiblePosition(toPosition, false);
                        } else {
                            // Ensure any animations dropped during the showing keyboard are caught up.
                            this._checkDoNext();
                        }
                    }
                    this._scrollHappened = false;
                },

                _ensurePosition: function Bar_ensurePosition() {
                    // Position the bar element relative to the top or bottom edge of the visible
                    // document, based on the the visible position we think we need to be in.
                    var offSet = this._computePositionOffset();
                    this._element.style.bottom = offSet.bottom;
                    this._element.style.top = offSet.top;

                },

                _computePositionOffset: function Bar_computePositionOffset() {
                    // Calculates and returns top and bottom offsets for the bar element, relative to the top or bottom edge of the visible
                    // document.
                    var positionOffSet = {};

                    if (this._placement === _Constants.barPlacementBottom) {
                        // If the IHM is open, the bottom of the visual viewport may or may not be obscured
                        // Use _getAdjustedBottom to account for the IHM if it is covering the bottom edge.
                        positionOffSet.bottom = this._getAdjustedBottom() + "px";
                        positionOffSet.top = "";
                    } else if (this._placement === _Constants.barPlacementTop) {
                        positionOffSet.bottom = "";
                        positionOffSet.top = this._getTopOfVisualViewport() + "px";
                    }

                    return positionOffSet;
                },

                _checkScrollPosition: function Bar_checkScrollPosition() {
                    // If IHM has appeared, then remember we may come in
                    if (this._needToHandleInputPaneHiding) {
                        // Tag that it's OK to edge back in.
                        this._scrollHappened = true;
                        return;
                    }

                    // We only need to update if we're not completely hidden.
                    if (this._visible || this._animating) {
                        this._ensurePosition();
                        // Ensure any animations dropped during the showing keyboard are caught up.
                        this._checkDoNext();
                    }
                },

                _alreadyInPlace: function Bar_alreadyInPlace() {
                    // See if we're already where we're supposed to be.
                    var offSet = this._computePositionOffset();
                    return (offSet.top === this._element.style.top && offSet.bottom === this._element.style.bottom);
                },

            }, {
                // Statics

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
                        if (occluded && !_Bar._keyboardInfo._isResized) {
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
                        return _Bar._keyboardInfo._visibleDocTop + _Bar._keyboardInfo._visibleDocHeight;

                    },

                    // Get the height of the visible document, e.g. the height of the visual viewport minus any IHM occlusion.
                    get _visibleDocHeight() {
                        return _Bar._keyboardInfo._visualViewportHeight - _Bar._keyboardInfo._extraOccluded;

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

                // Padding for IHM timer to allow for first scroll event
                _scrollTimeout: 150,

                _addMixin: function () {
                    if (_Bar._keyboardInfo._visibleDocTop === undefined) {


                        // Mixin for WWA's Soft Keyboard offsets when -ms-device-fixed CSS positioning is supported, or for general _Bar positioning whenever we are in a web browser outside of WWA.
                        // If we are in an instance of WWA, all _Bar elements will use -ms-device-fixed positioning which fixes them to the visual viewport directly.
                        var _keyboardInfo_Mixin = {

                            // Get the top offset of our visible area, aka the top of the visual viewport.
                            // This is always 0 when _Bar elements use -ms-device-fixed positioning.
                            _visibleDocTop: function _visibleDocTop() {
                                return 0;
                            },

                            // Get the bottom offset of the visual viewport, plus any IHM occlusion.
                            _visibleDocBottomOffset: function _visibleDocBottomOffset() {
                                // For -ms-device-fixed positioned elements, the bottom is just 0 when there's no IHM.
                                // When the IHM appears, the text input that invoked it may be in a position on the page that is occluded by the IHM.
                                // In that instance, the default browser behavior is to resize the visual viewport and scroll the input back into view.
                                // However, if the viewport resize is prevented by an IHM event listener, the keyboard will still occlude
                                // -ms-device-fixed elements, so we adjust the bottom offset of the bar by the height of the occluded rect of the IHM.
                                return (_Bar._keyboardInfo._isResized) ? 0 : _Bar._keyboardInfo._extraOccluded;
                            },

                            // Get the visual viewport height. window.innerHeight doesn't return floating point values which are present with high DPI.
                            _visualViewportHeight: function _visualViewportHeight() {
                                var boundingRect = _Bar._keyboardInfo._visualViewportSpace;
                                return boundingRect.bottom - boundingRect.top;
                            },

                            // Get the visual viewport width. window.innerWidth doesn't return floating point values which are present with high DPI.
                            _visualViewportWidth: function _visualViewportWidth() {
                                var boundingRect = _Bar._keyboardInfo._visualViewportSpace;
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
                        // In that instance, all _Bar elements fall back to using CSS fixed positioning.
                        // This is for backwards compatibility with Apache Cordova Apps targeting WWA since they target IE10.
                        // This is essentially the original logic for WWA _Bar / Soft Keyboard interactions we used when windows 8 first launched.
                        var _keyboardInfo_Windows8WWA_Mixin = {
                            // Get the top of our visible area in terms of its absolute distance from the top of document.documentElement.
                            // Normalizes any offsets which have have occured between the visual viewport and the layout viewport due to resizing the viewport to fit the IHM and/or optical zoom.
                            _visibleDocTop: function _visibleDocTop_Windows8WWA() {
                                return _Global.window.pageYOffset - _Global.document.documentElement.scrollTop;
                            },

                            // Get the bottom offset of the visual viewport from the bottom of the layout viewport, plus any IHM occlusion.
                            _visibleDocBottomOffset: function _visibleDocBottomOffset_Windows8WWA() {
                                return _Global.document.documentElement.clientHeight - _Bar._keyboardInfo._visibleDocBottom;
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
                            Object.defineProperty(_Bar._keyboardInfo, propertyName, {
                                get: propertiesMixin[propertyName],
                            });
                        }
                    }
                }
            });

            return _Bar;
        })
    });

});

