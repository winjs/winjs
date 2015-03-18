// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
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

    // Returns a CSS transformation to rotate and shrink an element when it is
    // pressed. The closer the click is to the center of the item, the more it
    // shrinks and the less it rotates.
    // *elementRect* should be of the form returned by getBoundingClientRect. All
    // of the parameters must be relative to the same coordinate system.
    // This function was translated from the Splash implementation.
    function tiltTransform(clickX, clickY, elementRect) {
        var minSize = 44,
            maxSize = 750,
            minRotationX = 2,
            maxRotationX = 9,
            minRotationY = 2.11,
            maxRotationY = 13,
            sizeRange = maxSize - minSize,
            halfWidth = elementRect.width / 2,
            halfHeight = elementRect.height / 2;

        var clampedWidth = _ElementUtilities._clamp(elementRect.width, minSize, maxSize);
        var clampedHeight = _ElementUtilities._clamp(elementRect.height, minSize, maxSize);

        // The maximum rotation that any element is capable of is calculated by using its width and height and clamping it into the range calculated above.
        // minRotationX|Y and maxRotationX|Y are the absolute minimums and maximums that any generic element can be rotated by, but in order to determine
        // what the min/max rotations for our current element is (which will be inside of the absolute min/max described above), we need
        // to calculate the max rotations for this element by clamping the sizes and doing a linear interpolation:
        var maxElementRotationX = maxRotationX - (((clampedHeight - minSize) / sizeRange) * (maxRotationX - minRotationX));
        var maxElementRotationY = maxRotationY - (((clampedWidth - minSize) / sizeRange) * (maxRotationY - minRotationY));

        // Now we calculate the distance of our current point from the center of our element and normalize it to be in the range of 0 - 1
        var normalizedOffsetX = ((clickX - elementRect.left) - halfWidth) / halfWidth;
        var normalizedOffsetY = ((clickY - elementRect.top) - halfHeight) / halfHeight;

        // Finally, we calculate the appropriate rotations and scale for the element by using the normalized click offsets and the
        // maximum element rotation.
        var rotationX = maxElementRotationX * normalizedOffsetY;
        var rotationY = maxElementRotationY * normalizedOffsetX;
        var scale = 0.97 + 0.03 * (Math.abs(normalizedOffsetX) + Math.abs(normalizedOffsetY)) / 2.0;
        var transform = "perspective(800px) scale(" + scale + ") rotateX(" + -rotationX + "deg) rotateY(" + rotationY + "deg)";
        return transform;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        // Expose these to the unit tests
        _tiltTransform: tiltTransform,

        _ItemEventsHandler: _Base.Namespace._lazy(function () {
            var PT_TOUCH = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_TOUCH || "touch";

            function createNodeWithClass(className, skipAriaHidden) {
                var element = _Global.document.createElement("div");
                element.className = className;
                if (!skipAriaHidden) {
                    element.setAttribute("aria-hidden", true);
                }
                return element;
            }

            var ItemEventsHandler = _Base.Class.define(function ItemEventsHandler_ctor(site) {
                this._site = site;

                this._work = [];
                this._animations = {};
            }, {
                dispose: function () {
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;
                    _ElementUtilities._removeEventListener(_Global, "pointerup", this._resetPointerDownStateBound);
                    _ElementUtilities._removeEventListener(_Global, "pointercancel", this._resetPointerDownStateBound);
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

                    var isInteractive = this._isInteractive(eventObject.target),
                        currentPressedIndex = site.indexForItemElement(eventObject.target),
                        currentPressedHeaderIndex = site.indexForHeaderElement(eventObject.target),
                        mustSetCapture = !isInteractive && currentPressedIndex !== _Constants._INVALID_INDEX;

                    if ((touchInput || leftButton) && this._site.pressedEntity.index === _Constants._INVALID_INDEX && !isInteractive) {
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

                            if (this._site.pressedEntity.type === _UI.ObjectType.item) {
                                this._site.pressedItemBox = site.itemBoxAtIndex(this._site.pressedEntity.index);
                                this._site.pressedContainer = site.containerAtIndex(this._site.pressedEntity.index);
                                this._site.animatedElement = this._site.pressedContainer;
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

                            this._pointerId = eventObject.pointerId;
                            this._pointerRightButton = rightButton;
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
                            this._site.pressedContainer.style[transformNames.scriptName] = "";
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
                            } else if (eventObject.ctrlKey) {
                                this.toggleSelectionIfAllowed(this._site.pressedEntity.index);
                            }
                        }

                        if (this._site.pressedHeader || this._site.pressedContainer) {
                            var upPosition = _ElementUtilities._getCursorPos(eventObject);
                            var isTap = Math.abs(upPosition.left - this._site.pressedPosition.left) <= _Constants._TAP_END_THRESHOLD &&
                                Math.abs(upPosition.top - this._site.pressedPosition.top) <= _Constants._TAP_END_THRESHOLD;

                            // We do not care whether or not the pressed and released indices are equivalent when the user is using touch. The only time they won't be is if the user
                            // tapped the edge of an item and the pressed animation shrank the item such that the user's finger was no longer over it. In this case, the item should
                            // be considered tapped.
                            // However, if the user is using touch then we must perform an extra check. Sometimes we receive MSPointerUp events when the user intended to pan.
                            // This extra check ensures that these intended pans aren't treated as taps.
                            if (!this._pointerRightButton && !eventObject.ctrlKey && !eventObject.shiftKey &&
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
                    if (this._pointerId === eventObject.pointerId) {
                        _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSPointerCancel,info");
                        this.resetPointerDownState();
                    }
                },

                onLostPointerCapture: function ItemEventsHandler_onLostPointerCapture(eventObject) {
                    if (this._pointerId === eventObject.pointerId) {
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

                toggleSelectionIfAllowed: function ItemEventsHandler_toggleSelectionIfAllowed(itemIndex) {
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
                    return this._site.selection._isIncluded(index);
                },

                _isInteractive: function ItemEventsHandler_isInteractive(element) {
                    return this._containedInElementWithClass(element, "win-interactive");
                },

                _togglePressed: function ItemEventsHandler_togglePressed(add, synchronous, eventObject) {
                    var that = this;
                    var isHeader = this._site.pressedEntity.type === _UI.ObjectType.groupHeader;

                    this._site.animatedDownPromise && this._site.animatedDownPromise.cancel();

                    if (!isHeader && _ElementUtilities.hasClass(this._site.pressedItemBox, _Constants._nonSelectableClass)) {
                        return;
                    }

                    if (!this._staticMode(isHeader)) {
                        if (add) {
                            if (!_ElementUtilities.hasClass(this._site.animatedElement, _Constants._pressedClass)) {
                                _WriteProfilerMark("WinJS.UI._ItemEventsHandler:applyPressedUI,info");
                                _ElementUtilities.addClass(this._site.animatedElement, _Constants._pressedClass);

                                var boundingElement = isHeader ? that._site.pressedHeader : that._site.pressedContainer;
                                var transform = tiltTransform(eventObject.clientX, eventObject.clientY, boundingElement.getBoundingClientRect());
                                // Timeout prevents item from looking like it was pressed down during pans
                                this._site.animatedDownPromise = Promise.timeout(50).then(function () {
                                    applyDownVisual(transform);
                                });
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
                        if (that._containsTransform(element, expectingStyle)) {
                            _TransitionAnimation.executeTransition(element, {
                                property: transformNames.cssName,
                                delay: 150,
                                duration: 350,
                                timing: "cubic-bezier(0.17,0.17,0.2,1)",
                                to: element.style[transformNames.scriptName].replace(expectingStyle, "")
                            });
                        }
                    }
                },

                _containsTransform: function ItemEventsHandler_containsTransform(element, transform) {
                    return transform && element.style[transformNames.scriptName].indexOf(transform) !== -1;
                },

                _resetPointerDownStateForPointerId: function ItemEventsHandler_resetPointerDownState(eventObject) {
                    if (this._pointerId === eventObject.pointerId) {
                        this.resetPointerDownState();
                    }
                },

                resetPointerDownState: function ItemEventsHandler_resetPointerDownState() {
                    this._site.pressedElement = null;
                    _ElementUtilities._removeEventListener(_Global, "pointerup", this._resetPointerDownStateBound);
                    _ElementUtilities._removeEventListener(_Global, "pointercancel", this._resetPointerDownStateBound);

                    this._resetPressedContainer();

                    this._site.pressedContainer = null;
                    this._site.animatedElement = null;
                    this._site.pressedHeader = null;
                    this._site.pressedItemBox = null;

                    this._site.pressedEntity = { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX };
                    this._pointerId = null;
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