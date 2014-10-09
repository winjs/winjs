// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Promise',
    '../../_Signal',
    '../../Scheduler',
    '../../Utilities/_Dispose',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_SafeHtml',
    '../../Utilities/_UI',
    '../ItemContainer/_Constants',
    '../ItemContainer/_ItemEventsHandler',
    './_Helpers',
    './_ItemsContainer'
    ], function virtualizeContentsViewInit(exports, _Global, _Base, _BaseUtils, Promise, _Signal, Scheduler, _Dispose, _ElementUtilities, _SafeHtml, _UI, _Constants, _ItemEventsHandler, _Helpers, _ItemsContainer) {
    "use strict";

    function setFlow(from, to) {
        _ElementUtilities._setAttribute(from, "aria-flowto", to.id);
        _ElementUtilities._setAttribute(to, "x-ms-aria-flowfrom", from.id);
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _VirtualizeContentsView: _Base.Namespace._lazy(function () {

            function cooperativeQueueWorker(info) {
                var workItems = info.job._workItems;
                var work;
                while (workItems.length && !info.shouldYield) {
                    work = workItems.shift();
                    work();
                }

                info.setWork(cooperativeQueueWorker);

                if (!workItems.length) {
                    info.job.pause();
                }
            }

            function scheduleQueueJob(priority, name) {

                var job = Scheduler.schedule(cooperativeQueueWorker, priority, null, name);

                job._workItems = [];

                job.addWork = function (work, head) {
                    if (head) {
                        this._workItems.unshift(work);
                    } else {
                        this._workItems.push(work);
                    }
                    this.resume();
                };

                job.clearWork = function () {
                    this._workItems.length = 0;
                };

                job.dispose = function () {
                    this.cancel();
                    this._workItems.length = 0;
                };

                return job;
            }

            function shouldWaitForSeZo(listView) {
                return listView._zooming || listView._pinching;
            }

            function waitForSeZo(listView, timeout) {
                // waitForSeZo will block until sezo calls endZoom on listview, or a timeout duration has elapsed to
                // unblock a potential deadlock between the sezo waiting on container creation, and container creation
                // waiting on endZoom.

                if (listView._isZombie()) { return Promise.wrap(); }
                if (shouldWaitForSeZo(listView)) {
                    if (+timeout !== timeout) {
                        timeout = _VirtualizeContentsView._waitForSeZoTimeoutDuration;
                    }
                    //To improve SeZo's zoom animation and pinch detection perf, we want to ensure unimportant task
                    //is only run while zooming or pinching is not in progress.
                    return Promise.timeout(_VirtualizeContentsView._waitForSeZoIntervalDuration).then(function () {
                        timeout -= _VirtualizeContentsView._waitForSeZoIntervalDuration;
                        if (timeout <= 0) {
                            return true;
                        }
                        return waitForSeZo(listView, timeout);
                    });
                } else {
                    return Promise.wrap();
                }
            }

            function makeFunctor(scrollToFunctor) {
                if (typeof scrollToFunctor === "number") {
                    var pos = scrollToFunctor;

                    scrollToFunctor = function () {
                        return {
                            position: pos,
                            direction: "right"
                        };
                    };
                }
                return scrollToFunctor;
            }

            var _VirtualizeContentsView = _Base.Class.define(function VirtualizeContentsView_ctor(listView) {
                this._listView = listView;
                this._forceRelayout = false;
                this.items = new _ItemsContainer._ItemsContainer(listView);
                this.firstIndexDisplayed = -1;
                this.lastIndexDisplayed = -1;
                this.begin = 0;
                this.end = 0;
                this._realizePass = 1;
                this._firstLayoutPass = true;
                this._runningAnimations = null;
                this._renderCompletePromise = Promise.wrap();
                this._state = new CreatedState(this);
                this._createLayoutSignal();
                this._createTreeBuildingSignal();
                this._layoutWork = null;
                this._onscreenJob = scheduleQueueJob(Scheduler.Priority.aboveNormal, "on-screen items");
                this._frontOffscreenJob = scheduleQueueJob(Scheduler.Priority.normal, "front off-screen items");
                this._backOffscreenJob = scheduleQueueJob(Scheduler.Priority.belowNormal, "back off-screen items");
                this._scrollbarPos = 0;
                this._direction = "right";
                this._scrollToFunctor = makeFunctor(0);
            },
            {

                _dispose: function VirtualizeContentsView_dispose() {
                    this.cleanUp();
                    this.items = null;
                    this._renderCompletePromise && this._renderCompletePromise.cancel();
                    this._renderCompletePromise = null;
                    this._onscreenJob.dispose();
                    this._frontOffscreenJob.dispose();
                    this._backOffscreenJob.dispose();
                },

                _createItem: function VirtualizeContentsView_createItem(itemIndex, itemPromise, available, unavailable) {
                    this._listView._writeProfilerMark("createItem(" + itemIndex + ") " + this._getBoundingRectString(itemIndex) + ",info");

                    var that = this;
                    that._listView._itemsManager._itemFromItemPromiseThrottled(itemPromise).done(
                        function (element) {
                            if (element) {
                                available(itemIndex, element, that._listView._itemsManager._recordFromElement(element));
                            } else {
                                unavailable(itemIndex);
                            }
                        },
                        function (err) {
                            unavailable(itemIndex);
                            return Promise.wrapError(err);
                        }
                    );
                },

                _addItem: function VirtualizeContentsView_addItem(fragment, itemIndex, element, currentPass) {
                    if (this._realizePass === currentPass) {
                        var record = this._listView._itemsManager._recordFromElement(element);

                        delete this._pendingItemPromises[record.itemPromise.handle];

                        this.items.setItemAt(itemIndex, {
                            itemBox: null,
                            container: null,
                            element: element,
                            detached: true,
                            itemsManagerRecord: record
                        });
                    }
                },

                lastItemIndex: function VirtualizeContentsView_lastItemIndex() {
                    return (this.containers ? (this.containers.length - 1) : -1);
                },

                _setSkipRealizationForChange: function (skip) {
                    if (skip) {
                        if (this._realizationLevel !== _VirtualizeContentsView._realizationLevel.realize) {
                            this._realizationLevel = _VirtualizeContentsView._realizationLevel.skip;
                        }
                    } else {
                        this._realizationLevel = _VirtualizeContentsView._realizationLevel.realize;
                    }
                },

                _realizeItems: function VirtualizeContentsView_realizeItems(fragment, begin, end, count, currentPass, scrollbarPos, direction, firstInView, lastInView, ignoreGaps) {
                    var perfId = "_realizeItems(" + begin + "-" + (end - 1) + ") visible(" + firstInView + "-" + lastInView + ")";

                    this._listView._writeProfilerMark(perfId + ",StartTM");

                    direction = direction || "right";

                    var counter = end - begin;
                    var inView = lastInView - firstInView + 1,
                        inViewCounter = inView,
                        rightOffscreenCount = end - lastInView - 1,
                        leftOffscreenCount = firstInView - begin;
                    var renderCompletePromises = [];
                    var entranceAnimationSignal = new _Signal();
                    var viewportItemsRealized = new _Signal();
                    var frontItemsRealized = new _Signal();

                    var that = this;

                    function itemIsReady(itemIndex, itemsManagerRecord) {
                        renderCompletePromises.push(Promise._cancelBlocker(itemsManagerRecord.renderComplete));

                        delivered(itemIndex);
                    }

                    function appendItemsToDom(startIndex, endIndex) {
                        that._listView._writeProfilerMark("_realizeItems_appendedItemsToDom,StartTM");
                        if (that._listView._isZombie()) { return; }

                        function updateSwipeable(itemData, element) {
                            if (!itemData.updatedSwipeableAttribute && (that._listView.itemsDraggable || that._listView.itemsReorderable || that._listView._swipeable)) {
                                itemData.itemsManagerRecord.renderComplete.done(function () {
                                    if (that._realizePass === currentPass) {
                                        var dragDisabledOnItem = _ElementUtilities.hasClass(element, _Constants._nonDraggableClass),
                                            selectionDisabledOnItem = _ElementUtilities.hasClass(element, _Constants._nonSelectableClass),
                                            dragEnabled = (that._listView.itemsDraggable || that._listView.itemsReorderable),
                                            swipeSelectEnabled = (that._listView._selectionAllowed() && that._listView._swipeBehavior === _UI.SwipeBehavior.select);
                                        if (dragEnabled && !dragDisabledOnItem) {
                                            itemData.itemBox.draggable = true;
                                        }

                                        if (that._listView._swipeable && ((dragEnabled && !swipeSelectEnabled && dragDisabledOnItem) ||
                                            (swipeSelectEnabled && !dragEnabled && selectionDisabledOnItem) ||
                                            (dragDisabledOnItem && selectionDisabledOnItem))) {
                                            _ElementUtilities.addClass(itemData.itemBox, _Constants._nonSwipeableClass);
                                        }
                                        itemData.updatedSwipeableAttribute = true;
                                    }
                                });
                            }
                        }

                        var itemIndex;
                        var appendItemsCount = 0;
                        var firstIndex = -1;
                        var lastIndex = -1;
                        for (itemIndex = startIndex; itemIndex <= endIndex; itemIndex++) {
                            var itemData = that.items.itemDataAt(itemIndex);
                            if (itemData) {
                                var element = itemData.element,
                                    itemBox = itemData.itemBox;

                                if (!itemBox) {
                                    itemBox = that._listView._itemBoxTemplate.cloneNode(true);
                                    itemData.itemBox = itemBox;

                                    itemBox.appendChild(element);
                                    _ElementUtilities.addClass(element, _Constants._itemClass);

                                    that._listView._setupAriaSelectionObserver(element);

                                    if (that._listView._isSelected(itemIndex)) {
                                        _ItemEventsHandler._ItemEventsHandler.renderSelection(itemBox, element, true, true);
                                    }

                                    that._listView._currentMode().renderDragSourceOnRealizedItem(itemIndex, itemBox);
                                }

                                updateSwipeable(itemData, element, itemBox);

                                var container = that.getContainer(itemIndex);
                                if (itemBox.parentNode !== container) {
                                    itemData.container = container;
                                    that._appendAndRestoreFocus(container, itemBox);

                                    appendItemsCount++;
                                    if (firstIndex < 0) {
                                        firstIndex = itemIndex;
                                    }
                                    lastIndex = itemIndex;

                                    if (that._listView._isSelected(itemIndex)) {
                                        _ElementUtilities.addClass(container, _Constants._selectedClass);
                                    }

                                    _ElementUtilities.removeClass(container, _Constants._backdropClass);

                                    // elementAvailable needs to be called after fragment.appendChild. elementAvailable fulfills a promise for items requested
                                    // by the keyboard focus handler. That handler will explicitly call .focus() on the element, so in order for
                                    // the focus handler to work, the element needs to be in a tree prior to focusing.

                                    that.items.elementAvailable(itemIndex);
                                }
                            }
                        }

                        that._listView._writeProfilerMark("_realizeItems_appendedItemsToDom,StopTM");
                        if (appendItemsCount > 0) {
                            that._listView._writeProfilerMark("_realizeItems_appendedItemsToDom:" + appendItemsCount + " (" + firstIndex + "-" + lastIndex + "),info");
                            that._reportElementsLevel(direction);
                        }
                    }

                    function removeGaps(first, last, begin, end) {
                        if (ignoreGaps) {
                            return;
                        }
                        // If we realized items 0 through 20 and then scrolled so that items 25 - 30 are on screen when we
                        // append them to the dom we should remove items 0 - 20 from the dom so there are no gaps between the
                        // two realized spots.

                        // Walk backwards from the beginning and if we find an item which is missing remove the rest
                        var foundMissing = false;
                        while (first >= begin) {
                            foundMissing = testGap(first, foundMissing);
                            first--;
                        }

                        // Walk forwards from the end and if we find an item which is missing remove the rest
                        foundMissing = false;
                        while (last <= end) {
                            foundMissing = testGap(last, foundMissing);
                            last++;
                        }

                        function testGap(itemIndex, foundMissing) {
                            // This helper method is called for each index and once an item is missing from the dom
                            // it removes any future one it encounters.
                            var itemData = that.items.itemDataAt(itemIndex);
                            if (itemData) {
                                var itemBox = itemData.itemBox;
                                if (!itemBox || !itemBox.parentNode) {
                                    return true;
                                } else if (foundMissing) {
                                    _ElementUtilities.addClass(itemBox.parentNode, _Constants._backdropClass);
                                    itemBox.parentNode.removeChild(itemBox);
                                    return true;
                                } else {
                                    return false;
                                }
                            } else {
                                return true;
                            }
                        }
                    }

                    function scheduleReadySignal(first, last, job, dir, head) {
                        var promises = [];

                        for (var i = first; i <= last; i++) {
                            var itemData = that.items.itemDataAt(i);
                            if (itemData) {
                                promises.push(itemData.itemsManagerRecord.itemPromise);
                            }
                        }

                        function schedule(itemIndex) {
                            var itemData = that.items.itemDataAt(itemIndex);
                            if (itemData) {
                                var record = itemData.itemsManagerRecord;
                                if (!record.readyComplete && that._realizePass === currentPass) {
                                    job.addWork(function () {
                                        if (that._listView._isZombie()) {
                                            return;
                                        }
                                        if (record.pendingReady && that._realizePass === currentPass) {
                                            that._listView._writeProfilerMark("pendingReady(" + itemIndex + "),info");
                                            record.pendingReady();
                                        }
                                    }, head);
                                }
                            }
                        }

                        Promise.join(promises).then(function () {
                            if (dir === "right") {
                                for (var i = first; i <= last; i++) {
                                    schedule(i);
                                }
                            } else {
                                for (var i = last; i >= first; i--) {
                                    schedule(i);
                                }
                            }
                        });
                    }

                    function delivered(index) {
                        if (that._realizePass !== currentPass) {
                            return;
                        }

                        if (index >= firstInView && index <= lastInView) {
                            if (--inViewCounter === 0) {
                                appendItemsToDom(firstInView, lastInView);
                                removeGaps(firstInView, lastInView, begin, end);

                                if (that._firstLayoutPass) {
                                    scheduleReadySignal(firstInView, lastInView, that._frontOffscreenJob, direction === "right" ? "left" : "right", true);

                                    var entranceAnimation = Scheduler.schedulePromiseHigh(null, "WinJS.UI.ListView.entranceAnimation").then(function () {
                                        if (that._listView._isZombie()) { return; }
                                        that._listView._writeProfilerMark("entranceAnimation,StartTM");
                                        var promise = that._listView._animateListEntrance(!that._firstEntranceAnimated);
                                        that._firstEntranceAnimated = true;
                                        return promise;
                                    });

                                    that._runningAnimations = Promise.join([that._runningAnimations, entranceAnimation]);
                                    that._runningAnimations.done(function () {
                                        that._listView._writeProfilerMark("entranceAnimation,StopTM");
                                        if (that._realizePass === currentPass) {
                                            that._runningAnimations = null;
                                            entranceAnimationSignal.complete();
                                        }
                                    });
                                    that._firstLayoutPass = false;

                                    if (that._listView._isCurrentZoomView) {
                                        Scheduler.requestDrain(that._onscreenJob.priority);
                                    }
                                } else {
                                    // during scrolling ready for onscreen items after front off screen items
                                    scheduleReadySignal(firstInView, lastInView, that._frontOffscreenJob, direction);
                                    entranceAnimationSignal.complete();
                                }

                                that._updateHeaders(that._listView._canvas, firstInView, lastInView + 1).done(function () {
                                    viewportItemsRealized.complete();
                                });
                            }
                        } else if (index < firstInView) {
                            --leftOffscreenCount;
                            if (leftOffscreenCount % inView === 0) {
                                appendItemsToDom(begin, firstInView - 1);
                            }
                            if (!leftOffscreenCount) {
                                that._updateHeaders(that._listView._canvas, begin, firstInView).done(function () {
                                    if (direction !== "right") {
                                        frontItemsRealized.complete();
                                    }
                                });
                                scheduleReadySignal(begin, firstInView - 1, direction !== "right" ? that._frontOffscreenJob : that._backOffscreenJob, "left");
                            }
                        } else if (index > lastInView) {
                            --rightOffscreenCount;
                            if (rightOffscreenCount % inView === 0) {
                                appendItemsToDom(lastInView + 1, end - 1);
                            }
                            if (!rightOffscreenCount) {
                                that._updateHeaders(that._listView._canvas, lastInView + 1, end).then(function () {
                                    if (direction === "right") {
                                        frontItemsRealized.complete();
                                    }
                                });
                                scheduleReadySignal(lastInView + 1, end - 1, direction === "right" ? that._frontOffscreenJob : that._backOffscreenJob, "right");
                            }
                        }
                        counter--;

                        if (counter === 0) {
                            that._renderCompletePromise = Promise.join(renderCompletePromises).then(null, function (e) {
                                var error = Array.isArray(e) && e.some(function (item) { return item && !(item instanceof Error && item.name === "Canceled"); });
                                if (error) {
                                    // rethrow
                                    return Promise.wrapError(e);
                                }
                            });

                            (that._headerRenderPromises || Promise.wrap()).done(function () {
                                Scheduler.schedule(function VirtualizeContentsView_async_delivered() {
                                    if (that._listView._isZombie()) {
                                        workCompleteSignal.cancel();
                                    } else {
                                        workCompleteSignal.complete();
                                    }
                                }, Math.min(that._onscreenJob.priority, that._backOffscreenJob.priority), null, "WinJS.UI.ListView._allItemsRealized");
                            });
                        }
                    }

                    function newItemIsReady(itemIndex, element, itemsManagerRecord) {
                        if (that._realizePass === currentPass) {
                            var element = itemsManagerRecord.element;
                            that._addItem(fragment, itemIndex, element, currentPass);
                            itemIsReady(itemIndex, itemsManagerRecord);
                        }
                    }

                    if (counter > 0) {
                        var createCount = 0;
                        var updateCount = 0;
                        var cleanCount = 0;
                        that.firstIndexDisplayed = firstInView;
                        that.lastIndexDisplayed = lastInView;

                        var isCurrentZoomView = that._listView._isCurrentZoomView;
                        if (that._highPriorityRealize && (that._firstLayoutPass || that._hasAnimationInViewportPending)) {
                            // startup or edits that will animate items in the viewport
                            that._highPriorityRealize = false;
                            that._onscreenJob.priority = Scheduler.Priority.high;
                            that._frontOffscreenJob.priority = Scheduler.Priority.normal;
                            that._backOffscreenJob.priority = Scheduler.Priority.belowNormal;
                        } else if (that._highPriorityRealize) {
                            // edits that won't animate items in the viewport
                            that._highPriorityRealize = false;
                            that._onscreenJob.priority = Scheduler.Priority.high;
                            that._frontOffscreenJob.priority = Scheduler.Priority.high - 1;
                            that._backOffscreenJob.priority = Scheduler.Priority.high - 1;
                        } else if (isCurrentZoomView) {
                            // scrolling
                            that._onscreenJob.priority = Scheduler.Priority.aboveNormal;
                            that._frontOffscreenJob.priority = Scheduler.Priority.normal;
                            that._backOffscreenJob.priority = Scheduler.Priority.belowNormal;
                        } else {
                            // hidden ListView in SeZo
                            that._onscreenJob.priority = Scheduler.Priority.belowNormal;
                            that._frontOffscreenJob.priority = Scheduler.Priority.idle;
                            that._backOffscreenJob.priority = Scheduler.Priority.idle;
                        }

                        // Create a promise to wrap the work in the queue. When the queue gets to the last item we can mark
                        // the work promise complete and if the work promise is canceled we cancel the queue.
                        //
                        var workCompleteSignal = new _Signal();

                        // If the version manager recieves a notification we clear the work in the work queues
                        //
                        var cancelToken = that._listView._versionManager.cancelOnNotification(workCompleteSignal.promise);

                        var queueStage1AfterStage0 = function (job, record) {
                            if (record.startStage1) {
                                record.stage0.then(function () {
                                    if (that._realizePass === currentPass && record.startStage1) {
                                        job.addWork(record.startStage1);
                                    }
                                });
                            }
                        };

                        var queueWork = function (job, itemIndex) {
                            var itemData = that.items.itemDataAt(itemIndex);
                            if (!itemData) {
                                var itemPromise = that._listView._itemsManager._itemPromiseAtIndex(itemIndex);

                                // Remember this pending item promise and avoid canceling it from the previous realization pass.
                                that._pendingItemPromises[itemPromise.handle] = itemPromise;
                                delete that._previousRealizationPendingItemPromises[itemPromise.handle];

                                job.addWork(function VirtualizeContentsView_realizeItemsWork() {
                                    if (that._listView._isZombie()) {
                                        return;
                                    }

                                    createCount++;
                                    that._createItem(itemIndex, itemPromise, newItemIsReady, delivered);

                                    // _createItem runs user code
                                    if (that._listView._isZombie() || that._realizePass !== currentPass) {
                                        return;
                                    }

                                    if (itemPromise.handle) {
                                        var record = that._listView._itemsManager._recordFromHandle(itemPromise.handle);
                                        queueStage1AfterStage0(job, record);
                                    }
                                });
                            }

                        };

                        var queueRight = function (job, first, last) {
                            for (var itemIndex = first; itemIndex <= last; itemIndex++) {
                                queueWork(job, itemIndex);
                            }
                        };

                        var queueLeft = function (job, first, last) {
                            // Always build the left side in the direction away from the center.
                            for (var itemIndex = last; itemIndex >= first; itemIndex--) {
                                queueWork(job, itemIndex);
                            }
                        };

                        var handleExistingRange = function (job, first, last) {
                            for (var itemIndex = first; itemIndex <= last; itemIndex++) {
                                var itemData = that.items.itemDataAt(itemIndex);
                                if (itemData) {
                                    var record = itemData.itemsManagerRecord;
                                    itemIsReady(itemIndex, record);
                                    updateCount++;
                                    queueStage1AfterStage0(job, record);
                                }
                            }
                        };

                        // PendingItemPromises are the item promises which we have requested from the ItemsManager
                        // which have not returned an element (placeholder or real). Since we only clean up items
                        // which have an element in _unrealizeItems we need to remember these item promises. We cancel
                        // the item promises from the previous realization iteration if those item promises are not
                        // used for the current realization.
                        this._previousRealizationPendingItemPromises = this._pendingItemPromises || {};
                        this._pendingItemPromises = {};

                        var emptyFront;
                        if (direction === "left") {
                            queueLeft(that._onscreenJob, firstInView, lastInView);
                            queueLeft(that._frontOffscreenJob, begin, firstInView - 1);
                            emptyFront = begin > (firstInView - 1);
                        } else {
                            queueRight(that._onscreenJob, firstInView, lastInView);
                            queueRight(that._frontOffscreenJob, lastInView + 1, end - 1);
                            emptyFront = lastInView + 1 > (end - 1);
                        }

                        // Anything left in _previousRealizationPendingItemPromises can be canceled here.
                        // Note: we are doing this synchronously. If we didn't do it synchronously we would have had to merge
                        // _previousRealizationPendingItemPromises and _pendingItemPromises together. This also has the great
                        // benefit to cancel item promises in the backOffScreenArea which are much less important.
                        for (var i = 0, handles = Object.keys(this._previousRealizationPendingItemPromises), len = handles.length; i < len; i++) {
                            var handle = handles[i];
                            that._listView._itemsManager.releaseItemPromise(this._previousRealizationPendingItemPromises[handle]);
                        }
                        this._previousRealizationPendingItemPromises = {};


                        // Handle existing items in the second pass to make sure that raising ready signal is added to the queues after creating items
                        handleExistingRange(that._onscreenJob, firstInView, lastInView);
                        if (direction === "left") {
                            handleExistingRange(that._frontOffscreenJob, begin, firstInView - 1);
                        } else {
                            handleExistingRange(that._frontOffscreenJob, lastInView + 1, end - 1);
                        }

                        var showProgress = (inViewCounter === lastInView - firstInView + 1);

                        if (that._firstLayoutPass) {
                            that._listView._canvas.style.opacity = 0;
                        } else {
                            if (showProgress) {
                                that._listView._showProgressBar(that._listView._element, "50%", "50%");
                            } else {
                                that._listView._hideProgressBar();
                            }
                        }

                        that._frontOffscreenJob.pause();
                        that._backOffscreenJob.pause();

                        viewportItemsRealized.promise.done(
                            function () {
                                that._frontOffscreenJob.resume();

                                if (emptyFront) {
                                    frontItemsRealized.complete();
                                }
                            },
                            function () {
                                workCompleteSignal.cancel();
                            }
                        );

                        frontItemsRealized.promise.done(function () {
                            that._listView._writeProfilerMark("frontItemsRealized,info");

                            if (direction === "left") {
                                queueRight(that._backOffscreenJob, lastInView + 1, end - 1);
                                handleExistingRange(that._backOffscreenJob, lastInView + 1, end - 1);
                            } else {
                                queueLeft(that._backOffscreenJob, begin, firstInView - 1);
                                handleExistingRange(that._backOffscreenJob, begin, firstInView - 1);
                            }

                            that._backOffscreenJob.resume();
                        });

                        workCompleteSignal.promise.done(
                            function () {
                                that._listView._versionManager.clearCancelOnNotification(cancelToken);

                                that._listView._writeProfilerMark(perfId + " complete(created:" + createCount + " updated:" + updateCount + "),info");
                            },
                            function (err) {
                                that._listView._versionManager.clearCancelOnNotification(cancelToken);
                                that._onscreenJob.clearWork();
                                that._frontOffscreenJob.clearWork();
                                that._backOffscreenJob.clearWork();

                                entranceAnimationSignal.cancel();
                                viewportItemsRealized.cancel();

                                that._listView._writeProfilerMark(perfId + " canceled(created:" + createCount + " updated:" + updateCount + " clean:" + cleanCount + "),info");
                                return Promise.wrapError(err);
                            }
                        );

                        that._listView._writeProfilerMark(perfId + ",StopTM");
                        return {
                            viewportItemsRealized: viewportItemsRealized.promise,
                            allItemsRealized: workCompleteSignal.promise,
                            loadingCompleted: Promise.join([workCompleteSignal.promise, entranceAnimationSignal.promise]).then(function () {
                                var promises = [];

                                for (var i = begin; i < end; i++) {
                                    var itemData = that.items.itemDataAt(i);
                                    if (itemData) {
                                        promises.push(itemData.itemsManagerRecord.itemReadyPromise);
                                    }
                                }
                                return Promise._cancelBlocker(Promise.join(promises));
                            })
                        };
                    } else {
                        that._listView._writeProfilerMark(perfId + ",StopTM");
                        return {
                            viewportItemsRealized: Promise.wrap(),
                            allItemsRealized: Promise.wrap(),
                            loadingCompleted: Promise.wrap()
                        };
                    }
                },

                _setAnimationInViewportState: function VirtualizeContentsView_setAnimationInViewportState(modifiedElements) {
                    this._hasAnimationInViewportPending = false;
                    if (modifiedElements && modifiedElements.length > 0) {
                        var viewportLength = this._listView._getViewportLength(),
                            range = this._listView._layout.itemsFromRange(this._scrollbarPos, this._scrollbarPos + viewportLength - 1);
                        for (var i = 0, len = modifiedElements.length; i < len; i++) {
                            var modifiedElement = modifiedElements[i];
                            if (modifiedElement.newIndex >= range.firstIndex && modifiedElement.newIndex <= range.lastIndex && modifiedElement.newIndex !== modifiedElement.oldIndex) {
                                this._hasAnimationInViewportPending = true;
                                break;
                            }
                        }
                    }
                },

                _addHeader: function VirtualizeContentsView_addHeader(fragment, groupIndex) {
                    var that = this;
                    return this._listView._groups.renderGroup(groupIndex).then(function (header) {
                        if (header) {
                            header.element.tabIndex = 0;
                            var placeholder = that._getHeaderContainer(groupIndex);
                            if (header.element.parentNode !== placeholder) {
                                placeholder.appendChild(header.element);
                                _ElementUtilities.addClass(header.element, _Constants._headerClass);
                            }

                            that._listView._groups.setDomElement(groupIndex, header.element);
                        }
                    });
                },

                _updateHeaders: function VirtualizeContentsView_updateHeaders(fragment, begin, end) {
                    var that = this;

                    function updateGroup(index) {
                        var group = that._listView._groups.group(index);
                        if (group && !group.header) {
                            var headerPromise = group.headerPromise;
                            if (!headerPromise) {
                                headerPromise = group.headerPromise = that._addHeader(fragment, index);
                                headerPromise.done(function () {
                                    group.headerPromise = null;
                                }, function () {
                                    group.headerPromise = null;
                                });
                            }
                            return headerPromise;
                        }
                        return Promise.wrap();
                    }

                    this._listView._groups.removeElements();

                    var groupStart = this._listView._groups.groupFromItem(begin),
                        groupIndex = groupStart,
                        groupEnd = this._listView._groups.groupFromItem(end - 1),
                        realizationPromises = [];

                    if (groupIndex !== null) {
                        for (; groupIndex <= groupEnd; groupIndex++) {
                            realizationPromises.push(updateGroup(groupIndex));
                        }
                    }

                    function done() {
                        that._headerRenderPromises = null;
                    }
                    this._headerRenderPromises = Promise.join(realizationPromises, this._headerRenderPromises).then(done, done);
                    return this._headerRenderPromises || Promise.wrap();
                },

                _unrealizeItem: function VirtualizeContentsView_unrealizeItem(itemIndex) {
                    var listView = this._listView,
                        focusedItemPurged;

                    this._listView._writeProfilerMark("_unrealizeItem(" + itemIndex + "),info");

                    var focused = listView._selection._getFocused();
                    if (focused.type === _UI.ObjectType.item && focused.index === itemIndex) {
                        listView._unsetFocusOnItem();
                        focusedItemPurged = true;
                    }
                    var itemData = this.items.itemDataAt(itemIndex),
                        item = itemData.element,
                        itemBox = itemData.itemBox;

                    if (itemBox && itemBox.parentNode) {
                        _ElementUtilities.removeClass(itemBox.parentNode, _Constants._selectedClass);
                        _ElementUtilities.removeClass(itemBox.parentNode, _Constants._footprintClass);
                        _ElementUtilities.addClass(itemBox.parentNode, _Constants._backdropClass);
                        itemBox.parentNode.removeChild(itemBox);
                    }
                    itemData.container = null;

                    if (listView._currentMode().itemUnrealized) {
                        listView._currentMode().itemUnrealized(itemIndex, itemBox);
                    }

                    this.items.removeItem(itemIndex);

                    // If this wasn't released by the itemsManager already, then
                    // we remove it. This handles the special case of delete
                    // occuring on an item that is outside of the current view, but
                    // has not been cleaned up yet.
                    //
                    if (!itemData.removed) {
                        listView._itemsManager.releaseItem(item);
                    }


                    _Dispose._disposeElement(item);

                    if (focusedItemPurged) {
                        // If the focused item was purged, we'll still want to focus on it if it comes into view sometime in the future.
                        // calling _setFocusOnItem once the item is removed from this.items will set up a promise that will be fulfilled
                        // if the item ever gets reloaded
                        listView._setFocusOnItem(listView._selection._getFocused());
                    }
                },

                _unrealizeGroup: function VirtualizeContentsView_unrealizeGroup(group) {
                    var headerElement = group.header,
                        focusedItemPurged;

                    var focused = this._listView._selection._getFocused();
                    if (focused.type === _UI.ObjectType.groupHeader && this._listView._groups.group(focused.index) === group) {
                        this._listView._unsetFocusOnItem();
                        focusedItemPurged = true;
                    }

                    if (headerElement.parentNode) {
                        headerElement.parentNode.removeChild(headerElement);
                    }

                    _Dispose._disposeElement(headerElement);

                    group.header = null;
                    group.left = -1;
                    group.top = -1;

                    if (focusedItemPurged) {
                        this._listView._setFocusOnItem(this._listView._selection._getFocused());
                    }
                },

                _unrealizeItems: function VirtualizeContentsView_unrealizeItems(remove) {
                    var that = this,
                        removedCount = 0;

                    this.items.eachIndex(function (index) {
                        if (index < that.begin || index >= that.end) {
                            that._unrealizeItem(index);
                            return remove && ++removedCount >= remove;
                        }
                    });

                    var groups = this._listView._groups,
                        beginGroup = groups.groupFromItem(this.begin);

                    if (beginGroup !== null) {
                        var endGroup = groups.groupFromItem(this.end - 1);
                        for (var i = 0, len = groups.length() ; i < len; i++) {
                            var group = groups.group(i);
                            if ((i < beginGroup || i > endGroup) && group.header) {
                                this._unrealizeGroup(group);
                            }
                        }
                    }
                },

                _unrealizeExcessiveItems: function VirtualizeContentsView_unrealizeExcessiveItems() {
                    var realized = this.items.count(),
                        needed = this.end - this.begin,
                        approved = needed + this._listView._maxDeferredItemCleanup;

                    this._listView._writeProfilerMark("_unrealizeExcessiveItems realized(" + realized + ") approved(" + approved + "),info");
                    if (realized > approved) {
                        this._unrealizeItems(realized - approved);
                    }
                },

                _lazilyUnrealizeItems: function VirtualizeContentsView_lazilyUnrealizeItems() {
                    this._listView._writeProfilerMark("_lazilyUnrealizeItems,StartTM");
                    var that = this;
                    return waitForSeZo(this._listView).then(function () {

                        function done() {
                            that._listView._writeProfilerMark("_lazilyUnrealizeItems,StopTM");
                        }

                        if (that._listView._isZombie()) {
                            done();
                            return;
                        }

                        var itemsToUnrealize = [];
                        that.items.eachIndex(function (index) {
                            if (index < that.begin || index >= that.end) {
                                itemsToUnrealize.push(index);
                            }
                        });

                        that._listView._writeProfilerMark("_lazilyUnrealizeItems itemsToUnrealize(" + itemsToUnrealize.length + "),info");

                        var groupsToUnrealize = [],
                            groups = that._listView._groups,
                            beginGroup = groups.groupFromItem(that.begin);

                        if (beginGroup !== null) {
                            var endGroup = groups.groupFromItem(that.end - 1);
                            for (var i = 0, len = groups.length() ; i < len; i++) {
                                var group = groups.group(i);
                                if ((i < beginGroup || i > endGroup) && group.header) {
                                    groupsToUnrealize.push(group);
                                }
                            }
                        }

                        if (itemsToUnrealize.length || groupsToUnrealize.length) {
                            var job;

                            var promise = new Promise(function (complete) {

                                function unrealizeWorker(info) {
                                    if (that._listView._isZombie()) { return; }

                                    var firstIndex = -1,
                                        lastIndex = -1,
                                        removeCount = 0,
                                        zooming = shouldWaitForSeZo(that._listView);

                                    while (itemsToUnrealize.length && !zooming && !info.shouldYield) {
                                        var itemIndex = itemsToUnrealize.shift();
                                        that._unrealizeItem(itemIndex);

                                        removeCount++;
                                        if (firstIndex < 0) {
                                            firstIndex = itemIndex;
                                        }
                                        lastIndex = itemIndex;
                                    }
                                    that._listView._writeProfilerMark("unrealizeWorker removeItems:" + removeCount + " (" + firstIndex + "-" + lastIndex + "),info");

                                    while (groupsToUnrealize.length && !zooming && !info.shouldYield) {
                                        that._unrealizeGroup(groupsToUnrealize.shift());
                                    }

                                    if (itemsToUnrealize.length || groupsToUnrealize.length) {
                                        if (zooming) {
                                            info.setPromise(waitForSeZo(that._listView).then(function () {
                                                return unrealizeWorker;
                                            }));
                                        } else {
                                            info.setWork(unrealizeWorker);
                                        }
                                    } else {
                                        complete();
                                    }
                                }

                                job = Scheduler.schedule(unrealizeWorker, Scheduler.Priority.belowNormal, null, "WinJS.UI.ListView._lazilyUnrealizeItems");
                            });

                            return promise.then(done, function (error) {
                                job.cancel();
                                that._listView._writeProfilerMark("_lazilyUnrealizeItems canceled,info");
                                that._listView._writeProfilerMark("_lazilyUnrealizeItems,StopTM");
                                return Promise.wrapError(error);
                            });

                        } else {
                            done();
                            return Promise.wrap();
                        }
                    });
                },

                _getBoundingRectString: function VirtualizeContentsView_getBoundingRectString(itemIndex) {
                    var result;
                    if (itemIndex >= 0 && itemIndex < this.containers.length) {
                        var itemPos = this._listView._layout._getItemPosition(itemIndex);
                        if (itemPos) {
                            result = "[" + itemPos.left + "; " + itemPos.top + "; " + itemPos.width + "; " + itemPos.height + " ]";
                        }
                    }
                    return result || "";
                },

                _clearDeferTimeout: function VirtualizeContentsView_clearDeferTimeout() {
                    if (this.deferTimeout) {
                        this.deferTimeout.cancel();
                        this.deferTimeout = null;
                    }
                    if (this.deferredActionCancelToken !== -1) {
                        this._listView._versionManager.clearCancelOnNotification(this.deferredActionCancelToken);
                        this.deferredActionCancelToken = -1;
                    }
                },

                _setupAria: function VirtualizeContentsView_setupAria(timedOut) {
                    if (this._listView._isZombie()) { return; }
                    var that = this;

                    function done() {
                        that._listView._writeProfilerMark("aria work,StopTM");
                    }

                    function calcLastRealizedIndexInGroup(groupIndex) {
                        var groups = that._listView._groups,
                            nextGroup = groups.group(groupIndex + 1);
                        return (nextGroup ? Math.min(nextGroup.startIndex - 1, that.end - 1) : that.end - 1);
                    }

                    this._listView._createAriaMarkers();
                    return this._listView._itemsCount().then(function (count) {
                        if (count > 0 && that.firstIndexDisplayed !== -1 && that.lastIndexDisplayed !== -1) {
                            that._listView._writeProfilerMark("aria work,StartTM");
                            var startMarker = that._listView._ariaStartMarker,
                                endMarker = that._listView._ariaEndMarker,
                                index = that.begin,
                                item = that.items.itemAt(that.begin),
                                job,
                                // These are only used when the ListView is using groups
                                groups,
                                startGroup,
                                currentGroup,
                                group,
                                lastRealizedIndexInGroup;

                            if (item) {
                                _ElementUtilities._ensureId(item);
                                if (that._listView._groupsEnabled()) {
                                    groups = that._listView._groups;
                                    startGroup = currentGroup = groups.groupFromItem(that.begin);
                                    group = groups.group(currentGroup);
                                    lastRealizedIndexInGroup = calcLastRealizedIndexInGroup(currentGroup);
                                    _ElementUtilities._ensureId(group.header);
                                    _ElementUtilities._setAttribute(group.header, "role", that._listView._headerRole);
                                    _ElementUtilities._setAttribute(group.header, "x-ms-aria-flowfrom", startMarker.id);
                                    setFlow(group.header, item);
                                    _ElementUtilities._setAttribute(group.header, "tabindex", that._listView._tabIndex);
                                } else {
                                    _ElementUtilities._setAttribute(item, "x-ms-aria-flowfrom", startMarker.id);
                                }

                                return new Promise(function (completeJobPromise) {
                                    var skipWait = timedOut;
                                    job = Scheduler.schedule(function ariaWorker(jobInfo) {
                                        if (that._listView._isZombie()) {
                                            done();
                                            return;
                                        }

                                        for (; index < that.end; index++) {
                                            if (!skipWait && shouldWaitForSeZo(that._listView)) {
                                                jobInfo.setPromise(waitForSeZo(that._listView).then(function (timedOut) {
                                                    skipWait = timedOut;
                                                    return ariaWorker;
                                                }));
                                                return;
                                            } else if (jobInfo.shouldYield) {
                                                jobInfo.setWork(ariaWorker);
                                                return;
                                            }

                                            item = that.items.itemAt(index);
                                            var nextItem = that.items.itemAt(index + 1);

                                            if (nextItem) {
                                                _ElementUtilities._ensureId(nextItem);
                                            }

                                            _ElementUtilities._setAttribute(item, "role", that._listView._itemRole);
                                            _ElementUtilities._setAttribute(item, "aria-setsize", count);
                                            _ElementUtilities._setAttribute(item, "aria-posinset", index + 1);
                                            _ElementUtilities._setAttribute(item, "tabindex", that._listView._tabIndex);

                                            if (that._listView._groupsEnabled()) {
                                                if (index === lastRealizedIndexInGroup || !nextItem) {
                                                    var nextGroup = groups.group(currentGroup + 1);

                                                    // If group is the last realized group, then nextGroup won't exist in the DOM.
                                                    // When this is the case, nextItem shouldn't exist.
                                                    if (nextGroup && nextGroup.header && nextItem) {
                                                        _ElementUtilities._setAttribute(nextGroup.header, "tabindex", that._listView._tabIndex);
                                                        _ElementUtilities._setAttribute(nextGroup.header, "role", that._listView._headerRole);
                                                        _ElementUtilities._ensureId(nextGroup.header);
                                                        setFlow(item, nextGroup.header);
                                                        setFlow(nextGroup.header, nextItem);
                                                    } else {
                                                        // We're at the last group so flow to the end marker
                                                        _ElementUtilities._setAttribute(item, "aria-flowto", endMarker.id);
                                                    }

                                                    currentGroup++;
                                                    group = nextGroup;
                                                    lastRealizedIndexInGroup = calcLastRealizedIndexInGroup(currentGroup);
                                                } else {
                                                    // This is not the last item in the group so flow to the next item
                                                    setFlow(item, nextItem);
                                                }
                                            } else if (nextItem) {
                                                // Groups are disabled so as long as we aren't at the last item, flow to the next one
                                                setFlow(item, nextItem);
                                            } else {
                                                // Groups are disabled and we're at the last item, so flow to the end marker
                                                _ElementUtilities._setAttribute(item, "aria-flowto", endMarker.id);
                                            }
                                            if (!nextItem) {
                                                break;
                                            }
                                        }

                                        that._listView._fireAccessibilityAnnotationCompleteEvent(that.begin, index, startGroup, currentGroup - 1);

                                        done();
                                        completeJobPromise();
                                    }, Scheduler.Priority.belowNormal, null, "WinJS.UI.ListView._setupAria");
                                }, function () {
                                    // Cancellation handler for promise returned by setupAria
                                    job.cancel();
                                    done();
                                });
                            } else {
                                // the first item is null
                                done();
                            }
                        } else {
                            // The count is 0
                            return Promise.wrap();
                        }
                    });
                },

                _setupDeferredActions: function VirtualizeContentsView_setupDeferredActions() {
                    this._listView._writeProfilerMark("_setupDeferredActions,StartTM");
                    var that = this;

                    this._clearDeferTimeout();

                    function cleanUp() {
                        if (that._listView._isZombie()) { return; }
                        that.deferTimeout = null;
                        that._listView._versionManager.clearCancelOnNotification(that.deferredActionCancelToken);
                        that.deferredActionCancelToken = -1;
                    }

                    this.deferTimeout = this._lazilyRemoveRedundantItemsBlocks().then(function () {
                            return Promise.timeout(_Constants._DEFERRED_ACTION);
                        }).
                        then(function () {
                            return waitForSeZo(that._listView);
                        }).
                        then(function (timedOut) {
                            return that._setupAria(timedOut);
                        }).
                        then(cleanUp, function (error) {
                            cleanUp();
                            return Promise.wrapError(error);
                        });

                    this.deferredActionCancelToken = this._listView._versionManager.cancelOnNotification(this.deferTimeout);
                    this._listView._writeProfilerMark("_setupDeferredActions,StopTM");
                },

                // Sets aria-flowto on _ariaStartMarker and x-ms-aria-flowfrom on _ariaEndMarker. The former
                // points to either the first visible group header or the first visible item. The latter points
                // to the last visible item.
                _updateAriaMarkers: function VirtualizeContentsView_updateAriaMarkers(listViewIsEmpty, firstIndexDisplayed, lastIndexDisplayed) {
                    var that = this;
                    if (this._listView._isZombie()) {
                        return;
                    }

                    function getFirstVisibleItem() {
                        return that.items.itemAt(firstIndexDisplayed);
                    }

                    // At a certain index, the VDS may return null for all items at that index and
                    // higher. When this is the case, the end marker should point to the last
                    // non-null item in the visible range.
                    function getLastVisibleItem() {
                        for (var i = lastIndexDisplayed; i >= firstIndexDisplayed; i--) {
                            if (that.items.itemAt(i)) {
                                return that.items.itemAt(i);
                            }
                        }
                        return null;
                    }

                    this._listView._createAriaMarkers();
                    var startMarker = this._listView._ariaStartMarker,
                        endMarker = this._listView._ariaEndMarker,
                        firstVisibleItem,
                        lastVisibleItem;

                    if (firstIndexDisplayed !== -1 && lastIndexDisplayed !== -1 && firstIndexDisplayed <= lastIndexDisplayed) {
                        firstVisibleItem = getFirstVisibleItem();
                        lastVisibleItem = getLastVisibleItem();
                    }

                    if (listViewIsEmpty || !firstVisibleItem || !lastVisibleItem) {
                        setFlow(startMarker, endMarker);
                        this._listView._fireAccessibilityAnnotationCompleteEvent(-1, -1);
                    } else {
                        _ElementUtilities._ensureId(firstVisibleItem);
                        _ElementUtilities._ensureId(lastVisibleItem);

                        // Set startMarker's flowto
                        if (this._listView._groupsEnabled()) {
                            var groups = this._listView._groups,
                                firstVisibleGroup = groups.group(groups.groupFromItem(firstIndexDisplayed));

                            if (firstVisibleGroup.header) {
                                _ElementUtilities._ensureId(firstVisibleGroup.header);

                                if (firstIndexDisplayed === firstVisibleGroup.startIndex) {
                                    _ElementUtilities._setAttribute(startMarker, "aria-flowto", firstVisibleGroup.header.id);
                                } else {
                                    _ElementUtilities._setAttribute(startMarker, "aria-flowto", firstVisibleItem.id);
                                }
                            }
                        } else {
                            _ElementUtilities._setAttribute(startMarker, "aria-flowto", firstVisibleItem.id);
                        }

                        // Set endMarker's flowfrom
                        _ElementUtilities._setAttribute(endMarker, "x-ms-aria-flowfrom", lastVisibleItem.id);
                    }
                },

                // Update the ARIA attributes on item that are needed so that Narrator can announce it.
                // item must be in the items container.
                updateAriaForAnnouncement: function VirtualizeContentsView_updateAriaForAnnouncement(item, count) {
                    if (item === this._listView.listHeader || item === this._listView.listFooter) {
                        return;
                    }

                    var index = -1;
                    var type = _UI.ObjectType.item;
                    if (_ElementUtilities.hasClass(item, _Constants._headerClass)) {
                        index = this._listView._groups.index(item);
                        type = _UI.ObjectType.groupHeader;
                        _ElementUtilities._setAttribute(item, "role", this._listView._headerRole);
                        _ElementUtilities._setAttribute(item, "tabindex", this._listView._tabIndex);
                    } else {
                        index = this.items.index(item);
                        _ElementUtilities._setAttribute(item, "aria-setsize", count);
                        _ElementUtilities._setAttribute(item, "aria-posinset", index + 1);
                        _ElementUtilities._setAttribute(item, "role", this._listView._itemRole);
                        _ElementUtilities._setAttribute(item, "tabindex", this._listView._tabIndex);
                    }

                    if (type === _UI.ObjectType.groupHeader) {
                        this._listView._fireAccessibilityAnnotationCompleteEvent(-1, -1, index, index);
                    } else {
                        this._listView._fireAccessibilityAnnotationCompleteEvent(index, index, -1, -1);
                    }
                },

                _reportElementsLevel: function VirtualizeContentsView_reportElementsLevel(direction) {
                    var items = this.items;

                    function elementsCount(first, last) {
                        var count = 0;
                        for (var itemIndex = first; itemIndex <= last; itemIndex++) {
                            var itemData = items.itemDataAt(itemIndex);
                            if (itemData && itemData.container) {
                                count++;
                            }
                        }
                        return count;
                    }

                    var level;
                    if (direction === "right") {
                        level = Math.floor(100 * elementsCount(this.firstIndexDisplayed, this.end - 1) / (this.end - this.firstIndexDisplayed));
                    } else {
                        level = Math.floor(100 * elementsCount(this.begin, this.lastIndexDisplayed) / (this.lastIndexDisplayed - this.begin + 1));
                    }

                    this._listView._writeProfilerMark("elementsLevel level(" + level + "),info");
                },

                _createHeaderContainer: function VirtualizeContentsView_createHeaderContainer(insertAfter) {
                    return this._createSurfaceChild(_Constants._headerContainerClass, insertAfter);
                },

                _createItemsContainer: function VirtualizeContentsView_createItemsContainer(insertAfter) {
                    var itemsContainer = this._createSurfaceChild(_Constants._itemsContainerClass, insertAfter);
                    var padder = _Global.document.createElement("div");
                    padder.className = _Constants._padderClass;
                    itemsContainer.appendChild(padder);
                    return itemsContainer;
                },

                _ensureContainerInDOM: function VirtualizeContentsView_ensureContainerInDOM(index) {
                    var container = this.containers[index];
                    if (container && !this._listView._canvas.contains(container)) {
                        this._forceItemsBlocksInDOM(index, index + 1);
                        return true;
                    }
                    return false;
                },

                _ensureItemsBlocksInDOM: function VirtualizeContentsView_ensureItemsBlocksInDOM(begin, end) {
                    if (this._expandedRange) {
                        var oldBegin = this._expandedRange.first.index,
                            oldEnd = this._expandedRange.last.index + 1;

                        if (begin <= oldBegin && end > oldBegin) {
                            end = Math.max(end, oldEnd);
                        } else if (begin < oldEnd && end >= oldEnd) {
                            begin = Math.min(begin, oldBegin);
                        }
                    }
                    this._forceItemsBlocksInDOM(begin, end);
                },

                _removeRedundantItemsBlocks: function VirtualizeContentsView_removeRedundantItemsBlocks() {
                    if (this.begin !== -1 && this.end !== -1) {
                        this._forceItemsBlocksInDOM(this.begin, this.end);
                    }
                },

                _lazilyRemoveRedundantItemsBlocks: function VirtualizeContentsView_lazilyRemoveRedundantItemsBlocks() {
                    this._listView._writeProfilerMark("_lazilyRemoveRedundantItemsBlocks,StartTM");
                    var that = this;
                    return waitForSeZo(this._listView).then(function () {

                        function done() {
                            that._listView._writeProfilerMark("_lazilyRemoveRedundantItemsBlocks,StopTM");
                        }

                        if (that._listView._isZombie()) {
                            done();
                            return;
                        }

                        if (that._expandedRange && that.begin !== -1 && that.end !== -1 && (that._expandedRange.first.index < that.begin || that._expandedRange.last.index + 1 > that.end)) {
                            var job;

                            var promise = new Promise(function (complete) {

                                function blocksCleanupWorker(info) {
                                    if (that._listView._isZombie()) { return; }

                                    var zooming = shouldWaitForSeZo(that._listView);

                                    while (that._expandedRange.first.index < that.begin && !zooming && !info.shouldYield) {
                                        var begin = Math.min(that.begin, that._expandedRange.first.index + that._blockSize * _VirtualizeContentsView._blocksToRelease);
                                        that._forceItemsBlocksInDOM(begin, that.end);
                                    }

                                    while (that._expandedRange.last.index + 1 > that.end && !zooming && !info.shouldYield) {
                                        var end = Math.max(that.end, that._expandedRange.last.index - that._blockSize * _VirtualizeContentsView._blocksToRelease);
                                        that._forceItemsBlocksInDOM(that.begin, end);
                                    }

                                    if (that._expandedRange.first.index < that.begin || that._expandedRange.last.index + 1 > that.end) {
                                        if (zooming) {
                                            info.setPromise(waitForSeZo(that._listView).then(function () {
                                                return blocksCleanupWorker;
                                            }));
                                        } else {
                                            info.setWork(blocksCleanupWorker);
                                        }
                                    } else {
                                        complete();
                                    }
                                }

                                job = Scheduler.schedule(blocksCleanupWorker, Scheduler.Priority.belowNormal, null, "WinJS.UI.ListView._lazilyRemoveRedundantItemsBlocks");
                            });

                            return promise.then(done, function (error) {
                                job.cancel();
                                that._listView._writeProfilerMark("_lazilyRemoveRedundantItemsBlocks canceled,info");
                                that._listView._writeProfilerMark("_lazilyRemoveRedundantItemsBlocks,StopTM");
                                return Promise.wrapError(error);
                            });

                        } else {
                            done();
                            return Promise.wrap();
                        }
                    });
                },

                _forceItemsBlocksInDOM: function VirtualizeContentsView_forceItemsBlocksInDOM(begin, end) {
                    if (!this._blockSize) {
                        return;
                    }
                    var perfId = "_forceItemsBlocksInDOM begin(" + begin + ") end(" + end + "),";
                    this._listView._writeProfilerMark(perfId + "StartTM");

                    var that = this,
                        added = 0,
                        removed = 0,
                        paddingProperty = "padding" + (this._listView._horizontal() ? "Left" : "Top");

                    function setPadder(itemsContainer, padding) {
                        var padder = itemsContainer.element.firstElementChild;
                        padder.style[paddingProperty] = padding;
                    }

                    function forEachBlock(callback) {
                        for (var g = 0; g < that.tree.length; g++) {
                            var itemsContainer = that.tree[g].itemsContainer;
                            for (var b = 0, len = itemsContainer.itemsBlocks.length; b < len; b++) {
                                if (callback(itemsContainer, itemsContainer.itemsBlocks[b])) {
                                    return;
                                }
                            }
                        }
                    }

                    function measureItemsBlock(itemsBlock) {
                        that._listView._writeProfilerMark("_itemsBlockExtent,StartTM");
                        that._listView._itemsBlockExtent = _ElementUtilities[that._listView._horizontal() ? "getTotalWidth" : "getTotalHeight"](itemsBlock.element);
                        that._listView._writeProfilerMark("_itemsBlockExtent(" + that._listView._itemsBlockExtent + "),info");
                        that._listView._writeProfilerMark("_itemsBlockExtent,StopTM");
                    }

                    function getItemsBlockExtent() {
                        if (that._listView._itemsBlockExtent === -1) {
                            // first try blocks already added to the DOM
                            forEachBlock(function (itemsContainer, itemsBlock) {
                                if (itemsBlock.items.length === that._blockSize && itemsBlock.element.parentNode === itemsContainer.element) {
                                    measureItemsBlock(itemsBlock);
                                    return true;
                                }
                                return false;
                            });
                        }

                        if (that._listView._itemsBlockExtent === -1) {
                            forEachBlock(function (itemsContainer, itemsBlock) {
                                if (itemsBlock.items.length === that._blockSize) {
                                    itemsContainer.element.appendChild(itemsBlock.element);
                                    measureItemsBlock(itemsBlock);
                                    itemsContainer.element.removeChild(itemsBlock.element);
                                    return true;
                                }
                                return false;
                            });
                        }
                        return that._listView._itemsBlockExtent;
                    }

                    function removeBlocks(itemsContainer, begin, end) {

                        function remove(blockIndex) {
                            var block = itemsContainer.itemsBlocks[blockIndex];
                            if (block && block.element.parentNode === itemsContainer.element) {
                                itemsContainer.element.removeChild(block.element);
                                removed++;
                            }
                        }

                        if (Array.isArray(begin)) {
                            begin.forEach(remove);
                        } else {
                            for (var i = begin; i < end; i++) {
                                remove(i);
                            }
                        }
                    }

                    function addBlocks(itemsContainer, begin, end) {
                        var padder = itemsContainer.element.firstElementChild,
                            previous = padder;

                        for (var i = begin; i < end; i++) {
                            var block = itemsContainer.itemsBlocks[i];
                            if (block) {
                                if (block.element.parentNode !== itemsContainer.element) {
                                    itemsContainer.element.insertBefore(block.element, previous.nextElementSibling);
                                    added++;
                                }
                                previous = block.element;
                            }
                        }
                    }

                    function collapseGroup(groupIndex) {
                        if (groupIndex < that.tree.length) {
                            that._listView._writeProfilerMark("collapseGroup(" + groupIndex + "),info");
                            var itemsContainer = that.tree[groupIndex].itemsContainer;
                            removeBlocks(itemsContainer, 0, itemsContainer.itemsBlocks.length);
                            setPadder(itemsContainer, "");
                        }
                    }

                    function expandGroup(groupIndex) {
                        if (groupIndex < that.tree.length) {
                            that._listView._writeProfilerMark("expandGroup(" + groupIndex + "),info");
                            var itemsContainer = that.tree[groupIndex].itemsContainer;
                            addBlocks(itemsContainer, 0, itemsContainer.itemsBlocks.length);
                            setPadder(itemsContainer, "");
                        }
                    }

                    function removedFromRange(oldRange, newRange) {
                        function expand(first, last) {
                            var array = [];
                            for (var i = first; i <= last; i++) {
                                array.push(i);
                            }
                            return array;
                        }

                        var newL = newRange[0];
                        var newR = newRange[1];
                        var oldL = oldRange[0];
                        var oldR = oldRange[1];

                        if (newR < oldL || newL > oldR) {
                            return expand(oldL, oldR);
                        } else if (newL > oldL && newR < oldR) {
                            return expand(oldL, newL - 1).concat(expand(newR + 1, oldR));
                        } else if (oldL < newL) {
                            return expand(oldL, newL - 1);
                        } else if (oldR > newR) {
                            return expand(newR + 1, oldR);
                        } else {
                            return null;
                        }
                    }

                    var firstGroupIndex = this._listView._groups.groupFromItem(begin),
                        lastGroupIndex = this._listView._groups.groupFromItem(end - 1);

                    var firstGroup = this._listView._groups.group(firstGroupIndex),
                        firstItemsContainer = that.tree[firstGroupIndex].itemsContainer;

                    var firstBlock = Math.floor((begin - firstGroup.startIndex) / this._blockSize);

                    var lastGroup = this._listView._groups.group(lastGroupIndex),
                        lastItemsContainer = that.tree[lastGroupIndex].itemsContainer;

                    var lastBlock = Math.floor((end - 1 - lastGroup.startIndex) / this._blockSize);

                    // if size of structure block is needed try to obtain it before modifying the tree to avoid a layout pass
                    if (firstBlock && that._listView._itemsBlockExtent === -1) {
                        forEachBlock(function (itemsContainer, itemsBlock) {
                            if (itemsBlock.items.length === that._blockSize && itemsBlock.element.parentNode === itemsContainer.element) {
                                measureItemsBlock(itemsBlock);
                                return true;
                            }
                            return false;
                        });
                    }

                    var groupsToCollapse = this._expandedRange ? removedFromRange([this._expandedRange.first.groupIndex, this._expandedRange.last.groupIndex], [firstGroupIndex, lastGroupIndex]) : null;
                    if (groupsToCollapse) {
                        groupsToCollapse.forEach(collapseGroup);
                    }

                    if (this._expandedRange && this._expandedRange.first.groupKey === firstGroup.key) {
                        var blocksToRemove = removedFromRange([this._expandedRange.first.block, Number.MAX_VALUE], [firstBlock, Number.MAX_VALUE]);
                        if (blocksToRemove) {
                            removeBlocks(firstItemsContainer, blocksToRemove);
                        }
                    } else if (this._expandedRange && firstGroupIndex >= this._expandedRange.first.groupIndex && firstGroupIndex <= this._expandedRange.last.groupIndex) {
                        removeBlocks(firstItemsContainer, 0, firstBlock);
                    }

                    if (firstGroupIndex !== lastGroupIndex) {
                        addBlocks(firstItemsContainer, firstBlock, firstItemsContainer.itemsBlocks.length);
                        addBlocks(lastItemsContainer, 0, lastBlock + 1);
                    } else {
                        addBlocks(firstItemsContainer, firstBlock, lastBlock + 1);
                    }

                    if (this._expandedRange && this._expandedRange.last.groupKey === lastGroup.key) {
                        var blocksToRemove = removedFromRange([0, this._expandedRange.last.block], [0, lastBlock]);
                        if (blocksToRemove) {
                            removeBlocks(lastItemsContainer, blocksToRemove);
                        }
                    } else if (this._expandedRange && lastGroupIndex >= this._expandedRange.first.groupIndex && lastGroupIndex <= this._expandedRange.last.groupIndex) {
                        removeBlocks(lastItemsContainer, lastBlock + 1, lastItemsContainer.itemsBlocks.length);
                    }

                    setPadder(firstItemsContainer, firstBlock ? firstBlock * getItemsBlockExtent() + "px" : "");

                    if (firstGroupIndex !== lastGroupIndex) {
                        setPadder(lastItemsContainer, "");
                    }

                    // groups between first and last
                    for (var i = firstGroupIndex + 1; i < lastGroupIndex; i++) {
                        expandGroup(i);
                    }

                    this._expandedRange = {
                        first: {
                            index: begin,
                            groupIndex: firstGroupIndex,
                            groupKey: firstGroup.key,
                            block: firstBlock
                        },
                        last: {
                            index: end - 1,
                            groupIndex: lastGroupIndex,
                            groupKey: lastGroup.key,
                            block: lastBlock
                        },
                    };
                    this._listView._writeProfilerMark("_forceItemsBlocksInDOM groups(" + firstGroupIndex + "-" + lastGroupIndex + ") blocks(" + firstBlock + "-" + lastBlock + ") added(" + added + ") removed(" + removed + "),info");
                    this._listView._writeProfilerMark(perfId + "StopTM");
                },

                _realizePageImpl: function VirtualizeContentsView_realizePageImpl() {
                    var that = this;

                    var perfId = "realizePage(scrollPosition:" + this._scrollbarPos + " forceLayout:" + this._forceRelayout + ")";
                    this._listView._writeProfilerMark(perfId + ",StartTM");

                    // It's safe to skip realizePage, so we just queue up the last request to run when the version manager
                    // get unlocked.
                    //
                    if (this._listView._versionManager.locked) {
                        this._listView._versionManager.unlocked.done(function () {
                            if (!that._listView._isZombie()) {
                                that._listView._batchViewUpdates(_Constants._ViewChange.realize, _Constants._ScrollToPriority.low, that._listView.scrollPosition);
                            }
                        });
                        this._listView._writeProfilerMark(perfId + ",StopTM");
                        return Promise.cancel;
                    }

                    return new Promise(function (c) {
                        var renderingCompleteSignal = new _Signal();

                        function complete() {
                            c();
                            renderingCompleteSignal.complete();
                        }

                        function viewPortPageRealized() {
                            that._listView._hideProgressBar();
                            that._state.setLoadingState(that._listView._LoadingState.viewPortLoaded);
                            if (that._executeAnimations) {
                                that._setState(RealizingAnimatingState, renderingCompleteSignal.promise);
                            }
                        }

                        function pageRealized(count) {
                            that._updateAriaMarkers(count === 0, that.firstIndexDisplayed, that.lastIndexDisplayed);
                            that._state.setLoadingState && that._state.setLoadingState(that._listView._LoadingState.itemsLoaded);
                        }

                        function finish(count) {
                            that._listView._clearInsertedItems();
                            that._listView._groups.removeElements();
                            viewPortPageRealized();
                            pageRealized(count);
                            complete();
                        }

                        that._state.setLoadingState(that._listView._LoadingState.itemsLoading);
                        if (that._firstLayoutPass) {
                            that._listView._showProgressBar(that._listView._element, "50%", "50%");
                        }

                        var count = that.containers.length;

                        if (count) {
                            // While the zoom animation is played we want to minimize the # of pages
                            // being fetched to improve TtFF for SeZo scenarios
                            var pagesToPrefetch = _VirtualizeContentsView._pagesToPrefetch;
                            var customPagesToPrefetchMax = _VirtualizeContentsView._customPagesToPrefetchMax;
                            var customPagesToPrefetchMin = _VirtualizeContentsView._customPagesToPrefetchMin;
                            if (that._listView._zooming) {
                                pagesToPrefetch = 0;
                                customPagesToPrefetchMax = 0;
                                customPagesToPrefetchMin = 0;
                            }

                            var viewportLength = that._listView._getViewportLength();
                            var pagesBefore, pagesAfter;

                            if (_BaseUtils._isiOS && !_VirtualizeContentsView._disableCustomPagesPrefetch) {
                                pagesBefore = (that._direction === "left" ? customPagesToPrefetchMax : customPagesToPrefetchMin);

                                // Optimize the beginning of the list such that if you scroll, then change direction and start going back towards the beginning of the list,
                                // we maintain a remainder of pages that can be added to pagesAfter. This ensures that at beginning of the list, which is the common case,
                                // we always have customPagesToPrefetchMax ahead, even when the scrolling direction is constantly changing.
                                var pagesShortBehind = Math.max(0, (pagesBefore - (that._scrollbarPos / viewportLength)));
                                pagesAfter = Math.min(customPagesToPrefetchMax, pagesShortBehind + (that._direction === "right" ? customPagesToPrefetchMax : customPagesToPrefetchMin));
                            } else {
                                pagesBefore = pagesToPrefetch;
                                pagesAfter = pagesToPrefetch;
                            }

                            var beginningOffset = Math.max(0, that._scrollbarPos - pagesBefore * viewportLength),
                                  endingOffset = that._scrollbarPos + (1 + pagesAfter) * viewportLength;

                            var range = that._listView._layout.itemsFromRange(beginningOffset, endingOffset - 1);
                            if ((range.firstIndex < 0 || range.firstIndex >= count) && (range.lastIndex < 0 || range.lastIndex >= count)) {
                                that.begin = -1;
                                that.end = -1;
                                that.firstIndexDisplayed = -1;
                                that.lastIndexDisplayed = -1;
                                finish(count);
                            } else {
                                var begin = _ElementUtilities._clamp(range.firstIndex, 0, count - 1),
                                    end = _ElementUtilities._clamp(range.lastIndex + 1, 0, count);

                                var inView = that._listView._layout.itemsFromRange(that._scrollbarPos, that._scrollbarPos + viewportLength - 1),
                                    firstInView = _ElementUtilities._clamp(inView.firstIndex, 0, count - 1),
                                    lastInView = _ElementUtilities._clamp(inView.lastIndex, 0, count - 1);

                                if (that._realizationLevel === _VirtualizeContentsView._realizationLevel.skip && !that.lastRealizePass && firstInView === that.firstIndexDisplayed && lastInView === that.lastIndexDisplayed) {
                                    that.begin = begin;
                                    that.end = begin + Object.keys(that.items._itemData).length;
                                    that._updateHeaders(that._listView._canvas, that.begin, that.end).done(function () {
                                        that.lastRealizePass = null;
                                        finish(count);
                                    });
                                } else if ((that._forceRelayout || begin !== that.begin || end !== that.end || firstInView !== that.firstIndexDisplayed || lastInView !== that.lastIndexDisplayed) && (begin < end) && (beginningOffset < endingOffset)) {
                                    that._listView._writeProfilerMark("realizePage currentInView(" + firstInView + "-" + lastInView + ") previousInView(" + that.firstIndexDisplayed + "-" + that.lastIndexDisplayed + ") change(" + (firstInView - that.firstIndexDisplayed) + "),info");
                                    that._cancelRealize();
                                    // cancelRealize changes the realizePass and resets begin/end
                                    var currentPass = that._realizePass;
                                    that.begin = begin;
                                    that.end = end;
                                    that.firstIndexDisplayed = firstInView;
                                    that.lastIndexDisplayed = lastInView;
                                    that.deletesWithoutRealize = 0;

                                    that._ensureItemsBlocksInDOM(that.begin, that.end);

                                    var realizeWork = that._realizeItems(
                                        that._listView._itemCanvas,
                                        that.begin,
                                        that.end,
                                        count,
                                        currentPass,
                                        that._scrollbarPos,
                                        that._direction,
                                        firstInView,
                                        lastInView,
                                        that._forceRelayout);

                                    that._forceRelayout = false;

                                    var realizePassWork = realizeWork.viewportItemsRealized.then(function () {
                                        viewPortPageRealized();
                                        return realizeWork.allItemsRealized;
                                    }).then(function () {
                                        if (that._realizePass === currentPass) {
                                            return that._updateHeaders(that._listView._canvas, that.begin, that.end).then(function () {
                                                pageRealized(count);
                                            });
                                        }
                                    }).then(function () {
                                        return realizeWork.loadingCompleted;
                                    }).then(
                                        function () {
                                            that._unrealizeExcessiveItems();
                                            that.lastRealizePass = null;
                                            complete();
                                        },
                                        function (e) {
                                            if (that._realizePass === currentPass) {
                                                that.lastRealizePass = null;
                                                that.begin = -1;
                                                that.end = -1;
                                            }
                                            return Promise.wrapError(e);
                                        }
                                    );

                                    that.lastRealizePass = Promise.join([realizeWork.viewportItemsRealized, realizeWork.allItemsRealized, realizeWork.loadingCompleted, realizePassWork]);

                                    that._unrealizeExcessiveItems();

                                } else if (!that.lastRealizePass) {
                                    // We are currently in the "itemsLoading" state and need to get back to "complete". The
                                    // previous realize pass has been completed so proceed to the other states.
                                    finish(count);
                                } else {
                                    that.lastRealizePass.then(complete);
                                }
                            }
                        } else {
                            that.begin = -1;
                            that.end = -1;
                            that.firstIndexDisplayed = -1;
                            that.lastIndexDisplayed = -1;

                            finish(count);
                        }

                        that._reportElementsLevel(that._direction);

                        that._listView._writeProfilerMark(perfId + ",StopTM");
                    });
                },

                realizePage: function VirtualizeContentsView_realizePage(scrollToFunctor, forceRelayout, scrollEndPromise, StateType) {
                    this._scrollToFunctor = makeFunctor(scrollToFunctor);
                    this._forceRelayout = this._forceRelayout || forceRelayout;
                    this._scrollEndPromise = scrollEndPromise;

                    this._listView._writeProfilerMark(this._state.name + "_realizePage,info");
                    this._state.realizePage(StateType || RealizingState);
                },

                onScroll: function VirtualizeContentsView_onScroll(scrollToFunctor, scrollEndPromise) {
                    this.realizePage(scrollToFunctor, false, scrollEndPromise, ScrollingState);
                },

                reload: function VirtualizeContentsView_reload(scrollToFunctor, highPriority) {
                    if (this._listView._isZombie()) { return; }

                    this._scrollToFunctor = makeFunctor(scrollToFunctor);
                    this._forceRelayout = true;
                    this._highPriorityRealize = !!highPriority;

                    this.stopWork(true);

                    this._listView._writeProfilerMark(this._state.name + "_rebuildTree,info");
                    this._state.rebuildTree();
                },

                refresh: function VirtualizeContentsView_refresh(scrollToFunctor) {
                    if (this._listView._isZombie()) { return; }

                    this._scrollToFunctor = makeFunctor(scrollToFunctor);
                    this._forceRelayout = true;
                    this._highPriorityRealize = true;

                    this.stopWork();

                    this._listView._writeProfilerMark(this._state.name + "_relayout,info");
                    this._state.relayout();
                },

                waitForValidScrollPosition: function VirtualizeContentsView_waitForValidScrollPosition(newPosition) {
                    var that = this;
                    var currentMaxScroll = this._listView._viewport[this._listView._scrollLength] - this._listView._getViewportLength();
                    if (newPosition > currentMaxScroll) {
                        return that._listView._itemsCount().then(function (count) {
                            // Wait until we have laid out enough containers to be able to set the scroll position to newPosition
                            if (that.containers.length < count) {
                                return Promise._cancelBlocker(that._creatingContainersWork && that._creatingContainersWork.promise).then(function () {
                                    return that._getLayoutCompleted();
                                }).then(function () {
                                    return newPosition;
                                });
                            } else {
                                return newPosition;
                            }
                        });
                    } else {
                        return Promise.wrap(newPosition);
                    }
                },

                waitForEntityPosition: function VirtualizeContentsView_waitForEntityPosition(entity) {
                    var that = this;
                    if (entity.type === _UI.ObjectType.listHeader || entity.type === _UI.ObjectType.listFooter) {
                        // Headers and footers are always laid out by the ListView as soon as it gets them, so there's nothing to wait on
                        return Promise.wrap();
                    }
                    this._listView._writeProfilerMark(this._state.name + "_waitForEntityPosition" + "(" + entity.type + ": " + entity.index + ")" + ",info");
                    return Promise._cancelBlocker(this._state.waitForEntityPosition(entity).then(function () {
                        if ((entity.type !== _UI.ObjectType.groupHeader && entity.index >= that.containers.length) ||
                            (entity.type === _UI.ObjectType.groupHeader && that._listView._groups.group(entity.index).startIndex >= that.containers.length)) {
                            return that._creatingContainersWork && that._creatingContainersWork.promise;
                        }
                    }).then(function () {
                        return that._getLayoutCompleted();
                    }));
                },

                stopWork: function VirtualizeContentsView_stopWork(stopTreeCreation) {
                    this._listView._writeProfilerMark(this._state.name + "_stop,info");
                    this._state.stop(stopTreeCreation);

                    if (this._layoutWork) {
                        this._layoutWork.cancel();
                    }

                    if (stopTreeCreation && this._creatingContainersWork) {
                        this._creatingContainersWork.cancel();
                    }

                    if (stopTreeCreation) {
                        this._state = new CreatedState(this);
                    }
                },

                _cancelRealize: function VirtualizeContentsView_cancelRealize() {
                    this._listView._writeProfilerMark("_cancelRealize,StartTM");

                    if (this.lastRealizePass || this.deferTimeout) {
                        this._forceRelayout = true;
                    }

                    this._clearDeferTimeout();
                    this._realizePass++;

                    if (this._headerRenderPromises) {
                        this._headerRenderPromises.cancel();
                        this._headerRenderPromises = null;
                    }

                    var last = this.lastRealizePass;
                    if (last) {
                        this.lastRealizePass = null;
                        this.begin = -1;
                        this.end = -1;
                        last.cancel();
                    }
                    this._listView._writeProfilerMark("_cancelRealize,StopTM");
                },

                resetItems: function VirtualizeContentsView_resetItems(unparent) {
                    if (!this._listView._isZombie()) {
                        this.firstIndexDisplayed = -1;
                        this.lastIndexDisplayed = -1;
                        this._runningAnimations = null;
                        this._executeAnimations = false;

                        var listView = this._listView;
                        this._firstLayoutPass = true;
                        listView._unsetFocusOnItem();
                        if (listView._currentMode().onDataChanged) {
                            listView._currentMode().onDataChanged();
                        }

                        this.items.each(function (index, item) {
                            if (unparent && item.parentNode && item.parentNode.parentNode) {
                                item.parentNode.parentNode.removeChild(item.parentNode);
                            }
                            listView._itemsManager.releaseItem(item);
                            _Dispose._disposeElement(item);
                        });

                        this.items.removeItems();
                        this._deferredReparenting = [];

                        if (unparent) {
                            listView._groups.removeElements();
                        }

                        listView._clearInsertedItems();
                    }
                },

                reset: function VirtualizeContentsView_reset() {
                    this.stopWork(true);
                    this._state = new CreatedState(this);

                    this.resetItems();

                    // when in the zombie state, we let disposal cleanup the ScrollView state
                    //
                    if (!this._listView._isZombie()) {
                        var listView = this._listView;
                        listView._groups.resetGroups();
                        listView._resetCanvas();

                        this.tree = null;
                        this.keyToGroupIndex = null;
                        this.containers = null;
                        this._expandedRange = null;
                    }
                },

                cleanUp: function VirtualizeContentsView_cleanUp() {
                    this.stopWork(true);

                    this._runningAnimations && this._runningAnimations.cancel();
                    var itemsManager = this._listView._itemsManager;
                    this.items.each(function (index, item) {
                        itemsManager.releaseItem(item);
                        _Dispose._disposeElement(item);
                    });
                    this._listView._unsetFocusOnItem();
                    this.items.removeItems();
                    this._deferredReparenting = [];
                    this._listView._groups.resetGroups();
                    this._listView._resetCanvas();

                    this.tree = null;
                    this.keyToGroupIndex = null;
                    this.containers = null;
                    this._expandedRange = null;

                    this.destroyed = true;
                },

                getContainer: function VirtualizeContentsView_getContainer(itemIndex) {
                    return this.containers[itemIndex];
                },

                _getHeaderContainer: function VirtualizeContentsView_getHeaderContainer(groupIndex) {
                    return this.tree[groupIndex].header;
                },

                _getGroups: function VirtualizeContentsView_getGroups(count) {
                    if (this._listView._groupDataSource) {
                        var groupsContainer = this._listView._groups.groups,
                            groups = [];
                        if (count) {
                            for (var i = 0, len = groupsContainer.length; i < len; i++) {
                                var group = groupsContainer[i],
                                    nextStartIndex = i + 1 < len ? groupsContainer[i + 1].startIndex : count;
                                groups.push({
                                    key: group.key,
                                    size: nextStartIndex - group.startIndex
                                });
                            }
                        }
                        return groups;
                    } else {
                        return [{ key: "-1", size: count }];
                    }
                },

                _createChunk: function VirtualizeContentsView_createChunk(groups, count, chunkSize) {
                    var that = this;

                    this._listView._writeProfilerMark("createChunk,StartTM");

                    function addToGroup(itemsContainer, groupSize) {
                        var children = itemsContainer.element.children,
                            oldSize = children.length,
                            toAdd = Math.min(groupSize - itemsContainer.items.length, chunkSize);

                        _SafeHtml.insertAdjacentHTMLUnsafe(itemsContainer.element, "beforeend", _Helpers._repeat("<div class='win-container win-backdrop'></div>", toAdd));

                        for (var i = 0; i < toAdd; i++) {
                            var container = children[oldSize + i];
                            itemsContainer.items.push(container);
                            that.containers.push(container);
                        }
                    }

                    function newGroup(group) {
                        var node = {
                            header: that._listView._groupDataSource ? that._createHeaderContainer() : null,
                            itemsContainer: {
                                element: that._createItemsContainer(),
                                items: []
                            }
                        };


                        that.tree.push(node);
                        that.keyToGroupIndex[group.key] = that.tree.length - 1;
                        addToGroup(node.itemsContainer, group.size);
                    }

                    if (this.tree.length && this.tree.length <= groups.length) {
                        var last = this.tree[this.tree.length - 1],
                            finalSize = groups[this.tree.length - 1].size;

                        // check if the last group in the tree already has all items. If not add items to this group
                        if (last.itemsContainer.items.length < finalSize) {
                            addToGroup(last.itemsContainer, finalSize);
                            this._listView._writeProfilerMark("createChunk,StopTM");
                            return;
                        }
                    }

                    if (this.tree.length < groups.length) {
                        newGroup(groups[this.tree.length]);
                    }

                    this._listView._writeProfilerMark("createChunk,StopTM");
                },

                _createChunkWithBlocks: function VirtualizeContentsView_createChunkWithBlocks(groups, count, blockSize, chunkSize) {
                    var that = this;
                    this._listView._writeProfilerMark("createChunk,StartTM");

                    function addToGroup(itemsContainer, toAdd) {
                        var indexOfNextGroupItem;
                        var lastExistingBlock = itemsContainer.itemsBlocks.length ? itemsContainer.itemsBlocks[itemsContainer.itemsBlocks.length - 1] : null;

                        toAdd = Math.min(toAdd, chunkSize);

                        // 1) Add missing containers to the latest itemsblock if it was only partially filled during the previous pass.
                        if (lastExistingBlock && lastExistingBlock.items.length < blockSize) {
                            var emptySpotsToFill = Math.min(toAdd, blockSize - lastExistingBlock.items.length),
                                sizeOfOldLastBlock = lastExistingBlock.items.length,

                            indexOfNextGroupItem = (itemsContainer.itemsBlocks.length - 1) * blockSize + sizeOfOldLastBlock;
                            var containersMarkup = _Helpers._stripedContainers(emptySpotsToFill, indexOfNextGroupItem);

                            _SafeHtml.insertAdjacentHTMLUnsafe(lastExistingBlock.element, "beforeend", containersMarkup);
                            children = lastExistingBlock.element.children;

                            for (var j = 0; j < emptySpotsToFill; j++) {
                                var child = children[sizeOfOldLastBlock + j];
                                lastExistingBlock.items.push(child);
                                that.containers.push(child);
                            }

                            toAdd -= emptySpotsToFill;
                        }
                        indexOfNextGroupItem = itemsContainer.itemsBlocks.length * blockSize;

                        // 2) Generate as many full itemblocks of containers as we can.
                        var newBlocksCount = Math.floor(toAdd / blockSize),
                            markup = "",
                            firstBlockFirstItemIndex = indexOfNextGroupItem,
                            secondBlockFirstItemIndex = indexOfNextGroupItem + blockSize;

                        if (newBlocksCount > 0) {
                            var pairOfItemBlocks = [
                                // Use pairs to ensure that the container striping pattern is maintained regardless if blockSize is even or odd.
                                "<div class='win-itemsblock'>" + _Helpers._stripedContainers(blockSize, firstBlockFirstItemIndex) + "</div>",
                                "<div class='win-itemsblock'>" + _Helpers._stripedContainers(blockSize, secondBlockFirstItemIndex) + "</div>"
                            ];
                            markup = _Helpers._repeat(pairOfItemBlocks, newBlocksCount);
                            indexOfNextGroupItem += (newBlocksCount * blockSize);
                        }

                        // 3) Generate and partially fill, one last itemblock if there are any remaining containers to add.
                        var sizeOfNewLastBlock = toAdd % blockSize;
                        if (sizeOfNewLastBlock > 0) {
                            markup += "<div class='win-itemsblock'>" + _Helpers._stripedContainers(sizeOfNewLastBlock, indexOfNextGroupItem) + "</div>";
                            indexOfNextGroupItem += sizeOfNewLastBlock;
                            newBlocksCount++;
                        }

                        var blocksTemp = _Global.document.createElement("div");
                        _SafeHtml.setInnerHTMLUnsafe(blocksTemp, markup);
                        var children = blocksTemp.children;

                        for (var i = 0; i < newBlocksCount; i++) {
                            var block = children[i],
                                blockNode = {
                                    element: block,
                                    items: _Helpers._nodeListToArray(block.children)
                                };
                            itemsContainer.itemsBlocks.push(blockNode);
                            for (var n = 0; n < blockNode.items.length; n++) {
                                that.containers.push(blockNode.items[n]);
                            }
                        }
                    }

                    function newGroup(group) {
                        var node = {
                            header: that._listView._groupDataSource ? that._createHeaderContainer() : null,
                            itemsContainer: {
                                element: that._createItemsContainer(),
                                itemsBlocks: []
                            }
                        };

                        that.tree.push(node);
                        that.keyToGroupIndex[group.key] = that.tree.length - 1;

                        addToGroup(node.itemsContainer, group.size);
                    }

                    if (this.tree.length && this.tree.length <= groups.length) {
                        var lastContainer = this.tree[this.tree.length - 1].itemsContainer,
                            finalSize = groups[this.tree.length - 1].size,
                            currentSize = 0;

                        if (lastContainer.itemsBlocks.length) {
                            currentSize = (lastContainer.itemsBlocks.length - 1) * blockSize + lastContainer.itemsBlocks[lastContainer.itemsBlocks.length - 1].items.length;
                        }

                        if (currentSize < finalSize) {
                            addToGroup(lastContainer, finalSize - currentSize);
                            this._listView._writeProfilerMark("createChunk,StopTM");
                            return;
                        }
                    }

                    if (this.tree.length < groups.length) {
                        newGroup(groups[this.tree.length]);
                    }

                    this._listView._writeProfilerMark("createChunk,StopTM");
                },

                _generateCreateContainersWorker: function VirtualizeContentsView_generateCreateContainersWorker() {
                    var that = this,
                        counter = 0,
                        skipWait = false;

                    return function work(info) {
                        if (!that._listView._versionManager.locked) {
                            that._listView._itemsCount().then(function (count) {
                                var zooming = !skipWait && shouldWaitForSeZo(that._listView);

                                if (!zooming) {
                                    if (that._listView._isZombie()) { return; }

                                    skipWait = false;

                                    var end = _BaseUtils._now() + _VirtualizeContentsView._createContainersJobTimeslice,
                                        groups = that._getGroups(count),
                                        startLength = that.containers.length,
                                        realizedToEnd = that.end === that.containers.length,
                                        chunkSize = _VirtualizeContentsView._chunkSize;

                                    do {
                                        that._blockSize ? that._createChunkWithBlocks(groups, count, that._blockSize, chunkSize) : that._createChunk(groups, count, chunkSize);
                                        counter++;
                                    } while (that.containers.length < count && _BaseUtils._now() < end);

                                    that._listView._writeProfilerMark("createContainers yields containers(" + that.containers.length + "),info");

                                    that._listView._affectedRange.add({ start: startLength, end: that.containers.length }, count);

                                    if (realizedToEnd) {
                                        that.stopWork();
                                        that._listView._writeProfilerMark(that._state.name + "_relayout,info");
                                        that._state.relayout();
                                    } else {
                                        that._listView._writeProfilerMark(that._state.name + "_layoutNewContainers,info");
                                        that._state.layoutNewContainers();
                                    }

                                    if (that.containers.length < count) {
                                        info.setWork(work);
                                    } else {
                                        that._listView._writeProfilerMark("createContainers completed steps(" + counter + "),info");
                                        that._creatingContainersWork.complete();
                                    }
                                } else {
                                    // Waiting on zooming
                                    info.setPromise(waitForSeZo(that._listView).then(function (timedOut) {
                                        skipWait = timedOut;
                                        return work;
                                    }));
                                }
                            });
                        } else {
                            // Version manager locked
                            info.setPromise(that._listView._versionManager.unlocked.then(function () {
                                return work;
                            }));
                        }
                    };
                },

                _scheduleLazyTreeCreation: function VirtualizeContentsView_scheduleLazyTreeCreation() {
                    return Scheduler.schedule(this._generateCreateContainersWorker(), Scheduler.Priority.idle, this, "WinJS.UI.ListView.LazyTreeCreation");
                },

                _createContainers: function VirtualizeContentsView_createContainers() {
                    this.tree = null;
                    this.keyToGroupIndex = null;
                    this.containers = null;
                    this._expandedRange = null;

                    var that = this,
                        count;

                    return this._listView._itemsCount().then(function (c) {
                        if (c === 0) {
                            that._listView._hideProgressBar();
                        }
                        count = c;
                        that._listView._writeProfilerMark("createContainers(" + count + "),StartTM");
                        if (that._listView._groupDataSource) {
                            return that._listView._groups.initialize();
                        }
                    }).then(function () {
                        that._listView._writeProfilerMark("numberOfItemsPerItemsBlock,StartTM");
                        return (count && that._listView._groups.length() ? that._listView._layout.numberOfItemsPerItemsBlock : null);
                    }).then(function (blockSize) {
                        that._listView._writeProfilerMark("numberOfItemsPerItemsBlock(" + blockSize + "),info");
                        that._listView._writeProfilerMark("numberOfItemsPerItemsBlock,StopTM");

                        that._listView._resetCanvas();

                        that.tree = [];
                        that.keyToGroupIndex = {};
                        that.containers = [];
                        that._blockSize = blockSize;

                        var groups = that._getGroups(count);

                        var end = _BaseUtils._now() + _VirtualizeContentsView._maxTimePerCreateContainers,
                            chunkSize = Math.min(_VirtualizeContentsView._startupChunkSize, _VirtualizeContentsView._chunkSize);
                        var stop;
                        do {
                            stop = blockSize ? that._createChunkWithBlocks(groups, count, blockSize, chunkSize) : that._createChunk(groups, count, chunkSize);
                        } while (_BaseUtils._now() < end && that.containers.length < count && !stop);

                        that._listView._writeProfilerMark("createContainers created(" + that.containers.length + "),info");

                        that._listView._affectedRange.add({ start: 0, end: that.containers.length }, count);

                        if (that.containers.length < count) {
                            var jobNode = that._scheduleLazyTreeCreation();

                            that._creatingContainersWork.promise.done(null, function () {
                                jobNode.cancel();
                            });
                        } else {
                            that._listView._writeProfilerMark("createContainers completed synchronously,info");
                            that._creatingContainersWork.complete();
                        }

                        that._listView._writeProfilerMark("createContainers(" + count + "),StopTM");
                    });
                },

                _updateItemsBlocks: function VirtualizeContentsView_updateItemsBlocks(blockSize) {
                    var that = this;
                    var usingStructuralNodes = !!blockSize;

                    function createNewBlock() {
                        var element = _Global.document.createElement("div");
                        element.className = _Constants._itemsBlockClass;
                        return element;
                    }

                    function updateGroup(itemsContainer, startIndex) {
                        var blockElements = [],
                            itemsCount = 0,
                            blocks = itemsContainer.itemsBlocks,
                            b;

                        function rebuildItemsContainer() {
                            itemsContainer.itemsBlocks = null;
                            itemsContainer.items = [];
                            for (var i = 0; i < itemsCount; i++) {
                                var container = that.containers[startIndex + i];
                                itemsContainer.element.appendChild(container);
                                itemsContainer.items.push(container);
                            }
                        }

                        function rebuildItemsContainerWithBlocks() {
                            itemsContainer.itemsBlocks = [{
                                element: blockElements.length ? blockElements.shift() : createNewBlock(),
                                items: []
                            }];
                            var currentBlock = itemsContainer.itemsBlocks[0];
                            for (var i = 0; i < itemsCount; i++) {
                                if (currentBlock.items.length === blockSize) {
                                    var nextBlock = blockElements.length ? blockElements.shift() : createNewBlock();
                                    itemsContainer.itemsBlocks.push({
                                        element: nextBlock,
                                        items: []
                                    });
                                    currentBlock = itemsContainer.itemsBlocks[itemsContainer.itemsBlocks.length - 1];
                                }

                                var container = that.containers[startIndex + i];
                                currentBlock.element.appendChild(container);
                                currentBlock.items.push(container);
                            }
                            itemsContainer.items = null;
                        }

                        if (blocks) {
                            for (b = 0; b < blocks.length; b++) {
                                itemsCount += blocks[b].items.length;
                                blockElements.push(blocks[b].element);
                            }
                        } else {
                            itemsCount = itemsContainer.items.length;
                        }

                        if (usingStructuralNodes) {
                            rebuildItemsContainerWithBlocks();
                        } else {
                            rebuildItemsContainer();
                        }

                        for (b = 0; b < blockElements.length; b++) {
                            var block = blockElements[b];
                            if (block.parentNode === itemsContainer.element) {
                                itemsContainer.element.removeChild(block);
                            }
                        }

                        return itemsCount;
                    }

                    for (var g = 0, startIndex = 0; g < this.tree.length; g++) {
                        startIndex += updateGroup(this.tree[g].itemsContainer, startIndex);
                    }

                    that._blockSize = blockSize;
                },

                _layoutItems: function VirtualizeContentsView_layoutItems() {
                    var that = this;
                    return this._listView._itemsCount().then(function () {
                        return Promise.as(that._listView._layout.numberOfItemsPerItemsBlock).then(function (blockSize) {
                            that._listView._writeProfilerMark("numberOfItemsPerItemsBlock(" + blockSize + "),info");
                            if (blockSize !== that._blockSize) {
                                that._updateItemsBlocks(blockSize);
                                that._listView._itemsBlockExtent = -1;
                            }

                            var affectedRange = that._listView._affectedRange.get();
                            var changedRange;

                            // We accumulate all changes that occur between layouts in _affectedRange. If layout is interrupted due to additional
                            // modifications, _affectedRange will become the union of the previous range of changes and the new range of changes
                            // and will be passed to layout again. _affectedRange is reset whenever layout completes.
                            if (affectedRange) {
                                changedRange = {
                                    // _affectedRange is stored in the format [start, end), layout expects a range in the form of [firstIndex , lastIndex]
                                    // To ensure that layout can successfully use the expected range to find all of the groups which need to be re-laid out
                                    // we will pad an extra index at the front end such that layout receives [start - 1, end] in form of [lastIndex, firstIndex].
                                    firstIndex: Math.max(affectedRange.start - 1, 0),
                                    lastIndex: Math.min(that.containers.length - 1, affectedRange.end) // Account for any constrained upper limits from lazily loaded win-container's.
                                };
                                if (changedRange.firstIndex < that.containers.length || that.containers.length === 0) {
                                    return that._listView._layout.layout(that.tree, changedRange,
                                        that._modifiedElements || [], that._modifiedGroups || []);
                                }
                            }

                            // There is nothing to layout.
                            that._listView._affectedRange.clear();
                            return {
                                realizedRangeComplete: Promise.wrap(),
                                layoutComplete: Promise.wrap()
                            };
                        });
                    });
                },

                updateTree: function VirtualizeContentsView_updateTree(count, delta, modifiedElements) {
                    this._listView._writeProfilerMark(this._state.name + "_updateTree,info");
                    return this._state.updateTree(count, delta, modifiedElements);
                },

                _updateTreeImpl: function VirtualizeContentsView_updateTreeImpl(count, delta, modifiedElements, skipUnrealizeItems) {
                    this._executeAnimations = true;
                    this._modifiedElements = modifiedElements;

                    if (modifiedElements.handled) {
                        return;
                    }
                    modifiedElements.handled = true;

                    this._listView._writeProfilerMark("_updateTreeImpl,StartTM");

                    var that = this,
                        i;

                    if (!skipUnrealizeItems) {
                        // If we skip unrealize items, this work will eventually happen when we reach the UnrealizingState. Sometimes,
                        // it is appropriate to defer the unrealize work in order to optimize scenarios (e.g, edits that happen when we are
                        // in the CompletedState, that way the animation can start sooner).
                        this._unrealizeItems();
                    }

                    function removeElements(array) {
                        for (var i = 0, len = array.length; i < len; i++) {
                            var itemBox = array[i];
                            itemBox.parentNode.removeChild(itemBox);
                        }
                    }

                    for (var i = 0, len = modifiedElements.length; i < len; i++) {
                        if (modifiedElements[i]._itemBox && modifiedElements[i]._itemBox.parentNode) {
                            _ElementUtilities.removeClass(modifiedElements[i]._itemBox.parentNode, _Constants._selectedClass);
                        }
                    }

                    this.items.each(function (index, item, itemData) {
                        itemData.container && _ElementUtilities.removeClass(itemData.container, _Constants._selectedClass);
                        itemData.container && _ElementUtilities.addClass(itemData.container, _Constants._backdropClass);
                    });

                    var removedGroups = this._listView._updateContainers(this._getGroups(count), count, delta, modifiedElements);

                    removeElements(removedGroups.removedHeaders);
                    removeElements(removedGroups.removedItemsContainers);

                    for (var i = 0, len = modifiedElements.length; i < len; i++) {
                        var modifiedElement = modifiedElements[i];
                        if (modifiedElement.newIndex !== -1) {
                            modifiedElement.element = this.getContainer(modifiedElement.newIndex);
                            if (!modifiedElement.element) {
                                throw "Container missing after updateContainers.";
                            }
                        } else {
                            _ElementUtilities.removeClass(modifiedElement.element, _Constants._backdropClass);
                        }
                    }

                    // We only need to restore focus if the current focus is within surface
                    var activeElement = _Global.document.activeElement;
                    if (this._listView._canvas.contains(activeElement)) {
                        this._requireFocusRestore = activeElement;
                    }

                    this._deferredReparenting = [];
                    this.items.each(function (index, item, itemData) {
                        var container = that.getContainer(index),
                            itemBox = itemData.itemBox;

                        if (itemBox && container) {
                            itemData.container = container;
                            if (itemBox.parentNode !== container) {
                                if (index >= that.firstIndexDisplayed && index <= that.lastIndexDisplayed) {
                                    that._appendAndRestoreFocus(container, itemBox);
                                } else {
                                    that._deferredReparenting.push({ itemBox: itemBox, container: container });
                                }
                            }
                            _ElementUtilities.removeClass(container, _Constants._backdropClass);

                            _ElementUtilities[that._listView.selection._isIncluded(index) ? "addClass" : "removeClass"](container, _Constants._selectedClass);
                            if (!that._listView.selection._isIncluded(index) && _ElementUtilities.hasClass(itemBox, _Constants._selectedClass)) {
                                _ItemEventsHandler._ItemEventsHandler.renderSelection(itemBox, itemData.element, false, true);
                            }
                        }
                    });

                    this._listView._writeProfilerMark("_updateTreeImpl,StopTM");
                },

                _completeUpdateTree: function () {
                    if (this._deferredReparenting) {
                        var deferredCount = this._deferredReparenting.length;
                        if (deferredCount > 0) {
                            var perfId = "_completeReparenting(" + deferredCount + ")";
                            this._listView._writeProfilerMark(perfId + ",StartTM");
                            var deferredItem;
                            for (var i = 0; i < deferredCount; i++) {
                                deferredItem = this._deferredReparenting[i];
                                this._appendAndRestoreFocus(deferredItem.container, deferredItem.itemBox);
                            }
                            this._deferredReparenting = [];
                            this._listView._writeProfilerMark(perfId + ",StopTM");
                        }
                    }
                    this._requireFocusRestore = null;
                },

                _appendAndRestoreFocus: function VirtualizeContentsView_appendAndRestoreFocus(container, itemBox) {
                    if (itemBox.parentNode !== container) {
                        var activeElement;
                        if (this._requireFocusRestore) {
                            activeElement = _Global.document.activeElement;
                        }

                        if (this._requireFocusRestore && this._requireFocusRestore === activeElement && (container.contains(activeElement) || itemBox.contains(activeElement))) {
                            this._listView._unsetFocusOnItem();
                            activeElement = _Global.document.activeElement;
                        }

                        _ElementUtilities.empty(container);
                        container.appendChild(itemBox);

                        if (this._requireFocusRestore && activeElement === this._listView._keyboardEventsHelper) {
                            var focused = this._listView._selection._getFocused();
                            if (focused.type === _UI.ObjectType.item && this.items.itemBoxAt(focused.index) === itemBox) {
                                _ElementUtilities._setActive(this._requireFocusRestore);
                                this._requireFocusRestore = null;
                            }
                        }
                    }
                },

                _startAnimations: function VirtualizeContentsView_startAnimations() {
                    this._listView._writeProfilerMark("startAnimations,StartTM");

                    var that = this;
                    this._hasAnimationInViewportPending = false;
                    var animationPromise = Promise.as(this._listView._layout.executeAnimations()).then(function () {
                        that._listView._writeProfilerMark("startAnimations,StopTM");
                    });
                    return animationPromise;
                },

                _setState: function VirtualizeContentsView_setState(NewStateType, arg) {
                    if (!this._listView._isZombie()) {
                        var prevStateName = this._state.name;
                        this._state = new NewStateType(this, arg);
                        this._listView._writeProfilerMark(this._state.name + "_enter from(" + prevStateName + "),info");
                        this._state.enter();
                    }
                },

                getAdjacent: function VirtualizeContentsView_getAdjacent(currentFocus, direction) {
                    var that = this;
                    return this.waitForEntityPosition(currentFocus).then(function () {
                        return that._listView._layout.getAdjacent(currentFocus, direction);
                    });
                },

                hitTest: function VirtualizeContentsView_hitTest(x, y) {
                    if (!this._realizedRangeLaidOut) {
                        var retVal = this._listView._layout.hitTest(x, y);
                        retVal.index = _ElementUtilities._clamp(retVal.index, -1, this._listView._cachedCount - 1, 0);
                        retVal.insertAfterIndex = _ElementUtilities._clamp(retVal.insertAfterIndex, -1, this._listView._cachedCount - 1, 0);
                        return retVal;
                    } else {
                        return {
                            index: -1,
                            insertAfterIndex: -1
                        };
                    }
                },

                _createTreeBuildingSignal: function VirtualizeContentsView__createTreeBuildingSignal() {
                    if (!this._creatingContainersWork) {
                        this._creatingContainersWork = new _Signal();

                        var that = this;
                        this._creatingContainersWork.promise.done(
                            function () {
                                that._creatingContainersWork = null;
                            },
                            function () {
                                that._creatingContainersWork = null;
                            }
                        );
                    }
                },

                _createLayoutSignal: function VirtualizeContentsView_createLayoutSignal() {
                    var that = this;

                    if (!this._layoutCompleted) {
                        this._layoutCompleted = new _Signal();

                        this._layoutCompleted.promise.done(
                            function () {
                                that._layoutCompleted = null;
                            },
                            function () {
                                that._layoutCompleted = null;
                            }
                        );
                    }

                    if (!this._realizedRangeLaidOut) {
                        this._realizedRangeLaidOut = new _Signal();
                        this._realizedRangeLaidOut.promise.done(
                            function () {
                                that._realizedRangeLaidOut = null;
                            },
                            function () {
                                that._realizedRangeLaidOut = null;
                            }
                        );
                    }
                },

                _getLayoutCompleted: function VirtualizeContentsView_getLayoutCompleted() {
                    return this._layoutCompleted ? Promise._cancelBlocker(this._layoutCompleted.promise) : Promise.wrap();
                },

                _createSurfaceChild: function VirtualizeContentsView_createSurfaceChild(className, insertAfter) {
                    var element = _Global.document.createElement("div");
                    element.className = className;
                    this._listView._canvas.insertBefore(element, insertAfter ? insertAfter.nextElementSibling : null);
                    return element;
                },

                _executeScrollToFunctor: function VirtualizeContentsView_executeScrollToFunctor() {
                    var that = this;
                    return Promise.as(this._scrollToFunctor ? this._scrollToFunctor() : null).then(function (scroll) {
                        that._scrollToFunctor = null;

                        scroll = scroll || {};
                        // _scrollbarPos is initialized to 0 in the constructor, and we only set it when a valid integer
                        // value is passed in order to account for cases when there is not a _scrollToFunctor
                        if (+scroll.position === scroll.position) {
                            that._scrollbarPos = scroll.position;
                        }
                        that._direction = scroll.direction || "right";
                    });
                }
            },{
                _pagesToPrefetch: 2,
                _customPagesToPrefetchMax: 6,
                _customPagesToPrefetchMin: 2,
                _disableCustomPagesPrefetch: false,
                _waitForSeZoIntervalDuration: 100,
                _waitForSeZoTimeoutDuration: 500,
                _chunkSize: 500,
                _startupChunkSize: 100,
                _maxTimePerCreateContainers: 5,
                _createContainersJobTimeslice: 15,
                _blocksToRelease:10,
                _realizationLevel: {
                    skip: "skip",
                    realize: "realize",
                    normal: "normal"
                }
            });


            function nop() { }

            /*
            View is in this state before reload is called so during startup, after datasource change etc.
            */

            var CreatedState = _Base.Class.define(function CreatedState_ctor(view) {
                this.view = view;
                this.view._createTreeBuildingSignal();
                this.view._createLayoutSignal();
            }, {
                name: 'CreatedState',
                enter: function CreatedState_enter() {
                    this.view._createTreeBuildingSignal();
                    this.view._createLayoutSignal();
                },
                stop: nop,
                realizePage: nop,
                rebuildTree: function CreatedState_rebuildTree() {
                    this.view._setState(BuildingState);
                },
                relayout: function CreatedState_relayout() {
                    this.view._setState(BuildingState);
                },
                layoutNewContainers: nop,
                waitForEntityPosition: function CreatedState_waitForEntityPosition() {
                    this.view._setState(BuildingState);
                    return this.view._getLayoutCompleted();
                },
                updateTree: nop
            });

            /*
            In this state View is building its DOM tree with win-container element for each item in the data set.
            To build the tree the view needs to know items count or for grouped case the count of groups and the
            count of items in each group. The view enters this state when the tree needs to be built during
            startup or rebuild after data source change and etc.

            BuildingState => LayingoutState | CreatedState
            */
            var BuildingState = _Base.Class.define(function BuildingState_ctor(view) {
                this.view = view;
            }, {
                name: 'BuildingState',
                enter: function BuildingState_enter() {
                    this.canceling = false;
                    this.view._createTreeBuildingSignal();
                    this.view._createLayoutSignal();

                    var that = this;

                    // Use a signal to guarantee that this.promise is set before the promise
                    // handler is executed.
                    var promiseStoredSignal = new _Signal();
                    this.promise = promiseStoredSignal.promise.then(function () {
                        return that.view._createContainers();
                    }).then(
                        function () {
                            that.view._setState(LayingoutState);
                        },
                        function (error) {
                            if (!that.canceling) {
                                // this is coming from layout. ListView is hidden. We need to raise complete and wait in initial state for further actions
                                that.view._setState(CreatedState);
                                that.view._listView._raiseViewComplete();
                            }
                            return Promise.wrapError(error);
                        }
                    );
                    promiseStoredSignal.complete();
                },
                stop: function BuildingState_stop() {
                    this.canceling = true;
                    this.promise.cancel();
                    this.view._setState(CreatedState);
                },
                realizePage: nop,
                rebuildTree: function BuildingState_rebuildTree() {
                    this.canceling = true;
                    this.promise.cancel();
                    this.enter();
                },
                relayout: nop,
                layoutNewContainers: nop,
                waitForEntityPosition: function BuildingState_waitForEntityPosition() {
                    return this.view._getLayoutCompleted();
                },
                updateTree: nop
            });

            /*
            In this state View waits for the layout to lay out win-container elements. The view enters this state
            after edits or resize.

            LayingoutState => RealizingState | BuildingState | CanceledState | CompletedState | LayoutCanceledState
            */
            var LayingoutState = _Base.Class.define(function LayingoutState_ctor(view, NextStateType) {
                this.view = view;
                this.nextStateType = NextStateType || RealizingState;
            }, {
                name: 'LayingoutState',
                enter: function LayingoutState_enter() {
                    var that = this;
                    this.canceling = false;
                    this.view._createLayoutSignal();

                    this.view._listView._writeProfilerMark(this.name + "_enter_layoutItems,StartTM");

                    // Use a signal to guarantee that this.promise is set before the promise
                    // handler is executed.
                    var promiseStoredSignal = new _Signal();
                    this.promise = promiseStoredSignal.promise.then(function () {
                        return that.view._layoutItems();
                    }).then(function (layoutPromises) {

                        // View is taking ownership of this promise and it will cancel it in stopWork
                        that.view._layoutWork = layoutPromises.layoutComplete;

                        return layoutPromises.realizedRangeComplete;
                    }).then(
                        function () {
                            that.view._listView._writeProfilerMark(that.name + "_enter_layoutItems,StopTM");

                            that.view._listView._clearInsertedItems();
                            that.view._setAnimationInViewportState(that.view._modifiedElements);
                            that.view._modifiedElements = [];
                            that.view._modifiedGroups = [];

                            that.view._realizedRangeLaidOut.complete();

                            that.view._layoutWork.then(function () {
                                that.view._listView._writeProfilerMark(that.name + "_enter_layoutCompleted,info");
                                that.view._listView._affectedRange.clear();
                                that.view._layoutCompleted.complete();
                            });

                            if (!that.canceling) {
                                that.view._setState(that.nextStateType);
                            }
                        },
                        function (error) {
                            that.view._listView._writeProfilerMark(that.name + "_enter_layoutCanceled,info");

                            if (!that.canceling) {
                                // Cancel is coming from layout itself so ListView is hidden or empty. In this case we want to raise loadingStateChanged
                                that.view.firstIndexDisplayed = that.view.lastIndexDisplayed = -1;
                                that.view._updateAriaMarkers(true, that.view.firstIndexDisplayed, that.view.lastIndexDisplayed);
                                that.view._setState(CompletedState);
                            }

                            return Promise.wrapError(error);
                        }
                    );
                    promiseStoredSignal.complete();

                    if (this.canceling) {
                        this.promise.cancel();
                    }
                },
                cancelLayout: function LayingoutState_cancelLayout(switchState) {
                    this.view._listView._writeProfilerMark(this.name + "_cancelLayout,info");
                    this.canceling = true;
                    if (this.promise) {
                        this.promise.cancel();
                    }
                    if (switchState) {
                        this.view._setState(LayoutCanceledState);
                    }
                },
                stop: function LayingoutState_stop() {
                    this.cancelLayout(true);
                },
                realizePage: nop,
                rebuildTree: function LayingoutState_rebuildTree() {
                    this.cancelLayout(false);
                    this.view._setState(BuildingState);
                },
                relayout: function LayingoutState_relayout() {
                    this.cancelLayout(false);
                    this.enter();
                },
                layoutNewContainers: function LayingoutState_layoutNewContainers() {
                    this.relayout();
                },
                waitForEntityPosition: function LayingoutState_waitForEntityPosition() {
                    return this.view._getLayoutCompleted();
                },
                updateTree: function LayingoutState_updateTree(count, delta, modifiedElements) {
                    return this.view._updateTreeImpl(count, delta, modifiedElements);
                }
            });


            /*
            View enters this state when layout is canceled.

            LayoutCanceledState => LayingoutState | BuildingState
            */
            var LayoutCanceledState = _Base.Class.define(function LayoutCanceledState_ctor(view) {
                this.view = view;
            }, {
                name: 'LayoutCanceledState',
                enter: nop,
                stop: nop,
                realizePage: function LayoutCanceledState_realizePage() {
                    this.relayout();
                },
                rebuildTree: function LayoutCanceledState_rebuildTree() {
                    this.view._setState(BuildingState);
                },
                relayout: function LayoutCanceledState_relayout() {
                    this.view._setState(LayingoutState);
                },
                layoutNewContainers: function LayoutCanceledState_layoutNewContainers() {
                    this.relayout();
                },
                waitForEntityPosition: function LayoutCanceledState_waitForEntityPosition() {
                    return this.view._getLayoutCompleted();
                },
                updateTree: function LayoutCanceledState_updateTree(count, delta, modifiedElements) {
                    return this.view._updateTreeImpl(count, delta, modifiedElements);
                }
            });

            /*
            Contents of items in the current viewport and prefetch area is realized during this stage.
            The view enters this state when items needs to be realized for instance during initialization, edits and resize.

            RealizingState => RealizingAnimatingState | UnrealizingState | LayingoutState | BuildingState | CanceledState
            */
            var RealizingState = _Base.Class.define(function RealizingState_ctor(view) {
                this.view = view;
                this.nextState = UnrealizingState;
                this.relayoutNewContainers = true;
            }, {
                name: 'RealizingState',
                enter: function RealizingState_enter() {
                    var that = this;
                    var promiseStoredSignal = new _Signal();
                    this.promise = promiseStoredSignal.promise.then(function () {
                        return that.view._executeScrollToFunctor();
                    }).then(function () {
                        that.relayoutNewContainers = false;
                        return Promise._cancelBlocker(that.view._realizePageImpl());
                    }).then(
                        function () {
                            if (that.view._state === that) {
                                that.view._completeUpdateTree();
                                that.view._listView._writeProfilerMark("RealizingState_to_UnrealizingState");
                                that.view._setState(that.nextState);
                            }
                        },
                        function (error) {
                            if (that.view._state === that && !that.canceling) {
                                that.view._listView._writeProfilerMark("RealizingState_to_CanceledState");
                                that.view._setState(CanceledState);
                            }
                            return Promise.wrapError(error);
                        }
                    );
                    promiseStoredSignal.complete();
                },
                stop: function RealizingState_stop() {
                    this.canceling = true;
                    this.promise.cancel();
                    this.view._cancelRealize();
                    this.view._setState(CanceledState);
                },
                realizePage: function RealizingState_realizePage() {
                    this.canceling = true;
                    this.promise.cancel();
                    this.enter();
                },
                rebuildTree: function RealizingState_rebuildTree() {
                    this.stop();
                    this.view._setState(BuildingState);
                },
                relayout: function RealizingState_relayout() {
                    this.stop();
                    this.view._setState(LayingoutState);
                },
                layoutNewContainers: function RealizingState_layoutNewContainers() {
                    if (this.relayoutNewContainers) {
                        this.relayout();
                    } else {
                        this.view._createLayoutSignal();
                        this.view._relayoutInComplete = true;
                    }
                },
                waitForEntityPosition: function RealizingState_waitForEntityPosition() {
                    return this.view._getLayoutCompleted();
                },
                updateTree: function RealizingState_updateTree(count, delta, modifiedElements) {
                    return this.view._updateTreeImpl(count, delta, modifiedElements);
                },
                setLoadingState: function RealizingState_setLoadingState(state) {
                    this.view._listView._setViewState(state);
                }
            });

            /*
            The view enters this state when the realize pass, animations or unrealizing was canceled or after newContainers have been laid out.
            In this state view waits for the next call from ListViewImpl. It can be scroll, edit etc.

            CanceledState => RealizingState | ScrollingState | LayingoutState | BuildingState
            */
            var CanceledState = _Base.Class.define(function CanceledState_ctor(view) {
                this.view = view;
            }, {
                name: 'CanceledState',
                enter: nop,
                stop: function CanceledState_stop() {
                    // cancelRealize cancels ariaSetup which can still be in progress
                    this.view._cancelRealize();
                },
                realizePage: function CanceledState_realizePage(NewStateType) {
                    this.stop();
                    this.view._setState(NewStateType);
                },
                rebuildTree: function CanceledState_rebuildTree() {
                    this.stop();
                    this.view._setState(BuildingState);
                },
                relayout: function CanceledState_relayout(NextStateType) {
                    this.stop();
                    this.view._setState(LayingoutState, NextStateType);
                },
                layoutNewContainers: function CanceledState_layoutNewContainers() {
                    this.relayout(CanceledState);
                },
                waitForEntityPosition: function CanceledState_waitForEntityPosition() {
                    return this.view._getLayoutCompleted();
                },
                updateTree: function CanceledState_updateTree(count, delta, modifiedElements) {
                    return this.view._updateTreeImpl(count, delta, modifiedElements);
                }
            });

            /*
            This state is almost identical with RealizingState. Currently the difference is that in this state loadingStateChanged events aren’t
            raised and after complete the state is switched to ScrollingPausedState to wait until end of scrolling.

            ScrollingState => RealizingAnimatingState | ScrollingPausedState | LayingoutState | BuildingState | CanceledState
            */
            var ScrollingState = _Base.Class.derive(RealizingState, function ScrollingState_ctor(view) {
                this.view = view;
                this.nextState = ScrollingPausedState;
                this.relayoutNewContainers = true;
            }, {
                name: 'ScrollingState',
                setLoadingState: function ScrollingState_setLoadingState() {
                }
            });

            /*
            The view waits in this state for end of scrolling which for touch is signaled by MSManipulationStateChanged event and for mouse it is timeout.

            ScrollingPausedState => RealizingAnimatingState | ScrollingPausedState | LayingoutState | BuildingState | CanceledState
            */
            var ScrollingPausedState = _Base.Class.derive(CanceledState, function ScrollingPausedState_ctor(view) {
                this.view = view;
            }, {
                name: 'ScrollingPausedState',
                enter: function ScrollingPausedState_enter() {
                    var that = this;
                    this.promise = Promise._cancelBlocker(this.view._scrollEndPromise).then(function () {
                        that.view._setState(UnrealizingState);
                    });
                },
                stop: function ScrollingPausedState_stop() {
                    this.promise.cancel();
                    // cancelRealize cancels ariaSetup which can still be in progress
                    this.view._cancelRealize();
                },
            });

            /*
            In this state, view unrealizes not needed items and then waits for all renderers to complete.

            UnrealizingState => CompletedState | RealizingState | ScrollingState | LayingoutState | BuildingState | CanceledState
            */
            var UnrealizingState = _Base.Class.define(function UnrealizingState_ctor(view) {
                this.view = view;
            }, {
                name: 'UnrealizingState',
                enter: function UnrealizingState_enter() {
                    var that = this;
                    this.promise = this.view._lazilyUnrealizeItems().then(function () {
                        that.view._listView._writeProfilerMark("_renderCompletePromise wait starts,info");
                        return that.view._renderCompletePromise;
                    }).then(function () {
                        that.view._setState(CompletedState);
                    });
                },
                stop: function UnrealizingState_stop() {
                    // cancelRealize cancels ariaSetup which can still be in progress
                    this.view._cancelRealize();
                    this.promise.cancel();
                    this.view._setState(CanceledState);
                },
                realizePage: function UnrealizingState_realizePage(NewStateType) {
                    this.promise.cancel();
                    this.view._setState(NewStateType);
                },
                rebuildTree: function UnrealizingState_rebuildTree() {
                    this.view._setState(BuildingState);
                },
                relayout: function UnrealizingState_relayout() {
                    this.view._setState(LayingoutState);
                },
                layoutNewContainers: function UnrealizingState_layoutNewContainers() {
                    this.view._createLayoutSignal();
                    this.view._relayoutInComplete = true;
                },
                waitForEntityPosition: function UnrealizingState_waitForEntityPosition() {
                    return this.view._getLayoutCompleted();
                },
                updateTree: function UnrealizingState_updateTree(count, delta, modifiedElements) {
                    return this.view._updateTreeImpl(count, delta, modifiedElements);
                }
            });

            /*
            We enter this state, when there are animations to execute, and we have already fired the viewportloaded event

            RealizingAnimatingState => RealizingState | UnrealizingState | LayingoutState | BuildingState | CanceledState
            */
            var RealizingAnimatingState = _Base.Class.define(function RealizingStateAnimating_ctor(view, realizePromise) {
                this.view = view;
                this.realizePromise = realizePromise;
                this.realizeId = 1;
            }, {
                name: 'RealizingAnimatingState',
                enter: function RealizingAnimatingState_enter() {
                    var that = this;


                    this.animating = true;
                    this.animatePromise = this.view._startAnimations();
                    this.animateSignal = new _Signal();
                    this.view._executeAnimations = false;

                    this.animatePromise.done(
                        function () {
                            that.animating = false;
                            if (that.modifiedElements) {
                                that.view._updateTreeImpl(that.count, that.delta, that.modifiedElements);
                                that.modifiedElements = null;
                                that.view._setState(CanceledState);
                            } else {
                                that.animateSignal.complete();
                            }
                        }, function (error) {
                            that.animating = false;
                            return Promise.wrapError(error);
                        }
                    );

                    this._waitForRealize();
                },

                _waitForRealize: function RealizingAnimatingState_waitForRealize() {
                    var that = this;

                    this.realizing = true;
                    this.realizePromise.done(function () {
                        that.realizing = false;
                    });

                    var currentRealizeId = ++this.realizeId;
                    Promise.join([this.realizePromise, this.animateSignal.promise]).done(function () {
                        if (currentRealizeId === that.realizeId) {
                            that.view._completeUpdateTree();
                            that.view._listView._writeProfilerMark("RealizingAnimatingState_to_UnrealizingState");
                            that.view._setState(UnrealizingState);
                        }
                    });
                },

                stop: function RealizingAnimatingState_stop(stopTreeCreation) {
                    // always cancel realization
                    this.realizePromise.cancel();
                    this.view._cancelRealize();

                    // animations are canceled only when tree needs to be rebuilt
                    if (stopTreeCreation) {
                        this.animatePromise.cancel();
                        this.view._setState(CanceledState);
                    }
                },
                realizePage: function RealizingAnimatingState_realizePage() {
                    if (!this.modifiedElements) {
                        var that = this;
                        this.realizePromise = this.view._executeScrollToFunctor().then(function () {
                            return Promise._cancelBlocker(that.view._realizePageImpl());
                        });
                        this._waitForRealize();
                    }
                },
                rebuildTree: function RealizingAnimatingState_rebuildTree() {
                    this.stop(true);
                    this.view._setState(BuildingState);
                },
                relayout: function RealizingAnimatingState_relayout() {
                    // Relayout caused by edits should be stopped by updateTree but relayout can be caused by resize or containers creation and in these cases we should stop animations
                    this.stop(true);
                    // if tree update was waiting for animations we should do it now
                    if (this.modifiedElements) {
                        this.view._updateTreeImpl(this.count, this.delta, this.modifiedElements);
                        this.modifiedElements = null;
                    }
                    this.view._setState(LayingoutState);
                },
                layoutNewContainers: function RealizingAnimatingState_layoutNewContainers() {
                    this.view._createLayoutSignal();
                    this.view._relayoutInComplete = true;
                },
                waitForEntityPosition: function RealizingAnimatingState_waitForEntityPosition() {
                    return this.view._getLayoutCompleted();
                },
                updateTree: function RealizingAnimatingState_updateTree(count, delta, modifiedElements) {
                    if (this.animating) {
                        var previousModifiedElements = this.modifiedElements;
                        this.count = count;
                        this.delta = delta;
                        this.modifiedElements = modifiedElements;

                        return previousModifiedElements ? Promise.cancel : this.animatePromise;
                    } else {
                        return this.view._updateTreeImpl(count, delta, modifiedElements);
                    }
                },
                setLoadingState: function RealizingAnimatingState_setLoadingState(state) {
                    this.view._listView._setViewState(state);
                }
            });

            /*
            The view enters this state when the tree is built, layout and realized after animations have
            finished. The layout can still laying out items outside of realized view during this stage.

            CompletedState => RealizingState | ScrollingState | LayingoutState | BuildingState | LayingoutNewContainersState
            */
            var CompletedState = _Base.Class.derive(CanceledState, function CompletedState_ctor(view) {
                this.view = view;
            }, {
                name: 'CompletedState',
                enter: function CompletedState_enter() {
                    this._stopped = false;
                    this.view._setupDeferredActions();

                    this.view._realizationLevel = _VirtualizeContentsView._realizationLevel.normal;
                    this.view._listView._raiseViewComplete();

                    // _raiseViewComplete will cause user event listener code to run synchronously.
                    // If any updates are made to the Listview, this state will be stopped by the updater.
                    // We don't want to change state to LayingoutNewContainersState if that happens.
                    if (this.view._state === this && this.view._relayoutInComplete && !this._stopped) {
                        this.view._setState(LayingoutNewContainersState);
                    }
                },
                stop: function CompletedState_stop() {
                    this._stopped = true;
                    // Call base class method.
                    CanceledState.prototype.stop.call(this);
                },
                layoutNewContainers: function CompletedState_layoutNewContainers() {
                    this.view._createLayoutSignal();
                    this.view._setState(LayingoutNewContainersState);
                },
                updateTree: function CompletedState_updateTree(count, delta, modifiedElements) {
                    return this.view._updateTreeImpl(count, delta, modifiedElements, true);
                }
            });

            /*
            The view waits in this state for previous layout pass to finish.

            LayingoutNewContainersState => RealizingState | ScrollingState | LayingoutState | BuildingState
            */
            var LayingoutNewContainersState = _Base.Class.derive(CanceledState, function LayingoutNewContainersState(view) {
                this.view = view;
            }, {
                name: 'LayingoutNewContainersState',
                enter: function LayingoutNewContainersState_enter() {
                    var that = this;

                    // _layoutWork is completed when the previous layout pass is done. _getLayoutCompleted will be completed when these new containers are laid out
                    this.promise = Promise.join([this.view.deferTimeout, this.view._layoutWork]);
                    this.promise.then(function () {
                        that.view._relayoutInComplete = false;
                        that.relayout(CanceledState);
                    });
                },
                stop: function LayingoutNewContainersState_stop() {
                    // cancelRealize cancels ariaSetup which can still be in progress
                    this.promise.cancel();
                    this.view._cancelRealize();
                },
                realizePage: function LayingoutNewContainersState_realizePage(NewStateType) {
                    // in this state realizePage needs to run layout before realizing items
                    this.stop();
                    this.view._setState(LayingoutState, NewStateType);
                },
                layoutNewContainers: function LayingoutNewContainersState_layoutNewContainers() {
                    this.view._createLayoutSignal();
                }
            });

            return _VirtualizeContentsView;
        })
    });

});
