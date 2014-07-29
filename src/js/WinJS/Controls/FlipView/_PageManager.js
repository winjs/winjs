// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

define([
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Core/_ErrorFromName',
    '../../Core/_Log',
    '../../Core/_Resources',
    '../../Core/_WriteProfilerMark',
    '../../Animations',
    '../../Promise',
    '../../_Signal',
    '../../Scheduler',
    '../../Utilities/_Dispose',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_TabContainer',
    './_Constants'
    ], function flipperPageManagerInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Log, _Resources, _WriteProfilerMark, Animations, Promise, _Signal, Scheduler, _Dispose, _ElementUtilities, _TabContainer, _Constants) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {

        // Definition of our private utility
        _FlipPageManager: _Base.Namespace._lazy(function () {
            var uniqueID = _ElementUtilities._uniqueID;
            var styleEquivalents = _BaseUtils._browserStyleEquivalents;

            var leftBufferAmount = 50,
                itemSelectedEventDelay = 250;

            var strings = {
                get badCurrentPage() { return "Invalid argument: currentPage must be a number greater than or equal to zero and be within the bounds of the datasource"; }
            };

            function isFlipper(element) {
                var control = element.winControl;
                if (control && control._isFlipView) {
                    return true;
                }

                return false;
            }

            function flipperPropertyChanged(list) {
                list.forEach(function (record) {
                    var element = record.target;
                    if (element.winControl && element.tabIndex >= 0) {
                        element.winControl._pageManager._updateTabIndex(element.tabIndex);
                        element.tabIndex = -1;
                    }
                    var that = element.winControl;
                    if (that && that._isFlipView) {
                        var dirChanged = false;
                        if (record.attributeName === "dir") {
                            dirChanged = true;
                        } else if (record.attributeName === "style") {
                            dirChanged = (that._cachedStyleDir !== element.style.direction);
                        }
                        if (dirChanged) {
                            that._cachedStyleDir = element.style.direction;
                            that._pageManager._rtl = _Global.getComputedStyle(that._pageManager._flipperDiv, null).direction === "rtl";
                            that._pageManager.resized();
                        }
                    }
                });
            }

            var _FlipPageManager = _Base.Class.define(function _FlipPageManager_ctor(flipperDiv, panningDiv, panningDivContainer, itemsManager, itemSpacing, environmentSupportsTouch, buttonVisibilityHandler) {
                // Construction
                this._visibleElements = [];
                this._flipperDiv = flipperDiv;
                this._panningDiv = panningDiv;
                this._panningDivContainer = panningDivContainer;
                this._buttonVisibilityHandler = buttonVisibilityHandler;
                this._currentPage = null;
                this._rtl = _Global.getComputedStyle(this._flipperDiv, null).direction === "rtl";
                this._itemsManager = itemsManager;
                this._itemSpacing = itemSpacing;
                this._tabIndex = _ElementUtilities.getTabIndex(flipperDiv);
                if (this._tabIndex < 0) {
                    this._tabIndex = 0;
                }
                flipperDiv.tabIndex = -1;
                this._tabManager = new _TabContainer.TabContainer(this._panningDivContainer);
                this._tabManager.tabIndex = this._tabIndex;
                this._lastSelectedPage = null;
                this._lastSelectedElement = null;
                this._bufferSize = _FlipPageManager.flipPageBufferCount;
                this._cachedSize = -1;
                this._environmentSupportsTouch = environmentSupportsTouch;

                var that = this;
                this._panningDiv.addEventListener("keydown", function (event) {
                    if (that._blockTabs && event.keyCode === _ElementUtilities.Key.tab) {
                        event.stopImmediatePropagation();
                        event.preventDefault();
                    }
                }, true);
                _ElementUtilities._addEventListener(this._flipperDiv, "focusin", function (event) {
                    if (event.target === that._flipperDiv) {
                        if (that._currentPage.element) {
                            _ElementUtilities._setActive(that._currentPage.element);
                        }
                    }
                }, false);
                new _ElementUtilities._MutationObserver(flipperPropertyChanged).observe(this._flipperDiv, { attributes: true, attributeFilter: ["dir", "style", "tabindex"] });
                this._cachedStyleDir = this._flipperDiv.style.direction;
                this._panningDiv.addEventListener("activate", function () {
                    that._hasFocus = true;
                }, true);
                this._panningDiv.addEventListener("deactivate", function () {
                    that._hasFocus = false;
                }, true);
                if (this._environmentSupportsTouch) {
                    this._panningDivContainer.addEventListener(_BaseUtils._browserEventEquivalents["manipulationStateChanged"], function (event) {
                        that._manipulationState = event.currentState;
                        if (event.currentState === 0 && event.target === that._panningDivContainer) {
                            that._itemSettledOn();
                            that._ensureCentered();
                        }
                    }, true);
                }
            }, {
                // Public Methods

                initialize: function (initialIndex, isHorizontal) {
                    var currPage = null;
                    // Every call to offsetWidth/offsetHeight causes an switch from Script to Layout which affects
                    // the performance of the control. The values will be cached and will be updated when a resize occurs.
                    this._panningDivContainerOffsetWidth = this._panningDivContainer.offsetWidth;
                    this._panningDivContainerOffsetHeight = this._panningDivContainer.offsetHeight;
                    this._isHorizontal = isHorizontal;
                    if (!this._currentPage) {
                        this._bufferAriaStartMarker = _Global.document.createElement("div");
                        this._bufferAriaStartMarker.id = uniqueID(this._bufferAriaStartMarker);
                        this._panningDiv.appendChild(this._bufferAriaStartMarker);

                        this._currentPage = this._createFlipPage(null, this);
                        currPage = this._currentPage;
                        this._panningDiv.appendChild(currPage.pageRoot);

                        // flipPageBufferCount is added here twice. 
                        // Once for the buffer prior to the current item, and once for the buffer ahead of the current item.
                        var pagesToInit = 2 * this._bufferSize;
                        for (var i = 0; i < pagesToInit; i++) {
                            currPage = this._createFlipPage(currPage, this);
                            this._panningDiv.appendChild(currPage.pageRoot);
                        }

                        this._bufferAriaEndMarker = _Global.document.createElement("div");
                        this._bufferAriaEndMarker.id = uniqueID(this._bufferAriaEndMarker);
                        this._panningDiv.appendChild(this._bufferAriaEndMarker);
                    }

                    this._prevMarker = this._currentPage.prev.prev;

                    if (this._itemsManager) {
                        this.setNewItemsManager(this._itemsManager, initialIndex);
                    }
                },

                dispose: function () {
                    var curPage = this._currentPage;

                    var tmpPage = curPage;
                    do {
                        _Dispose._disposeElement(tmpPage.element);
                        tmpPage = tmpPage.next;
                    } while (tmpPage !== curPage);
                },

                setOrientation: function (isHorizontal) {
                    if (this._notificationsEndedSignal) {
                        var that = this;
                        this._notificationsEndedSignal.promise.done(function () {
                            that._notificationsEndedSignal = null;
                            that.setOrientation(isHorizontal);
                        });
                        return;
                    }

                    if (isHorizontal === this._isHorizontal) {
                        return;
                    }

                    this._isOrientationChanging = true;

                    if (this._isHorizontal) {
                        _ElementUtilities.setScrollPosition(this._panningDivContainer, { scrollLeft: this._getItemStart(this._currentPage), scrollTop: 0 });
                    } else {
                        _ElementUtilities.setScrollPosition(this._panningDivContainer, { scrollLeft: 0, scrollTop: this._getItemStart(this._currentPage) });
                    }
                    this._isHorizontal = isHorizontal;

                    var containerStyle = this._panningDivContainer.style;
                    containerStyle.overflowX = "hidden";
                    containerStyle.overflowY = "hidden";

                    var that = this;
                    _Global.requestAnimationFrame(function () {
                        that._isOrientationChanging = false;
                        that._forEachPage(function (curr) {
                            var currStyle = curr.pageRoot.style;
                            currStyle.left = "0px";
                            currStyle.top = "0px";
                        });
                        containerStyle.overflowX = ((that._isHorizontal && that._environmentSupportsTouch) ? "scroll" : "hidden");
                        containerStyle.overflowY = ((that._isHorizontal || !that._environmentSupportsTouch) ? "hidden" : "scroll");
                        that._ensureCentered();
                    });
                },

                resetState: function (initialIndex) {
                    this._writeProfilerMark("WinJS.UI.FlipView:resetState,info");
                    if (initialIndex !== 0) {
                        var indexValid = this.jumpToIndex(initialIndex, true);
                        if (!indexValid && _BaseUtils.validation) {
                            throw new _ErrorFromName("WinJS.UI.FlipView.BadCurrentPage", strings.badCurrentPage);
                        }
                        return indexValid;
                    } else {
                        _Dispose.disposeSubTree(this._flipperDiv);
                        this._resetBuffer(null, true);
                        var that = this;
                        var work = Promise.wrap(true);
                        if (this._itemsManager) {
                            work = that._itemsManager._firstItem().then(function (e) {
                                that._currentPage.setElement(e);
                                return that._fetchPreviousItems(true).
                                    then(function () {
                                        return that._fetchNextItems();
                                    }).then(function () {
                                        that._setButtonStates();
                                    });
                            });
                        }
                        return work.then(function () {
                            that._tabManager.childFocus = that._currentPage.element;
                            that._ensureCentered();
                            that._itemSettledOn();
                        });
                    }
                },

                setNewItemsManager: function (manager, initialIndex) {
                    this._itemsManager = manager;
                    var that = this;
                    return this.resetState(initialIndex).then(function () {
                        // resetState already configures the tabManager, calls _ensureCentered and _itemSettledOn when the initial index is 0
                        if (initialIndex !== 0) {
                            that._tabManager.childFocus = that._currentPage.element;
                            that._ensureCentered();
                            that._itemSettledOn();
                        }
                    });
                },

                currentIndex: function () {
                    if (!this._itemsManager) {
                        return 0;
                    }
                    var index = 0;
                    var element = (this._navigationAnimationRecord ? this._navigationAnimationRecord.newCurrentElement : this._currentPage.element);
                    if (element) {
                        index = this._getElementIndex(element);
                    }
                    return index;
                },

                resetScrollPos: function () {
                    this._ensureCentered();
                },

                scrollPosChanged: function () {

                    if (!this._itemsManager || !this._currentPage.element || this._isOrientationChanging) {
                        return;
                    }

                    var newPos = this._getViewportStart(),
                        bufferEnd = (this._lastScrollPos > newPos ? this._getTailOfBuffer() : this._getHeadOfBuffer());

                    if (newPos === this._lastScrollPos) {
                        return;
                    }

                    while (this._currentPage.element && this._getItemStart(this._currentPage) > newPos && this._currentPage.prev.element) {
                        this._currentPage = this._currentPage.prev;
                        this._fetchOnePrevious(bufferEnd.prev);
                        bufferEnd = bufferEnd.prev;
                    }

                    while (this._currentPage.element && this._itemEnd(this._currentPage) <= newPos && this._currentPage.next.element) {
                        this._currentPage = this._currentPage.next;
                        this._fetchOneNext(bufferEnd.next);
                        bufferEnd = bufferEnd.next;
                    }
                    this._setButtonStates();
                    this._checkElementVisibility(false);
                    this._blockTabs = true;
                    this._lastScrollPos = newPos;
                    if (this._currentPage.element) {
                        this._tabManager.childFocus = this._currentPage.element;
                    }
                    this._setListEnds();

                    if (!this._manipulationState && this._viewportOnItemStart()) {
                        // Setup a timeout to invoke _itemSettledOn in cases where the scroll position is changed, and the control 
                        // does not know when it has settled on an item (e.g. 1-finger swipe with narrator touch).
                        this._currentPage.element.setAttribute("aria-setsize", this._cachedSize);
                        this._currentPage.element.setAttribute("aria-posinset", this.currentIndex() + 1);
                        this._timeoutPageSelection();
                    }
                },

                itemRetrieved: function (real, placeholder) {
                    var that = this;
                    this._forEachPage(function (curr) {
                        if (curr.element === placeholder) {
                            if (curr === that._currentPage || curr === that._currentPage.next) {
                                that._changeFlipPage(curr, placeholder, real);
                            } else {
                                curr.setElement(real, true);
                            }
                            return true;
                        }
                    });
                    if (this._navigationAnimationRecord && this._navigationAnimationRecord.elementContainers) {
                        var animatingElements = this._navigationAnimationRecord.elementContainers;
                        for (var i = 0, len = animatingElements.length; i < len; i++) {
                            if (animatingElements[i].element === placeholder) {
                                that._changeFlipPage(animatingElements[i], placeholder, real);
                                animatingElements[i].element = real;
                            }
                        }
                    }
                    this._checkElementVisibility(false);
                },

                resized: function () {
                    this._panningDivContainerOffsetWidth = this._panningDivContainer.offsetWidth;
                    this._panningDivContainerOffsetHeight = this._panningDivContainer.offsetHeight;
                    var that = this;
                    this._forEachPage(function (curr) {
                        curr.pageRoot.style.width = that._panningDivContainerOffsetWidth + "px";
                        curr.pageRoot.style.height = that._panningDivContainerOffsetHeight + "px";
                    });

                    // Call _ensureCentered to adjust all the width/height of the pages in the buffer
                    this._ensureCentered();
                    this._writeProfilerMark("WinJS.UI.FlipView:resize,StopTM");
                },

                jumpToIndex: function (index, forceJump) {
                    // If we force jumping to an index, we are not interested in making sure that there is distance
                    // between the current and the new index.
                    if (!forceJump) {
                        if (!this._itemsManager || !this._currentPage.element || index < 0) {
                            return Promise.wrap(false);
                        }

                        // If we have to keep our pages in memory, we need to iterate through every single item from our current position to the desired target
                        var currIndex = this._getElementIndex(this._currentPage.element),
                            distance = Math.abs(index - currIndex);

                        if (distance === 0) {
                            return Promise.wrap(false);
                        }
                    }

                    var tail = Promise.wrap(true);
                    var that = this;

                    tail = tail.then(function () {
                        var itemPromise = that._itemsManager._itemPromiseAtIndex(index);
                        return Promise.join({
                            element: that._itemsManager._itemFromItemPromise(itemPromise),
                            item: itemPromise
                        }).then(function (v) {
                            var elementAtIndex = v.element;

                            // Reset the buffer regardless of whether we have elementAtIndex or not
                            that._resetBuffer(elementAtIndex, forceJump);

                            if (!elementAtIndex) {
                                return false;
                            }

                            that._currentPage.setElement(elementAtIndex);
                            return that._fetchNextItems().
                                then(function () {
                                    return that._fetchPreviousItems(true);
                                }).
                                then(function () {
                                    return true;
                                });
                        });
                    });
                    tail = tail.then(function (v) {
                        that._setButtonStates();
                        return v;
                    });

                    return tail;
                },

                startAnimatedNavigation: function (goForward, cancelAnimationCallback, completionCallback) {
                    this._writeProfilerMark("WinJS.UI.FlipView:startAnimatedNavigation,info");
                    if (this._currentPage.element) {
                        var outgoingPage = this._currentPage,
                            incomingPage = (goForward ? this._currentPage.next : this._currentPage.prev);

                        if (incomingPage.element) {
                            if (this._hasFocus) {
                                // Give focus to the panning div ONLY if anything inside the flipview control currently has
                                // focus; otherwise, it will be lost when the current page is animated during the navigation.
                                _ElementUtilities._setActive(this._panningDiv);
                            }
                            this._navigationAnimationRecord = {};
                            this._navigationAnimationRecord.goForward = goForward;
                            this._navigationAnimationRecord.cancelAnimationCallback = cancelAnimationCallback;
                            this._navigationAnimationRecord.completionCallback = completionCallback;
                            this._navigationAnimationRecord.oldCurrentPage = outgoingPage;
                            this._navigationAnimationRecord.newCurrentPage = incomingPage;
                            var outgoingElement = outgoingPage.element;
                            var incomingElement = incomingPage.element;
                            this._navigationAnimationRecord.newCurrentElement = incomingElement;

                            // When a page element is animated during a navigation, it is temporarily appended on a different container during the animation (see _createDiscardablePage).
                            // However, updates in the data source can happen (change, remove, insert, etc) during the animation affecting the element that is being animated.
                            // Therefore, the page object also maintains the elementUniqueID, and the functions that deal with re-building the internal buffer (shifting/remove/etc)
                            // do all the comparissons, based on the page.elementUniqueID that way even if the element of the page is being animated, we are able to restore/discard it
                            // into the internal buffer back in the correct place.
                            outgoingPage.setElement(null, true);
                            outgoingPage.elementUniqueID = uniqueID(outgoingElement);
                            incomingPage.setElement(null, true);
                            incomingPage.elementUniqueID = uniqueID(incomingElement);

                            var outgoingFlipPage = this._createDiscardablePage(outgoingElement),
                                incomingFlipPage = this._createDiscardablePage(incomingElement);

                            outgoingFlipPage.pageRoot.itemIndex = this._getElementIndex(outgoingElement);
                            incomingFlipPage.pageRoot.itemIndex = outgoingFlipPage.pageRoot.itemIndex + (goForward ? 1 : -1);
                            outgoingFlipPage.pageRoot.style.position = "absolute";
                            incomingFlipPage.pageRoot.style.position = "absolute";
                            outgoingFlipPage.pageRoot.style.zIndex = 1;
                            incomingFlipPage.pageRoot.style.zIndex = 2;
                            this._setItemStart(outgoingFlipPage, 0);
                            this._setItemStart(incomingFlipPage, 0);
                            this._blockTabs = true;
                            this._visibleElements.push(incomingElement);
                            this._announceElementVisible(incomingElement);
                            this._navigationAnimationRecord.elementContainers = [outgoingFlipPage, incomingFlipPage];
                            return {
                                outgoing: outgoingFlipPage,
                                incoming: incomingFlipPage
                            };
                        }
                    }
                    return null;
                },

                endAnimatedNavigation: function (goForward, outgoing, incoming) {
                    this._writeProfilerMark("WinJS.UI.FlipView:endAnimatedNavigation,info");
                    if (this._navigationAnimationRecord &&
                        this._navigationAnimationRecord.oldCurrentPage &&
                        this._navigationAnimationRecord.newCurrentPage) {
                        var outgoingRemoved = this._restoreAnimatedElement(this._navigationAnimationRecord.oldCurrentPage, outgoing);
                        this._restoreAnimatedElement(this._navigationAnimationRecord.newCurrentPage, incoming);
                        if (!outgoingRemoved) {
                            // Advance only when the element in the current page was not removed because if it did, all the pages
                            // were shifted.
                            this._setViewportStart(this._getItemStart(goForward ? this._currentPage.next : this._currentPage.prev));
                        }
                        this._navigationAnimationRecord = null;
                        this._itemSettledOn();
                    }
                },

                startAnimatedJump: function (index, cancelAnimationCallback, completionCallback) {
                    this._writeProfilerMark("WinJS.UI.FlipView:startAnimatedJump,info");
                    if (this._currentPage.element) {
                        var oldElement = this._currentPage.element;
                        var oldIndex = this._getElementIndex(oldElement);
                        var that = this;

                        return that.jumpToIndex(index).then(function (v) {
                            if (!v) {
                                return null;
                            }
                            that._navigationAnimationRecord = {};
                            that._navigationAnimationRecord.cancelAnimationCallback = cancelAnimationCallback;
                            that._navigationAnimationRecord.completionCallback = completionCallback;
                            that._navigationAnimationRecord.oldCurrentPage = null;
                            that._forEachPage(function (curr) {
                                if (curr.element === oldElement) {
                                    that._navigationAnimationRecord.oldCurrentPage = curr;
                                    return true;
                                }
                            });
                            that._navigationAnimationRecord.newCurrentPage = that._currentPage;
                            if (that._navigationAnimationRecord.newCurrentPage === that._navigationAnimationRecord.oldCurrentPage) {
                                return null;
                            }
                            var newElement = that._currentPage.element;
                            that._navigationAnimationRecord.newCurrentElement = newElement;

                            // When a page element is animated during a jump, it is temporarily appended on a different container during the animation (see _createDiscardablePage).
                            // However, updates in the data source can happen (change, remove, insert, etc) during the animation affecting the element that is being animated.
                            // Therefore, the page object also maintains the elementUniqueID, and the functions that deal with re-building the internal buffer (shifting/remove/etc)
                            // do all the comparissons, based on the page.elementUniqueID that way even if the element of the page is being animated, we are able to restore/discard it
                            // into the internal buffer back in the correct place.
                            that._currentPage.setElement(null, true);
                            that._currentPage.elementUniqueID = uniqueID(newElement);

                            if (that._navigationAnimationRecord.oldCurrentPage) {
                                that._navigationAnimationRecord.oldCurrentPage.setElement(null, true);
                            }

                            var oldFlipPage = that._createDiscardablePage(oldElement),
                                newFlipPage = that._createDiscardablePage(newElement);
                            oldFlipPage.pageRoot.itemIndex = oldIndex;
                            newFlipPage.pageRoot.itemIndex = index;
                            oldFlipPage.pageRoot.style.position = "absolute";
                            newFlipPage.pageRoot.style.position = "absolute";
                            oldFlipPage.pageRoot.style.zIndex = 1;
                            newFlipPage.pageRoot.style.zIndex = 2;
                            that._setItemStart(oldFlipPage, 0);
                            that._setItemStart(newFlipPage, that._itemSize(that._currentPage));
                            that._visibleElements.push(newElement);
                            that._announceElementVisible(newElement);
                            that._navigationAnimationRecord.elementContainers = [oldFlipPage, newFlipPage];
                            that._blockTabs = true;
                            return {
                                oldPage: oldFlipPage,
                                newPage: newFlipPage
                            };
                        });
                    }

                    return Promise.wrap(null);
                },

                simulateMouseWheelScroll: function (ev) {

                    if (this._environmentSupportsTouch || this._waitingForMouseScroll) {
                        return;
                    }

                    var wheelingForward = (ev.deltaX || ev.deltaY) > 0;
                    var targetPage = wheelingForward ? this._currentPage.next : this._currentPage.prev;

                    if (!targetPage.element) {
                        return;
                    }

                    var zoomToContent = { contentX: 0, contentY: 0, viewportX: 0, viewportY: 0 };
                    zoomToContent[this._horizontal ? "contentX" : "contentY"] = this._getItemStart(targetPage);
                    _ElementUtilities._zoomTo(this._panningDivContainer, zoomToContent);
                    this._waitingForMouseScroll = true;

                    // The 100ms is added to the zoom duration to give the snap feeling where the page sticks
                    // while scrolling
                    _Global.setTimeout(function () {
                        this._waitingForMouseScroll = false;
                    }.bind(this), _ElementUtilities._zoomToDuration + 100);
                },

                endAnimatedJump: function (oldCurr, newCurr) {
                    this._writeProfilerMark("WinJS.UI.FlipView:endAnimatedJump,info");
                    if (this._navigationAnimationRecord.oldCurrentPage) {
                        this._navigationAnimationRecord.oldCurrentPage.setElement(oldCurr.element, true);
                    } else {
                        if (oldCurr.element.parentNode) {
                            oldCurr.element.parentNode.removeChild(oldCurr.element);
                        }
                    }
                    this._navigationAnimationRecord.newCurrentPage.setElement(newCurr.element, true);
                    this._navigationAnimationRecord = null;
                    this._ensureCentered();
                    this._itemSettledOn();
                },

                inserted: function (element, prev, next, animateInsertion) {
                    this._writeProfilerMark("WinJS.UI.FlipView:inserted,info");
                    var curr = this._prevMarker,
                        passedCurrent = false,
                        elementSuccessfullyPlaced = false;

                    if (animateInsertion) {
                        this._createAnimationRecord(uniqueID(element), null);
                        this._getAnimationRecord(element).inserted = true;
                    }

                    if (!prev) {
                        if (!next) {
                            this._currentPage.setElement(element);
                        } else {
                            while (curr.next !== this._prevMarker && curr.elementUniqueID !== uniqueID(next)) {
                                if (curr === this._currentPage) {
                                    passedCurrent = true;
                                }
                                curr = curr.next;
                            }

                            if (curr.elementUniqueID === uniqueID(next) && curr !== this._prevMarker) {
                                curr.prev.setElement(element);
                                elementSuccessfullyPlaced = true;
                            } else {
                                this._releaseElementIfNotAnimated(element);
                            }
                        }
                    } else {
                        do {
                            if (curr === this._currentPage) {
                                passedCurrent = true;
                            }
                            if (curr.elementUniqueID === uniqueID(prev)) {
                                elementSuccessfullyPlaced = true;
                                var pageShifted = curr,
                                    lastElementMoved = element,
                                    lastElementMovedUniqueID = uniqueID(element),
                                    temp;
                                if (passedCurrent) {
                                    while (pageShifted.next !== this._prevMarker) {
                                        temp = pageShifted.next.element;
                                        lastElementMovedUniqueID = pageShifted.next.elementUniqueID;
                                        pageShifted.next.setElement(lastElementMoved, true);
                                        if (!lastElementMoved && lastElementMovedUniqueID) {
                                            // Shift the uniqueID of the page manually since its element is being animated.
                                            // This page  will not contain the element until the animation completes.
                                            pageShifted.next.elementUniqueID = lastElementMovedUniqueID;
                                        }
                                        lastElementMoved = temp;
                                        pageShifted = pageShifted.next;
                                    }
                                } else {
                                    if (curr.elementUniqueID === curr.next.elementUniqueID && curr.elementUniqueID) {
                                        pageShifted = curr.next;
                                    }
                                    while (pageShifted.next !== this._prevMarker) {
                                        temp = pageShifted.element;
                                        lastElementMovedUniqueID = pageShifted.elementUniqueID;
                                        pageShifted.setElement(lastElementMoved, true);
                                        if (!lastElementMoved && lastElementMovedUniqueID) {
                                            // Shift the uniqueID of the page manually since its element is being animated.
                                            // This page  will not contain the element until the animation completes.
                                            pageShifted.elementUniqueID = lastElementMovedUniqueID;
                                        }
                                        lastElementMoved = temp;
                                        pageShifted = pageShifted.prev;
                                    }
                                }
                                if (lastElementMoved) {
                                    var reused = false;
                                    this._forEachPage(function (curr) {
                                        if (uniqueID(lastElementMoved) === curr.elementUniqueID) {
                                            reused = true;
                                            return true;
                                        }
                                    });
                                    if (!reused) {
                                        this._releaseElementIfNotAnimated(lastElementMoved);
                                    }
                                }
                                break;
                            }
                            curr = curr.next;
                        } while (curr !== this._prevMarker);
                    }

                    this._getAnimationRecord(element).successfullyMoved = elementSuccessfullyPlaced;
                    this._setButtonStates();
                },

                changed: function (newVal, element) {
                    this._writeProfilerMark("WinJS.UI.FlipView:changed,info");
                    var that = this;
                    this._forEachPage(function (curr) {
                        if (curr.elementUniqueID === uniqueID(element)) {
                            var record = that._animationRecords[curr.elementUniqueID];
                            record.changed = true;
                            record.oldElement = element;
                            record.newElement = newVal;
                            curr.element = newVal; // We set curr's element field here so that next/prev works, but we won't update the visual until endNotifications
                            curr.elementUniqueID = uniqueID(newVal);
                            that._animationRecords[uniqueID(newVal)] = record;
                            return true;
                        }
                    });

                    if (this._navigationAnimationRecord && this._navigationAnimationRecord.elementContainers) {
                        for (var i = 0, len = this._navigationAnimationRecord.elementContainers.length; i < len; i++) {
                            var page = this._navigationAnimationRecord.elementContainers[i];
                            if (page && page.elementUniqueID === uniqueID(element)) {
                                page.element = newVal;
                                page.elementUniqueID = uniqueID(newVal);
                            }
                        }

                        var newElement = this._navigationAnimationRecord.newCurrentElement;
                        if (newElement && uniqueID(newElement) === uniqueID(element)) {
                            this._navigationAnimationRecord.newCurrentElement = newVal;
                        }
                    }
                },

                moved: function (element, prev, next) {
                    this._writeProfilerMark("WinJS.UI.FlipView:moved,info");
                    var record = this._getAnimationRecord(element);

                    if (!record) {
                        record = this._createAnimationRecord(uniqueID(element));
                    }

                    record.moved = true;
                    this.removed(element, false, false);
                    if (prev || next) {
                        this.inserted(element, prev, next, false);
                    } else {
                        record.successfullyMoved = false;
                    }
                },

                removed: function (element, mirage, animateRemoval) {
                    this._writeProfilerMark("WinJS.UI.FlipView:removed,info");
                    var that = this;
                    var prevMarker = this._prevMarker;
                    var work = Promise.wrap();

                    if (mirage) {
                        var clearNext = false;
                        this._forEachPage(function (curr) {
                            if (curr.elementUniqueID === uniqueID(element) || clearNext) {
                                curr.setElement(null, true);
                                clearNext = true;
                            }
                        });
                        this._setButtonStates();
                        return;
                    }

                    if (animateRemoval) {
                        var record = this._getAnimationRecord(element);
                        if (record) {
                            record.removed = true;
                        }
                    }
                    if (this._currentPage.elementUniqueID === uniqueID(element)) {
                        if (this._currentPage.next.elementUniqueID) {
                            this._shiftLeft(this._currentPage);
                            this._ensureCentered();
                        } else if (this._currentPage.prev.elementUniqueID) {
                            this._shiftRight(this._currentPage);
                        } else {
                            this._currentPage.setElement(null, true);
                        }
                    } else if (prevMarker.elementUniqueID === uniqueID(element)) {
                        if (prevMarker.next.element) {
                            work = this._itemsManager._previousItem(prevMarker.next.element).
                                then(function (e) {
                                    if (e === element) {
                                        // Because the VDS and Binding.List can send notifications in 
                                        // different states we accomodate this here by fixing the case 
                                        // where VDS hasn't yet removed an item when it sends a removed
                                        // or moved notification.
                                        //
                                        e = that._itemsManager._previousItem(e);
                                    }
                                    return e;
                                }).
                                then(function (e) {
                                    prevMarker.setElement(e, true);
                                });
                        } else {
                            prevMarker.setElement(null, true);
                        }
                    } else if (prevMarker.prev.elementUniqueID === uniqueID(element)) {
                        if (prevMarker.prev.prev && prevMarker.prev.prev.element) {
                            work = this._itemsManager._nextItem(prevMarker.prev.prev.element).
                                then(function (e) {
                                    if (e === element) {
                                        // Because the VDS and Binding.List can send notifications in 
                                        // different states we accomodate this here by fixing the case 
                                        // where VDS hasn't yet removed an item when it sends a removed
                                        // or moved notification.
                                        //
                                        e = that._itemsManager._nextItem(e);
                                    }
                                    return e;
                                }).
                                then(function (e) {
                                    prevMarker.prev.setElement(e, true);
                                });
                        } else {
                            prevMarker.prev.setElement(null, true);
                        }
                    } else {
                        var curr = this._currentPage.prev,
                            handled = false;
                        while (curr !== prevMarker && !handled) {
                            if (curr.elementUniqueID === uniqueID(element)) {
                                this._shiftRight(curr);
                                handled = true;
                            }

                            curr = curr.prev;
                        }

                        curr = this._currentPage.next;
                        while (curr !== prevMarker && !handled) {
                            if (curr.elementUniqueID === uniqueID(element)) {
                                this._shiftLeft(curr);
                                handled = true;
                            }

                            curr = curr.next;
                        }
                    }

                    return work.then(function () {
                        that._setButtonStates();
                    });
                },

                reload: function () {
                    this._writeProfilerMark("WinJS.UI.FlipView:reload,info");
                    this.resetState(0);
                },

                getItemSpacing: function () {
                    return this._itemSpacing;
                },

                setItemSpacing: function (space) {
                    this._itemSpacing = space;
                    this._ensureCentered();
                },

                notificationsStarted: function () {
                    this._writeProfilerMark("WinJS.UI.FlipView:changeNotifications,StartTM");
                    this._logBuffer();
                    this._notificationsStarted = this._notificationsStarted || 0;
                    this._notificationsStarted++;
                    // _notificationsEndedSignal is also used in the FlipView unit tests for coordination in the datasource tests
                    this._notificationsEndedSignal = new _Signal();
                    this._temporaryKeys = [];
                    this._animationRecords = {};
                    var that = this;
                    this._forEachPage(function (curr) {
                        that._createAnimationRecord(curr.elementUniqueID, curr);
                    });

                    // Since the current item is defined as the left-most item in the view, the only possible elements that can be in view at any time are
                    // the current item and the item proceeding it. We'll save these two elements for animations during the notificationsEnded cycle
                    this._animationRecords.currentPage = this._currentPage.element;
                    this._animationRecords.nextPage = this._currentPage.next.element;
                },

                notificationsEnded: function () {
                    // The animations are broken down into three parts.
                    // First, we move everything back to where it was before the changes happened. Elements that were inserted between two pages won't have their flip pages moved.
                    // Next, we figure out what happened to the two elements that used to be in view. If they were removed/moved, they get animated as appropriate in this order:
                    // removed, moved
                    // Finally, we figure out how the items that are now in view got there, and animate them as necessary, in this order: moved, inserted.
                    // The moved animation of the last part is joined with the moved animation of the previous part, so in the end it is:
                    // removed -> moved items in view + moved items not in view -> inserted.
                    var that = this;
                    this._endNotificationsWork && this._endNotificationsWork.cancel();
                    this._endNotificationsWork = this._ensureBufferConsistency().then(function () {
                        var animationPromises = [];
                        that._forEachPage(function (curr) {
                            var record = that._getAnimationRecord(curr.element);
                            if (record) {
                                if (record.changed) {
                                    record.oldElement.removedFromChange = true;
                                    animationPromises.push(that._changeFlipPage(curr, record.oldElement, record.newElement));
                                }
                                record.newLocation = curr.location;
                                that._setItemStart(curr, record.originalLocation);
                                if (record.inserted) {
                                    curr.elementRoot.style.opacity = 0.0;
                                }
                            }
                        });

                        function flipPageFromElement(element) {
                            var flipPage = null;
                            that._forEachPage(function (curr) {
                                if (curr.element === element) {
                                    flipPage = curr;
                                    return true;
                                }
                            });
                            return flipPage;
                        }

                        function animateOldViewportItemRemoved(record, item) {
                            that._writeProfilerMark("WinJS.UI.FlipView:_animateOldViewportItemRemoved,info");
                            var removedPage = that._createDiscardablePage(item);
                            that._setItemStart(removedPage, record.originalLocation);
                            animationPromises.push(that._deleteFlipPage(removedPage));
                        }

                        function animateOldViewportItemMoved(record, item) {
                            that._writeProfilerMark("WinJS.UI.FlipView:_animateOldViewportItemMoved,info");
                            var newLocation = record.originalLocation,
                                movedPage;
                            if (!record.successfullyMoved) {
                                // If the old visible item got moved, but the next/prev of that item don't match up with anything
                                // currently in our flip page buffer, we need to figure out in which direction it moved.
                                // The exact location doesn't matter since we'll be deleting it anyways, but we do need to
                                // animate it going in the right direction.
                                movedPage = that._createDiscardablePage(item);
                                var indexMovedTo = that._getElementIndex(item);
                                var newCurrentIndex = (that._currentPage.element ? that._getElementIndex(that._currentPage.element) : 0);
                                newLocation += (newCurrentIndex > indexMovedTo ? -100 * that._bufferSize : 100 * that._bufferSize);
                            } else {
                                movedPage = flipPageFromElement(item);
                                newLocation = record.newLocation;
                            }
                            if (movedPage) {
                                that._setItemStart(movedPage, record.originalLocation);
                                animationPromises.push(that._moveFlipPage(movedPage, function () {
                                    that._setItemStart(movedPage, newLocation);
                                }));
                            }
                        }

                        var oldCurrent = that._animationRecords.currentPage,
                            oldCurrentRecord = that._getAnimationRecord(oldCurrent),
                            oldNext = that._animationRecords.nextPage,
                            oldNextRecord = that._getAnimationRecord(oldNext);
                        if (oldCurrentRecord && oldCurrentRecord.changed) {
                            oldCurrent = oldCurrentRecord.newElement;
                        }
                        if (oldNextRecord && oldNextRecord.changed) {
                            oldNext = oldNextRecord.newElement;
                        }

                        if (oldCurrent !== that._currentPage.element || oldNext !== that._currentPage.next.element) {
                            if (oldCurrentRecord && oldCurrentRecord.removed) {
                                animateOldViewportItemRemoved(oldCurrentRecord, oldCurrent);
                            }
                            if (oldNextRecord && oldNextRecord.removed) {
                                animateOldViewportItemRemoved(oldNextRecord, oldNext);
                            }
                        }

                        function joinAnimationPromises() {
                            if (animationPromises.length === 0) {
                                animationPromises.push(Promise.wrap());
                            }

                            return Promise.join(animationPromises);
                        }
                        that._blockTabs = true;
                        joinAnimationPromises().then(function () {
                            animationPromises = [];
                            if (oldCurrentRecord && oldCurrentRecord.moved) {
                                animateOldViewportItemMoved(oldCurrentRecord, oldCurrent);
                            }
                            if (oldNextRecord && oldNextRecord.moved) {
                                animateOldViewportItemMoved(oldNextRecord, oldNext);
                            }
                            var newCurrRecord = that._getAnimationRecord(that._currentPage.element),
                                newNextRecord = that._getAnimationRecord(that._currentPage.next.element);
                            that._forEachPage(function (curr) {
                                var record = that._getAnimationRecord(curr.element);
                                if (record) {
                                    if (!record.inserted) {
                                        if (record.originalLocation !== record.newLocation) {
                                            if ((record !== oldCurrentRecord && record !== oldNextRecord) ||
                                                (record === oldCurrentRecord && !oldCurrentRecord.moved) ||
                                                (record === oldNextRecord && !oldNextRecord.moved)) {
                                                animationPromises.push(that._moveFlipPage(curr, function () {
                                                    that._setItemStart(curr, record.newLocation);
                                                }));
                                            }
                                        }
                                    } else if (record !== newCurrRecord && record !== newNextRecord) {
                                        curr.elementRoot.style.opacity = 1.0;
                                    }
                                }
                            });
                            joinAnimationPromises().then(function () {
                                animationPromises = [];
                                if (newCurrRecord && newCurrRecord.inserted) {
                                    animationPromises.push(that._insertFlipPage(that._currentPage));
                                }
                                if (newNextRecord && newNextRecord.inserted) {
                                    animationPromises.push(that._insertFlipPage(that._currentPage.next));
                                }
                                joinAnimationPromises().then(function () {
                                    that._checkElementVisibility(false);
                                    that._itemSettledOn();
                                    that._setListEnds();
                                    that._notificationsStarted--;
                                    if (that._notificationsStarted === 0) {
                                        that._notificationsEndedSignal.complete();
                                    }
                                    that._writeProfilerMark("WinJS.UI.FlipView:changeNotifications,StopTM");
                                    that._logBuffer();
                                    that._endNotificationsWork = null;
                                });
                            });
                        });
                    });
                },

                // Private methods

                _timeoutPageSelection: function () {
                    var that = this;
                    if (this._lastTimeoutRequest) {
                        this._lastTimeoutRequest.cancel();
                    }
                    this._lastTimeoutRequest = Promise.timeout(itemSelectedEventDelay).then(function () {
                        that._itemSettledOn();
                    });
                },

                _updateTabIndex: function (newIndex) {
                    this._forEachPage(function (curr) {
                        if (curr.element) {
                            curr.element.tabIndex = newIndex;
                        }
                    });
                    this._tabIndex = newIndex;
                    this._tabManager.tabIndex = newIndex;
                },

                _releaseElementIfNotAnimated: function (element) {
                    var animatedRecord = this._getAnimationRecord(element);
                    if (!(animatedRecord && (animatedRecord.changed || animatedRecord.inserted || animatedRecord.moved || animatedRecord.removed))) {
                        this._itemsManager.releaseItem(element);
                    }
                },

                _getAnimationRecord: function (element) {
                    return (element ? this._animationRecords[uniqueID(element)] : null);
                },

                _createAnimationRecord: function (elementUniqueID, flipPage) {
                    if (elementUniqueID) {
                        var record = this._animationRecords[elementUniqueID] = {
                            removed: false,
                            changed: false,
                            inserted: false
                        };

                        if (flipPage) {
                            record.originalLocation = flipPage.location;
                        }

                        return record;
                    }
                },

                _writeProfilerMark: function (message) {
                    _WriteProfilerMark(message);
                    if (this._flipperDiv.winControl.constructor._enabledDebug) {
                        _Log.log && _Log.log(message, null, "flipviewdebug");
                    }
                },

                _getElementIndex: function (element) {
                    var index = 0;
                    try {
                        index = this._itemsManager.itemObject(element).index;
                    }
                    catch (e) {
                        // Failures are expected in cases where items are moved and then deleted. Animations will simply animate as if the item
                        // moved to the beginning of the list.
                    }
                    return index;
                },

                _resetBuffer: function (elementToSave, skipReleases) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_resetBuffer,info");
                    var head = this._currentPage,
                        curr = head;
                    do {
                        if ((curr.element && curr.element === elementToSave) || skipReleases) {
                            curr.setElement(null, true);
                        } else {
                            curr.setElement(null);
                        }
                        curr = curr.next;
                    } while (curr !== head);
                },

                _getHeadOfBuffer: function () {
                    return this._prevMarker.prev;
                },

                _getTailOfBuffer: function () {
                    return this._prevMarker;
                },

                _insertNewFlipPage: function (prevElement) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_insertNewFlipPage,info");
                    var newPage = this._createFlipPage(prevElement, this);
                    this._panningDiv.appendChild(newPage.pageRoot);
                    return newPage;
                },

                _fetchNextItems: function () {
                    this._writeProfilerMark("WinJS.UI.FlipView:_fetchNextItems,info");
                    var tail = Promise.wrap(this._currentPage);
                    var that = this;

                    for (var i = 0; i < this._bufferSize; i++) {
                        tail = tail.then(function (curr) {
                            if (curr.next === that._prevMarker) {
                                that._insertNewFlipPage(curr);
                            }
                            if (curr.element) {
                                return that._itemsManager._nextItem(curr.element).
                                    then(function (element) {
                                        curr.next.setElement(element);
                                        return curr.next;
                                    });
                            } else {
                                curr.next.setElement(null);
                                return curr.next;
                            }
                        });
                    }

                    return tail;
                },

                _fetchOneNext: function (target) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_fetchOneNext,info");
                    var prevElement = target.prev.element;
                    // If the target we want to fill with the next item is the end of the circular buffer but we want to keep everything in memory, we've got to increase the buffer size
                    // so that we don't reuse prevMarker.
                    if (this._prevMarker === target) {
                        this._prevMarker = this._prevMarker.next;
                    }
                    if (!prevElement) {
                        target.setElement(null);
                        return;
                    }
                    var that = this;
                    return this._itemsManager._nextItem(prevElement).
                        then(function (element) {
                            target.setElement(element);
                            that._movePageAhead(target.prev, target);
                        });
                },

                _fetchPreviousItems: function (setPrevMarker) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_fetchPreviousItems,info");
                    var that = this;

                    var tail = Promise.wrap(this._currentPage);

                    for (var i = 0; i < this._bufferSize; i++) {
                        tail = tail.then(function (curr) {
                            if (curr.element) {
                                return that._itemsManager._previousItem(curr.element).
                                    then(function (element) {
                                        curr.prev.setElement(element);
                                        return curr.prev;
                                    });
                            } else {
                                curr.prev.setElement(null);
                                return curr.prev;
                            }
                        });
                    }

                    return tail.then(function (curr) {
                        if (setPrevMarker) {
                            that._prevMarker = curr;
                        }
                    });
                },

                _fetchOnePrevious: function (target) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_fetchOnePrevious,info");
                    var nextElement = target.next.element;

                    // If the target we want to fill with the previous item is the end of the circular buffer but we want to keep everything in memory, we've got to increase the buffer size
                    // so that we don't reuse prevMarker. We'll add a new element to be prevMarker's prev, then set prevMarker to point to that new element.
                    if (this._prevMarker === target.next) {
                        this._prevMarker = this._prevMarker.prev;
                    }
                    if (!nextElement) {
                        target.setElement(null);
                        return Promise.wrap();
                    }
                    var that = this;
                    return this._itemsManager._previousItem(nextElement).
                        then(function (element) {
                            target.setElement(element);
                            that._movePageBehind(target.next, target);
                        });
                },

                _setButtonStates: function () {
                    if (this._currentPage.prev.element) {
                        this._buttonVisibilityHandler.showPreviousButton();
                    } else {
                        this._buttonVisibilityHandler.hidePreviousButton();
                    }

                    if (this._currentPage.next.element) {
                        this._buttonVisibilityHandler.showNextButton();
                    } else {
                        this._buttonVisibilityHandler.hideNextButton();
                    }
                },

                _ensureCentered: function (delayBoundariesSet) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_ensureCentered,info");
                    this._setItemStart(this._currentPage, leftBufferAmount * this._viewportSize());
                    var curr = this._currentPage;
                    while (curr !== this._prevMarker) {
                        this._movePageBehind(curr, curr.prev);
                        curr = curr.prev;
                    }

                    curr = this._currentPage;
                    while (curr.next !== this._prevMarker) {
                        this._movePageAhead(curr, curr.next);
                        curr = curr.next;
                    }
                    var boundariesSet = false;
                    if (this._lastScrollPos && !delayBoundariesSet) {
                        this._setListEnds();
                        boundariesSet = true;
                    }
                    this._lastScrollPos = this._getItemStart(this._currentPage);
                    this._setViewportStart(this._lastScrollPos);
                    this._checkElementVisibility(true);
                    this._setupSnapPoints();
                    if (!boundariesSet) {
                        this._setListEnds();
                    }
                },

                _ensureBufferConsistency: function () {
                    var that = this;
                    var currentElement = this._currentPage.element;
                    if (!currentElement) {
                        return Promise.wrap();
                    }

                    var refreshBuffer = false;
                    var seenUniqueIDs = {};
                    var seenLocations = {};
                    this._forEachPage(function (page) {
                        if (page && page.elementUniqueID) {
                            if (!seenUniqueIDs[page.elementUniqueID]) {
                                seenUniqueIDs[page.elementUniqueID] = true;
                            } else {
                                refreshBuffer = true;
                                return true;
                            }

                            if (page.location > 0) {
                                if (!seenLocations[page.location]) {
                                    seenLocations[page.location] = true;
                                } else {
                                    refreshBuffer = true;
                                    return true;
                                }
                            }
                        }
                    });

                    var animationKeys = Object.keys(this._animationRecords);
                    animationKeys.forEach(function (key) {
                        var record = that._animationRecords[key];
                        if (record && (record.changed || record.inserted || record.moved || record.removed)) {
                            refreshBuffer = true;
                        }
                    });

                    if (refreshBuffer) {
                        this._resetBuffer(null, true);
                        this._currentPage.setElement(currentElement);
                        return this._fetchNextItems().
                            then(function () {
                                return that._fetchPreviousItems(true);
                            }).
                            then(function () {
                                that._ensureCentered();
                            });
                    } else {
                        return Promise.wrap();
                    }
                },

                _shiftLeft: function (startingPoint) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_shiftLeft,info");
                    var curr = startingPoint,
                        nextEl = null;
                    while (curr !== this._prevMarker && curr.next !== this._prevMarker) {
                        nextEl = curr.next.element;
                        if (!nextEl && curr.next.elementUniqueID) {
                            // Shift the uniqueID of the page manually since its element is being animated.
                            // This page  will not contain the element until the animation completes.
                            curr.elementUniqueID = curr.next.elementUniqueID;
                        }
                        curr.next.setElement(null, true);
                        curr.setElement(nextEl, true);
                        curr = curr.next;
                    }
                    if (curr !== this._prevMarker && curr.prev.element) {
                        var that = this;
                        return this._itemsManager._nextItem(curr.prev.element).
                            then(function (element) {
                                curr.setElement(element);
                                that._createAnimationRecord(curr.elementUniqueID, curr);
                            });
                    }
                },

                _logBuffer: function () {
                    if (this._flipperDiv.winControl.constructor._enabledDebug) {
                        _Log.log && _Log.log(this._currentPage.next.next.next.elementUniqueID + "\t@:" + this._currentPage.next.next.next.location + (this._currentPage.next.next.next.element ? ("\t" + this._currentPage.next.next.next.element.textContent) : ""), null, "flipviewdebug");
                        _Log.log && _Log.log(this._currentPage.next.next.next.next.elementUniqueID + "\t@:" + this._currentPage.next.next.next.next.location + (this._currentPage.next.next.next.next.element ? ("\t" + this._currentPage.next.next.next.next.element.textContent) : ""), null, "flipviewdebug");
                        _Log.log && _Log.log("> " + this._currentPage.elementUniqueID + "\t@:" + this._currentPage.location + (this._currentPage.element ? ("\t" + this._currentPage.element.textContent) : ""), null, "flipviewdebug");
                        _Log.log && _Log.log(this._currentPage.next.elementUniqueID + "\t@:" + this._currentPage.next.location + (this._currentPage.next.element ? ("\t" + this._currentPage.next.element.textContent) : ""), null, "flipviewdebug");
                        _Log.log && _Log.log(this._currentPage.next.next.elementUniqueID + "\t@:" + this._currentPage.next.next.location + (this._currentPage.next.next.element ? ("\t" + this._currentPage.next.next.element.textContent) : ""), null, "flipviewdebug");

                        var keys = Object.keys(this._itemsManager._elementMap);
                        var bufferKeys = [];
                        this._forEachPage(function (page) {
                            if (page && page.elementUniqueID) {
                                bufferKeys.push(page.elementUniqueID);
                            }
                        });
                        _Log.log && _Log.log("itemsmanager  = [" + keys.join(" ") + "] flipview [" + bufferKeys.join(" ") + "]", null, "flipviewdebug");
                    }
                },

                _shiftRight: function (startingPoint) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_shiftRight,info");
                    var curr = startingPoint,
                        prevEl = null;
                    while (curr !== this._prevMarker) {
                        prevEl = curr.prev.element;
                        if (!prevEl && curr.prev.elementUniqueID) {
                            // Shift the uniqueID of the page manually since its element is being animated.
                            // This page  will not contain the element until the animation completes.
                            curr.elementUniqueID = curr.prev.elementUniqueID;
                        }
                        curr.prev.setElement(null, true);
                        curr.setElement(prevEl, true);
                        curr = curr.prev;
                    }
                    if (curr.next.element) {
                        var that = this;
                        return this._itemsManager._previousItem(curr.next.element).
                            then(function (element) {
                                curr.setElement(element);
                                that._createAnimationRecord(curr.elementUniqueID, curr);
                            });
                    }
                },

                _checkElementVisibility: function (viewWasReset) {
                    var i,
                        len;
                    if (viewWasReset) {
                        var currentElement = this._currentPage.element;
                        for (i = 0, len = this._visibleElements.length; i < len; i++) {
                            if (this._visibleElements[i] !== currentElement) {
                                this._announceElementInvisible(this._visibleElements[i]);
                            }
                        }

                        this._visibleElements = [];
                        if (currentElement) {
                            this._visibleElements.push(currentElement);
                            this._announceElementVisible(currentElement);
                        }
                    } else {
                        // Elements that have been removed completely from the flipper still need to raise pageVisibilityChangedEvents if they were visible prior to being removed,
                        // so before going through all the elements we go through the ones that we knew were visible and see if they're missing a parentNode. If they are,
                        // the elements were removed and we announce them as invisible.
                        for (i = 0, len = this._visibleElements.length; i < len; i++) {
                            if (!this._visibleElements[i].parentNode || this._visibleElements[i].removedFromChange) {
                                this._announceElementInvisible(this._visibleElements[i]);
                            }
                        }
                        this._visibleElements = [];
                        var that = this;
                        this._forEachPage(function (curr) {
                            var element = curr.element;
                            if (element) {
                                if (that._itemInView(curr)) {
                                    that._visibleElements.push(element);
                                    that._announceElementVisible(element);
                                } else {
                                    that._announceElementInvisible(element);
                                }
                            }
                        });
                    }
                },

                _announceElementVisible: function (element) {
                    if (element && !element.visible) {
                        element.visible = true;

                        var event = _Global.document.createEvent("CustomEvent");
                        this._writeProfilerMark("WinJS.UI.FlipView:pageVisibilityChangedEvent(visible:true),info");
                        event.initCustomEvent(_Constants.pageVisibilityChangedEvent, true, false, { source: this._flipperDiv, visible: true });

                        element.dispatchEvent(event);
                    }
                },

                _announceElementInvisible: function (element) {
                    if (element && element.visible) {
                        element.visible = false;

                        // Elements that have been removed from the flipper still need to fire invisible events, but they can't do that without being in the DOM.
                        // To fix that, we add the element back into the flipper, fire the event, then remove it.
                        var addedToDomForEvent = false;
                        if (!element.parentNode) {
                            addedToDomForEvent = true;
                            this._panningDivContainer.appendChild(element);
                        }

                        var event = _Global.document.createEvent("CustomEvent");
                        this._writeProfilerMark("WinJS.UI.FlipView:pageVisibilityChangedEvent(visible:false),info");
                        event.initCustomEvent(_Constants.pageVisibilityChangedEvent, true, false, { source: this._flipperDiv, visible: false });

                        element.dispatchEvent(event);
                        if (addedToDomForEvent) {
                            this._panningDivContainer.removeChild(element);
                        }
                    }
                },

                _createDiscardablePage: function (content) {
                    var pageDivs = this._createPageContainer(),
                        page = {
                            pageRoot: pageDivs.root,
                            elementRoot: pageDivs.elementContainer,
                            discardable: true,
                            element: content,
                            elementUniqueID: uniqueID(content),
                            discard: function () {
                                if (page.pageRoot.parentNode) {
                                    page.pageRoot.parentNode.removeChild(page.pageRoot);
                                }
                                if (page.element.parentNode) {
                                    page.element.parentNode.removeChild(page.element);
                                }
                            }
                        };
                    page.pageRoot.style.top = "0px";
                    page.elementRoot.appendChild(content);
                    this._panningDiv.appendChild(page.pageRoot);
                    return page;
                },

                _createPageContainer: function () {
                    var width = this._panningDivContainerOffsetWidth,
                        height = this._panningDivContainerOffsetHeight,
                        parentDiv = _Global.document.createElement("div"),
                        pageStyle = parentDiv.style,
                        flexBox = _Global.document.createElement("div");
                    flexBox.className = "win-item";
                    pageStyle.position = "absolute";
                    pageStyle.overflow = "hidden";
                    pageStyle.width = width + "px";
                    pageStyle.height = height + "px";

                    parentDiv.appendChild(flexBox);
                    return {
                        root: parentDiv,
                        elementContainer: flexBox
                    };
                },

                _createFlipPage: function (prev, manager) {
                    var page = {};
                    page.element = null;
                    page.elementUniqueID = null;

                    // The flip pages are managed as a circular doubly-linked list. this.currentItem should always refer to the current item in view, and this._prevMarker marks the point 
                    // in the list where the last previous item is stored. Why a circular linked list?
                    // The virtualized flipper reuses its flip pages. When a new item is requested, the flipper needs to reuse an old item from the buffer. In the case of previous items,
                    // the flipper has to go all the way back to the farthest next item in the buffer and recycle it (which is why having a .prev pointer on the farthest previous item is really useful),
                    // and in the case of the next-most item, it needs to recycle next's next (ie, the this._prevMarker). The linked structure comes in really handy when iterating through the list
                    // and separating out prev items from next items (like removed and ensureCentered do). If we were to use a structure like an array it would be pretty messy to do that and still
                    // maintain a buffer of recyclable items.
                    if (!prev) {
                        page.next = page;
                        page.prev = page;
                    } else {
                        page.prev = prev;
                        page.next = prev.next;
                        page.next.prev = page;
                        prev.next = page;
                    }
                    var pageContainer = this._createPageContainer();
                    page.elementRoot = pageContainer.elementContainer;
                    page.elementRoot.style["msOverflowStyle"] = "auto";
                    page.pageRoot = pageContainer.root;

                    // Sets the element to display in this flip page
                    page.setElement = function (element, isReplacement) {
                        if (element === undefined) {
                            element = null;
                        }
                        if (element === page.element) {
                            if (!element) {
                                // If there are data source updates during the animation (e.g. item removed), a page element can be set to null when the shiftLeft/Right functions
                                // call this function with a null element. However, since the element in the page is in the middle of an animation its page.elementUniqueID
                                // is still set, so we need to explicitly clear its value so that when the animation completes, the animated element is not 
                                // restored back into the internal buffer.
                                page.elementUniqueID = null;
                            }
                            return;
                        }
                        if (page.element) {
                            if (!isReplacement) {
                                manager._itemsManager.releaseItem(page.element);
                                _Dispose._disposeElement(page.element);
                            }
                        }
                        page.element = element;
                        page.elementUniqueID = (element ? uniqueID(element) : null);
                        _ElementUtilities.empty(page.elementRoot);

                        if (page.element) {
                            if (page === manager._currentPage) {
                                manager._tabManager.childFocus = element;
                            }
                            if (!isFlipper(page.element)) {
                                page.element.tabIndex = manager._tabIndex;
                                page.element.setAttribute("role", "option");
                                page.element.setAttribute("aria-selected", false);
                                if (!page.element.id) {
                                    page.element.id = uniqueID(page.element);
                                }

                                var setFlowAttribute = function (source, target, attributeName) {
                                    source.setAttribute(attributeName, target.id);
                                };

                                var isEnd = !page.next.element || page === manager._prevMarker.prev;
                                if (isEnd) {
                                    setFlowAttribute(page.element, manager._bufferAriaEndMarker, "aria-flowto");
                                    setFlowAttribute(manager._bufferAriaEndMarker, page.element, "x-ms-aria-flowfrom");
                                }

                                if (page !== manager._prevMarker && page.prev.element) {
                                    setFlowAttribute(page.prev.element, page.element, "aria-flowto");
                                    setFlowAttribute(page.element, page.prev.element, "x-ms-aria-flowfrom");
                                }
                                if (page.next !== manager._prevMarker && page.next.element) {
                                    setFlowAttribute(page.element, page.next.element, "aria-flowto");
                                    setFlowAttribute(page.next.element, page.element, "x-ms-aria-flowfrom");
                                }

                                if (!page.prev.element) {
                                    setFlowAttribute(page.element, manager._bufferAriaStartMarker, "x-ms-aria-flowfrom");
                                    // aria-flowto in the start marker is configured in itemSettledOn to point to the current page in view
                                }
                            }
                            page.elementRoot.appendChild(page.element);
                        }
                    };

                    return page;
                },

                _itemInView: function (flipPage) {
                    return this._itemEnd(flipPage) > this._getViewportStart() && this._getItemStart(flipPage) < this._viewportEnd();
                },

                _getViewportStart: function () {
                    if (!this._panningDivContainer.parentNode) {
                        return;
                    }
                    if (this._isHorizontal) {
                        return _ElementUtilities.getScrollPosition(this._panningDivContainer).scrollLeft;
                    } else {
                        return _ElementUtilities.getScrollPosition(this._panningDivContainer).scrollTop;
                    }
                },

                _setViewportStart: function (newValue) {
                    if (!this._panningDivContainer.parentNode) {
                        return;
                    }
                    if (this._isHorizontal) {
                        _ElementUtilities.setScrollPosition(this._panningDivContainer, { scrollLeft: newValue });
                    } else {
                        _ElementUtilities.setScrollPosition(this._panningDivContainer, { scrollTop: newValue });
                    }
                },

                _viewportEnd: function () {
                    var element = this._panningDivContainer;
                    if (this._isHorizontal) {
                        if (this._rtl) {
                            return this._getViewportStart() + this._panningDivContainerOffsetWidth;
                        } else {
                            return _ElementUtilities.getScrollPosition(element).scrollLeft + this._panningDivContainerOffsetWidth;
                        }
                    } else {
                        return element.scrollTop + this._panningDivContainerOffsetHeight;
                    }
                },

                _viewportSize: function () {
                    return this._isHorizontal ? this._panningDivContainerOffsetWidth : this._panningDivContainerOffsetHeight;
                },

                _getItemStart: function (flipPage) {
                    return flipPage.location;
                },

                _setItemStart: function (flipPage, newValue) {

                    if (this._isHorizontal) {
                        flipPage.pageRoot.style.left = (this._rtl ? -newValue : newValue) + "px";
                    } else {
                        flipPage.pageRoot.style.top = newValue + "px";
                    }
                    flipPage.location = newValue;
                },

                _itemEnd: function (flipPage) {
                    return (this._isHorizontal ? flipPage.location + this._panningDivContainerOffsetWidth : flipPage.location + this._panningDivContainerOffsetHeight) + this._itemSpacing;
                },

                _itemSize: function () {
                    return this._isHorizontal ? this._panningDivContainerOffsetWidth : this._panningDivContainerOffsetHeight;
                },

                _movePageAhead: function (referencePage, pageToPlace) {
                    var delta = this._itemSize(referencePage) + this._itemSpacing;
                    this._setItemStart(pageToPlace, this._getItemStart(referencePage) + delta);
                },

                _movePageBehind: function (referencePage, pageToPlace) {
                    var delta = this._itemSize(referencePage) + this._itemSpacing;
                    this._setItemStart(pageToPlace, this._getItemStart(referencePage) - delta);
                },

                _setupSnapPoints: function () {
                    if (!this._environmentSupportsTouch) {
                        return;
                    }
                    var containerStyle = this._panningDivContainer.style;
                    containerStyle[styleEquivalents["scroll-snap-type"].scriptName] = "mandatory";
                    var viewportSize = this._viewportSize();
                    var snapInterval = viewportSize + this._itemSpacing;
                    var propertyName = "scroll-snap-points";
                    var startSnap = 0;
                    var currPos = this._getItemStart(this._currentPage);
                    startSnap = currPos % (viewportSize + this._itemSpacing);
                    containerStyle[styleEquivalents[(this._isHorizontal ? propertyName + "-x" : propertyName + "-y")].scriptName] = "snapInterval(" + startSnap + "px, " + snapInterval + "px)";
                },

                _setListEnds: function () {
                    if (!this._environmentSupportsTouch) {
                        return;
                    }

                    if (this._currentPage.element) {
                        var containerStyle = this._panningDivContainer.style,
                            startScroll = 0,
                            endScroll = 0,
                            startNonEmptyPage = this._getTailOfBuffer(),
                            endNonEmptyPage = this._getHeadOfBuffer(),
                            startBoundaryStyle = styleEquivalents["scroll-limit-" + (this._isHorizontal ? "x-min" : "y-min")].scriptName,
                            endBoundaryStyle = styleEquivalents["scroll-limit-" + (this._isHorizontal ? "x-max" : "y-max")].scriptName;

                        while (!endNonEmptyPage.element) {
                            endNonEmptyPage = endNonEmptyPage.prev;

                            // We started at the item before prevMarker (going backwards), so we will exit if all
                            // the pages in the buffer are empty.
                            if (endNonEmptyPage === this._prevMarker.prev) {
                                break;
                            }
                        }

                        while (!startNonEmptyPage.element) {
                            startNonEmptyPage = startNonEmptyPage.next;

                            // We started at prevMarker (going forward), so we will exit if all the pages in the
                            // buffer are empty.
                            if (startNonEmptyPage === this._prevMarker) {
                                break;
                            }
                        }

                        endScroll = this._getItemStart(endNonEmptyPage);
                        startScroll = this._getItemStart(startNonEmptyPage);
                        containerStyle[startBoundaryStyle] = startScroll + "px";
                        containerStyle[endBoundaryStyle] = endScroll + "px";
                    }
                },

                _viewportOnItemStart: function () {
                    return this._getItemStart(this._currentPage) === this._getViewportStart();
                },

                _restoreAnimatedElement: function (oldPage, discardablePage) {
                    var removed = true;
                    // Restore the element in the old page only if it still matches the uniqueID, and the page
                    // does not have new updated content. If the element was removed, it won't be restore in the
                    // old page.
                    if (oldPage.elementUniqueID === uniqueID(discardablePage.element) && !oldPage.element) {
                        oldPage.setElement(discardablePage.element, true);
                        removed = false;
                    } else {
                        // Iterate through the pages to see if the element was moved
                        this._forEachPage(function (curr) {
                            if (curr.elementUniqueID === discardablePage.elementUniqueID && !curr.element) {
                                curr.setElement(discardablePage.element, true);
                                removed = false;
                            }
                        });
                    }
                    return removed;
                },

                _itemSettledOn: function () {
                    if (this._lastTimeoutRequest) {
                        this._lastTimeoutRequest.cancel();
                        this._lastTimeoutRequest = null;
                    }

                    var that = this;
                    // Need to yield to the host here
                    _BaseUtils._setImmediate(function () {
                        if (that._viewportOnItemStart()) {
                            that._blockTabs = false;
                            if (that._currentPage.element) {
                                if (that._hasFocus) {
                                    _ElementUtilities._setActive(that._currentPage.element);
                                    that._tabManager.childFocus = that._currentPage.element;
                                }
                                if (that._lastSelectedElement !== that._currentPage.element) {
                                    if (that._lastSelectedPage && that._lastSelectedPage.element && !isFlipper(that._lastSelectedPage.element)) {
                                        that._lastSelectedPage.element.setAttribute("aria-selected", false);
                                    }
                                    that._lastSelectedPage = that._currentPage;
                                    that._lastSelectedElement = that._currentPage.element;
                                    if (!isFlipper(that._currentPage.element)) {
                                        that._currentPage.element.setAttribute("aria-selected", true);
                                    }

                                    // Need to schedule this:
                                    // - to be able to register for the pageselected event after instantiating the control and still get the event
                                    // - in case a FlipView navigation is triggered inside the pageselected listener (avoid reentering _itemSettledOn)
                                    Scheduler.schedule(function FlipView_dispatchPageSelectedEvent() {
                                        if (that._currentPage.element) {
                                            var event = _Global.document.createEvent("CustomEvent");
                                            event.initCustomEvent(_Constants.pageSelectedEvent, true, false, { source: that._flipperDiv });
                                            that._writeProfilerMark("WinJS.UI.FlipView:pageSelectedEvent,info");
                                            that._currentPage.element.dispatchEvent(event);

                                            // Fire the pagecompleted event when the render completes if we are still looking  at the same element.
                                            // Check that the current element is not null, since the app could've triggered a navigation inside the 
                                            // pageselected event handler.
                                            var originalElement = that._currentPage.element;
                                            if (originalElement) {
                                                var record = that._itemsManager._recordFromElement(originalElement, true);
                                                if (record) {
                                                    record.renderComplete.then(function () {
                                                        if (originalElement === that._currentPage.element) {
                                                            that._currentPage.element.setAttribute("aria-setsize", that._cachedSize);
                                                            that._currentPage.element.setAttribute("aria-posinset", that.currentIndex() + 1);
                                                            that._bufferAriaStartMarker.setAttribute("aria-flowto", that._currentPage.element.id);
                                                            event = _Global.document.createEvent("CustomEvent");
                                                            event.initCustomEvent(_Constants.pageCompletedEvent, true, false, { source: that._flipperDiv });
                                                            that._writeProfilerMark("WinJS.UI.FlipView:pageCompletedEvent,info");
                                                            that._currentPage.element.dispatchEvent(event);
                                                        }
                                                    });
                                                }
                                            }
                                        }
                                    }, Scheduler.Priority.normal, null, "WinJS.UI.FlipView._dispatchPageSelectedEvent");
                                }
                            }
                        }
                    });
                },

                _forEachPage: function (callback) {
                    var curr = this._prevMarker;
                    do {
                        if (callback(curr)) {
                            break;
                        }
                        curr = curr.next;
                    } while (curr !== this._prevMarker);
                },

                _changeFlipPage: function (page, oldElement, newElement) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_changeFlipPage,info");
                    page.element = null;
                    if (page.setElement) {
                        page.setElement(newElement, true);
                    } else {
                        // Discardable pages that are created for animations aren't full fleged pages, and won't have some of the functions a normal page would.
                        // changeFlipPage will be called on them when an item that's animating gets fetched. When that happens, we need to replace its element
                        // manually, then center it.
                        oldElement.parentNode.removeChild(oldElement);
                        page.elementRoot.appendChild(newElement);
                    }

                    var style = oldElement.style;
                    style.position = "absolute";
                    style.left = "0px";
                    style.top = "0px";
                    style.opacity = 1.0;

                    page.pageRoot.appendChild(oldElement);
                    oldElement.style.left = Math.max(0, (page.pageRoot.offsetWidth - oldElement.offsetWidth) / 2) + "px";
                    oldElement.style.top = Math.max(0, (page.pageRoot.offsetHeight - oldElement.offsetHeight) / 2) + "px";

                    return Animations.fadeOut(oldElement).then(function () {
                        oldElement.parentNode && oldElement.parentNode.removeChild(oldElement);
                    });
                },

                _deleteFlipPage: function (page) {
                    _WriteProfilerMark("WinJS.UI.FlipView:_deleteFlipPage,info");
                    page.elementRoot.style.opacity = 0;
                    var animation = Animations.createDeleteFromListAnimation([page.elementRoot]);

                    var that = this;
                    return animation.execute().then(function () {
                        if (page.discardable) {
                            page.discard();
                            that._itemsManager.releaseItem(page.element);
                        }
                    });
                },

                _insertFlipPage: function (page) {
                    _WriteProfilerMark("WinJS.UI.FlipView:_insertFlipPage,info");
                    page.elementRoot.style.opacity = 1.0;
                    var animation = Animations.createAddToListAnimation([page.elementRoot]);

                    return animation.execute().then(function () {
                        if (page.discardable) {
                            page.discard();
                        }
                    });
                },

                _moveFlipPage: function (page, move) {
                    _WriteProfilerMark("WinJS.UI.FlipView:_moveFlipPage,info");
                    var animation = Animations.createRepositionAnimation(page.pageRoot);

                    move();

                    var that = this;
                    return animation.execute().then(function () {
                        if (page.discardable) {
                            page.discard();
                            var animationRecord = that._getAnimationRecord(page.element);
                            if (animationRecord && !animationRecord.successfullyMoved) {
                                // If the animationRecord was not succesfully moved, the item is now outside of the buffer,
                                // and we can release it.
                                that._itemsManager.releaseItem(page.element);
                            }
                        }
                    });
                }
            }, {
                supportedForProcessing: false,
            });
            _FlipPageManager.flipPageBufferCount = 2; // The number of items that should surround the current item as a buffer at any time
            return _FlipPageManager;
        })
    });

});
