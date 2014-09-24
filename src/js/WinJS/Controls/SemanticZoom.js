// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Semantic Zoom control
define([
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations',
    '../Animations/_TransitionAnimation',
    '../ControlProcessor',
    '../Promise',
    '../Utilities/_Control',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities',
    '../Utilities/_ElementListUtilities',
    '../Utilities/_Hoverable',
    'require-style!less/desktop/controls'
    ], function semanticZoomInit(_Global, _Base, _BaseUtils, _ErrorFromName, _Events, _Resources, _WriteProfilerMark, Animations, _TransitionAnimation, ControlProcessor, Promise, _Control, _Dispose, _ElementUtilities, _ElementListUtilities, _Hoverable) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.SemanticZoom">
        /// Enables the user to zoom between two different views supplied by two child controls.
        /// One child control supplies the zoomed-out view and the other provides the zoomed-in view.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.semanticzoom.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.semanticzoom.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.SemanticZoom"><div class="zoomedInContainer" data-win-control="WinJS.UI.ListView"></div><div class="zoomedOutContainer" data-win-control="WinJS.UI.ListView"></div></div>]]></htmlSnippet>
        /// <part name="semanticZoom" class="win-semanticzoom" locid="WinJS.UI.SemanticZoom_part:semanticZoom">The entire SemanticZoom control.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        SemanticZoom: _Base.Namespace._lazy(function () {
            var browserStyleEquivalents = _BaseUtils._browserStyleEquivalents;

            var strings = {
                get invalidZoomFactor() { return "Invalid zoomFactor"; },
            };

            function identity(item) {
                return item;
            }

            // Private statics

            var sezoButtonClass = "win-semanticzoom-button";
            var sezoButtonLocationClass = "win-semanticzoom-button-location";
            var sezoButtonShowDuration = 3000;
            var sezoButtonMouseMoveThreshold = 8;

            var semanticZoomClass = "win-semanticzoom";
            var zoomedInElementClass = "win-semanticzoom-zoomedinview";
            var zoomedOutElementClass = "win-semanticzoom-zoomedoutview";

            var zoomChangedEvent = "zoomchanged";

            var bounceFactor = 1.05;
            var defaultZoomFactor = 0.65; // Value used by the shell
            // If we change these we need to update the metadata for the zoomFactor property as well.
            var maxZoomFactor = 0.8;
            var minZoomFactor = 0.2;

            var canvasSizeMax = 4096;

            var outgoingOpacityTransitionDuration = 0.333;
            var incomingOpacityTransitionDuration = 0.333;
            var outgoingScaleTransitionDuration = 0.333;
            var incomingScaleTransitionDuration = 0.333;
            var zoomAnimationDuration = outgoingOpacityTransitionDuration * 1000;
            var zoomAnimationTTFFBuffer = 50;
            // PS 846107 - TransitionEnd event not being fired occassionally if duration is not same
            var bounceInDuration = 0.333;
            var bounceBackDuration = 0.333;
            var easeOutBezier = "cubic-bezier(0.1,0.9,0.2,1)";
            var transformNames = browserStyleEquivalents["transform"];
            var transitionScriptName = browserStyleEquivalents["transition"].scriptName;

            function buildTransition(prop, duration, timing) {
                return prop + " " + _TransitionAnimation._animationTimeAdjustment(duration) + "s " + timing + " " + _TransitionAnimation._libraryDelay + "ms";
            }
            function outgoingElementTransition() {
                return buildTransition(transformNames.cssName, outgoingScaleTransitionDuration, "ease-in-out") + ", " +
                       buildTransition("opacity", outgoingOpacityTransitionDuration, "ease-in-out");
            }

            function incomingElementTransition() {
                return buildTransition(transformNames.cssName, incomingScaleTransitionDuration, "ease-in-out") + ", " +
                       buildTransition("opacity", incomingOpacityTransitionDuration, "ease-in-out");
            }

            function bounceInTransition() {
                return buildTransition(transformNames.cssName, bounceInDuration, easeOutBezier);
            }

            function bounceBackTransition() {
                return buildTransition(transformNames.cssName, bounceBackDuration, easeOutBezier);
            }

            var pinchDistanceCount = 2;
            var zoomOutGestureDistanceChangeFactor = 0.2;
            var zoomInGestureDistanceChangeFactor = 0.45;

            var zoomAnimationTimeout = 1000;

            // The semantic zoom has to piece together information from a variety of separate events to get an understanding of the current
            // manipulation state. Since these events are altogether separate entities, we have to put a delay between the end of one event
            // to allow time for another event to come around. For example, when we handle MSLostPointerCapture events, we need
            // to wait because DManip might be taking over. If it is, we'll receive an MSManipulationStateChanged event soon,
            // and so we don't want to reset our state back, and need give that event a chance to fire.
            var eventTimeoutDelay = 50;

            var PinchDirection = {
                none: 0,
                zoomedIn: 1,
                zoomedOut: 2
            };

            var PT_TOUCH = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_TOUCH || "touch";
            var PT_PEN = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_PEN || "pen";
            var PT_MOUSE = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_MOUSE || "mouse";

            function getDimension(element, property) {
                return _ElementUtilities.convertToPixels(element, property);
            }

            function scaleElement(element, scale) {
                if (_TransitionAnimation.isAnimationEnabled()) {
                    element.style[transformNames.scriptName] = "scale(" + scale + ")";
                }
            }

            var origin = { x: 0, y: 0 };

            function onSemanticZoomResize(ev) {
                var control = ev.target && ev.target.winControl;
                if (control && !control._resizing) {
                    control._onResize();
                }
            }

            function onSemanticZoomPropertyChanged(list) {
                // This will only be called for "aria-checked" changes
                var control = list[0].target && list[0].target.winControl;
                if (control && control instanceof SemanticZoom) {
                    control._onPropertyChanged();
                }
            }

            var SemanticZoom = _Base.Class.define(function SemanticZoom_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.SemanticZoom.SemanticZoom">
                /// <summary locid="WinJS.UI.SemanticZoom.constructor">
                /// Creates a new SemanticZoom.
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.SemanticZoom.constructor_p:element">
                /// The DOM element that hosts the SemanticZoom.
                /// </param>
                /// <param name="options" type="object" locid="WinJS.UI.SemanticZoom.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events. This parameter is optional.
                /// </param>
                /// <returns type="WinJS.UI.SemanticZoom" locid="WinJS.UI.SemanticZoom.constructor_returnValue">
                /// The new SemanticZoom control.
                /// </returns>
                /// </signature>

                this._disposed = false;

                var that = this;
                var isPhone = _BaseUtils.isPhone;

                this._element = element;
                this._element.winControl = this;
                _ElementUtilities.addClass(this._element, "win-disposable");
                _ElementUtilities.addClass(this._element, semanticZoomClass);
                this._element.setAttribute("role", "ms-semanticzoomcontainer");
                var ariaLabel = this._element.getAttribute("aria-label");
                if (!ariaLabel) {
                    this._element.setAttribute("aria-label", "");
                }

                options = options || {};
                this._zoomedOut = !!options.zoomedOut || !!options.initiallyZoomedOut || false;
                this._enableButton = !isPhone;
                if (!isPhone && options.enableButton !== undefined) {
                    this._enableButton = !!options.enableButton;
                }

                this._element.setAttribute("aria-checked", this._zoomedOut.toString());
                this._zoomFactor = _ElementUtilities._clamp(options.zoomFactor, minZoomFactor, maxZoomFactor, defaultZoomFactor);

                this.zoomedInItem = options.zoomedInItem;
                this.zoomedOutItem = options.zoomedOutItem;

                if (_BaseUtils.validation) {
                    if (options._zoomFactor && options._zoomFactor !== this._zoomFactor) {
                        throw new _ErrorFromName("WinJS.UI.SemanticZoom.InvalidZoomFactor", strings.invalidZoomFactor);
                    }
                }

                this._locked = !!options.locked;

                this._zoomInProgress = false;
                this._isBouncingIn = false;
                this._isBouncing = false;
                this._zooming = false;
                this._aligning = false;
                this._gesturing = false;
                this._gestureEnding = false;
                this._buttonShown = false;
                this._shouldFakeTouchCancel = ("TouchEvent" in _Global);

                // Initialize the control

                this._initialize();
                this._configure();

                // Register event handlers

                var initiallyParented = _Global.document.body.contains(this._element);
                _ElementUtilities._addInsertedNotifier(this._element);
                this._element.addEventListener("WinJSNodeInserted", function (event) {
                    // WinJSNodeInserted fires even if the element is already in the DOM
                    if (initiallyParented) {
                        initiallyParented = false;
                        return;
                    }
                    onSemanticZoomResize(event);
                }, false);
                this._element.addEventListener("mselementresize", onSemanticZoomResize);
                _ElementUtilities._resizeNotifier.subscribe(this._element, onSemanticZoomResize);
                new _ElementUtilities._MutationObserver(onSemanticZoomPropertyChanged).observe(this._element, { attributes: true, attributeFilter: ["aria-checked"] });

                if (!isPhone) {
                    this._element.addEventListener("wheel", this._onWheel.bind(this), true);
                    this._element.addEventListener("mousewheel", this._onMouseWheel.bind(this), true);
                    this._element.addEventListener("keydown", this._onKeyDown.bind(this), true);

                    _ElementUtilities._addEventListener(this._element, "pointerdown", this._onPointerDown.bind(this), true);
                    _ElementUtilities._addEventListener(this._element, "pointermove", this._onPointerMove.bind(this), true);
                    _ElementUtilities._addEventListener(this._element, "pointerout", this._onPointerOut.bind(this), true);
                    _ElementUtilities._addEventListener(this._element, "pointercancel", this._onPointerCancel.bind(this), true);
                    _ElementUtilities._addEventListener(this._element, "pointerup", this._onPointerUp.bind(this), false);
                    this._hiddenElement.addEventListener("gotpointercapture", this._onGotPointerCapture.bind(this), false);
                    this._hiddenElement.addEventListener("lostpointercapture", this._onLostPointerCapture.bind(this), false);
                    this._element.addEventListener("click", this._onClick.bind(this), true);
                    this._canvasIn.addEventListener(_BaseUtils._browserEventEquivalents["transitionEnd"], this._onCanvasTransitionEnd.bind(this), false);
                    this._canvasOut.addEventListener(_BaseUtils._browserEventEquivalents["transitionEnd"], this._onCanvasTransitionEnd.bind(this), false);
                    this._element.addEventListener("MSContentZoom", this._onMSContentZoom.bind(this), true);
                    this._resetPointerRecords();
                }

                // Get going
                this._onResizeImpl();

                _Control._setOptions(this, options, true);

                // Present the initial view
                that._setVisibility();
            }, {
                // Public members

                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.SemanticZoom.element" helpKeyword="WinJS.UI.SemanticZoom.element">
                /// The DOM element that hosts the SemanticZoom control.
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.SemanticZoom.enableButton" helpKeyword="WinJS.UI.SemanticZoom.enableButton">
                /// Gets or sets a value that specifies whether the semantic zoom button should be displayed or not
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                enableButton: {
                    get: function () {
                        return this._enableButton;
                    },
                    set: function (value) {
                        var newValue = !!value;
                        if (this._enableButton !== newValue && !_BaseUtils.isPhone) {
                            this._enableButton = newValue;
                            if (newValue) {
                                this._createSemanticZoomButton();
                            } else {
                                this._removeSemanticZoomButton();
                            }
                        }
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.SemanticZoom.zoomedOut" helpKeyword="WinJS.UI.SemanticZoom.zoomedOut">
                /// Gets or sets a value that specifies whether the zoomed out view is currently displayed.
                /// </field>
                zoomedOut: {
                    get: function () {
                        return this._zoomedOut;
                    },
                    set: function (value) {
                        this._zoom(!!value, { x: 0.5 * this._sezoClientWidth, y: 0.5 * this._sezoClientHeight }, false, false, (this._zoomedOut && _BaseUtils.isPhone));
                    }
                },

                /// <field type="Number" locid="WinJS.UI.SemanticZoom.zoomFactor" helpKeyword="WinJS.UI.SemanticZoom.zoomFactor" minimum="0.2" maximum="0.8">
                /// Gets or sets a value between 0.2 and 0.85 that specifies the scale of the zoomed out view. The default is 0.65.
                /// </field>
                zoomFactor: {
                    get: function () {
                        return this._zoomFactor;
                    },
                    set: function (value) {
                        var oldValue = this._zoomFactor;
                        var newValue = _ElementUtilities._clamp(value, minZoomFactor, maxZoomFactor, defaultZoomFactor);
                        if (oldValue !== newValue) {
                            this._zoomFactor = newValue;
                            this._onResize();
                        }
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.SemanticZoom.locked" helpKeyword="WinJS.UI.SemanticZoom.locked">
                /// Gets or sets a value that indicates whether SemanticZoom is locked and zooming between views is disabled.
                /// </field>
                locked: {
                    get: function () {
                        return this._locked;
                    },
                    set: function (value) {
                        this._locked = !!value;
                        if (value) {
                            this._hideSemanticZoomButton();
                        } else {
                            this._displayButton();
                        }
                    }
                },

                /// <field type="Function" locid="WinJS.UI.SemanticZoom.zoomedInItem" helpKeyword="WinJS.UI.SemanticZoom.zoomedInItem">
                /// Gets or sets a mapping function which can be used to change the item which is targeted on zoom in.
                /// </field>
                zoomedInItem: {
                    get: function () { return this._zoomedInItem; },
                    set: function (value) {
                        this._zoomedInItem = value || identity;
                    },
                },

                /// <field type="Function" locid="WinJS.UI.SemanticZoom.zoomedOutItem" helpKeyword="WinJS.UI.SemanticZoom.zoomedOutItem">
                /// Gets or sets a mapping function which can be used to change the item which is targeted on zoom out.
                /// </field>
                zoomedOutItem: {
                    get: function () { return this._zoomedOutItem; },
                    set: function (value) {
                        this._zoomedOutItem = value || identity;
                    },
                },

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.SemanticZoom.dispose">
                    /// <summary locid="WinJS.UI.SemanticZoom.dispose">
                    /// Disposes this SemanticZoom.
                    /// </summary>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }

                    this._disposed = true;
                    _ElementUtilities._resizeNotifier.unsubscribe(this._element, onSemanticZoomResize);
                    _Dispose._disposeElement(this._elementIn);
                    _Dispose._disposeElement(this._elementOut);

                    this._clearTimeout(this._completeZoomTimer);
                    this._clearTimeout(this._TTFFTimer);
                },

                forceLayout: function () {
                    /// <signature helpKeyword="WinJS.UI.SemanticZoom.forceLayout">
                    /// <summary locid="WinJS.UI.SemanticZoom.forceLayout">
                    /// Forces the SemanticZoom to update its layout. Use this function when making the SemanticZoom visible again
                    /// after its style.display property had been set to "none".
                    /// </summary>
                    /// </signature>
                    this._onResizeImpl();
                },

                // Private members

                _initialize: function () {
                    // initialize the semantic zoom, parent the child controls

                    // Zoomed in and zoomed out controls must be on the first two child elements

                    var children = _ElementListUtilities.children(this._element);
                    this._elementIn = children[0];
                    this._elementOut = children[1];

                    // Ensure the child controls have the same height as the SemanticZoom element

                    this._elementIn.style.height = this._elementOut.style.height = this._element.offsetHeight + "px";

                    // Create the child controls if they haven't been created already

                    ControlProcessor.processAll(this._elementIn);
                    ControlProcessor.processAll(this._elementOut);

                    this._viewIn = this._elementIn.winControl.zoomableView;
                    this._viewOut = this._elementOut.winControl.zoomableView;

                    // Remove the children and place them beneath new divs that will serve as canvases and viewports
                    this._element.removeChild(this._elementOut);
                    this._element.removeChild(this._elementIn);
                    this._element.innerHTML = "";
                    this._cropViewport = _Global.document.createElement("div");
                    this._element.appendChild(this._cropViewport);
                    this._viewportIn = _Global.document.createElement("div");
                    this._opticalViewportIn = _Global.document.createElement("div");
                    this._viewportOut = _Global.document.createElement("div");
                    this._opticalViewportOut = _Global.document.createElement("div");
                    this._opticalViewportIn.appendChild(this._viewportIn);
                    this._opticalViewportOut.appendChild(this._viewportOut);
                    this._cropViewport.appendChild(this._opticalViewportIn);
                    this._cropViewport.appendChild(this._opticalViewportOut);

                    this._canvasIn = _Global.document.createElement("div");
                    this._canvasOut = _Global.document.createElement("div");
                    this._viewportIn.appendChild(this._canvasIn);
                    this._viewportOut.appendChild(this._canvasOut);
                    this._canvasIn.appendChild(this._elementIn);
                    this._canvasOut.appendChild(this._elementOut);

                    if (this._enableButton) {
                        this._createSemanticZoomButton();
                    }

                    this._hiddenElement = _Global.document.createElement("div");
                    this._hiddenElement.tabIndex = -1;
                    this._hiddenElement.visibility = "hidden";
                    this._hiddenElement.setAttribute("aria-hidden", "true");
                    this._element.appendChild(this._hiddenElement);

                    _ElementUtilities.addClass(this._elementIn, zoomedInElementClass);
                    _ElementUtilities.addClass(this._elementOut, zoomedOutElementClass);
                    this._setLayout(this._element, "relative", "hidden");
                    this._setLayout(this._cropViewport, "absolute", "hidden");
                    this._setLayout(this._opticalViewportIn, "absolute", "auto");
                    this._setLayout(this._opticalViewportOut, "absolute", "auto");
                    this._setLayout(this._viewportIn, "absolute", "hidden");
                    this._setLayout(this._viewportOut, "absolute", "hidden");
                    this._setLayout(this._canvasIn, "absolute", "hidden");
                    this._setLayout(this._canvasOut, "absolute", "hidden");
                    // Pinch zoom on a precision touchpad doesn't send PointerMove etc. events like ordinary touch actions. PTP has to be handled specially.
                    // PTP ignores the -ms-touch-action styles that are applied to elements, which means it ignores the style we apply to disable
                    // optical zooming. An element can be optically zoomed via PTP but not with touch. SemanticZoom takes advantage of this fact to
                    // implement zoom for PTPs. The _opticalViewportIn/Out elements have optical zoom properties attached to them to enable
                    // optical zoom, and we attach an MSContentZoom event handler to our root element. When we receive that event on an optical viewport,
                    // and it's in the direction for triggering a zoom, we'll trigger a zoom just like we would for scroll wheel/keyboard.
                    // A nice side effect of this is that we don't need to play the overbounce animation in the PTP code, since optical zoom will
                    // zoom out a small percentage then hit the min/max zoom value for us, then automatically return to 100% once the user stops manipulating.
                    this._setupOpticalViewport(this._opticalViewportIn);
                    this._setupOpticalViewport(this._opticalViewportOut);

                    // Optical zoom can only work on elements with overflow = scroll. The opticalViewportIn/Out elements have overflow=scroll applied to them to enable this,
                    // but we don't want those scrollbars to be visible, so they also have -ms-overflow-style=none.
                    // The -ms-overflow-style on the optical viewport is inherited by its children. We don't want that, so we'll set the immediate children to have the
                    // default overflow style.
                    this._viewportIn.style["-ms-overflow-style"] = "-ms-autohiding-scrollbar";
                    this._viewportOut.style["-ms-overflow-style"] = "-ms-autohiding-scrollbar";

                    this._elementIn.style.position = "absolute";
                    this._elementOut.style.position = "absolute";
                },

                _createSemanticZoomButton: function () {
                    this._sezoButton = _Global.document.createElement("button");
                    this._sezoButton.className = sezoButtonClass + " " + sezoButtonLocationClass;
                    this._sezoButton.tabIndex = -1;
                    this._sezoButton.style.visibility = "hidden";
                    this._sezoButton.setAttribute("aria-hidden", true);
                    this._element.appendChild(this._sezoButton);

                    //register the appropriate events for display the sezo button
                    this._sezoButton.addEventListener("click", this._onSeZoButtonZoomOutClick.bind(this), false);
                    this._element.addEventListener("scroll", this._onSeZoChildrenScroll.bind(this), true);
                    _ElementUtilities._addEventListener(this._element, "pointermove", this._onPenHover.bind(this), false);
                },

                _removeSemanticZoomButton: function () {
                    if (this._sezoButton) {
                        this._element.removeChild(this._sezoButton);
                        this._sezoButton = null;
                    }
                },

                _configure: function () {
                    // Configure the controls for zooming
                    var axisIn = this._viewIn.getPanAxis(),
                        axisOut = this._viewOut.getPanAxis(),
                        isPhone = _BaseUtils.isPhone;
                    this._pansHorizontallyIn = (axisIn === "horizontal" || axisIn === "both");
                    this._pansVerticallyIn = (axisIn === "vertical" || axisIn === "both");
                    this._pansHorizontallyOut = (axisOut === "horizontal" || axisOut === "both");
                    this._pansVerticallyOut = (axisOut === "vertical" || axisOut === "both");

                    if (this._zoomInProgress) {
                        return;
                    }

                    var pagesToPrefetchIn = 1 / this._zoomFactor - 1,
                        pagesToPrefetchOut = bounceFactor - 1;

                    this._setLayout(this._elementIn, "absolute", "visible");
                    this._setLayout(this._elementOut, "absolute", "visible");
                    this._viewIn.configureForZoom(false, !this._zoomedOut, this._zoomFromCurrent.bind(this, true), pagesToPrefetchIn);
                    this._viewOut.configureForZoom(true, this._zoomedOut, this._zoomFromCurrent.bind(this, false), pagesToPrefetchOut);
                    this._pinching = false;
                    this._pinchGesture = 0;
                    this._canvasLeftIn = 0;
                    this._canvasTopIn = 0;
                    this._canvasLeftOut = 0;
                    this._canvasTopOut = 0;

                    // Set scales and opacity when not on the phone
                    if (!isPhone) {
                        if (this._zoomedOut) {
                            scaleElement(this._canvasIn, this._zoomFactor);
                        } else {
                            scaleElement(this._canvasOut, 1 / this._zoomFactor);
                        }
                    }
                    var styleViewportIn = this._opticalViewportIn.style,
                        styleViewportOut = this._opticalViewportOut.style,
                        styleCanvasIn = this._canvasIn.style,
                        styleCanvasOut = this._canvasOut.style;

                    styleCanvasIn.opacity = (this._zoomedOut && !isPhone ? 0 : 1);
                    styleCanvasOut.opacity = (this._zoomedOut ? 1 : 0);
                    // Set the zoomed out canvas to have a higher zIndex than the zoomedIn canvas, so that when hosted on the phone
                    // the SeZo will display both views properly.
                    if (isPhone) {
                        styleCanvasIn.zIndex = 1;
                        styleCanvasOut.zIndex = 2;
                    }

                    // Enable animation
                    if (_TransitionAnimation.isAnimationEnabled() && !isPhone) {
                        styleViewportIn[browserStyleEquivalents["transition-property"].scriptName] = transformNames.cssName;
                        styleViewportIn[browserStyleEquivalents["transition-duration"].scriptName] = "0s";
                        styleViewportIn[browserStyleEquivalents["transition-timing-function"].scriptName] = "linear";

                        styleViewportOut[browserStyleEquivalents["transition-property"].scriptName] = transformNames.cssName;
                        styleViewportOut[browserStyleEquivalents["transition-duration"].scriptName] = "0s";
                        styleViewportOut[browserStyleEquivalents["transition-timing-function"].scriptName] = "linear";
                    }
                },

                _onPropertyChanged: function () {
                    // This will only be called for "aria-checked" changes...also, the list is not important.
                    var newValue = this._element.getAttribute("aria-checked");
                    var zoomedOut = newValue === "true";
                    if (this._zoomedOut !== zoomedOut) {
                        this.zoomedOut = zoomedOut;
                    }
                },

                _onResizeImpl: function () {
                    this._resizing = this._resizing || 0;
                    this._resizing++;
                    try {
                        var positionElement = function (element, left, top, width, height) {
                            var style = element.style;
                            style.left = left + "px";
                            style.top = top + "px";
                            style.width = width + "px";
                            style.height = height + "px";
                        };

                        var sezoComputedStyle = _Global.getComputedStyle(this._element, null),
                            computedWidth = parseFloat(sezoComputedStyle.width),
                            computedHeight = parseFloat(sezoComputedStyle.height),
                            sezoPaddingLeft = getDimension(this._element, sezoComputedStyle["paddingLeft"]),
                            sezoPaddingRight = getDimension(this._element, sezoComputedStyle["paddingRight"]),
                            sezoPaddingTop = getDimension(this._element, sezoComputedStyle["paddingTop"]),
                            sezoPaddingBottom = getDimension(this._element, sezoComputedStyle["paddingBottom"]),
                            viewportWidth = computedWidth - sezoPaddingLeft - sezoPaddingRight,
                            viewportHeight = computedHeight - sezoPaddingTop - sezoPaddingBottom,
                            scaleFactor = 1 / this._zoomFactor;


                        if (this._viewportWidth === viewportWidth && this._viewportHeight === viewportHeight) {
                            return;
                        }
                        this._sezoClientHeight = computedHeight;
                        this._sezoClientWidth = computedWidth;
                        this._viewportWidth = viewportWidth;
                        this._viewportHeight = viewportHeight;

                        this._configure();

                        var multiplierIn = 2 * scaleFactor - 1,
                            canvasInWidth = Math.min(canvasSizeMax, (this._pansHorizontallyIn ? multiplierIn : 1) * viewportWidth),
                            canvasInHeight = Math.min(canvasSizeMax, (this._pansVerticallyIn ? multiplierIn : 1) * viewportHeight);

                        this._canvasLeftIn = 0.5 * (canvasInWidth - viewportWidth);
                        this._canvasTopIn = 0.5 * (canvasInHeight - viewportHeight);
                        positionElement(this._cropViewport, sezoPaddingLeft, sezoPaddingTop, viewportWidth, viewportHeight);
                        positionElement(this._viewportIn, 0, 0, viewportWidth, viewportHeight);
                        positionElement(this._opticalViewportIn, 0, 0, viewportWidth, viewportHeight);
                        positionElement(this._canvasIn, -this._canvasLeftIn, -this._canvasTopIn, canvasInWidth, canvasInHeight);
                        positionElement(this._elementIn, this._canvasLeftIn, this._canvasTopIn, viewportWidth, viewportHeight);

                        var multiplierOut = 2 * bounceFactor - 1,
                            canvasOutWidth = (this._pansHorizontallyOut ? multiplierOut : 1) * viewportWidth,
                            canvasOutHeight = (this._pansVerticallyOut ? multiplierOut : 1) * viewportHeight;

                        this._canvasLeftOut = 0.5 * (canvasOutWidth - viewportWidth);
                        this._canvasTopOut = 0.5 * (canvasOutHeight - viewportHeight);
                        positionElement(this._viewportOut, 0, 0, viewportWidth, viewportHeight);
                        positionElement(this._opticalViewportOut, 0, 0, viewportWidth, viewportHeight);
                        positionElement(this._canvasOut, -this._canvasLeftOut, -this._canvasTopOut, canvasOutWidth, canvasOutHeight);
                        positionElement(this._elementOut, this._canvasLeftOut, this._canvasTopOut, viewportWidth, viewportHeight);
                    } finally {
                        this._resizing--;
                    }
                },

                _onResize: function () {
                    this._onResizeImpl();
                },

                _onMouseMove: function (ev) {
                    if (this._zooming ||
                         (!this._lastMouseX && !this._lastMouseY) ||
                         (ev.screenX === this._lastMouseX && ev.screenY === this._lastMouseY)) {
                        this._lastMouseX = ev.screenX;
                        this._lastMouseY = ev.screenY;
                        return;
                    }

                    if (Math.abs(ev.screenX - this._lastMouseX) <= sezoButtonMouseMoveThreshold &&
                        Math.abs(ev.screenY - this._lastMouseY) <= sezoButtonMouseMoveThreshold) {
                        return;
                    }

                    this._lastMouseX = ev.screenX;
                    this._lastMouseY = ev.screenY;

                    this._displayButton();
                },

                _displayButton: function () {
                    if (!_Hoverable.isHoverable) {
                        return;
                    }

                    _Global.clearTimeout(this._dismissButtonTimer);
                    this._showSemanticZoomButton();

                    var that = this;
                    this._dismissButtonTimer = _Global.setTimeout(function () {
                        that._hideSemanticZoomButton();
                    }, _TransitionAnimation._animationTimeAdjustment(sezoButtonShowDuration));
                },

                _showSemanticZoomButton: function () {
                    if (this._disposed || this._buttonShown) {
                        return;
                    }

                    if (this._sezoButton && !this._zoomedOut && !this._locked) {
                        Animations.fadeIn(this._sezoButton);
                        this._sezoButton.style.visibility = "visible";
                        this._buttonShown = true;
                    }
                },

                _hideSemanticZoomButton: function (immediately) {
                    if (this._disposed || !this._buttonShown) {
                        return;
                    }

                    if (this._sezoButton) {
                        if (!immediately) {
                            var that = this;
                            Animations.fadeOut(this._sezoButton).then(function () {
                                that._sezoButton.style.visibility = "hidden";
                            });
                        } else {
                            this._sezoButton.style.visibility = "hidden";
                        }
                        this._buttonShown = false;
                    }
                },

                _onSeZoChildrenScroll: function (ev) {
                    if (ev.target !== this.element) {
                        this._hideSemanticZoomButton(true);
                    }
                },

                _onWheel: function (ev) {
                    if (ev.ctrlKey) {
                        this._zoom(ev.deltaY > 0, this._getPointerLocation(ev));

                        ev.stopPropagation();
                        ev.preventDefault();
                    }
                },

                _onMouseWheel: function (ev) {
                    if (ev.ctrlKey) {
                        this._zoom(ev.wheelDelta < 0, this._getPointerLocation(ev));

                        ev.stopPropagation();
                        ev.preventDefault();
                    }
                },

                _onPenHover: function (ev) {
                    if (ev.pointerType === PT_PEN && ev.buttons === 0) {
                        this._displayButton();
                    }
                },

                _onSeZoButtonZoomOutClick: function () {
                    this._hideSemanticZoomButton();
                    this._zoom(true, { x: 0.5 * this._sezoClientWidth, y: 0.5 * this._sezoClientHeight }, false);
                },

                _onKeyDown: function (ev) {
                    var handled = false;

                    if (ev.ctrlKey) {
                        var Key = _ElementUtilities.Key;

                        switch (ev.keyCode) {
                            case Key.add:
                            case Key.equal:
                            case 61: //Firefox uses a different keycode
                                this._zoom(false);
                                handled = true;
                                break;

                            case Key.subtract:
                            case Key.dash:
                            case 173: //Firefox uses a different keycode
                                this._zoom(true);
                                handled = true;
                                break;
                        }
                    }

                    if (handled) {
                        ev.stopPropagation();
                        ev.preventDefault();
                    }
                },

                _createPointerRecord: function (ev, fireCancelOnPinch) {
                    var location = this._getPointerLocation(ev);

                    var newRecord = {};
                    newRecord.startX = newRecord.currentX = location.x;
                    newRecord.startY = newRecord.currentY = location.y;
                    newRecord.fireCancelOnPinch = fireCancelOnPinch;

                    this._pointerRecords[ev.pointerId] = newRecord;
                    this._pointerCount = Object.keys(this._pointerRecords).length;

                    return newRecord;
                },

                _deletePointerRecord: function (id) {
                    var record = this._pointerRecords[id];

                    delete this._pointerRecords[id];
                    this._pointerCount = Object.keys(this._pointerRecords).length;

                    if (this._pointerCount !== 2) {
                        this._pinching = false;
                    }

                    return record;
                },

                _fakeCancelOnPointer: function (ev) {
                    var touchEvent = _Global.document.createEvent("UIEvent");
                    touchEvent.initUIEvent("touchcancel", true, true, _Global, 0);
                    touchEvent.touches = ev.touches;
                    touchEvent.targetTouches = ev.targetTouches;
                    touchEvent.changedTouches = [ev._currentTouch];
                    touchEvent._fakedBySemanticZoom = true;
                    ev.target.dispatchEvent(touchEvent);
                },

                _handlePointerDown: function (ev) {
                    this._createPointerRecord(ev, false);

                    // When we get more than one pointer, we need to explicitly set PointerCapture on every pointer we've got to the SemanticZoom.
                    // This will fire lostCapture events on any descendant elements that had called setCapture earlier (for example, ListView items),
                    // and let the hosted control know that the pointer is no longer under its control.
                    var contactKeys = Object.keys(this._pointerRecords);

                    for (var i = 0, len = contactKeys.length; i < len; i++) {
                        try {
                            _ElementUtilities._setPointerCapture(this._hiddenElement, contactKeys[i] || 0);
                        } catch (e) {
                            this._resetPointerRecords();
                            return;
                        }
                    }


                    ev.stopImmediatePropagation();
                    ev.preventDefault();
                },

                _handleFirstPointerDown: function (ev) {
                    this._resetPointerRecords();
                    this._createPointerRecord(ev, this._shouldFakeTouchCancel);
                    this._startedZoomedOut = this._zoomedOut;
                },

                // SeZo wants to prevent clicks while it is playing the bounce animation
                // This can happen when user try to pinch out on the zoomed out view
                // and lift the finger up on the same item
                _onClick: function (ev) {
                    if (ev.target !== this._element) {
                        if (this._isBouncing) {
                            ev.stopImmediatePropagation();
                        }
                    }
                },

                // To optimize perf for ListView and to support more than 2 contact points
                // for custom control, we wire up pointerDown routine for listview during capture
                // but during bubbling phase for everythign else
                _onPointerDown: function (ev) {
                    if (ev.pointerType !== PT_TOUCH) {
                        return;
                    }

                    if (this._pointerCount === 0) {
                        this._handleFirstPointerDown(ev);
                    } else {
                        this._handlePointerDown(ev);
                    }
                },

                // SemanticZoom uses MSPointerMove messages to recognize a pinch. It has to use pointer messages instead of GestureUpdate for a few reasons:
                // 1 - MSGestureUpdate events' scale property (the property that determines pinches) is based on a scalar value. We want our pinch threshold to be pixel based
                // 2 - MSGestureUpdate events' scale property doesn't work when multiple contacts are on multiple surfaces. When that happens .scale will always stay 1.0.
                _onPointerMove: function (ev) {
                    if (ev.pointerType === PT_MOUSE || ev.pointerType === PT_PEN) {
                        this._onMouseMove(ev);
                        return;
                    }

                    if (ev.pointerType !== PT_TOUCH) {
                        return;
                    }

                    function distance(startX, startY, endX, endY) {
                        return Math.sqrt((endX - startX) * (endX - startX) + (endY - startY) * (endY - startY));
                    }

                    function midpoint(point1, point2) {
                        return {
                            x: (0.5 * (point1.currentX + point2.currentX)) | 0,
                            y: (0.5 * (point1.currentY + point2.currentY)) | 0
                        };
                    }

                    var pointerRecord = this._pointerRecords[ev.pointerId],
                        location = this._getPointerLocation(ev);

                    // We listen to MSPointerDown on the bubbling phase of its event, but listen to MSPointerMove on the capture phase.
                    // MSPointerDown can be stopped from bubbling if the underlying control doesn't want the SemanticZoom to interfere for whatever reason.
                    // When that happens, we won't have a pointer record for the event we just got, so there's no sense in doing additional processing.
                    if (!pointerRecord) {
                        return;
                    }
                    pointerRecord.currentX = location.x;
                    pointerRecord.currentY = location.y;

                    if (this._pointerCount === 2) {
                        this._pinching = true;

                        // The order in which these contacts are stored and retrieved from contactKeys is unimportant.  Any two points will suffice."
                        var contactKeys = Object.keys(this._pointerRecords),
                            point1 = this._pointerRecords[contactKeys[0]],
                            point2 = this._pointerRecords[contactKeys[1]];
                        this._currentMidPoint = midpoint(point1, point2);
                        var contactDistance = distance(point1.currentX, point1.currentY, point2.currentX, point2.currentY);
                        var that = this;
                        var processPinchGesture = function (zoomingOut) {
                            var pinchDirection = (zoomingOut ? PinchDirection.zoomedOut : PinchDirection.zoomedIn),
                                gestureReversed = (zoomingOut ? (that._pinchedDirection === PinchDirection.zoomedIn && !that._zoomingOut) : (that._pinchedDirection === PinchDirection.zoomedOut && that._zoomingOut)),
                                canZoomInGesturedDirection = (zoomingOut ? !that._zoomedOut : that._zoomedOut);
                            if (that._pinchedDirection === PinchDirection.none) {
                                if (canZoomInGesturedDirection) {
                                    that._isBouncingIn = false;
                                    that._zoom(zoomingOut, midpoint(point1, point2), true);
                                    that._pinchedDirection = pinchDirection;
                                } else if (!that._isBouncingIn) {
                                    that._playBounce(true, midpoint(point1, point2));
                                }
                            } else if (gestureReversed) {
                                var deltaFromStart = that._lastPinchDistance / that._lastPinchStartDistance;
                                var deltaFromLast = that._lastLastPinchDistance / that._lastPinchDistance;
                                if ((zoomingOut && deltaFromStart > zoomOutGestureDistanceChangeFactor) ||
                                    (!zoomingOut && deltaFromLast > zoomInGestureDistanceChangeFactor)) {
                                    that._zoom(zoomingOut, midpoint(point1, point2), true);
                                    that._pinchedDirection = pinchDirection;
                                }
                            }
                        };
                        this._updatePinchDistanceRecords(contactDistance);
                        if (this._pinchDistanceCount >= pinchDistanceCount) {
                            if (!this._zooming && !this._isBouncing) {
                                _WriteProfilerMark("WinJS.UI.SemanticZoom:EndPinchDetection,info");
                                processPinchGesture(this._lastPinchDirection === PinchDirection.zoomedOut);
                            }
                        }
                    } else if (this._pointerCount > 2) {
                        // When more than two pointers are down, we're not going to interpret that as a pinch, so we reset the distance we'd recorded when it was
                        // just two pointers down.
                        this._resetPinchDistanceRecords();
                    }

                    if (this._pointerCount >= 2) {
                        // When two or more pointers are down, we want to hide all of their move events from the underlying view.
                        // If the pointer we're looking at needs to have a touch cancel event fired for it, we'll fake that now.
                        if (pointerRecord.fireCancelOnPinch) {
                            this._fakeCancelOnPointer(ev, pointerRecord);
                            pointerRecord.fireCancelOnPinch = false;
                        }
                        ev.stopImmediatePropagation();
                        ev.preventDefault();
                    }
                    // If the pointerCount isn't 2, we're no longer making a pinch. This generally happens if you try pinching, find you can't zoom in the pinched direction,
                    // then release one finger. When that happens we need to animate back to normal state.
                    if (this._pointerCount !== 2 && this._isBouncingIn) {
                        this._playBounce(false);
                    }
                },

                _onPointerOut: function (ev) {
                    if (ev.pointerType !== PT_TOUCH || ev.target !== this._element) {
                        return;
                    }

                    this._completePointerUp(ev, false);
                },

                _onPointerUp: function (ev) {
                    this._releasePointerCapture(ev);
                    this._completePointerUp(ev, true);
                    this._completeZoomingIfTimeout();
                },

                _onPointerCancel: function (ev) {
                    if (!ev._fakedBySemanticZoom) {
                        this._releasePointerCapture(ev);
                        this._completePointerUp(ev, false);
                        this._completeZoomingIfTimeout();
                    }
                },

                _onGotPointerCapture: function (ev) {
                    var pointerRecord = this._pointerRecords[ev.pointerId];
                    if (pointerRecord) {
                        pointerRecord.dirty = false;
                    }
                },

                _onLostPointerCapture: function (ev) {
                    var pointerRecord = this._pointerRecords[ev.pointerId];
                    if (pointerRecord) {
                        // If we lose capture on an element, there are three things that could be happening:
                        // 1 - Independent Manipulations are taking over. If that's the case, we should be getting an MSManipulationStateChanged event soon.
                        // 2 - Capture is just moving around inside of the semantic zoom region. We should get a got capture event soon, so we'll want to preserve this record.
                        // 3 - Capture got moved outside of the semantic zoom region. We'll destroy the pointer record if this happens.
                        pointerRecord.dirty = true;
                        var that = this;
                        Promise.timeout(eventTimeoutDelay).then(function () {
                            if (pointerRecord.dirty) {
                                // If the timeout completed and the record is still dirty, we can discard it
                                that._completePointerUp(ev, false);
                            }
                        });
                    }
                },

                _onMSContentZoom: function (ev) {
                    var sourceElement = ev.target;
                    if (sourceElement === this._opticalViewportIn || sourceElement === this._opticalViewportOut) {
                        // msZoomFactor is a floating point, and sometimes it'll won't be exactly 1.0 when at rest. We'll give a 5/1000ths margin above/below 1.0 as the start points for a zoomIn or out gesture.
                        var zoomingOut = (sourceElement.msContentZoomFactor < 0.995),
                            zoomingIn = (sourceElement.msContentZoomFactor > 1.005);
                        if (zoomingOut && !(this._zoomedOut || this._zoomingOut)) {
                            this.zoomedOut = true;
                        } else if (zoomingIn && (this._zoomedOut || this._zoomingOut)) {
                            this.zoomedOut = false;
                        }
                    }
                },

                _updatePinchDistanceRecords: function (contactDistance) {
                    var that = this;
                    function updatePinchDirection(direction) {
                        if (that._lastPinchDirection === direction) {
                            that._pinchDistanceCount++;
                        } else {
                            that._pinchGesture++;
                            that._pinchDistanceCount = 0;
                            that._lastPinchStartDistance = contactDistance;
                        }
                        that._lastPinchDirection = direction;
                        that._lastPinchDistance = contactDistance;
                        that._lastLastPinchDistance = that._lastPinchDistance;
                    }

                    if (this._lastPinchDistance === -1) {
                        _WriteProfilerMark("WinJS.UI.SemanticZoom:StartPinchDetection,info");
                        this._lastPinchDistance = contactDistance;
                    } else {
                        if (this._lastPinchDistance !== contactDistance) {
                            if (this._lastPinchDistance > contactDistance) {
                                updatePinchDirection(PinchDirection.zoomedOut);
                            } else {
                                updatePinchDirection(PinchDirection.zoomedIn);
                            }
                        }
                    }
                },

                _zoomFromCurrent: function (zoomOut) {
                    this._zoom(zoomOut, null, false, true);
                },

                _zoom: function (zoomOut, zoomCenter, gesture, centerOnCurrent, skipAlignment) {
                    _WriteProfilerMark("WinJS.UI.SemanticZoom:StartZoom(zoomOut=" + zoomOut + "),info");

                    this._clearTimeout(this._completeZoomTimer);
                    this._clearTimeout(this._TTFFTimer);

                    this._hideSemanticZoomButton();
                    this._resetPinchDistanceRecords();

                    if (this._locked || this._gestureEnding) {
                        return;
                    }

                    if (this._zoomInProgress) {
                        if (this._gesturing === !gesture) {
                            return;
                        }

                        if (zoomOut !== this._zoomingOut) {
                            // Reverse the zoom that's currently in progress
                            this._startAnimations(zoomOut);
                        }
                    } else if (zoomOut !== this._zoomedOut) {
                        this._zooming = true;
                        this._aligning = true;
                        this._gesturing = !!gesture;

                        if (zoomCenter) {
                            (zoomOut ? this._viewIn : this._viewOut).setCurrentItem(zoomCenter.x, zoomCenter.y);
                        }

                        this._zoomInProgress = true;

                        (zoomOut ? this._opticalViewportOut : this._opticalViewportIn).style.visibility = "visible";
                        if (zoomOut && _BaseUtils.isPhone) {
                            // When on the phone, we need to make sure the zoomed out canvas is visible before calling beginZoom(), otherwise
                            // beginZoom will start up animations on an invisible element, and those animations will be animated dependently.
                            this._canvasOut.style.opacity = 1;
                        }

                        var promiseIn = this._viewIn.beginZoom(),
                            promiseOut = this._viewOut.beginZoom(),
                            beginZoomPromises = null;

                        if ((promiseIn || promiseOut) && _BaseUtils.isPhone) {
                            beginZoomPromises = Promise.join([promiseIn, promiseOut]);
                        }
                        // To simplify zoomableView implementations, only call getCurrentItem between beginZoom and endZoom
                        if (centerOnCurrent && !skipAlignment) {
                            var that = this;
                            (zoomOut ? this._viewIn : this._viewOut).getCurrentItem().then(function (current) {
                                var position = current.position;

                                // Pass in current item to avoid calling getCurrentItem again
                                that._prepareForZoom(zoomOut, {
                                    x: that._rtl() ? (that._sezoClientWidth - position.left - 0.5 * position.width) : position.left + 0.5 * position.width,
                                    y: position.top + 0.5 * position.height
                                }, Promise.wrap(current), beginZoomPromises);
                            });
                        } else {
                            this._prepareForZoom(zoomOut, zoomCenter || {}, null, beginZoomPromises, skipAlignment);
                        }
                    }
                },

                _prepareForZoom: function (zoomOut, zoomCenter, completedCurrentItem, customViewAnimationPromise, skipAlignment) {
                    _WriteProfilerMark("WinJS.UI.SemanticZoom:prepareForZoom,StartTM");
                    var that = this;
                    var centerX = zoomCenter.x,
                        centerY = zoomCenter.y;


                    if (typeof centerX !== "number" || !this._pansHorizontallyIn || !this._pansHorizontallyOut) {
                        centerX = 0.5 * this._sezoClientWidth;
                    }

                    if (typeof centerY !== "number" || !this._pansVerticallyIn || !this._pansVerticallyOut) {
                        centerY = 0.5 * this._sezoClientHeight;
                    }

                    function setZoomCenters(adjustmentIn, adjustmentOut) {
                        that._canvasIn.style[browserStyleEquivalents["transform-origin"].scriptName] = (that._canvasLeftIn + centerX - adjustmentIn.x) + "px " + (that._canvasTopIn + centerY - adjustmentIn.y) + "px";
                        that._canvasOut.style[browserStyleEquivalents["transform-origin"].scriptName] = (that._canvasLeftOut + centerX - adjustmentOut.x) + "px " + (that._canvasTopOut + centerY - adjustmentOut.y) + "px";
                    }

                    setZoomCenters(origin, origin);

                    if (!skipAlignment) {
                        this._alignViewsPromise = this._alignViews(zoomOut, centerX, centerY, completedCurrentItem).then(function () {
                            that._aligning = false;
                            that._gestureEnding = false;
                            that._alignViewsPromise = null;
                            if (!that._zooming && !that._gesturing) {
                                that._completeZoom();
                            }
                        });
                    } else {
                        this._aligning = false;
                    }
                    this._zoomingOut = zoomOut;
                    // Force style resolution
                    _Global.getComputedStyle(this._canvasIn).opacity;
                    _Global.getComputedStyle(this._canvasOut).opacity;
                    _WriteProfilerMark("WinJS.UI.SemanticZoom:prepareForZoom,StopTM");
                    this._startAnimations(zoomOut, customViewAnimationPromise);
                },

                _alignViews: function (zoomOut, centerX, centerY, completedCurrentItem) {
                    var multiplier = (1 - this._zoomFactor),
                        rtl = this._rtl(),
                        offsetLeft = multiplier * (rtl ? this._viewportWidth - centerX : centerX),
                        offsetTop = multiplier * centerY;

                    var that = this;
                    if (zoomOut) {
                        var item = completedCurrentItem || this._viewIn.getCurrentItem();
                        if (item) {
                            return item.then(function (current) {
                                var positionIn = current.position,
                                positionOut = {
                                    left: positionIn.left * that._zoomFactor + offsetLeft,
                                    top: positionIn.top * that._zoomFactor + offsetTop,
                                    width: positionIn.width * that._zoomFactor,
                                    height: positionIn.height * that._zoomFactor
                                };

                                return that._viewOut.positionItem(that._zoomedOutItem(current.item), positionOut);
                            });
                        }
                    } else {
                        var item2 = completedCurrentItem || this._viewOut.getCurrentItem();
                        if (item2) {
                            return item2.then(function (current) {
                                var positionOut = current.position,
                                positionIn = {
                                    left: (positionOut.left - offsetLeft) / that._zoomFactor,
                                    top: (positionOut.top - offsetTop) / that._zoomFactor,
                                    width: positionOut.width / that._zoomFactor,
                                    height: positionOut.height / that._zoomFactor
                                };

                                return that._viewIn.positionItem(that._zoomedInItem(current.item), positionIn);
                            });
                        }
                    }

                    return new Promise(function (c) { c({ x: 0, y: 0 }); });
                },

                _startAnimations: function (zoomOut, customViewAnimationPromise) {
                    this._zoomingOut = zoomOut;

                    var isPhone = _BaseUtils.isPhone;
                    if (_TransitionAnimation.isAnimationEnabled() && !isPhone) {
                        _WriteProfilerMark("WinJS.UI.SemanticZoom:ZoomAnimation,StartTM");
                        this._canvasIn.style[transitionScriptName] = (zoomOut ? outgoingElementTransition() : incomingElementTransition());
                        this._canvasOut.style[transitionScriptName] = (zoomOut ? incomingElementTransition() : outgoingElementTransition());
                    }

                    if (!isPhone) {
                        scaleElement(this._canvasIn, (zoomOut ? this._zoomFactor : 1));
                        scaleElement(this._canvasOut, (zoomOut ? 1 : 1 / this._zoomFactor));
                    }
                    this._canvasIn.style.opacity = (zoomOut && !isPhone ? 0 : 1);
                    if (!isPhone || zoomOut) {
                        this._canvasOut.style.opacity = (zoomOut ? 1 : 0);
                    }

                    if (!_TransitionAnimation.isAnimationEnabled()) {
                        this._zooming = false;
                        this._canvasIn.style[transformNames.scriptName] = "";
                        this._canvasOut.style[transformNames.scriptName] = "";
                        this._completeZoom();
                    } else if (!customViewAnimationPromise) {
                        this.setTimeoutAfterTTFF(this._onZoomAnimationComplete.bind(this), _TransitionAnimation._animationTimeAdjustment(zoomAnimationDuration));
                    } else {
                        var that = this;
                        var onComplete = function onComplete() {
                            that._canvasIn.style[transformNames.scriptName] = "";
                            that._canvasOut.style[transformNames.scriptName] = "";
                            that._onZoomAnimationComplete();
                        };
                        customViewAnimationPromise.then(onComplete, onComplete);
                    }
                },

                _onBounceAnimationComplete: function () {
                    if (!this._isBouncingIn && !this._disposed) {
                        this._completeZoom();
                    }
                },

                _onZoomAnimationComplete: function () {
                    _WriteProfilerMark("WinJS.UI.SemanticZoom:ZoomAnimation,StopTM");

                    if (this._disposed) {
                        return;
                    }
                    this._zooming = false;
                    if (!this._aligning && !this._gesturing && !this._gestureEnding) {
                        this._completeZoom();
                    }
                },

                _onCanvasTransitionEnd: function (ev) {
                    if (this._disposed) {
                        return;
                    }

                    if ((ev.target === this._canvasOut || ev.target === this._canvasIn) && this._isBouncing) {
                        this._onBounceAnimationComplete();
                        return;
                    }

                    if (ev.target === this._canvasIn && ev.propertyName === transformNames.cssName) {
                        this._onZoomAnimationComplete();
                    }
                },

                _clearTimeout: function (timer) {
                    if (timer) {
                        _Global.clearTimeout(timer);
                    }
                },

                _completePointerUp: function (ev, stopPropagation) {
                    if (this._disposed) {
                        return;
                    }

                    var id = ev.pointerId;
                    var pointerRecord = this._pointerRecords[id];
                    if (pointerRecord) {
                        this._deletePointerRecord(id);
                        if (this._isBouncingIn) {
                            this._playBounce(false);
                        }

                        if (stopPropagation && this._pinchedDirection !== PinchDirection.none) {
                            ev.stopImmediatePropagation();
                        }

                        if (this._pointerCount === 0) {
                            // if we are not zooming and if there's any single pending pinch gesture detected that's not being triggered (fast pinch), process them now
                            if (this._pinchGesture === 1 && !this._zooming && this._lastPinchDirection !== PinchDirection.none && this._pinchDistanceCount < pinchDistanceCount) {
                                this._zoom(this._lastPinchDirection === PinchDirection.zoomedOut, this._currentMidPoint, false);
                                this._pinchGesture = 0;
                                this._attemptRecordReset();
                                return;
                            }

                            if (this._pinchedDirection !== PinchDirection.none) {
                                this._gesturing = false;
                                if (!this._aligning && !this._zooming) {
                                    this._completeZoom();
                                }
                            }
                            this._pinchGesture = 0;
                            this._attemptRecordReset();
                        }
                    }
                },

                setTimeoutAfterTTFF: function (callback, delay) {
                    var that = this;
                    that._TTFFTimer = _Global.setTimeout(function () {
                        if (this._disposed) {
                            return;
                        }
                        that._TTFFTimer = _Global.setTimeout(callback, delay);
                    }, zoomAnimationTTFFBuffer);
                },

                _completeZoomingIfTimeout: function () {
                    if (this._pointerCount !== 0) {
                        return;
                    }

                    var that = this;
                    if (this._zoomInProgress || this._isBouncing) {
                        that._completeZoomTimer = _Global.setTimeout(function () {
                            that._completeZoom();
                        }, _TransitionAnimation._animationTimeAdjustment(zoomAnimationTimeout));
                    }
                },

                _completeZoom: function () {
                    if (this._disposed) {
                        return;
                    }

                    if (this._isBouncing) {
                        if (this._zoomedOut) {
                            this._viewOut.endZoom(true);
                        } else {
                            this._viewIn.endZoom(true);
                        }
                        this._isBouncing = false;
                        return;
                    }


                    if (!this._zoomInProgress) {
                        return;
                    }

                    _WriteProfilerMark("WinJS.UI.SemanticZoom:CompleteZoom,info");
                    this._aligning = false;
                    this._alignViewsPromise && this._alignViewsPromise.cancel();

                    this._clearTimeout(this._completeZoomTimer);
                    this._clearTimeout(this._TTFFTimer);

                    this._gestureEnding = false;
                    this[this._zoomingOut ? "_opticalViewportOut" : "_opticalViewportIn"].msContentZoomFactor = 1.0;
                    this._viewIn.endZoom(!this._zoomingOut);
                    this._viewOut.endZoom(this._zoomingOut);
                    this._canvasIn.style.opacity = (this._zoomingOut && !_BaseUtils.isPhone ? 0 : 1);
                    this._canvasOut.style.opacity = (this._zoomingOut ? 1 : 0);

                    this._zoomInProgress = false;

                    var zoomChanged = false;
                    if (this._zoomingOut !== this._zoomedOut) {
                        this._zoomedOut = !!this._zoomingOut;
                        this._element.setAttribute("aria-checked", this._zoomedOut.toString());
                        zoomChanged = true;
                    }

                    this._setVisibility();

                    if (zoomChanged) {
                        // Dispatch the zoomChanged event
                        var ev = _Global.document.createEvent("CustomEvent");
                        ev.initCustomEvent(zoomChangedEvent, true, true, this._zoomedOut);
                        this._element.dispatchEvent(ev);

                        if (this._isActive) {
                            // If the element is no longer a valid focus target, it will throw, we
                            // simply won't do anything in this case
                            _ElementUtilities._setActive(this._zoomedOut ? this._elementOut : this._elementIn);
                        }
                    }

                    _WriteProfilerMark("WinJS.UI.SemanticZoom:CompleteZoom_Custom,info");
                },

                _isActive: function () {
                    var active = _Global.document.activeElement;
                    return this._element === active || this._element.contains(active);
                },

                _setLayout: function (element, position, overflow) {
                    var style = element.style;
                    style.position = position;
                    style.overflow = overflow;
                },

                _setupOpticalViewport: function (viewport) {
                    viewport.style["-ms-overflow-style"] = "none";
                    if (!_BaseUtils.isPhone) {
                        viewport.style["-ms-content-zooming"] = "zoom";
                        // We don't want the optical zoom to be too obvious with PTP (we're mostly just using it to get MSContentZoom events).
                        // We'll use a +/-1% margin around 100% so that we can still optically zoom, but not too far.
                        viewport.style["-ms-content-zoom-limit-min"] = "99%";
                        viewport.style["-ms-content-zoom-limit-max"] = "101%";
                        viewport.style["-ms-content-zoom-snap-points"] = "snapList(100%)";
                        viewport.style["-ms-content-zoom-snap-type"] = "mandatory";
                    }
                },

                _setVisibility: function () {
                    function setVisibility(element, isVisible) {
                        element.style.visibility = (isVisible ? "visible" : "hidden");
                        element.style.zIndex = (isVisible ? "1" : "0");
                    }
                    setVisibility(this._opticalViewportIn, !this._zoomedOut || _BaseUtils.isPhone);
                    setVisibility(this._opticalViewportOut, this._zoomedOut);
                    this._opticalViewportIn.setAttribute("aria-hidden", !!this._zoomedOut);
                    this._opticalViewportOut.setAttribute("aria-hidden", !this._zoomedOut);
                },

                _resetPointerRecords: function () {
                    this._pinchedDirection = PinchDirection.none;
                    this._pointerCount = 0;
                    this._pointerRecords = {};
                    this._resetPinchDistanceRecords();
                },

                _releasePointerCapture: function (ev) {
                    var id = ev.pointerId;
                    try {
                        // Release the pointer capture since they are going away, to allow in air touch pointers
                        // to be reused for multiple interactions
                        _ElementUtilities._releasePointerCapture(this._hiddenElement, id);
                    } catch (e) {
                        // This can throw if the pointer was not already captured
                    }
                },

                _attemptRecordReset: function () {
                    if (this._recordResetPromise) {
                        this._recordResetPromise.cancel();
                    }

                    var that = this;
                    this._recordResetPromise = Promise.timeout(eventTimeoutDelay).then(function () {
                        if (that._pointerCount === 0) {
                            that._resetPointerRecords();
                            that._recordResetPromise = null;
                        }
                    });
                },

                _resetPinchDistanceRecords: function () {
                    this._lastPinchDirection = PinchDirection.none;
                    this._lastPinchDistance = -1;
                    this._lastLastPinchDistance = -1;
                    this._pinchDistanceCount = 0;
                    this._currentMidPoint = null;
                },

                _getPointerLocation: function (ev) {
                    // Get pointer location returns co-ordinate in the sezo control co-ordinate space
                    var sezoBox = { left: 0, top: 0 };
                    try {
                        sezoBox = this._element.getBoundingClientRect();
                    }
                    catch (err) { }  // an exception can be thrown if SeZoDiv is no longer available

                    var sezoComputedStyle = _Global.getComputedStyle(this._element, null),
                        sezoPaddingLeft = getDimension(this._element, sezoComputedStyle["paddingLeft"]),
                        sezoPaddingTop = getDimension(this._element, sezoComputedStyle["paddingTop"]),
                        sezoBorderLeft = getDimension(this._element, sezoComputedStyle["borderLeftWidth"]);

                    return {
                        x: +ev.clientX === ev.clientX ? (ev.clientX - sezoBox.left - sezoPaddingLeft - sezoBorderLeft) : 0,
                        y: +ev.clientY === ev.clientY ? (ev.clientY - sezoBox.top - sezoPaddingTop - sezoPaddingTop) : 0
                    };
                },

                _playBounce: function (beginBounce, center) {
                    if (!_TransitionAnimation.isAnimationEnabled()) {
                        return;
                    }

                    if (this._isBouncingIn === beginBounce) {
                        return;
                    }

                    this._clearTimeout(this._completeZoomTimer);
                    this._clearTimeout(this._TTFFTimer);
                    this._isBouncing = true;
                    this._isBouncingIn = beginBounce;
                    if (beginBounce) {
                        this._bounceCenter = center;
                    } else {
                        this._aligned = true;
                    }

                    var targetElement = (this._zoomedOut ? this._canvasOut : this._canvasIn);
                    var adjustmentX = (this._zoomedOut ? this._canvasLeftOut : this._canvasLeftIn);
                    var adjustmentY = (this._zoomedOut ? this._canvasTopOut : this._canvasTopIn);
                    targetElement.style[browserStyleEquivalents["transform-origin"].scriptName] = (adjustmentX + this._bounceCenter.x) + "px " + (adjustmentY + this._bounceCenter.y) + "px";
                    targetElement.style[transitionScriptName] = beginBounce ? bounceInTransition() : bounceBackTransition();

                    if (!this._zoomedOut) {
                        this._viewIn.beginZoom();
                    } else {
                        this._viewOut.beginZoom();
                    }

                    var scale = (beginBounce ? (this._zoomedOut ? 2 - bounceFactor : bounceFactor) : 1);

                    scaleElement(targetElement, scale);

                    this.setTimeoutAfterTTFF(this._onBounceAnimationComplete.bind(this), _TransitionAnimation._animationTimeAdjustment(zoomAnimationDuration));
                },

                _rtl: function () {
                    return _Global.getComputedStyle(this._element, null).direction === "rtl";
                },

                _pinching: {
                    set: function (value) {
                        this._viewIn.pinching = value;
                        this._viewOut.pinching = value;
                    }
                }
            });
            _Base.Class.mix(SemanticZoom, _Events.createEventProperties("zoomchanged"));
            _Base.Class.mix(SemanticZoom, _Control.DOMEventMixin);
            return SemanticZoom;
        })

    });

});
