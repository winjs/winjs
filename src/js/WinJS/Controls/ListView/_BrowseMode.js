// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Animations',
    '../../Promise',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_UI',
    '../ItemContainer/_Constants',
    '../ItemContainer/_ItemEventsHandler',
    './_SelectionManager'
    ], function browseModeInit(exports, _Global, _Base, _BaseUtils, Animations, Promise, _ElementUtilities, _UI, _Constants, _ItemEventsHandler, _SelectionManager) {
    "use strict";

    var transformName = _BaseUtils._browserStyleEquivalents["transform"].scriptName;
    // This component is responsible for handling input in Browse Mode.
    // When the user clicks on an item in this mode itemInvoked event is fired.
    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {

        _SelectionMode: _Base.Namespace._lazy(function () {

            function clampToRange(first, last, x) {
                return Math.max(first, Math.min(last, x));
            }

            function dispatchKeyboardNavigating(element, oldEntity, newEntity) {
                var navigationEvent = _Global.document.createEvent("CustomEvent");
                navigationEvent.initCustomEvent("keyboardnavigating", true, true, {
                    oldFocus: oldEntity.index,
                    oldFocusType: oldEntity.type,
                    newFocus: newEntity.index,
                    newFocusType: newEntity.type
                });
                return element.dispatchEvent(navigationEvent);
            }

            var _SelectionMode = _Base.Class.define(function _SelectionMode_ctor(modeSite) {
                this.inboundFocusHandled = false;
                this._pressedContainer = null;
                this._pressedItemBox = null;
                this._pressedHeader = null;
                this._pressedEntity = { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX };
                this._pressedPosition = null;

                this.initialize(modeSite);
            },{
                _dispose: function () {
                    if (this._itemEventsHandler) {
                        this._itemEventsHandler.dispose();
                    }
                    if (this._setNewFocusItemOffsetPromise) {
                        this._setNewFocusItemOffsetPromise.cancel();
                    }
                },

                initialize: function (modeSite) {
                    this.site = modeSite;

                    this._keyboardNavigationHandlers = {};
                    this._keyboardAcceleratorHandlers = {};

                    var site = this.site,
                        that = this;
                    this._itemEventsHandler = new _ItemEventsHandler._ItemEventsHandler(Object.create({
                        containerFromElement: function (element) {
                            return site._view.items.containerFrom(element);
                        },
                        indexForItemElement: function (element) {
                            return site._view.items.index(element);
                        },
                        indexForHeaderElement: function (element) {
                            return site._groups.index(element);
                        },
                        itemBoxAtIndex: function (index) {
                            return site._view.items.itemBoxAt(index);
                        },
                        itemAtIndex: function (index) {
                            return site._view.items.itemAt(index);
                        },
                        headerAtIndex: function (index) {
                            return site._groups.group(index).header;
                        },
                        headerFromElement: function (element) {
                            return site._groups.headerFrom(element);
                        },
                        containerAtIndex: function (index) {
                            return site._view.items.containerAt(index);
                        },
                        isZombie: function () {
                            return site._isZombie();
                        },
                        getItemPosition: function (entity) {
                            return site._getItemPosition(entity);
                        },
                        rtl: function () {
                            return site._rtl();
                        },
                        fireInvokeEvent: function (entity, itemElement) {
                            return that._fireInvokeEvent(entity, itemElement);
                        },
                        verifySelectionAllowed: function (index) {
                            return that._verifySelectionAllowed(index);
                        },
                        changeFocus: function (newFocus, skipSelection, ctrlKeyDown, skipEnsureVisible, keyboardFocused) {
                            return site._changeFocus(newFocus, skipSelection, ctrlKeyDown, skipEnsureVisible, keyboardFocused);
                        },
                        selectRange: function (firstIndex, lastIndex, additive) {
                            return that._selectRange(firstIndex, lastIndex, additive);
                        }
                    }, {
                        pressedEntity: {
                            enumerable: true,
                            get: function () {
                                return that._pressedEntity;
                            },
                            set: function (value) {
                                that._pressedEntity = value;
                            }
                        },
                        pressedContainerScaleTransform: {
                            enumerable: true,
                            get: function () {
                                return that._pressedContainerScaleTransform;
                            },
                            set: function (value) {
                                that._pressedContainerScaleTransform = value;
                            }
                        },
                        pressedContainer: {
                            enumerable: true,
                            get: function () {
                                return that._pressedContainer;
                            },
                            set: function (value) {
                                that._pressedContainer = value;
                            }
                        },

                        pressedItemBox: {
                            enumerable: true,
                            get: function () {
                                return that._pressedItemBox;
                            },
                            set: function (value) {
                                that._pressedItemBox = value;
                            }
                        },

                        pressedHeader: {
                            enumerable: true,
                            get: function () {
                                return that._pressedHeader;
                            },
                            set: function (value) {
                                return that._pressedHeader = value;
                            }
                        },

                        pressedPosition: {
                            enumerable: true,
                            get: function () {
                                return that._pressedPosition;
                            },
                            set: function (value) {
                                that._pressedPosition = value;
                            }
                        },

                        pressedElement: {
                            enumerable: true,
                            set: function (value) {
                                that._pressedElement = value;
                            }
                        },

                        swipeBehavior: {
                            enumerable: true,
                            get: function () {
                                return site._swipeBehavior;
                            }
                        },
                        eventHandlerRoot: {
                            enumerable: true,
                            get: function () {
                                return site._viewport;
                            }
                        },
                        selectionMode: {
                            enumerable: true,
                            get: function () {
                                return site._selectionMode;
                            }
                        },
                        accessibleItemClass: {
                            enumerable: true,
                            get: function () {
                                // CSS class of the element with the aria role
                                return _Constants._itemClass;
                            }
                        },
                        canvasProxy: {
                            enumerable: true,
                            get: function () {
                                return site._canvasProxy;
                            }
                        },
                        tapBehavior: {
                            enumerable: true,
                            get: function () {
                                return site._tap;
                            }
                        },
                        headerTapBehavior: {
                            enumerable: true,
                            get: function () {
                                return site._groupHeaderTap;
                            }
                        },
                        draggable: {
                            enumerable: true,
                            get: function () {
                                return site.itemsDraggable || site.itemsReorderable;
                            }
                        },
                        selection: {
                            enumerable: true,
                            get: function () {
                                return site._selection;
                            }
                        },
                        horizontal: {
                            enumerable: true,
                            get: function () {
                                return site._horizontal();
                            }
                        },
                        customFootprintParent: {
                            enumerable: true,
                            get: function () {
                                return null;
                            }
                        }
                    }));

                    function createArrowHandler(direction, clampToBounds) {
                        var handler = function (oldFocus) {
                            return modeSite._view.getAdjacent(oldFocus, direction);
                        };
                        handler.clampToBounds = clampToBounds;
                        return handler;
                    }

                    var Key = _ElementUtilities.Key;
                    this._keyboardNavigationHandlers[Key.upArrow] = createArrowHandler(Key.upArrow);
                    this._keyboardNavigationHandlers[Key.downArrow] = createArrowHandler(Key.downArrow);
                    this._keyboardNavigationHandlers[Key.leftArrow] = createArrowHandler(Key.leftArrow);
                    this._keyboardNavigationHandlers[Key.rightArrow] = createArrowHandler(Key.rightArrow);
                    this._keyboardNavigationHandlers[Key.pageUp] = createArrowHandler(Key.pageUp, true);
                    this._keyboardNavigationHandlers[Key.pageDown] = createArrowHandler(Key.pageDown, true);
                    this._keyboardNavigationHandlers[Key.home] = function (oldFocus) {
                        if (that.site._listHeader && (oldFocus.type === _UI.ObjectType.groupHeader || oldFocus.type === _UI.ObjectType.listFooter)) {
                            return Promise.wrap({ type: _UI.ObjectType.listHeader, index: 0 });
                        }


                        return Promise.wrap({ type: (oldFocus.type !== _UI.ObjectType.listFooter ? oldFocus.type : _UI.ObjectType.groupHeader), index: 0 });
                    };
                    this._keyboardNavigationHandlers[Key.end] = function (oldFocus) {
                        if (that.site._listFooter && (oldFocus.type === _UI.ObjectType.groupHeader || oldFocus.type === _UI.ObjectType.listHeader)) {
                            return Promise.wrap({ type: _UI.ObjectType.listFooter, index: 0 });
                        } else if (oldFocus.type === _UI.ObjectType.groupHeader || oldFocus.type === _UI.ObjectType.listHeader) {
                            return Promise.wrap({ type: _UI.ObjectType.groupHeader, index: site._groups.length() - 1 });
                        } else {
                            // Get the index of the last container
                            var lastIndex = that.site._view.lastItemIndex();
                            if (lastIndex >= 0) {
                                return Promise.wrap({ type: oldFocus.type, index: lastIndex });
                            } else {
                                return Promise.cancel;
                            }
                        }
                    };

                    this._keyboardAcceleratorHandlers[Key.a] = function () {
                        if (that.site._multiSelection()) {
                            that._selectAll();
                        }
                    };
                },

                staticMode: function SelectionMode_staticMode() {
                    return this.site._tap === _UI.TapBehavior.none && this.site._selectionMode === _UI.SelectionMode.none;
                },

                itemUnrealized: function SelectionMode_itemUnrealized(index, itemBox) {
                    if (this._pressedEntity.type === _UI.ObjectType.groupHeader) {
                        return;
                    }

                    if (this._pressedEntity.index === index) {
                        this._resetPointerDownState();
                    }

                    if (this._itemBeingDragged(index)) {
                        for (var i = this._draggedItemBoxes.length - 1; i >= 0; i--) {
                            if (this._draggedItemBoxes[i] === itemBox) {
                                _ElementUtilities.removeClass(itemBox, _Constants._dragSourceClass);
                                this._draggedItemBoxes.splice(i, 1);
                            }
                        }
                    }
                },

                _fireInvokeEvent: function SelectionMode_fireInvokeEvent(entity, itemElement) {
                    if (!itemElement) {
                        return;
                    }

                    var that = this;
                    function fireInvokeEventImpl(dataSource, isHeader) {
                        var listBinding = dataSource.createListBinding(),
                             promise = listBinding.fromIndex(entity.index),
                             eventName = isHeader ? "groupheaderinvoked" : "iteminvoked";

                        promise.done(function () {
                            listBinding.release();
                        });

                        var eventObject = _Global.document.createEvent("CustomEvent");
                        eventObject.initCustomEvent(eventName, true, true, isHeader ? {
                            groupHeaderPromise: promise,
                            groupHeaderIndex: entity.index
                        } : {
                            itemPromise: promise,
                            itemIndex: entity.index
                        });

                        // If preventDefault was not called, call the default action on the site
                        if (itemElement.dispatchEvent(eventObject)) {
                            that.site._defaultInvoke(entity);
                        }
                    }

                    if (entity.type === _UI.ObjectType.groupHeader) {
                        if (this.site._groupHeaderTap === _UI.GroupHeaderTapBehavior.invoke &&
                            entity.index !== _Constants._INVALID_INDEX) {
                            fireInvokeEventImpl(this.site.groupDataSource, true);
                        }
                    } else {
                        if (this.site._tap !== _UI.TapBehavior.none && entity.index !== _Constants._INVALID_INDEX) {
                            fireInvokeEventImpl(this.site.itemDataSource, false);
                        }
                    }
                },

                _verifySelectionAllowed: function SelectionMode_verifySelectionAllowed(entity) {
                    if (entity.type === _UI.ObjectType.groupHeader) {
                        return {
                            canSelect: false,
                            canTapSelect: false
                        };
                    }

                    var itemIndex = entity.index;
                    var site = this.site;
                    var item = this.site._view.items.itemAt(itemIndex);
                    if (site._selectionAllowed() && (site._selectOnTap() || site._swipeBehavior === _UI.SwipeBehavior.select) && !(item && _ElementUtilities.hasClass(item, _Constants._nonSelectableClass))) {
                        var selected = site._selection._isIncluded(itemIndex),
                            single = !site._multiSelection(),
                            newSelection = site._selection._cloneSelection();

                        if (selected) {
                            if (single) {
                                newSelection.clear();
                            } else {
                                newSelection.remove(itemIndex);
                            }
                        } else {
                            if (single) {
                                newSelection.set(itemIndex);
                            } else {
                                newSelection.add(itemIndex);
                            }
                        }

                        var eventObject = _Global.document.createEvent("CustomEvent"),
                            newSelectionUpdated = Promise.wrap(),
                            completed = false,
                            preventTap = false,
                            included;

                        eventObject.initCustomEvent("selectionchanging", true, true, {
                            newSelection: newSelection,
                            preventTapBehavior: function () {
                                preventTap = true;
                            },
                            setPromise: function (promise) {
                                /// <signature helpKeyword="WinJS.UI.BrowseMode.selectionchanging.setPromise">
                                /// <summary locid="WinJS.UI.BrowseMode.selectionchanging.setPromise">
                                /// Used to inform the ListView that asynchronous work is being performed, and that this
                                /// event handler should not be considered complete until the promise completes.
                                /// </summary>
                                /// <param name="promise" type="WinJS.Promise" locid="WinJS.UI.BrowseMode.selectionchanging.setPromise_p:promise">
                                /// The promise to wait for.
                                /// </param>
                                /// </signature>

                                newSelectionUpdated = promise;
                            }
                        });

                        var defaultBehavior = site._element.dispatchEvent(eventObject);

                        newSelectionUpdated.then(function () {
                            completed = true;
                            included = newSelection._isIncluded(itemIndex);
                            newSelection.clear();
                        });

                        var canSelect = defaultBehavior && completed && (selected || included);

                        return {
                            canSelect: canSelect,
                            canTapSelect: canSelect && !preventTap
                        };
                    } else {
                        return {
                            canSelect: false,
                            canTapSelect: false
                        };
                    }
                },

                _containedInElementWithClass: function SelectionMode_containedInElementWithClass(element, className) {
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

                _isDraggable: function SelectionMode_isDraggable(element) {
                    return (!this._containedInElementWithClass(element, _Constants._nonDraggableClass));
                },

                _isInteractive: function SelectionMode_isInteractive(element) {
                    return this._containedInElementWithClass(element, "win-interactive");
                },

                _resetPointerDownState: function SelectionMode_resetPointerDownState() {
                    this._itemEventsHandler.resetPointerDownState();
                },

                onMSManipulationStateChanged: function (eventObject) {
                    this._itemEventsHandler.onMSManipulationStateChanged(eventObject);
                },

                onPointerDown: function SelectionMode_onPointerDown(eventObject) {
                    this._itemEventsHandler.onPointerDown(eventObject);
                },

                onclick: function SelectionMode_onclick(eventObject) {
                    this._itemEventsHandler.onClick(eventObject);
                },

                onPointerUp: function SelectionMode_onPointerUp(eventObject) {
                    this._itemEventsHandler.onPointerUp(eventObject);
                },

                onPointerCancel: function SelectionMode_onPointerCancel(eventObject) {
                    this._itemEventsHandler.onPointerCancel(eventObject);
                },

                onLostPointerCapture: function SelectionMode_onLostPointerCapture(eventObject) {
                    this._itemEventsHandler.onLostPointerCapture(eventObject);
                },

                onContextMenu: function SelectionMode_onContextMenu(eventObject) {
                    this._itemEventsHandler.onContextMenu(eventObject);
                },

                onMSHoldVisual: function SelectionMode_onMSHoldVisual(eventObject) {
                    this._itemEventsHandler.onMSHoldVisual(eventObject);
                },

                onDataChanged: function SelectionMode_onDataChanged(eventObject) {
                    this._itemEventsHandler.onDataChanged(eventObject);
                },

                _removeTransform: function SelectionMode_removeTransform(element, transform) {
                    if (transform && element.style[transformName].indexOf(transform) !== -1) {
                        element.style[transformName] = element.style[transformName].replace(transform, "");
                    }
                },

                _selectAll: function SelectionMode_selectAll() {
                    var unselectableRealizedItems = [];
                    this.site._view.items.each(function (index, item) {
                        if (item && _ElementUtilities.hasClass(item, _Constants._nonSelectableClass)) {
                            unselectableRealizedItems.push(index);
                        }
                    });

                    this.site._selection.selectAll();
                    if (unselectableRealizedItems.length > 0) {
                        this.site._selection.remove(unselectableRealizedItems);
                    }
                },

                _selectRange: function SelectionMode_selectRange(firstIndex, lastIndex, additive) {
                    var ranges = [];
                    var currentStartRange = -1;
                    for (var i = firstIndex; i <= lastIndex; i++) {
                        var item = this.site._view.items.itemAt(i);
                        if (item && _ElementUtilities.hasClass(item, _Constants._nonSelectableClass)) {
                            if (currentStartRange !== -1) {
                                ranges.push({
                                    firstIndex: currentStartRange,
                                    lastIndex: i - 1
                                });
                                currentStartRange = -1;
                            }
                        } else if (currentStartRange === -1) {
                            currentStartRange = i;
                        }
                    }
                    if (currentStartRange !== -1) {
                        ranges.push({
                            firstIndex: currentStartRange,
                            lastIndex: lastIndex
                        });
                    }
                    if (ranges.length > 0) {
                        this.site._selection[additive ? "add" : "set"](ranges);
                    }
                },

                onDragStart: function SelectionMode_onDragStart(eventObject) {
                    this._pressedEntity = { type: _UI.ObjectType.item, index: this.site._view.items.index(eventObject.target) };
                    this.site._selection._pivot = _Constants._INVALID_INDEX;
                    // Drag shouldn't be initiated when the user holds down the mouse on a win-interactive element and moves.
                    // The problem is that the dragstart event's srcElement+target will both be an itembox (which has draggable=true), so we can't check for win-interactive in the dragstart event handler.
                    // The itemEventsHandler sets our _pressedElement field on MSPointerDown, so we use that instead when checking for interactive.
                    if (this._pressedEntity.index !== _Constants._INVALID_INDEX &&
                            (this.site.itemsDraggable || this.site.itemsReorderable) &&
                            !this.site._view.animating &&
                            this._isDraggable(eventObject.target) &&
                            (!this._pressedElement || !this._isInteractive(this._pressedElement))) {
                        this._dragging = true;
                        this._dragDataTransfer = eventObject.dataTransfer;
                        this._pressedPosition = _ElementUtilities._getCursorPos(eventObject);
                        this._dragInfo = null;
                        this._lastEnteredElement = eventObject.target;

                        if (this.site._selection._isIncluded(this._pressedEntity.index)) {
                            this._dragInfo = this.site.selection;
                        } else {
                            this._draggingUnselectedItem = true;
                            this._dragInfo = new _SelectionManager._Selection(this.site, [{ firstIndex: this._pressedEntity.index, lastIndex: this._pressedEntity.index }]);
                        }

                        var dropTarget = this.site.itemsReorderable;
                        var event = _Global.document.createEvent("CustomEvent");
                        event.initCustomEvent("itemdragstart", true, false, {
                            dataTransfer: eventObject.dataTransfer,
                            dragInfo: this._dragInfo
                        });

                        // Firefox requires setData to be called on the dataTransfer object in order for DnD to continue.
                        // Firefox also has an issue rendering the item's itemBox+element, so we need to use setDragImage, using the item's container, to get it to render.
                        eventObject.dataTransfer.setData("text", "");
                        if (eventObject.dataTransfer.setDragImage) {
                            var pressedItemData = this.site._view.items.itemDataAt(this._pressedEntity.index);
                            if (pressedItemData && pressedItemData.container) {
                                var rect = pressedItemData.container.getBoundingClientRect();
                                eventObject.dataTransfer.setDragImage(pressedItemData.container, eventObject.clientX - rect.left, eventObject.clientY - rect.top);
                            }
                        }
                        this.site.element.dispatchEvent(event);
                        if (this.site.itemsDraggable && !this.site.itemsReorderable) {
                            if (!this._firedDragEnter) {
                                if (this._fireDragEnterEvent(eventObject.dataTransfer)) {
                                    dropTarget = true;
                                    this._dragUnderstood = true;
                                }
                            }
                        }

                        if (dropTarget) {
                            this._addedDragOverClass = true;
                            _ElementUtilities.addClass(this.site._element, _Constants._dragOverClass);
                        }

                        this._draggedItemBoxes = [];

                        var that = this;
                        // A dragged element can be removed from the DOM by a number of actions - datasource removes/changes, being scrolled outside of the realized range, etc.
                        // The dragend event is fired on the original source element of the drag. If that element isn't in the DOM, though, the dragend event will only be fired on the element
                        // itself and not bubble up through the ListView's tree to the _viewport element where all the other drag event handlers are.
                        // The dragend event handler has to be added to the event's srcElement so that we always receive the event, even when the source element is unrealized.
                        var sourceElement = eventObject.target;
                        sourceElement.addEventListener("dragend", function itemDragEnd(eventObject) {
                            sourceElement.removeEventListener("dragend", itemDragEnd);
                            that.onDragEnd(eventObject);
                        });
                        // We delay setting the opacity of the dragged items so that IE has time to create a thumbnail before me make them invisible
                        _BaseUtils._yieldForDomModification(function () {
                            if (that._dragging) {
                                var indicesSelected = that._dragInfo.getIndices();
                                for (var i = 0, len = indicesSelected.length; i < len; i++) {
                                    var itemData = that.site._view.items.itemDataAt(indicesSelected[i]);
                                    if (itemData && itemData.itemBox) {
                                        that._addDragSourceClass(itemData.itemBox);
                                    }
                                }
                            }
                        });
                    } else {
                        eventObject.preventDefault();
                    }
                },

                onDragEnter: function (eventObject) {
                    var eventHandled = this._dragUnderstood;
                    this._lastEnteredElement = eventObject.target;
                    if (this._exitEventTimer) {
                        _Global.clearTimeout(this._exitEventTimer);
                        this._exitEventTimer = 0;
                    }

                    if (!this._firedDragEnter) {
                        if (this._fireDragEnterEvent(eventObject.dataTransfer)) {
                            eventHandled = true;
                        }
                    }

                    if (eventHandled || (this._dragging && this.site.itemsReorderable)) {
                        eventObject.preventDefault();
                        this._dragUnderstood = true;
                        if (!this._addedDragOverClass) {
                            this._addedDragOverClass = true;
                            _ElementUtilities.addClass(this.site._element, _Constants._dragOverClass);
                        }
                    }
                    this._pointerLeftRegion = false;
                },

                onDragLeave: function (eventObject) {
                    if (eventObject.target === this._lastEnteredElement) {
                        this._pointerLeftRegion = true;
                        this._handleExitEvent();
                    }
                },

                fireDragUpdateEvent: function () {
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent("itemdragchanged", true, false, {
                        dataTransfer: this._dragDataTransfer,
                        dragInfo: this._dragInfo
                    });
                    this.site.element.dispatchEvent(event);
                },

                _fireDragEnterEvent: function (dataTransfer) {
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent("itemdragenter", true, true, {
                        dataTransfer: dataTransfer
                    });
                    // The end developer must tell a ListView when a drag can be understood by calling preventDefault() on the event we fire
                    var dropTarget = (!this.site.element.dispatchEvent(event));
                    this._firedDragEnter = true;
                    return dropTarget;
                },

                _fireDragBetweenEvent: function (index, insertAfterIndex, dataTransfer) {
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent("itemdragbetween", true, true, {
                        index: index,
                        insertAfterIndex: insertAfterIndex,
                        dataTransfer: dataTransfer
                    });
                    return this.site.element.dispatchEvent(event);
                },

                _fireDropEvent: function (index, insertAfterIndex, dataTransfer) {
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent("itemdragdrop", true, true, {
                        index: index,
                        insertAfterIndex: insertAfterIndex,
                        dataTransfer: dataTransfer
                    });
                    return this.site.element.dispatchEvent(event);
                },

                _handleExitEvent: function () {
                    if (this._exitEventTimer) {
                        _Global.clearTimeout(this._exitEventTimer);
                        this._exitEventTimer = 0;
                    }
                    var that = this;
                    this._exitEventTimer = _Global.setTimeout(function () {
                        if (that.site._disposed) { return; }

                        if (that._pointerLeftRegion) {
                            that.site._layout.dragLeave && that.site._layout.dragLeave();
                            that._pointerLeftRegion = false;
                            that._dragUnderstood = false;
                            that._lastEnteredElement = null;
                            that._lastInsertPoint = null;
                            that._dragBetweenDisabled = false;
                            if (that._firedDragEnter) {
                                var event = _Global.document.createEvent("CustomEvent");
                                event.initCustomEvent("itemdragleave", true, false, {
                                });
                                that.site.element.dispatchEvent(event);
                                that._firedDragEnter = false;
                            }
                            if (that._addedDragOverClass) {
                                that._addedDragOverClass = false;
                                _ElementUtilities.removeClass(that.site._element, _Constants._dragOverClass);
                            }
                            that._exitEventTimer = 0;
                            that._stopAutoScroll();
                        }
                    }, 40);
                },

                _getEventPositionInElementSpace: function (element, eventObject) {
                    var elementRect = { left: 0, top: 0 };
                    try {
                        elementRect = element.getBoundingClientRect();
                    }
                    catch (err) { }

                    var computedStyle = _Global.getComputedStyle(element, null),
                        paddingLeft = parseInt(computedStyle["paddingLeft"]),
                        paddingTop = parseInt(computedStyle["paddingTop"]),
                        borderLeft = parseInt(computedStyle["borderLeftWidth"]),
                        borderTop = parseInt(computedStyle["borderTopWidth"]),
                        clientX = eventObject.clientX,
                        clientY = eventObject.clientY;

                    var position = {
                        x: +clientX === clientX ? (clientX - elementRect.left - paddingLeft - borderLeft) : 0,
                        y: +clientY === clientY ? (clientY - elementRect.top - paddingTop - borderTop) : 0
                    };

                    if (this.site._rtl()) {
                        position.x = (elementRect.right - elementRect.left) - position.x;
                    }

                    return position;
                },

                _getPositionInCanvasSpace: function (eventObject) {
                    var scrollLeft = this.site._horizontal() ? this.site.scrollPosition : 0,
                        scrollTop = this.site._horizontal() ? 0 : this.site.scrollPosition,
                        position = this._getEventPositionInElementSpace(this.site.element, eventObject);

                    return {
                        x: position.x + scrollLeft,
                        y: position.y + scrollTop
                    };
                },

                _itemBeingDragged: function (itemIndex) {
                    if (!this._dragging) {
                        return false;
                    }

                    return ((this._draggingUnselectedItem && this._dragInfo._isIncluded(itemIndex)) || (!this._draggingUnselectedItem && this.site._isSelected(itemIndex)));
                },

                _addDragSourceClass: function (itemBox) {
                    this._draggedItemBoxes.push(itemBox);
                    _ElementUtilities.addClass(itemBox, _Constants._dragSourceClass);
                    if (itemBox.parentNode) {
                        _ElementUtilities.addClass(itemBox.parentNode, _Constants._footprintClass);
                    }
                },

                renderDragSourceOnRealizedItem: function (itemIndex, itemBox) {
                    if (this._itemBeingDragged(itemIndex)) {
                        this._addDragSourceClass(itemBox);
                    }
                },

                onDragOver: function (eventObject) {
                    if (!this._dragUnderstood) {
                        return;
                    }
                    this._pointerLeftRegion = false;
                    eventObject.preventDefault();

                    var cursorPositionInCanvas = this._getPositionInCanvasSpace(eventObject),
                        cursorPositionInRoot = this._getEventPositionInElementSpace(this.site.element, eventObject);
                    this._checkAutoScroll(cursorPositionInRoot.x, cursorPositionInRoot.y);
                    if (this.site._layout.hitTest) {
                        if (this._autoScrollFrame) {
                            if (this._lastInsertPoint) {
                                this.site._layout.dragLeave();
                                this._lastInsertPoint = null;
                            }
                        } else {
                            var insertPoint = this.site._view.hitTest(cursorPositionInCanvas.x, cursorPositionInCanvas.y);
                            insertPoint.insertAfterIndex = clampToRange(-1, this.site._cachedCount - 1, insertPoint.insertAfterIndex);
                            if (!this._lastInsertPoint || this._lastInsertPoint.insertAfterIndex !== insertPoint.insertAfterIndex || this._lastInsertPoint.index !== insertPoint.index) {
                                this._dragBetweenDisabled = !this._fireDragBetweenEvent(insertPoint.index, insertPoint.insertAfterIndex, eventObject.dataTransfer);
                                if (!this._dragBetweenDisabled) {
                                    this.site._layout.dragOver(cursorPositionInCanvas.x, cursorPositionInCanvas.y, this._dragInfo);
                                } else {
                                    this.site._layout.dragLeave();
                                }
                            }
                            this._lastInsertPoint = insertPoint;
                        }
                    }
                },

                _clearDragProperties: function () {
                    if (this._addedDragOverClass) {
                        this._addedDragOverClass = false;
                        _ElementUtilities.removeClass(this.site._element, _Constants._dragOverClass);
                    }
                    if (this._draggedItemBoxes) {
                        for (var i = 0, len = this._draggedItemBoxes.length; i < len; i++) {
                            _ElementUtilities.removeClass(this._draggedItemBoxes[i], _Constants._dragSourceClass);
                            if (this._draggedItemBoxes[i].parentNode) {
                                _ElementUtilities.removeClass(this._draggedItemBoxes[i].parentNode, _Constants._footprintClass);
                            }
                        }
                        this._draggedItemBoxes = [];
                    }
                    this.site._layout.dragLeave();
                    this._dragging = false;
                    this._dragInfo = null;
                    this._draggingUnselectedItem = false;
                    this._dragDataTransfer = null;
                    this._lastInsertPoint = null;
                    this._resetPointerDownState();
                    this._lastEnteredElement = null;
                    this._dragBetweenDisabled = false;
                    this._firedDragEnter = false;
                    this._dragUnderstood = false;
                    this._stopAutoScroll();
                },

                onDragEnd: function () {
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent("itemdragend", true, false, {});
                    this.site.element.dispatchEvent(event);
                    this._clearDragProperties();
                },

                _findFirstAvailableInsertPoint: function (selectedItems, startIndex, searchForwards) {
                    var indicesSelected = selectedItems.getIndices(),
                        dropIndexInSelection = -1,
                        count = this.site._cachedCount,
                        selectionCount = indicesSelected.length,
                        startIndexInSelection = -1,
                        dropIndex = startIndex;
                    for (var i = 0; i < selectionCount; i++) {
                        if (indicesSelected[i] === dropIndex) {
                            dropIndexInSelection = i;
                            startIndexInSelection = i;
                            break;
                        }
                    }

                    while (dropIndexInSelection >= 0 && dropIndex >= 0) {
                        if (searchForwards) {
                            dropIndex++;
                            if (dropIndexInSelection < selectionCount && indicesSelected[dropIndexInSelection + 1] === dropIndex && dropIndex < count) {
                                dropIndexInSelection++;
                            } else if (dropIndex >= count) {
                                // If we hit the end of the list when looking for a new location ahead of our start index, it means everything from the starting point
                                // to the end is selected, so no valid index can be located to move the items. We need to start searching again, moving backwards
                                // from the starting location, to find the first available insert location to move the selected items.
                                searchForwards = false;
                                dropIndex = startIndex;
                                dropIndexInSelection = startIndexInSelection;
                            } else {
                                dropIndexInSelection = -1;
                            }
                        } else {
                            dropIndex--;
                            if (dropIndexInSelection > 0 && indicesSelected[dropIndexInSelection - 1] === dropIndex) {
                                dropIndexInSelection--;
                            } else {
                                dropIndexInSelection = -1;
                            }
                        }
                    }

                    return dropIndex;
                },

                _reorderItems: function (dropIndex, reorderedItems, reorderingUnselectedItem, useMoveBefore, ensureVisibleAtEnd) {
                    var site = this.site;
                    var updateSelection = function updatedSelectionOnDrop(items) {
                        // Update selection if the items were selected. If there is a range with length > 0 a move operation
                        // on the first or last item removes the range.
                        if (!reorderingUnselectedItem) {
                            site._selection.set({ firstKey: items[0].key, lastKey: items[items.length - 1].key });
                        } else {
                            site._selection.remove({ key: items[0].key });
                        }
                        if (ensureVisibleAtEnd) {
                            site.ensureVisible(site._selection._getFocused());
                        }
                    };
                    reorderedItems.getItems().then(function (items) {
                        var ds = site.itemDataSource;
                        if (dropIndex === -1) {
                            ds.beginEdits();
                            for (var i = items.length - 1; i >= 0; i--) {
                                ds.moveToStart(items[i].key);
                            }
                            ds.endEdits();
                            updateSelection(items);
                        } else {
                            var listBinding = ds.createListBinding();
                            listBinding.fromIndex(dropIndex).then(function (item) {
                                listBinding.release();
                                ds.beginEdits();
                                if (useMoveBefore) {
                                    for (var i = 0, len = items.length; i < len; i++) {
                                        ds.moveBefore(items[i].key, item.key);
                                    }
                                } else {
                                    for (var i = items.length - 1; i >= 0; i--) {
                                        ds.moveAfter(items[i].key, item.key);
                                    }
                                }
                                ds.endEdits();
                                updateSelection(items);
                            });
                        }
                    });
                },

                onDrop: function SelectionMode_onDrop(eventObject) {
                    // If the listview or the handler of the drop event we fire triggers a reorder, the dragged items can end up having different container nodes than what they started with.
                    // Because of that, we need to remove the footprint class from the item boxes' containers before we do any processing of the drop event.
                    if (this._draggedItemBoxes) {
                        for (var i = 0, len = this._draggedItemBoxes.length; i < len; i++) {
                            if (this._draggedItemBoxes[i].parentNode) {
                                _ElementUtilities.removeClass(this._draggedItemBoxes[i].parentNode, _Constants._footprintClass);
                            }
                        }
                    }
                    if (!this._dragBetweenDisabled) {
                        var cursorPosition = this._getPositionInCanvasSpace(eventObject);
                        var dropLocation = this.site._view.hitTest(cursorPosition.x, cursorPosition.y),
                            dropIndex = clampToRange(-1, this.site._cachedCount - 1, dropLocation.insertAfterIndex),
                            allowDrop = true;
                        // We don't fire dragBetween events during autoscroll, so if a user drops during autoscroll, we need to get up to date information
                        // on the drop location, and fire dragBetween before the insert so that the developer can prevent the drop if they choose.
                        if (!this._lastInsertPoint || this._lastInsertPoint.insertAfterIndex !== dropIndex || this._lastInsertPoint.index !== dropLocation.index) {
                            allowDrop = this._fireDragBetweenEvent(dropLocation.index, dropIndex, eventObject.dataTransfer);
                        }
                        if (allowDrop) {
                            this._lastInsertPoint = null;
                            this.site._layout.dragLeave();
                            if (this._fireDropEvent(dropLocation.index, dropIndex, eventObject.dataTransfer) && this._dragging && this.site.itemsReorderable) {
                                if (this._dragInfo.isEverything() || this.site._groupsEnabled()) {
                                    return;
                                }

                                dropIndex = this._findFirstAvailableInsertPoint(this._dragInfo, dropIndex, false);
                                this._reorderItems(dropIndex, this._dragInfo, this._draggingUnselectedItem);
                            }
                        }
                    }
                    this._clearDragProperties();
                    eventObject.preventDefault();
                },

                _checkAutoScroll: function (x, y) {
                    var viewportSize = this.site._getViewportLength(),
                        horizontal = this.site._horizontal(),
                        cursorPositionInViewport = (horizontal ? x : y),
                        canvasSize = this.site._viewport[horizontal ? "scrollWidth" : "scrollHeight"],
                        scrollPosition = Math.floor(this.site.scrollPosition),
                        travelRate = 0;

                    if (cursorPositionInViewport < _Constants._AUTOSCROLL_THRESHOLD) {
                        travelRate = cursorPositionInViewport - _Constants._AUTOSCROLL_THRESHOLD;
                    } else if (cursorPositionInViewport > (viewportSize - _Constants._AUTOSCROLL_THRESHOLD)) {
                        travelRate = (cursorPositionInViewport - (viewportSize - _Constants._AUTOSCROLL_THRESHOLD));
                    }
                    travelRate = Math.round((travelRate / _Constants._AUTOSCROLL_THRESHOLD) * (_Constants._MAX_AUTOSCROLL_RATE - _Constants._MIN_AUTOSCROLL_RATE));

                    // If we're at the edge of the content, we don't need to keep scrolling. We'll set travelRate to 0 to stop the autoscroll timer.
                    if ((scrollPosition === 0 && travelRate < 0) || (scrollPosition >= (canvasSize - viewportSize) && travelRate > 0)) {
                        travelRate = 0;
                    }
                    if (travelRate === 0) {
                        if (this._autoScrollDelay) {
                            _Global.clearTimeout(this._autoScrollDelay);
                            this._autoScrollDelay = 0;
                        }
                    } else {
                        if (!this._autoScrollDelay && !this._autoScrollFrame) {
                            var that = this;
                            this._autoScrollDelay = _Global.setTimeout(function () {
                                if (that._autoScrollRate) {
                                    that._lastDragTimeout = _BaseUtils._now();
                                    var nextFrame = function () {
                                        if ((!that._autoScrollRate && that._autoScrollFrame) || that.site._disposed) {
                                            that._stopAutoScroll();
                                        } else {
                                            // Timeout callbacks aren't reliably timed, so extra math is needed to figure out how far the scroll position should move since the last callback
                                            var currentTime = _BaseUtils._now();
                                            var delta = that._autoScrollRate * ((currentTime - that._lastDragTimeout) / 1000);
                                            delta = (delta < 0 ? Math.min(-1, delta) : Math.max(1, delta));
                                            var newScrollPos = {};
                                            newScrollPos[that.site._scrollProperty] = that.site._viewportScrollPosition + delta;
                                            _ElementUtilities.setScrollPosition(that.site._viewport, newScrollPos);
                                            that._lastDragTimeout = currentTime;
                                            that._autoScrollFrame = _BaseUtils._requestAnimationFrame(nextFrame);
                                        }
                                    };
                                    that._autoScrollFrame = _BaseUtils._requestAnimationFrame(nextFrame);
                                }
                            }, _Constants._AUTOSCROLL_DELAY);
                        }
                    }
                    this._autoScrollRate = travelRate;
                },

                _stopAutoScroll: function () {
                    if (this._autoScrollDelay) {
                        _Global.clearTimeout(this._autoScrollDelay);
                        this._autoScrollDelay = 0;
                    }
                    this._autoScrollRate = 0;
                    this._autoScrollFrame = 0;
                },

                onKeyDown: function SelectionMode_onKeyDown(eventObject) {
                    var that = this,
                        site = this.site,
                        swipeEnabled = site._swipeBehavior === _UI.SwipeBehavior.select,
                        view = site._view,
                        oldEntity = site._selection._getFocused(),
                        handled = true,
                        ctrlKeyDown = eventObject.ctrlKey;

                    function setNewFocus(newEntity, skipSelection, clampToBounds) {
                        function setNewFocusImpl(maxIndex) {
                            var moveView = true,
                                invalidIndex = false;
                            // Since getKeyboardNavigatedItem is purely geometry oriented, it can return us out of bounds numbers, so this check is necessary
                            if (clampToBounds) {
                                newEntity.index = Math.max(0, Math.min(maxIndex, newEntity.index));
                            } else if (newEntity.index < 0 || newEntity.index > maxIndex) {
                                invalidIndex = true;
                            }
                            if (!invalidIndex && (oldEntity.index !== newEntity.index || oldEntity.type !== newEntity.type)) {
                                var changeFocus = dispatchKeyboardNavigating(site._element, oldEntity, newEntity);
                                if (changeFocus) {
                                    moveView = false;

                                    // If the oldEntity is completely off-screen then we mimic the desktop
                                    // behavior. This is consistent with navbar keyboarding.
                                    if (that._setNewFocusItemOffsetPromise) {
                                        that._setNewFocusItemOffsetPromise.cancel();
                                    }
                                    site._batchViewUpdates(_Constants._ViewChange.realize, _Constants._ScrollToPriority.high, function () {
                                        that._setNewFocusItemOffsetPromise = site._getItemOffset(oldEntity, true).then(function (range) {
                                            range = site._convertFromCanvasCoordinates(range);
                                            var oldItemOffscreen = range.end <= site.scrollPosition || range.begin >= site.scrollPosition + site._getViewportLength() - 1;
                                            that._setNewFocusItemOffsetPromise = site._getItemOffset(newEntity).then(function (range) {
                                                that._setNewFocusItemOffsetPromise = null;
                                                var retVal = {
                                                    position: site.scrollPosition,
                                                    direction: "right"
                                                };
                                                if (oldItemOffscreen) {
                                                    // oldEntity is completely off-screen
                                                    site._selection._setFocused(newEntity, true);
                                                    range = site._convertFromCanvasCoordinates(range);
                                                    if (newEntity.index > oldEntity.index) {
                                                        retVal.direction = "right";
                                                        retVal.position = range.end - site._getViewportLength();
                                                    } else {
                                                        retVal.direction = "left";
                                                        retVal.position = range.begin;
                                                    }
                                                }
                                                site._changeFocus(newEntity, skipSelection, ctrlKeyDown, oldItemOffscreen, true);
                                                if (!oldItemOffscreen) {
                                                    return Promise.cancel;
                                                } else {
                                                    return retVal;
                                                }
                                            }, function (error) {
                                                site._changeFocus(newEntity, skipSelection, ctrlKeyDown, true, true);
                                                return Promise.wrapError(error);
                                            });
                                            return that._setNewFocusItemOffsetPromise;
                                        }, function (error) {
                                            site._changeFocus(newEntity, skipSelection, ctrlKeyDown, true, true);
                                            return Promise.wrapError(error);
                                        });
                                        return that._setNewFocusItemOffsetPromise;
                                    }, true);
                                }
                            }
                            // When a key is pressed, we want to make sure the current focus is in view. If the keypress is changing to a new valid index,
                            // _changeFocus will handle moving the viewport for us. If the focus isn't moving, though, we need to put the view back on
                            // the current item ourselves and call setFocused(oldFocus, true) to make sure that the listview knows the focused item was
                            // focused via keyboard and renders the rectangle appropriately.
                            if (moveView) {
                                site._selection._setFocused(oldEntity, true);
                                site.ensureVisible(oldEntity);
                            }
                            if (invalidIndex) {
                                return { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX };
                            } else {
                                return newEntity;
                            }
                        }

                        // We need to get the final item in the view so that we don't try setting focus out of bounds.
                        if (newEntity.type === _UI.ObjectType.item) {
                            return Promise.wrap(view.lastItemIndex()).then(setNewFocusImpl);
                        } else if (newEntity.type === _UI.ObjectType.groupHeader) {
                            return Promise.wrap(site._groups.length() - 1).then(setNewFocusImpl);
                        } else {
                            return Promise.wrap(0).then(setNewFocusImpl);
                        }
                    }

                    var Key = _ElementUtilities.Key,
                        keyCode = eventObject.keyCode,
                        rtl = site._rtl();

                    if (!this._isInteractive(eventObject.target)) {
                        if (eventObject.ctrlKey && !eventObject.altKey && !eventObject.shiftKey && this._keyboardAcceleratorHandlers[keyCode]) {
                            this._keyboardAcceleratorHandlers[keyCode]();
                        }
                        if (site.itemsReorderable && (!eventObject.ctrlKey && eventObject.altKey && eventObject.shiftKey && oldEntity.type === _UI.ObjectType.item) &&
                            (keyCode === Key.leftArrow || keyCode === Key.rightArrow || keyCode === Key.upArrow || keyCode === Key.downArrow)) {
                            var selection = site._selection,
                                focusedIndex = oldEntity.index,
                                movingUnselectedItem = false,
                                processReorder = true;
                            if (!selection.isEverything()) {
                                if (!selection._isIncluded(focusedIndex)) {
                                    var item = site._view.items.itemAt(focusedIndex);
                                    // Selected items should never be marked as non draggable, so we only need to check for nonDraggableClass when trying to reorder an unselected item.
                                    if (item && _ElementUtilities.hasClass(item, _Constants._nonDraggableClass)) {
                                        processReorder = false;
                                    } else {
                                        movingUnselectedItem = true;
                                        selection = new _SelectionManager._Selection(this.site, [{ firstIndex: focusedIndex, lastIndex: focusedIndex }]);
                                    }
                                }
                                if (processReorder) {
                                    var dropIndex = focusedIndex;
                                    if (keyCode === Key.rightArrow) {
                                        dropIndex += (rtl ? -1 : 1);
                                    } else if (keyCode === Key.leftArrow) {
                                        dropIndex += (rtl ? 1 : -1);
                                    } else if (keyCode === Key.upArrow) {
                                        dropIndex--;
                                    } else {
                                        dropIndex++;
                                    }
                                    // If the dropIndex is larger than the original index, we're trying to move items forward, so the search for the first unselected item to insert after should move forward.
                                    var movingAhead = (dropIndex > focusedIndex),
                                        searchForward = movingAhead;
                                    if (movingAhead && dropIndex >= this.site._cachedCount) {
                                        // If we're at the end of the list and trying to move items forward, dropIndex should be >= cachedCount.
                                        // That doesn't mean we don't have to do any reordering, though. A selection could be broken down into
                                        // a few blocks. We need to make the selection contiguous after this reorder, so we've got to search backwards
                                        // to find the first unselected item, then move everything in the selection after it.
                                        searchForward = false;
                                        dropIndex = this.site._cachedCount - 1;
                                    }
                                    dropIndex = this._findFirstAvailableInsertPoint(selection, dropIndex, searchForward);
                                    dropIndex = Math.min(Math.max(-1, dropIndex), this.site._cachedCount - 1);
                                    var reportedInsertAfterIndex = dropIndex - (movingAhead || dropIndex === -1 ? 0 : 1),
                                        reportedIndex = dropIndex,
                                        groupsEnabled = this.site._groupsEnabled();

                                    if (groupsEnabled) {
                                        // The indices we picked for the index/insertAfterIndex to report in our events is always correct in an ungrouped list,
                                        // and mostly correct in a grouped list. The only problem occurs when you move an item (or items) ahead into a new group,
                                        // or back into a previous group, such that the items should be the first/last in the group. Take this list as an example:
                                        // [Group A] [a] [b] [c] [Group B] [d] [e]
                                        // When [d] is focused, right/down arrow reports index: 4, insertAfterIndex: 4, which is right -- it means move [d] after [e].
                                        // Similarily, when [c] is focused and left/up is pressed, we report index: 1, insertAfterIndex: 0 -- move [c] to after [a].
                                        // Take note that index does not tell us where focus is / what item is being moved.
                                        // Like mouse/touch DnD, index tells us what the dragBetween slots would be were we to animate a dragBetween.
                                        // The problem cases are moving backwards into a previous group, or forward into the next group.
                                        // If [c] were focused and the user pressed right/down, we would report index: 3, insertAfterIndex: 3. In other words, move [c] after [d].
                                        // That's not right at all - [c] needs to become the first element of [Group B]. When we're moving ahead, then, and our dropIndex
                                        // is the first index of a new group, we adjust insertAfterIndex to be dropIndex - 1. Now we'll report index:3, insertAfterIndex: 2, which means
                                        // [c] is now the first element of [Group B], rather than the last element of [Group A]. This is exactly the same as what we would report when
                                        // the user mouse/touch drags [c] right before [d].
                                        // Similarily, when [d] is focused and we press left/up, without the logic below we would report index: 2, insertAfterIndex: 1, so we'd try to move
                                        // [d] ahead of [b]. Again, [d] first needs the opportunity to become the last element in [Group A], so we adjust the insertAfterIndex up by 1.
                                        // We then will report index:2, insertAfterIndex:2, meaning insert [d] in [Group A] after [c], which again mimics the mouse/touch API.
                                        var groups = this.site._groups,
                                            groupIndex = (dropIndex > -1 ? groups.groupFromItem(dropIndex) : 0);
                                        if (movingAhead) {
                                            if (groups.group(groupIndex).startIndex === dropIndex) {
                                                reportedInsertAfterIndex--;
                                            }
                                        } else if (groupIndex < (groups.length() - 1) && dropIndex === (groups.group(groupIndex + 1).startIndex - 1)) {
                                            reportedInsertAfterIndex++;
                                        }
                                    }

                                    if (this._fireDragBetweenEvent(reportedIndex, reportedInsertAfterIndex, null) && this._fireDropEvent(reportedIndex, reportedInsertAfterIndex, null)) {
                                        if (groupsEnabled) {
                                            return;
                                        }

                                        this._reorderItems(dropIndex, selection, movingUnselectedItem, !movingAhead, true);
                                    }
                                }
                            }
                        } else if (!eventObject.altKey) {
                            if (this._keyboardNavigationHandlers[keyCode]) {
                                this._keyboardNavigationHandlers[keyCode](oldEntity).then(function (newEntity) {
                                    var clampToBounds = that._keyboardNavigationHandlers[keyCode].clampToBounds;
                                    if (newEntity.type !== _UI.ObjectType.groupHeader && eventObject.shiftKey && site._selectionAllowed() && site._multiSelection()) {
                                        // Shift selection should work when shift or shift+ctrl are depressed
                                        if (site._selection._pivot === _Constants._INVALID_INDEX) {
                                            site._selection._pivot = oldEntity.index;
                                        }
                                        setNewFocus(newEntity, true, clampToBounds).then(function (newEntity) {
                                            if (newEntity.index !== _Constants._INVALID_INDEX) {
                                                var firstIndex = Math.min(newEntity.index, site._selection._pivot),
                                                    lastIndex = Math.max(newEntity.index, site._selection._pivot),
                                                    additive = (eventObject.ctrlKey || site._tap === _UI.TapBehavior.toggleSelect);
                                                that._selectRange(firstIndex, lastIndex, additive);
                                            }
                                        });
                                    } else {
                                        site._selection._pivot = _Constants._INVALID_INDEX;
                                        setNewFocus(newEntity, false, clampToBounds);
                                    }
                                });
                            } else if (!eventObject.ctrlKey && keyCode === Key.enter) {
                                var element = oldEntity.type === _UI.ObjectType.groupHeader ? site._groups.group(oldEntity.index).header : site._view.items.itemBoxAt(oldEntity.index);
                                if (element) {
                                    if (oldEntity.type === _UI.ObjectType.groupHeader) {
                                        this._pressedHeader = element;
                                        this._pressedItemBox = null;
                                        this._pressedContainer = null;
                                    } else {
                                        this._pressedItemBox = element;
                                        this._pressedContainer = site._view.items.containerAt(oldEntity.index);
                                        this._pressedHeader = null;
                                    }

                                    var allowed = this._verifySelectionAllowed(oldEntity);
                                    if (allowed.canTapSelect) {
                                        this._itemEventsHandler.handleTap(oldEntity);
                                    }
                                    this._fireInvokeEvent(oldEntity, element);
                                }
                            } else if (oldEntity.type !== _UI.ObjectType.groupHeader &&
                                    ((eventObject.ctrlKey && keyCode === Key.enter) ||
                                    (swipeEnabled && eventObject.shiftKey && keyCode === Key.F10) ||
                                    (swipeEnabled && keyCode === Key.menu) ||
                                    keyCode === Key.space)) {
                                // Swipe emulation
                                this._itemEventsHandler.handleSwipeBehavior(oldEntity.index);
                                site._changeFocus(oldEntity, true, ctrlKeyDown, false, true);
                            } else if (keyCode === Key.escape && site._selection.count() > 0) {
                                site._selection._pivot = _Constants._INVALID_INDEX;
                                site._selection.clear();
                            } else {
                                handled = false;
                            }
                        } else {
                            handled = false;
                        }

                        this._keyDownHandled = handled;
                        if (handled) {
                            eventObject.stopPropagation();
                            eventObject.preventDefault();
                        }
                    }

                    if (keyCode === Key.tab) {
                        this.site._keyboardFocusInbound = true;
                    }
                },

                onKeyUp: function (eventObject) {
                    if (this._keyDownHandled) {
                        eventObject.stopPropagation();
                        eventObject.preventDefault();
                    }
                },

                onTabEntered: function (eventObject) {
                    if (this.site._groups.length() === 0 && !this.site._hasListHeaderOrFooter) {
                        return;
                    }

                    var site = this.site,
                        focused = site._selection._getFocused(),
                        forward = eventObject.detail;

                    // We establish whether focus is incoming on the ListView by checking keyboard focus and the srcElement.
                    // If the ListView did not have keyboard focus, then it is definitely incoming since keyboard focus is cleared
                    // on blur which works for 99% of all scenarios. When the ListView is the only tabbable element on the page,
                    // then tabbing out of the ListView will make focus wrap around and focus the ListView again. The blur event is
                    // handled after TabEnter, so the keyboard focus flag is not yet cleared. Therefore, we examine the srcElement and see
                    // if it is the _viewport since it is the first tabbable element in the ListView DOM tree.
                    var inboundFocus = !site._hasKeyboardFocus || eventObject.target === site._viewport;
                    if (inboundFocus) {
                        this.inboundFocusHandled = true;

                        // We tabbed into the ListView
                        focused.index = (focused.index === _Constants._INVALID_INDEX ? 0 : focused.index);
                        if (forward || !(this.site._supportsGroupHeaderKeyboarding || this.site._hasListHeaderOrFooter)) {
                            // We tabbed into the ListView from before the ListView, so focus should go to items
                            var entity = { type: _UI.ObjectType.item };
                            if (focused.type === _UI.ObjectType.groupHeader) {
                                entity.index = site._groupFocusCache.getIndexForGroup(focused.index);
                                if (dispatchKeyboardNavigating(site._element, focused, entity)) {
                                    site._changeFocus(entity, true, false, false, true);
                                } else {
                                    site._changeFocus(focused, true, false, false, true);
                                }
                            } else {
                                entity.index = (focused.type !== _UI.ObjectType.item ? site._groupFocusCache.getLastFocusedItemIndex() : focused.index);
                                site._changeFocus(entity, true, false, false, true);
                            }
                            eventObject.preventDefault();
                        } else {
                            // We tabbed into the ListView from after the ListView, focus should go to headers
                            var entity = { type: _UI.ObjectType.groupHeader };
                            if (this.site._hasListHeaderOrFooter) {
                                if (this.site._lastFocusedElementInGroupTrack.type === _UI.ObjectType.groupHeader && this.site._supportsGroupHeaderKeyboarding) {
                                    entity.index = site._groups.groupFromItem(focused.index);
                                    if (dispatchKeyboardNavigating(site._element, focused, entity)) {
                                        site._changeFocus(entity, true, false, false, true);
                                    } else {
                                        site._changeFocus(focused, true, false, false, true);
                                    }
                                } else {
                                    entity.type = this.site._lastFocusedElementInGroupTrack.type;
                                    entity.index = 0;
                                    site._changeFocus(entity, true, false, false, true);
                                }
                            } else if (focused.type !== _UI.ObjectType.groupHeader && this.site._supportsGroupHeaderKeyboarding) {
                                entity.index = site._groups.groupFromItem(focused.index);
                                if (dispatchKeyboardNavigating(site._element, focused, entity)) {
                                    site._changeFocus(entity, true, false, false, true);
                                } else {
                                    site._changeFocus(focused, true, false, false, true);
                                }
                            } else {
                                entity.index = focused.index;
                                site._changeFocus(entity, true, false, false, true);
                            }
                            eventObject.preventDefault();
                        }
                    }
                },

                onTabExiting: function (eventObject) {
                    if (!this.site._hasListHeaderOrFooter && (!this.site._supportsGroupHeaderKeyboarding || this.site._groups.length() === 0)) {
                        return;
                    }

                    var site = this.site,
                        focused = site._selection._getFocused(),
                        forward = eventObject.detail;

                    if (forward) {
                        var entity = null;
                        if (focused.type === _UI.ObjectType.item) {
                            // Tabbing and we were focusing an item, go to headers.
                            // If we last saw focus in the header track on the layout header/footer, we'll move focus back to there first. Otherwise, we'll let the group header take it.
                            var lastType = this.site._lastFocusedElementInGroupTrack.type;
                            if (lastType === _UI.ObjectType.listHeader || lastType === _UI.ObjectType.listFooter || !this.site._supportsGroupHeaderKeyboarding) {
                                var entity = { type: (lastType === _UI.ObjectType.item ? _UI.ObjectType.listHeader : lastType), index: 0 };
                            } else {
                                var entity = { type: _UI.ObjectType.groupHeader, index: site._groups.groupFromItem(focused.index) };
                            }
                            
                        }

                        if (entity && dispatchKeyboardNavigating(site._element, focused, entity)) {
                            site._changeFocus(entity, true, false, false, true);
                            eventObject.preventDefault();
                        }
                    } else if (!forward && focused.type !== _UI.ObjectType.item) {
                        // Shift tabbing and we were focusing a header, go to items
                        var targetIndex = 0;
                        if (focused.type === _UI.ObjectType.groupHeader) {
                            targetIndex = site._groupFocusCache.getIndexForGroup(focused.index);
                        } else {
                            targetIndex = (focused.type === _UI.ObjectType.listHeader ? 0 : site._view.lastItemIndex());
                        }
                        var entity = { type: _UI.ObjectType.item, index: targetIndex };
                        if (dispatchKeyboardNavigating(site._element, focused, entity)) {
                            site._changeFocus(entity, true, false, false, true);
                            eventObject.preventDefault();
                        }
                    }
                }
            });
            return _SelectionMode;
        })
    });

});
