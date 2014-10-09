// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../../Core/_Global',
    '../../Core/_WinRT',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Core/_WriteProfilerMark',
    '../../Animations',
    '../../Animations/_TransitionAnimation',
    '../../Promise',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_UI',
    './_Constants'
    ], function itemEventsHandlerInit(exports, _Global, _WinRT, _Base, _BaseUtils, _WriteProfilerMark, Animations, _TransitionAnimation, Promise, _ElementUtilities, _UI, _Constants) {
    "use strict";

    var transformNames = _BaseUtils._browserStyleEquivalents["transform"];
    var MAX_TILT_ROTATION = 0.15;
    var MAX_TILT_SHRINK = 0.025;
    var uniqueID = _ElementUtilities._uniqueID;
    var MSManipulationEventStates = _ElementUtilities._MSManipulationEvent;

    function unitVector3d(v) {
        var mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        return {
            x: v.x / mag,
            y: v.y / mag,
            z: v.z / mag
        };
    }

    // Returns a CSS rotation matrix which rotates by *angle* radians over *axis*.
    // *axis* is an object of the form: { x: number, y: number, z: number }
    function rotationTransform3d(angle, axis) {
        var u = unitVector3d(axis);
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);
        var matrix = [
            cos + u.x * u.x * (1 - cos),
            u.x * u.y * (1 - cos) - u.z * sin,
            u.x * u.z * (1 - cos) + u.y * sin,
            0,

            u.y * u.x * (1 - cos) + u.z * sin,
            cos + u.y * u.y * (1 - cos),
            u.y * u.z * (1 - cos) - u.x * sin,
            0,

            u.z * u.x * (1 - cos) - u.y * sin,
            u.z * u.y * (1 - cos) + u.x * sin,
            cos + u.z * u.z * (1 - cos),
            0,

            0, 0, 0, 1
        ];

        // Scientific notation in transform values breaks the CSS3 values spec.
        matrix = matrix.map(function (value) {
            return value.toFixed(8);
        });
        return "matrix3d(" + matrix.join(",") + ")";
    }

    // Returns a CSS transformation to rotate and shrink an element when it is
    // pressed. The closer the click is to the center of the item, the more it
    // shrinks and the less it rotates.
    // *elementRect* should be of the form returned by getBoundingClientRect. All
    // of the parameters must be relative to the same coordinate system.
    // This function was translated from the Splash implementation.
    function tiltTransform(clickX, clickY, elementRect) {
        // x and y range from 0.0 thru 1.0 inclusive with the origin being at the top left.
        var x = _ElementUtilities._clamp((clickX - elementRect.left) / elementRect.width, 0, 1);
        var y = _ElementUtilities._clamp((clickY - elementRect.top) / elementRect.height, 0, 1);

        // Axis is perpendicular to the line drawn between the click position and the center of the item.
        // We set z to a small value so that even if x and y turn out to be 0, we still have an axis.
        var axis = {
            x: y - 0.5,
            y: -(x - 0.5),
            z: 0.0001
        };

        // The angle of the rotation is larger when the click is farther away from the center.
        var magnitude = Math.abs(x - 0.5) + Math.abs(y - 0.5); // an approximation
        var angle = magnitude * MAX_TILT_ROTATION;

        // The distance the control is pushed into z-space is larger when the click is closer to the center.
        var scale = 1 - (1 - magnitude) * MAX_TILT_SHRINK;

        var transform = "perspective(800px) scale(" + scale + ", " + scale + ") " + rotationTransform3d(angle, axis);

        return transform;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        // Expose these to the unit tests
        _rotationTransform3d: rotationTransform3d,
        _tiltTransform: tiltTransform,

        _ItemEventsHandler: _Base.Namespace._lazy(function () {
            var PT_TOUCH = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_TOUCH || "touch";

            function getElementWithClass(parent, className) {
                return parent.querySelector("." + className);
            }

            function createNodeWithClass(className, skipAriaHidden) {
                var element = _Global.document.createElement("div");
                element.className = className;
                if (!skipAriaHidden) {
                    element.setAttribute("aria-hidden", true);
                }
                return element;
            }

            var ItemEventsHandler =  _Base.Class.define(function ItemEventsHandler_ctor(site) {
                this._site = site;

                this._work = [];
                this._animations = {};
                this._selectionHintTracker = {};
                this._swipeClassTracker = {};

                // The gesture recognizer is used for SRG, which is not supported on Phone
                if (!_BaseUtils.isPhone && this._selectionAllowed()) {
                    var that = this;
                    _Global.setTimeout(function () {
                        if (!that._gestureRecognizer && !site.isZombie()) {
                            that._gestureRecognizer = that._createGestureRecognizer();
                        }
                    }, 500);
                }
            }, {
                dispose: function () {
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;
                    this._gestureRecognizer = null;
                    _ElementUtilities._removeEventListener(_Global, "pointerup", this._resetPointerDownStateBound);
                    _ElementUtilities._removeEventListener(_Global, "pointercancel", this._resetPointerDownStateBound);
                },

                onMSManipulationStateChanged: function ItemEventsHandler_onMSManipulationStateChanged(eventObject) {
                    var state = eventObject.currentState;
                    // We're not necessarily guaranteed to get onMSPointerDown before we get a selection event from cross slide,
                    // so if we hit a select state with no pressed item box recorded, we need to set up the pressed info before
                    // processing the selection.
                    if (state === MSManipulationEventStates.MS_MANIPULATION_STATE_PRESELECT && !this._site.pressedItemBox) {
                        var currentPressedIndex = this._site.indexForItemElement(eventObject.target);

                        this._site.pressedEntity = { type: _UI.ObjectType.item, index: currentPressedIndex };
                        if (this._site.pressedEntity.index !== _Constants._INVALID_INDEX) {
                            this._site.pressedItemBox = this._site.itemBoxAtIndex(this._site.pressedEntity.index);
                            this._site.pressedContainer = this._site.containerAtIndex(this._site.pressedEntity.index);
                            this._site.animatedElement = _BaseUtils.isPhone ? this._site.pressedItemBox : this._site.pressedContainer;
                            this._site.pressedHeader = null;
                            var allowed = this._site.verifySelectionAllowed(this._site.pressedEntity);
                            this._canSelect = allowed.canSelect;
                            this._canTapSelect = allowed.canTapSelect;
                            this._swipeBehaviorSelectionChanged = false;
                            this._selectionHint = null;
                            if (this._canSelect) {
                                this._addSelectionHint();
                            }
                        }
                    }
                    if (this._canSelect && (state === MSManipulationEventStates.MS_MANIPULATION_STATE_PRESELECT ||
                        state === MSManipulationEventStates.MS_MANIPULATION_STATE_COMMITTED ||
                        state === MSManipulationEventStates.MS_MANIPULATION_STATE_CANCELLED ||
                        state === MSManipulationEventStates.MS_MANIPULATION_STATE_SELECTING ||
                        state === MSManipulationEventStates.MS_MANIPULATION_STATE_DRAGGING)) {
                        this._dispatchSwipeBehavior(state);
                    }

                    if (state === MSManipulationEventStates.MS_MANIPULATION_STATE_COMMITTED ||
                        state === MSManipulationEventStates.MS_MANIPULATION_STATE_CANCELLED ||
                        state === MSManipulationEventStates.MS_MANIPULATION_STATE_STOPPED) {
                        this.resetPointerDownState();
                    }
                },

                onPointerDown: function ItemEventsHandler_onPointerDown(eventObject) {
                    _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSPointerDown,StartTM");
                    var site = this._site,
                        touchInput = (eventObject.pointerType === PT_TOUCH),
                        leftButton,
                        rightButton;
                    site.pressedElement = eventObject.target;
                    if (_WinRT.Windows.UI.Input.PointerPoint) {
                        // xButton is true when you've x-clicked with a mouse or pen. Otherwise it is false.
                        var currentPoint = this._getCurrentPoint(eventObject);
                        var pointProps = currentPoint.properties;
                        if (!(touchInput || pointProps.isInverted || pointProps.isEraser || pointProps.isMiddleButtonPressed)) {
                            rightButton = pointProps.isRightButtonPressed;
                            leftButton = !rightButton && pointProps.isLeftButtonPressed;
                        } else {
                            leftButton = rightButton = false;
                        }
                    } else {
                        // xButton is true when you've x-clicked with a mouse. Otherwise it is false.
                        leftButton = (eventObject.button === _Constants._LEFT_MSPOINTER_BUTTON);
                        rightButton = (eventObject.button === _Constants._RIGHT_MSPOINTER_BUTTON);
                    }

                    this._DragStartBound = this._DragStartBound || this.onDragStart.bind(this);
                    this._PointerEnterBound = this._PointerEnterBound || this.onPointerEnter.bind(this);
                    this._PointerLeaveBound = this._PointerLeaveBound || this.onPointerLeave.bind(this);

                    this._swipeBehaviorState = MSManipulationEventStates.MS_MANIPULATION_STATE_STOPPED;
                    var swipeEnabled = site.swipeBehavior === _UI.SwipeBehavior.select,
                        isInteractive = this._isInteractive(eventObject.target),
                        currentPressedIndex = site.indexForItemElement(eventObject.target),
                        currentPressedHeaderIndex = site.indexForHeaderElement(eventObject.target),
                        mustSetCapture = !isInteractive && currentPressedIndex !== _Constants._INVALID_INDEX;

                    if ((touchInput || leftButton || (this._selectionAllowed() && swipeEnabled && rightButton)) && this._site.pressedEntity.index === _Constants._INVALID_INDEX && !isInteractive) {
                        if (currentPressedHeaderIndex === _Constants._INVALID_INDEX) {
                            this._site.pressedEntity = { type: _UI.ObjectType.item, index: currentPressedIndex };
                        } else {
                            this._site.pressedEntity = { type: _UI.ObjectType.groupHeader, index: currentPressedHeaderIndex };
                        }

                        if (this._site.pressedEntity.index !== _Constants._INVALID_INDEX) {
                            this._site.pressedPosition = _ElementUtilities._getCursorPos(eventObject);

                            var allowed = site.verifySelectionAllowed(this._site.pressedEntity);
                            this._canSelect = allowed.canSelect;
                            this._canTapSelect = allowed.canTapSelect;

                            this._swipeBehaviorSelectionChanged = false;
                            this._selectionHint = null;

                            if (this._site.pressedEntity.type === _UI.ObjectType.item) {
                                this._site.pressedItemBox = site.itemBoxAtIndex(this._site.pressedEntity.index);
                                this._site.pressedContainer = site.containerAtIndex(this._site.pressedEntity.index);
                                this._site.animatedElement = _BaseUtils.isPhone ? this._site.pressedItemBox : this._site.pressedContainer;
                                this._site.pressedHeader = null;
                                this._togglePressed(true, false, eventObject);
                                this._site.pressedContainer.addEventListener('dragstart', this._DragStartBound);
                                if (!touchInput) {
                                    // This only works for non touch input because on touch input we set capture which immediately fires the MSPointerOut.
                                    _ElementUtilities._addEventListener(this._site.pressedContainer, 'pointerenter', this._PointerEnterBound, false);
                                    _ElementUtilities._addEventListener(this._site.pressedContainer, 'pointerleave', this._PointerLeaveBound, false);
                                }
                            } else {
                                this._site.pressedHeader = this._site.headerFromElement(eventObject.target);
                                // Interactions with the headers on phone show an animation
                                if (_BaseUtils.isPhone) {
                                    this._site.animatedElement = this._site.pressedHeader;
                                    this._togglePressed(true, false, eventObject);
                                } else {
                                    this._site.pressedItemBox = null;
                                    this._site.pressedContainer = null;
                                    this._site.animatedElement = null;
                                }
                            }

                            if (!this._resetPointerDownStateBound) {
                                this._resetPointerDownStateBound = this._resetPointerDownStateForPointerId.bind(this);
                            }

                            if (!touchInput) {
                                _ElementUtilities._addEventListener(_Global, "pointerup", this._resetPointerDownStateBound, false);
                                _ElementUtilities._addEventListener(_Global, "pointercancel", this._resetPointerDownStateBound, false);
                            }

                            // The gesture recognizer is used for SRG, which is not supported on Phone
                            if (this._canSelect && !_BaseUtils.isPhone) {
                                if (!this._gestureRecognizer) {
                                    this._gestureRecognizer = this._createGestureRecognizer();
                                }
                                this._addSelectionHint();
                            }
                            this._pointerId = eventObject.pointerId;
                            this._pointerRightButton = rightButton;
                            this._pointerTriggeredSRG = false;

                            if (this._gestureRecognizer && touchInput) {
                                try {
                                    this._gestureRecognizer.addPointer(this._pointerId);
                                } catch (e) {
                                    this._gestureRecognizer.stop();
                                }
                            }
                        }
                    }

                    if (mustSetCapture) {
                        if (touchInput) {
                            try {
                                // Move pointer capture to avoid hover visual on second finger
                                _ElementUtilities._setPointerCapture(site.canvasProxy, eventObject.pointerId);
                            } catch (e) {
                                _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSPointerDown,StopTM");
                                return;
                            }
                        }
                    }

                    // Once the shift selection pivot is set, it remains the same until the user
                    // performs a left- or right-click without holding the shift key down.
                    if (this._site.pressedEntity.type === _UI.ObjectType.item &&
                            this._selectionAllowed() && this._multiSelection() &&       // Multi selection enabled
                            this._site.pressedEntity.index !== _Constants._INVALID_INDEX &&    // A valid item was clicked
                            site.selection._getFocused().index !== _Constants._INVALID_INDEX && site.selection._pivot === _Constants._INVALID_INDEX) {
                        site.selection._pivot = site.selection._getFocused().index;
                    }

                    _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSPointerDown,StopTM");
                },

                onPointerEnter: function ItemEventsHandler_onPointerEnter(eventObject) {
                    if (this._site.pressedContainer && this._pointerId === eventObject.pointerId) {
                        this._togglePressed(true, false, eventObject);
                    }
                },

                onPointerLeave: function ItemEventsHandler_onPointerLeave(eventObject) {
                    if (this._site.pressedContainer && this._pointerId === eventObject.pointerId) {
                        this._togglePressed(false, true /* synchronous */, eventObject);
                    }
                },

                onDragStart: function ItemEventsHandler_onDragStart() {
                    this._resetPressedContainer();
                },

                _resetPressedContainer: function ItemEventsHandler_resetPressedContainer() {
                    if ((this._site.pressedContainer || this._site.pressedHeader) && this._site.animatedElement) {
                        this._togglePressed(false);
                        if (this._site.pressedContainer) {
                            this._site.pressedContainer.removeEventListener('dragstart', this._DragStartBound);
                            _ElementUtilities._removeEventListener(this._site.pressedContainer, 'pointerenter', this._PointerEnterBound, false);
                            _ElementUtilities._removeEventListener(this._site.pressedContainer, 'pointerleave', this._PointerLeaveBound, false);
                        }
                    }
                },

                onClick: function ItemEventsHandler_onClick(eventObject) {
                    if (!this._skipClick) {
                        // Handle the UIA invoke action on an item. this._skipClick is false which tells us that we received a click
                        // event without an associated MSPointerUp event. This means that the click event was triggered thru UIA
                        // rather than thru the GUI.
                        var entity = { type: _UI.ObjectType.item, index: this._site.indexForItemElement(eventObject.target) };
                        if (entity.index === _Constants._INVALID_INDEX) {
                            entity.index = this._site.indexForHeaderElement(eventObject.target);
                            if (entity.index !== _Constants._INVALID_INDEX) {
                                entity.type = _UI.ObjectType.groupHeader;
                            }
                        }

                        if (entity.index !== _Constants._INVALID_INDEX &&
                            (_ElementUtilities.hasClass(eventObject.target, this._site.accessibleItemClass) || _ElementUtilities.hasClass(eventObject.target, _Constants._headerClass))) {
                            var allowed = this._site.verifySelectionAllowed(entity);
                            if (allowed.canTapSelect) {
                                this.handleTap(entity);
                            }
                            this._site.fireInvokeEvent(entity, eventObject.target);
                        }
                    }
                },

                onPointerUp: function ItemEventsHandler_onPointerUp(eventObject) {
                    _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSPointerUp,StartTM");

                    var site = this._site;
                    this._skipClick = true;
                    var that = this;
                    var swipeEnabled = this._site.swipeBehavior === _UI.SwipeBehavior.select;
                    _BaseUtils._yieldForEvents(function () {
                        that._skipClick = false;
                    });

                    try {
                        // Release the pointer capture to allow in air touch pointers to be reused for multiple interactions
                        _ElementUtilities._releasePointerCapture(site.canvasProxy, eventObject.pointerId);
                    } catch (e) {
                        // This can throw if SeZo had capture or if the pointer was not already captured
                    }

                    var touchInput = (eventObject.pointerType === PT_TOUCH),
                        releasedElement = this._releasedElement(eventObject),
                        releasedIndex = site.indexForItemElement(releasedElement),
                        releasedHeaderIndex = releasedElement && _ElementUtilities.hasClass(releasedElement, _Constants._headerContainerClass) ? site.indexForHeaderElement(site.pressedHeader) : site.indexForHeaderElement(releasedElement);

                    if (this._pointerId === eventObject.pointerId) {
                        var releasedEntity;
                        if (releasedHeaderIndex === _Constants._INVALID_INDEX) {
                            releasedEntity = { type: _UI.ObjectType.item, index: releasedIndex };
                        } else {
                            releasedEntity = { type: _UI.ObjectType.groupHeader, index: releasedHeaderIndex };
                        }

                        this._resetPressedContainer();

                        if (this._site.pressedEntity.type === _UI.ObjectType.item && releasedEntity.type === _UI.ObjectType.item &&
                                this._site.pressedContainer && this._site.pressedEntity.index === releasedEntity.index) {

                            if (!eventObject.shiftKey) {
                                // Reset the shift selection pivot when the user clicks w/o pressing shift
                                site.selection._pivot = _Constants._INVALID_INDEX;
                            }

                            if (eventObject.shiftKey) {
                                // Shift selection should work when shift or shift+ctrl are depressed for both left- and right-click
                                if (this._selectionAllowed() && this._multiSelection() && site.selection._pivot !== _Constants._INVALID_INDEX) {
                                    var firstIndex = Math.min(this._site.pressedEntity.index, site.selection._pivot),
                                        lastIndex = Math.max(this._site.pressedEntity.index, site.selection._pivot),
                                        additive = (this._pointerRightButton || eventObject.ctrlKey || site.tapBehavior === _UI.TapBehavior.toggleSelect);
                                    site.selectRange(firstIndex, lastIndex, additive);
                                }
                            } else if (eventObject.ctrlKey || (this._selectionAllowed() && swipeEnabled && this._pointerRightButton)) {
                                // Swipe emulation
                                this.handleSwipeBehavior(this._site.pressedEntity.index);
                            }
                        }

                        if ((this._site.pressedHeader || this._site.pressedContainer) && this._swipeBehaviorState !== MSManipulationEventStates.MS_MANIPULATION_STATE_COMMITTED) {
                            var upPosition = _ElementUtilities._getCursorPos(eventObject);
                            var isTap = Math.abs(upPosition.left - this._site.pressedPosition.left) <= _Constants._TAP_END_THRESHOLD &&
                                Math.abs(upPosition.top - this._site.pressedPosition.top) <= _Constants._TAP_END_THRESHOLD;

                            this._endSelfRevealGesture();
                            this._clearItem(this._site.pressedEntity, this._isSelected(this._site.pressedEntity.index));

                            // We do not care whether or not the pressed and released indices are equivalent when the user is using touch. The only time they won't be is if the user
                            // tapped the edge of an item and the pressed animation shrank the item such that the user's finger was no longer over it. In this case, the item should
                            // be considered tapped.
                            // However, if the user is using touch then we must perform an extra check. Sometimes we receive MSPointerUp events when the user intended to pan or swipe.
                            // This extra check ensures that these intended pans/swipes aren't treated as taps.
                            if (!this._pointerRightButton && !this._pointerTriggeredSRG && !eventObject.ctrlKey && !eventObject.shiftKey &&
                                    ((touchInput && isTap) ||
                                    (!touchInput && this._site.pressedEntity.index === releasedEntity.index && this._site.pressedEntity.type === releasedEntity.type))) {
                                if (releasedEntity.type === _UI.ObjectType.groupHeader) {
                                    this._site.pressedHeader = site.headerAtIndex(releasedEntity.index);
                                    this._site.pressedItemBox = null;
                                    this._site.pressedContainer = null;
                                } else {
                                    this._site.pressedItemBox = site.itemBoxAtIndex(releasedEntity.index);
                                    this._site.pressedContainer = site.containerAtIndex(releasedEntity.index);
                                    this._site.pressedHeader = null;
                                }

                                if (this._canTapSelect) {
                                    this.handleTap(this._site.pressedEntity);
                                }
                                this._site.fireInvokeEvent(this._site.pressedEntity, this._site.pressedItemBox || this._site.pressedHeader);
                            }
                        }

                        if (this._site.pressedEntity.index !== _Constants._INVALID_INDEX) {
                            site.changeFocus(this._site.pressedEntity, true, false, true);
                        }

                        this.resetPointerDownState();
                    }

                    _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSPointerUp,StopTM");
                },

                onPointerCancel: function ItemEventsHandler_onPointerCancel(eventObject) {
                    if (this._pointerId === eventObject.pointerId && this._swipeBehaviorState !== MSManipulationEventStates.MS_MANIPULATION_STATE_PRESELECT) {
                        _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSPointerCancel,info");
                        this.resetPointerDownState();
                    }
                },

                onLostPointerCapture: function ItemEventsHandler_onLostPointerCapture(eventObject) {
                    if (this._pointerId === eventObject.pointerId && this._swipeBehaviorState !== MSManipulationEventStates.MS_MANIPULATION_STATE_PRESELECT) {
                        _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSLostPointerCapture,info");
                        this.resetPointerDownState();
                    }
                },

                // In order for the control to play nicely with other UI controls such as the app bar, it calls preventDefault on
                // contextmenu events. It does this only when selection is enabled, the event occurred on or within an item, and
                // the event did not occur on an interactive element.
                onContextMenu: function ItemEventsHandler_onContextMenu(eventObject) {
                    var containerElement = this._site.containerFromElement(eventObject.target);

                    if (this._selectionAllowed() && containerElement && !this._isInteractive(eventObject.target)) {
                        eventObject.preventDefault();
                    }
                },

                onMSHoldVisual: function ItemEventsHandler_onMSHoldVisual(eventObject) {
                    if (!this._isInteractive(eventObject.target)) {
                        eventObject.preventDefault();
                    }
                },

                onDataChanged: function ItemEventsHandler_onDataChanged() {
                    this.resetPointerDownState();
                },

                handleSwipeBehavior: function ItemEventsHandler_handleSwipeBehavior(itemIndex) {
                    if (this._selectionAllowed(itemIndex)) {
                        this._toggleItemSelection(itemIndex);
                    }
                },

                handleTap: function ItemEventsHandler_handleTap(entity) {
                    if (entity.type === _UI.ObjectType.groupHeader) {
                        return;
                    }

                    var site = this._site,
                        selection = site.selection;

                    if (this._selectionAllowed(entity.index) && this._selectOnTap()) {
                        if (site.tapBehavior === _UI.TapBehavior.toggleSelect) {
                            this._toggleItemSelection(entity.index);
                        } else {
                            // site.tapBehavior === _UI.TapBehavior.directSelect so ensure only itemIndex is selected
                            if (site.selectionMode === _UI.SelectionMode.multi || !selection._isIncluded(entity.index)) {
                                selection.set(entity.index);
                            }
                        }
                    }
                },

                // In single selection mode, in addition to itemIndex's selection state being toggled,
                // all other items will become deselected
                _toggleItemSelection: function ItemEventsHandler_toggleItemSelection(itemIndex) {
                    var site = this._site,
                        selection = site.selection,
                        selected = selection._isIncluded(itemIndex);

                    if (site.selectionMode === _UI.SelectionMode.single) {
                        if (!selected) {
                            selection.set(itemIndex);
                        } else {
                            selection.clear();
                        }
                    } else {
                        if (!selected) {
                            selection.add(itemIndex);
                        } else {
                            selection.remove(itemIndex);
                        }
                    }
                },

                _getCurrentPoint: function ItemEventsHandler_getCurrentPoint(eventObject) {
                    return _WinRT.Windows.UI.Input.PointerPoint.getCurrentPoint(eventObject.pointerId);
                },

                _containedInElementWithClass: function ItemEventsHandler_containedInElementWithClass(element, className) {
                    if (element.parentNode) {
                        var matches = element.parentNode.querySelectorAll("." + className + ", ." + className + " *");
                        for (var i = 0, len = matches.length; i < len; i++) {
                            if (matches[i] === element) {
                                return true;
                            }
                        }
                    }
                    return false;
                },

                _isSelected: function ItemEventsHandler_isSelected(index) {
                    return (!this._swipeBehaviorSelectionChanged && this._site.selection._isIncluded(index)) || (this._swipeBehaviorSelectionChanged && this.swipeBehaviorSelected);
                },

                _isInteractive: function ItemEventsHandler_isInteractive(element) {
                    return this._containedInElementWithClass(element, "win-interactive");
                },

                _togglePressed: function ItemEventsHandler_togglePressed(add, synchronous, eventObject) {
                    var that = this;
                    var isHeader = this._site.pressedEntity.type === _UI.ObjectType.groupHeader;

                    this._site.animatedDownPromise && this._site.animatedDownPromise.cancel();

                    if (_BaseUtils.isPhone && !isHeader && _ElementUtilities.hasClass(this._site.pressedItemBox, _Constants._nonSelectableClass)) {
                        return;
                    }

                    if (!this._staticMode(isHeader)) {
                        if (add) {
                            if (!_ElementUtilities.hasClass(this._site.animatedElement, _Constants._pressedClass)) {
                                _WriteProfilerMark("WinJS.UI._ItemEventsHandler:applyPressedUI,info");
                                _ElementUtilities.addClass(this._site.animatedElement, _Constants._pressedClass);

                                if (eventObject && _BaseUtils.isPhone) {
                                    var boundingElement = isHeader ? that._site.pressedHeader : that._site.pressedContainer;
                                    var transform = tiltTransform(eventObject.clientX, eventObject.clientY, boundingElement.getBoundingClientRect());
                                    // Timeout prevents item from looking like it was pressed down during swipes and pans
                                    this._site.animatedDownPromise = Promise.timeout(50).then(function () {
                                        applyDownVisual(transform);
                                    });
                                } else {
                                    // Shrink by 97.5% unless that is larger than 7px in either direction. In that case we cap the
                                    // scale so that it is no larger than 7px in either direction. We keep the scale uniform in both x
                                    // and y directions. Note that this scale cap only works if getItemPosition returns synchronously
                                    // which it does for the built in layouts.
                                    var scale = 0.975;
                                    var maxPixelsToShrink = 7;

                                    this._site.getItemPosition(this._site.pressedEntity).then(function (pos) {
                                        if (pos.contentWidth > 0) {
                                            scale = Math.max(scale, (1 - (maxPixelsToShrink / pos.contentWidth)));
                                        }
                                        if (pos.contentHeight > 0) {
                                            scale = Math.max(scale, (1 - (maxPixelsToShrink / pos.contentHeight)));
                                        }
                                    }, function () {
                                        // Swallow errors in case data source changes
                                    });
                                    applyDownVisual("scale(" + scale + "," + scale + ")");
                                }
                            }
                        } else {
                            if (_ElementUtilities.hasClass(this._site.animatedElement, _Constants._pressedClass)) {
                                var element = this._site.animatedElement;
                                var expectingStyle = this._site.animatedElementScaleTransform;
                                if (synchronous) {
                                    applyUpVisual(element, expectingStyle);
                                } else {
                                    // Force removal of the _pressedClass to be asynchronous so that users will see at
                                    // least one frame of the shrunken item when doing a quick tap.
                                    //
                                    // setImmediate is used rather than requestAnimationFrame to ensure that the item
                                    // doesn't get stuck down for too long -- apps are told to put long running invoke
                                    // code behind a setImmediate and togglePressed's async code needs to run first.
                                    _BaseUtils._setImmediate(function () {
                                        if (_ElementUtilities.hasClass(element, _Constants._pressedClass)) {
                                            applyUpVisual(element, expectingStyle);
                                        }
                                    });
                                }
                            }
                        }
                    }

                    function applyDownVisual(transform) {
                        if (that._site.animatedElement.style[transformNames.scriptName] === "") {
                            that._site.animatedElement.style[transformNames.scriptName] = transform;
                            that._site.animatedElementScaleTransform = that._site.animatedElement.style[transformNames.scriptName];
                        } else {
                            that._site.animatedElementScaleTransform = "";
                        }
                    }

                    function applyUpVisual(element, expectingStyle) {
                        _WriteProfilerMark("WinJS.UI._ItemEventsHandler:removePressedUI,info");
                        _ElementUtilities.removeClass(element, _Constants._pressedClass);
                        if (_BaseUtils.isPhone) {
                            if (that._containsTransform(element, expectingStyle)) {
                                _TransitionAnimation.executeTransition(element, {
                                    property: transformNames.cssName,
                                    delay: 0,
                                    duration: 500,
                                    timing: "cubic-bezier(0.7025,0,0.9225,-0.115)",
                                    to: element.style[transformNames.scriptName].replace(expectingStyle, "")
                                });
                            }
                        } else {
                            that._removeTransform(element, expectingStyle);
                        }
                    }
                },

                _containsTransform: function ItemEventsHandler_containsTransform(element, transform) {
                    return transform && element.style[transformNames.scriptName].indexOf(transform) !== -1;
                },

                _removeTransform: function ItemEventsHandler_removeTransform(element, transform) {
                    if (this._containsTransform(element, transform)) {
                        element.style[transformNames.scriptName] = element.style[transformNames.scriptName].replace(transform, "");
                    }
                },

                _endSwipeBehavior: function ItemEventsHandler_endSwipeBehavior() {
                    if (!(this._swipeBehaviorState === MSManipulationEventStates.MS_MANIPULATION_STATE_PRESELECT ||
                        this._swipeBehaviorState === MSManipulationEventStates.MS_MANIPULATION_STATE_SELECTING ||
                        this._swipeBehaviorState === MSManipulationEventStates.MS_MANIPULATION_STATE_DRAGGING ||
                        this._swipeBehaviorState === MSManipulationEventStates.MS_MANIPULATION_STATE_COMMITTED ||
                        this._swipeBehaviorState === MSManipulationEventStates.MS_MANIPULATION_STATE_CANCELLED)) {
                        return;
                    }

                    if (this._site.pressedEntity.type === _UI.ObjectType.groupHeader) {
                        return;
                    }

                    this._flushUIBatches();
                    var selectionHint = this._selectionHint;
                    this._selectionHint = null;

                    if (this._site.pressedItemBox) {
                        var pressedIndex = this._site.pressedEntity.index,
                            selected = this._site.selection._isIncluded(pressedIndex);
                        if (selected) {
                            var elementsToShowHide = _ElementUtilities._getElementsByClasses(this._site.pressedItemBox, [_Constants._selectionCheckmarkClass, _Constants._selectionCheckmarkBackgroundClass]);
                            for (var i = 0; i < elementsToShowHide.length; i++) {
                                elementsToShowHide[i].style.opacity = 1;
                            }
                        }
                        this._clearItem(this._site.pressedEntity, selected);
                        if (selectionHint) {
                            this._removeSelectionHint(selectionHint);
                        }
                        delete this._animations[pressedIndex];
                    }
                },

                _createGestureRecognizer: function ItemEventsHandler_createGestureRecognizer() {
                    var rootElement = this._site.eventHandlerRoot;
                    var recognizer = _ElementUtilities._createGestureRecognizer();
                    recognizer.target = rootElement;
                    var that = this;
                    rootElement.addEventListener("MSGestureHold", function (eventObject) {
                        if (that._site.pressedEntity.index !== -1 && eventObject.detail === _ElementUtilities._MSGestureEvent.MSGESTURE_FLAG_BEGIN) {
                            that._startSelfRevealGesture();
                        }
                    });
                    return recognizer;
                },

                _dispatchSwipeBehavior: function ItemEventsHandler_dispatchSwipeBehavior(manipulationState) {
                    if (this._site.pressedEntity.type === _UI.ObjectType.groupHeader ||
                        this._site.swipeBehavior !== _UI.SwipeBehavior.select) {
                        return;
                    }
                    this._site.selection._pivot = _Constants._INVALID_INDEX;
                    if (this._site.pressedItemBox) {
                        var pressedIndex = this._site.pressedEntity.index;
                        if (this._swipeBehaviorState !== manipulationState) {
                            if (manipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_DRAGGING && this._canSelect) {
                                this._animateSelectionChange(this._site.selection._isIncluded(pressedIndex));
                                this._removeSelectionHint(this._selectionHint);
                            } else if (manipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_PRESELECT) {
                                _WriteProfilerMark("WinJS.UI._ItemEventsHandler:crossSlidingStarted,info");
                                var site = this._site,
                                    pressedElement = site.itemAtIndex(pressedIndex),
                                    selected = site.selection._isIncluded(pressedIndex);

                                if (this._selfRevealGesture) {
                                    this._selfRevealGesture.finishAnimation();
                                    this._selfRevealGesture = null;
                                } else if (this._canSelect) {
                                    this._prepareItem(this._site.pressedEntity, pressedElement, selected);
                                }

                                if (this._swipeBehaviorState !== MSManipulationEventStates.MS_MANIPULATION_STATE_SELECTING) {
                                    if (this._site.animatedElement && _ElementUtilities.hasClass(this._site.animatedElement, _Constants._pressedClass)) {
                                        this._site.animatedDownPromise && this._site.animatedDownPromise.cancel();
                                        _ElementUtilities.removeClass(this._site.animatedElement, _Constants._pressedClass);
                                        this._removeTransform(this._site.animatedElement, this._site.animatedElementScaleTransform);
                                    }

                                    this._showSelectionHintCheckmark();
                                } else {
                                    this._animateSelectionChange(this._site.selection._isIncluded(pressedIndex));
                                }
                            } else if (manipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_COMMITTED) {
                                _WriteProfilerMark("WinJS.UI._ItemEventsHandler:crossSlidingCompleted,info");
                                var site = this._site,
                                    selection = site.selection,
                                    swipeBehaviorSelectionChanged = this._swipeBehaviorSelectionChanged,
                                    swipeBehaviorSelected = this.swipeBehaviorSelected;

                                if (this._swipeBehaviorState === MSManipulationEventStates.MS_MANIPULATION_STATE_SELECTING && swipeBehaviorSelectionChanged) {
                                    if (this._selectionAllowed() && site.swipeBehavior === _UI.SwipeBehavior.select) {
                                        if (site.selectionMode === _UI.SelectionMode.single) {
                                            if (swipeBehaviorSelected) {
                                                selection.set(pressedIndex);
                                            } else if (selection._isIncluded(pressedIndex)) {
                                                selection.remove(pressedIndex);
                                            }
                                        } else {
                                            if (swipeBehaviorSelected) {
                                                selection.add(pressedIndex);
                                            } else if (selection._isIncluded(pressedIndex)) {
                                                selection.remove(pressedIndex);
                                            }
                                        }
                                    }
                                }

                                // snap back and remove addional elements
                                this._endSwipeBehavior();
                            } else if (manipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_SELECTING && this._canSelect) {
                                this._animateSelectionChange(!this._site.selection._isIncluded(pressedIndex));
                            } else if (this._swipeBehaviorState === MSManipulationEventStates.MS_MANIPULATION_STATE_SELECTING && this._canSelect) {
                                this._animateSelectionChange(this._site.selection._isIncluded(pressedIndex), (manipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_CANCELLED));
                            }
                        }
                    }

                    this._swipeBehaviorState = manipulationState;
                },


                _resetPointerDownStateForPointerId: function ItemEventsHandler_resetPointerDownState(eventObject) {
                    if (this._pointerId === eventObject.pointerId) {
                        this.resetPointerDownState();
                    }
                },

                resetPointerDownState: function ItemEventsHandler_resetPointerDownState() {
                    if (this._gestureRecognizer) {
                        this._endSelfRevealGesture();
                        this._endSwipeBehavior();
                    }
                    this._site.pressedElement = null;
                    _ElementUtilities._removeEventListener(_Global, "pointerup", this._resetPointerDownStateBound);
                    _ElementUtilities._removeEventListener(_Global, "pointercancel", this._resetPointerDownStateBound);

                    this._resetPressedContainer();

                    this._site.pressedContainer = null;
                    this._site.animatedElement = null;
                    this._site.pressedHeader = null;
                    this._site.pressedItemBox = null;

                    this._removeSelectionHint(this._selectionHint);
                    this._selectionHint = null;

                    this._site.pressedEntity = { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX };
                    this._pointerId = null;
                },

                // Play the self-reveal gesture (SRG) animation which jiggles the item to reveal the selection hint behind it.
                // This function is overridden by internal teams to add a tooltip on SRG start - treat this function as a public API for the sake of function name/parameter changes.
                _startSelfRevealGesture: function ItemEventsHandler_startSelfRevealGesture() {
                    if (this._canSelect && this._site.swipeBehavior === _UI.SwipeBehavior.select) {
                        _WriteProfilerMark("WinJS.UI._ItemEventsHandler:playSelfRevealGesture,info");

                        var that = this;
                        var site = this._site,
                            index = this._site.pressedEntity.index,
                            itemBox = site.itemBoxAtIndex(index),
                            selected = site.selection._isIncluded(index),
                            finished = false;

                        var swipeReveal = function () {
                            var top,
                                left;

                            if (site.horizontal) {
                                top = _Constants._VERTICAL_SWIPE_SELF_REVEAL_GESTURE + "px";
                                left = "0px";
                            } else {
                                top = "0px";
                                left = (site.rtl() ? "" : "-") + _Constants._HORIZONTAL_SWIPE_SELF_REVEAL_GESTURE + "px";
                            }

                            return Animations.swipeReveal(itemBox, { top: top, left: left });
                        };

                        var swipeHide = function () {
                            return finished ? Promise.wrap() : Animations.swipeReveal(itemBox, { top: "0px", left: "0px" });
                        };

                        var cleanUp = function (selectionHint) {
                            if (!site.isZombie()) {
                                if (selectionHint) {
                                    that._removeSelectionHint(selectionHint);
                                }
                                that._clearItem(site.pressedEntity, site.selection._isIncluded(index));
                            }
                        };

                        // Immediately begins the last phase of the SRG animation which animates the item back to its original location
                        var finishAnimation = function () {
                            that._selfRevealGesture._promise.cancel();
                            finished = true;
                            var selectionHint = that._selectionHint;
                            that._selectionHint = null;
                            return swipeHide().then(function () {
                                itemBox.style[transformNames.scriptName] = "";
                                cleanUp(selectionHint);
                            });
                        };

                        this._prepareItem(this._site.pressedEntity, itemBox, selected);
                        this._showSelectionHintCheckmark();

                        this._pointerTriggeredSRG = true;
                        this._selfRevealGesture = {
                            finishAnimation: finishAnimation,
                            _promise: swipeReveal().
                                then(swipeHide).
                                then(function () {
                                    if (!finished) {
                                        that._hideSelectionHintCheckmark();
                                        cleanUp();
                                        that._selfRevealGesture = null;
                                    }
                                })
                        };
                    }
                },

                // This function is overridden by internal teams to remove a tooltip on SRG completion - treat this function as a public API for the sake of function name/parameter changes
                _endSelfRevealGesture: function ItemEventsHandler_endSelfRevealGesture() {
                    if (this._selfRevealGesture) {
                        this._selfRevealGesture.finishAnimation();
                        this._selfRevealGesture = null;
                    }
                },

                _prepareItem: function ItemEventsHandler_prepareItem(pressedEntity, pressedElement, selected) {
                    if (pressedEntity.type === _UI.ObjectType.groupHeader) {
                        return;
                    }

                    var that = this,
                        site = this._site,
                        pressedIndex = pressedEntity.index;

                    function addSwipeClass(container) {
                        if (!that._swipeClassTracker[uniqueID(container)]) {
                            _ElementUtilities.addClass(container, _Constants._swipeClass);
                            that._swipeClassTracker[uniqueID(container)] = 1;
                        } else {
                            that._swipeClassTracker[uniqueID(container)]++;
                        }
                    }

                    if (!selected) {
                        (this._animations[pressedIndex] || Promise.wrap()).then(function () {
                            if (!site.isZombie() && pressedEntity.type === _UI.ObjectType.item && site.pressedEntity.index !== -1) {
                                pressedIndex = site.pressedEntity.index;

                                var pressedElement = site.itemAtIndex(pressedIndex),
                                    itemBox = site.itemBoxAtIndex(pressedIndex),
                                    container = site.containerAtIndex(pressedIndex);

                                addSwipeClass(container);

                                if (!_ElementUtilities._isSelectionRendered(itemBox)) {
                                    ItemEventsHandler.renderSelection(itemBox, pressedElement, true, container);

                                    _ElementUtilities.removeClass(itemBox, _Constants._selectedClass);
                                    _ElementUtilities.removeClass(container, _Constants._selectedClass);

                                    var nodes = itemBox.querySelectorAll(_ElementUtilities._selectionPartsSelector);
                                    for (var i = 0, len = nodes.length; i < len; i++) {
                                        nodes[i].style.opacity = 0;
                                    }
                                }
                            }
                        });
                    } else {
                        var container = site.containerAtIndex(pressedIndex);
                        addSwipeClass(container);
                    }
                },

                _clearItem: function ItemEventsHandler_clearItem(pressedEntity, selected) {
                    if (pressedEntity.type !== _UI.ObjectType.item) {
                        return;
                    }

                    var that = this,
                        site = this._site,
                        container = site.containerAtIndex(pressedEntity.index),
                        itemBox = site.itemBoxAtIndex(pressedEntity.index),
                        element = site.itemAtIndex(pressedEntity.index);

                    function removeSwipeClass(container) {
                        var refCount = --that._swipeClassTracker[uniqueID(container)];
                        if (!refCount) {
                            delete that._swipeClassTracker[uniqueID(container)];
                            _ElementUtilities.removeClass(container, _Constants._swipeClass);
                            return true;
                        }
                        return false;
                    }

                    function removeSwipeFromItemsBlock(container) {
                        var itemsBlock = container.parentNode;
                        if (itemsBlock && _ElementUtilities.hasClass(itemsBlock, _Constants._itemsBlockClass)) {
                            removeSwipeClass(itemsBlock);
                        }
                    }

                    if (container && itemBox && element) {
                        var doneSwiping = removeSwipeClass(container);
                        removeSwipeFromItemsBlock(container);
                        if (doneSwiping) {
                            ItemEventsHandler.renderSelection(itemBox, element, selected, true, container);
                        }
                    }
                },

                _animateSelectionChange: function ItemEventsHandler_animateSelectionChange(select, includeCheckmark) {
                    var that = this,
                        pressedContainer = this._site.pressedContainer,
                        pressedItemBox = this._site.pressedItemBox;

                    function toggleClasses() {
                        var classOperation = select ? "addClass" : "removeClass";
                        _ElementUtilities[classOperation](pressedItemBox, _Constants._selectedClass);
                        _ElementUtilities[classOperation](pressedContainer, _Constants._selectedClass);
                        if (that._selectionHint) {
                            var hintCheckMark = getElementWithClass(that._selectionHint, _Constants._selectionHintClass);
                            if (hintCheckMark) {
                                _ElementUtilities[classOperation](hintCheckMark, _Constants._revealedClass);
                            }
                        }
                    }

                    this._swipeBehaviorSelectionChanged = true;
                    this.swipeBehaviorSelected = select;

                    var elementsToShowHide = _ElementUtilities._getElementsByClasses(this._site.pressedItemBox, [_Constants._selectionBorderClass, _Constants._selectionBackgroundClass]);

                    if (!select || includeCheckmark) {
                        elementsToShowHide = elementsToShowHide.concat(_ElementUtilities._getElementsByClasses(this._site.pressedItemBox, [_Constants._selectionCheckmarkBackgroundClass, _Constants._selectionCheckmarkClass]));
                    }

                    _WriteProfilerMark("WinJS.UI._ItemEventsHandler:" + (select ? "hitSelectThreshold" : "hitUnselectThreshold") + ",info");

                    this._applyUIInBatches(function () {
                        _WriteProfilerMark("WinJS.UI._ItemEventsHandler:" + (select ? "apply" : "remove") + "SelectionVisual,info");
                        var opacity = (select ? 1 : 0);
                        for (var i = 0; i < elementsToShowHide.length; i++) {
                            elementsToShowHide[i].style.opacity = opacity;
                        }

                        toggleClasses();
                    });
                },

                _showSelectionHintCheckmark: function ItemEventsHandler_showSelectionHintCheckmark() {
                    if (this._selectionHint) {
                        var hintCheckMark = getElementWithClass(this._selectionHint, _Constants._selectionHintClass);
                        if (hintCheckMark) {
                            hintCheckMark.style.display = 'block';
                        }
                    }
                },

                _hideSelectionHintCheckmark: function ItemEventsHandler_hideSelectionHintCheckmark() {
                    if (this._selectionHint) {
                        var hintCheckMark = getElementWithClass(this._selectionHint, _Constants._selectionHintClass);
                        if (hintCheckMark) {
                            hintCheckMark.style.display = 'none';
                        }
                    }
                },

                _addSelectionHint: function ItemEventsHandler_addSelectionHint() {
                    if (this._site.pressedEntity.type === _UI.ObjectType.groupHeader) {
                        return;
                    }

                    var selectionHint,
                        site = this._site;

                    if (site.customFootprintParent) {
                        selectionHint = this._selectionHint = _Global.document.createElement("div");
                        selectionHint.className = _Constants._containerClass;

                        var that = this;
                        site.getItemPosition(this._site.pressedEntity).then(function (pos) {
                            if (!site.isZombie() && that._selectionHint && that._selectionHint === selectionHint) {
                                var style = selectionHint.style;
                                var cssText = ";position:absolute;" +
                                    (site.rtl() ? "right:" : "left:") + pos.left + "px;top:" +
                                    pos.top + "px;width:" + pos.contentWidth + "px;height:" + pos.contentHeight + "px";
                                style.cssText += cssText;
                                site.customFootprintParent.insertBefore(that._selectionHint, that._site.pressedItemBox);
                            }
                        }, function () {
                            // Swallow errors in case data source changes
                        });
                    } else {
                        selectionHint = this._selectionHint = this._site.pressedContainer;
                    }

                    if (!this._selectionHintTracker[uniqueID(selectionHint)]) {
                        _ElementUtilities.addClass(selectionHint, _Constants._footprintClass);

                        if (!site.selection._isIncluded(this._site.pressedEntity.index)) {
                            var element = _Global.document.createElement("div");
                            element.className = _Constants._selectionHintClass;
                            element.textContent = _Constants._SELECTION_CHECKMARK;
                            element.style.display = 'none';
                            this._selectionHint.insertBefore(element, this._selectionHint.firstElementChild);
                        }

                        this._selectionHintTracker[uniqueID(selectionHint)] = 1;
                    } else {
                        this._selectionHintTracker[uniqueID(selectionHint)]++;
                    }
                },

                _removeSelectionHint: function ItemEventsHandler_removeSelectionHint(selectionHint) {
                    if (selectionHint) {
                        var refCount = --this._selectionHintTracker[uniqueID(selectionHint)];
                        if (!refCount) {
                            delete this._selectionHintTracker[uniqueID(selectionHint)];

                            if (!this._site.customFootprintParent) {
                                _ElementUtilities.removeClass(selectionHint, _Constants._footprintClass);
                                var hintCheckMark = getElementWithClass(selectionHint, _Constants._selectionHintClass);
                                if (hintCheckMark) {
                                    hintCheckMark.parentNode.removeChild(hintCheckMark);
                                }
                            } else if (selectionHint.parentNode) {
                                selectionHint.parentNode.removeChild(selectionHint);
                            }
                        }
                    }
                },

                _releasedElement: function ItemEventsHandler_releasedElement(eventObject) {
                    return _Global.document.elementFromPoint(eventObject.clientX, eventObject.clientY);
                },

                _applyUIInBatches: function ItemEventsHandler_applyUIInBatches(work) {
                    var that = this;
                    this._work.push(work);

                    if (!this._paintedThisFrame) {
                        applyUI();
                    }

                    function applyUI() {
                        if (that._work.length > 0) {
                            that._flushUIBatches();
                            that._paintedThisFrame = _BaseUtils._requestAnimationFrame(applyUI.bind(that));
                        } else {
                            that._paintedThisFrame = null;
                        }
                    }
                },

                _flushUIBatches: function ItemEventsHandler_flushUIBatches() {
                    if (this._work.length > 0) {
                        var workItems = this._work;
                        this._work = [];

                        for (var i = 0; i < workItems.length; i++) {
                            workItems[i]();
                        }
                    }
                },

                _selectionAllowed: function ItemEventsHandler_selectionAllowed(itemIndex) {
                    var item = (itemIndex !== undefined ? this._site.itemAtIndex(itemIndex) : null),
                        itemSelectable = !(item && _ElementUtilities.hasClass(item, _Constants._nonSelectableClass));
                    return itemSelectable && this._site.selectionMode !== _UI.SelectionMode.none;
                },

                _multiSelection: function ItemEventsHandler_multiSelection() {
                    return this._site.selectionMode === _UI.SelectionMode.multi;
                },

                _selectOnTap: function ItemEventsHandler_selectOnTap() {
                    return this._site.tapBehavior === _UI.TapBehavior.toggleSelect || this._site.tapBehavior === _UI.TapBehavior.directSelect;
                },

                _staticMode: function ItemEventsHandler_staticMode(isHeader) {
                    if (isHeader) {
                        return this._site.headerTapBehavior === _UI.GroupHeaderTapBehavior.none;
                    } else {
                        return this._site.tapBehavior === _UI.TapBehavior.none && this._site.selectionMode === _UI.SelectionMode.none;
                    }
                },
            }, {
                // Avoids unnecessary UIA selection events by only updating aria-selected if it has changed
                setAriaSelected: function ItemEventsHandler_setAriaSelected(itemElement, isSelected) {
                    var ariaSelected = (itemElement.getAttribute("aria-selected") === "true");

                    if (isSelected !== ariaSelected) {
                        itemElement.setAttribute("aria-selected", isSelected);
                    }
                },

                renderSelection: function ItemEventsHandler_renderSelection(itemBox, element, selected, aria, container) {
                    if (!ItemEventsHandler._selectionTemplate) {
                        ItemEventsHandler._selectionTemplate = [];
                        ItemEventsHandler._selectionTemplate.push(createNodeWithClass(_Constants._selectionBackgroundClass));
                        ItemEventsHandler._selectionTemplate.push(createNodeWithClass(_Constants._selectionBorderClass));
                        ItemEventsHandler._selectionTemplate.push(createNodeWithClass(_Constants._selectionCheckmarkBackgroundClass));
                        var checkmark = createNodeWithClass(_Constants._selectionCheckmarkClass);
                        checkmark.textContent = _Constants._SELECTION_CHECKMARK;
                        ItemEventsHandler._selectionTemplate.push(checkmark);
                    }

                    // Update the selection rendering if necessary
                    if (selected !== _ElementUtilities._isSelectionRendered(itemBox)) {
                        if (selected) {
                            itemBox.insertBefore(ItemEventsHandler._selectionTemplate[0].cloneNode(true), itemBox.firstElementChild);

                            for (var i = 1, len = ItemEventsHandler._selectionTemplate.length; i < len; i++) {
                                itemBox.appendChild(ItemEventsHandler._selectionTemplate[i].cloneNode(true));
                            }
                        } else {
                            var nodes = itemBox.querySelectorAll(_ElementUtilities._selectionPartsSelector);
                            for (var i = 0, len = nodes.length; i < len; i++) {
                                itemBox.removeChild(nodes[i]);
                            }
                        }

                        _ElementUtilities[selected ? "addClass" : "removeClass"](itemBox, _Constants._selectedClass);
                        if (container) {
                            _ElementUtilities[selected ? "addClass" : "removeClass"](container, _Constants._selectedClass);
                        }
                    }

                    // To allow itemPropertyChange to work properly, aria needs to be updated after the selection visuals are added to the itemBox
                    if (aria) {
                        ItemEventsHandler.setAriaSelected(element, selected);
                    }
                },
            });

            return ItemEventsHandler;
        })

    });

});