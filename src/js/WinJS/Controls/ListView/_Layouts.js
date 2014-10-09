// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Core/_ErrorFromName',
    '../../Core/_Resources',
    '../../Core/_WriteProfilerMark',
    '../../Animations/_TransitionAnimation',
    '../../Promise',
    '../../Scheduler',
    '../../_Signal',
    '../../Utilities/_Dispose',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_SafeHtml',
    '../../Utilities/_UI',
    '../ItemContainer/_Constants',
    './_ErrorMessages'
], function layouts2Init(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Resources, _WriteProfilerMark, _TransitionAnimation, Promise, Scheduler, _Signal, _Dispose, _ElementUtilities, _SafeHtml, _UI, _Constants, _ErrorMessages) {
    "use strict";

    var Key = _ElementUtilities.Key,
        uniqueID = _ElementUtilities._uniqueID;

    var strings = {
        get itemInfoIsInvalid() { return "Invalid argument: An itemInfo function must be provided which returns an object with numeric width and height properties."; },
        get groupInfoResultIsInvalid() { return "Invalid result: groupInfo result for cell spanning groups must include the following numeric properties: cellWidth and cellHeight."; }
    };

    //
    // Helpers for dynamic CSS rules
    //
    // Rule deletions are delayed until the next rule insertion. This helps the
    // scenario where a ListView changes layouts. By doing the rule manipulations
    // in a single synchronous block, IE will do 1 layout pass instead of 2.
    //

    // Dynamic CSS rules will be added to this style element
    var layoutStyleElem = _Global.document.createElement("style");
    _Global.document.head.appendChild(layoutStyleElem);

    var nextCssClassId = 0,
        staleClassNames = [];

    // The prefix for the class name should not contain dashes
    function uniqueCssClassName(prefix) {
        return "_win-dynamic-" + prefix + "-" + (nextCssClassId++);
    }

    var browserStyleEquivalents = _BaseUtils._browserStyleEquivalents;
    var transformNames = browserStyleEquivalents["transform"];
    var transitionScriptName = _BaseUtils._browserStyleEquivalents["transition"].scriptName;
    var dragBetweenTransition = transformNames.cssName + " cubic-bezier(0.1, 0.9, 0.2, 1) 167ms";
    var dragBetweenDistance = 12;

    // Removes the dynamic CSS rules corresponding to the classes in staleClassNames
    // from the DOM.
    function flushDynamicCssRules() {
        var rules = layoutStyleElem.sheet.cssRules,
            classCount = staleClassNames.length,
            i,
            j,
            ruleSuffix;

        for (i = 0; i < classCount; i++) {
            ruleSuffix = "." + staleClassNames[i] + " ";
            for (j = rules.length - 1; j >= 0; j--) {
                if (rules[j].selectorText.indexOf(ruleSuffix) !== -1) {
                    layoutStyleElem.sheet.deleteRule(j);
                }
            }
        }
        staleClassNames = [];
    }

    // Creates a dynamic CSS rule and adds it to the DOM. uniqueToken is a class name
    // which uniquely identifies a set of related rules. These rules may be removed
    // using deleteDynamicCssRule. uniqueToken should be created using uniqueCssClassName.
    function addDynamicCssRule(uniqueToken, site, selector, body) {
        flushDynamicCssRules();
        var rule = "." + _Constants._listViewClass + " ." + uniqueToken + " " + selector + " { " +
             body +
        "}";
        var perfId = "_addDynamicCssRule:" + uniqueToken + ",info";
        if (site) {
            site._writeProfilerMark(perfId);
        } else {
            _WriteProfilerMark("WinJS.UI.ListView:Layout" + perfId);
        }
        layoutStyleElem.sheet.insertRule(rule, 0);
    }

    // Marks the CSS rules corresponding to uniqueToken for deletion. The rules
    // should have been added by addDynamicCssRule.
    function deleteDynamicCssRule(uniqueToken) {
        staleClassNames.push(uniqueToken);
    }

    //
    // Helpers shared by all layouts
    //

    // Clamps x to the range first <= x <= last
    function clampToRange(first, last, x) {
        return Math.max(first, Math.min(last, x));
    }

    function getDimension(element, property) {
        return _ElementUtilities.convertToPixels(element, _Global.getComputedStyle(element, null)[property]);
    }

    // Returns the sum of the margin, border, and padding for the side of the
    // element specified by side. side can be "Left", "Right", "Top", or "Bottom".
    function getOuter(side, element) {
        return getDimension(element, "margin" + side) +
            getDimension(element, "border" + side + "Width") +
            getDimension(element, "padding" + side);
    }

    // Returns the total height of element excluding its content height
    function getOuterHeight(element) {
        return getOuter("Top", element) + getOuter("Bottom", element);
    }

    // Returns the total width of element excluding its content width
    function getOuterWidth(element) {
        return getOuter("Left", element) + getOuter("Right", element);
    }

    function forEachContainer(itemsContainer, callback) {
        if (itemsContainer.items) {
            for (var i = 0, len = itemsContainer.items.length; i < len; i++) {
                callback(itemsContainer.items[i], i);
            }
        } else {
            for (var b = 0, index = 0; b < itemsContainer.itemsBlocks.length; b++) {
                var block = itemsContainer.itemsBlocks[b];
                for (var i = 0, len = block.items.length; i < len; i++) {
                    callback(block.items[i], index++);
                }
            }
        }
    }

    function containerFromIndex(itemsContainer, index) {
        if (index < 0) {
            return null;
        }
        if (itemsContainer.items) {
            return (index < itemsContainer.items.length ? itemsContainer.items[index] : null);
        } else {
            var blockSize = itemsContainer.itemsBlocks[0].items.length,
                blockIndex = Math.floor(index / blockSize),
                offset = index % blockSize;
            return (blockIndex < itemsContainer.itemsBlocks.length && offset < itemsContainer.itemsBlocks[blockIndex].items.length ? itemsContainer.itemsBlocks[blockIndex].items[offset] : null);
        }
    }

    function getItemsContainerTree(itemsContainer, tree) {
        var itemsContainerTree;
        for (var i = 0, treeLength = tree.length; i < treeLength; i++) {
            if (tree[i].itemsContainer.element === itemsContainer) {
                itemsContainerTree = tree[i].itemsContainer;
                break;
            }
        }
        return itemsContainerTree;
    }

    function getItemsContainerLength(itemsContainer) {
        var blocksCount,
            itemsCount;
        if (itemsContainer.itemsBlocks) {
            blocksCount = itemsContainer.itemsBlocks.length;
            if (blocksCount > 0) {
                itemsCount = (itemsContainer.itemsBlocks[0].items.length * (blocksCount - 1)) + itemsContainer.itemsBlocks[blocksCount - 1].items.length;
            } else {
                itemsCount = 0;
            }
        } else {
            itemsCount = itemsContainer.items.length;
        }
        return itemsCount;
    }

    var environmentDetails = null;
    // getEnvironmentSupportInformation does one-time checks on several browser-specific environment details (both to check the existence of styles,
    // and also to see if some environments have layout bugs the ListView needs to work around).
    function getEnvironmentSupportInformation(site) {
        if (!environmentDetails) {
            var surface = _Global.document.createElement("div");
            surface.style.width = "500px";
            surface.style.visibility = "hidden";

            // Set up the DOM
            var flexRoot = _Global.document.createElement("div");
            flexRoot.style.cssText += "width: 500px; height: 200px; display: -webkit-flex; display: flex";
            _SafeHtml.setInnerHTMLUnsafe(flexRoot,
                "<div style='height: 100%; display: -webkit-flex; display: flex; flex-flow: column wrap; align-content: flex-start; -webkit-flex-flow: column wrap; -webkit-align-content: flex-start'>" +
                    "<div style='width: 100px; height: 100px'></div>" +
                    "<div style='width: 100px; height: 100px'></div>" +
                    "<div style='width: 100px; height: 100px'></div>" +
                "</div>");
            surface.appendChild(flexRoot);

            // Read from the DOM and detect the bugs
            site.viewport.insertBefore(surface, site.viewport.firstChild);
            var canMeasure = surface.offsetWidth > 0,
                expectedWidth = 200;
            if (canMeasure) {
                // If we can't measure now (e.g. ListView is display:none), leave environmentDetails as null
                // so that we do the detection later when the app calls recalculateItemPosition/forceLayout.

                environmentDetails = {
                    supportsCSSGrid: !!("-ms-grid-row" in _Global.document.documentElement.style),
                    // Detects Chrome flex issue 345433: Incorrect sizing for nested flexboxes
                    // https://code.google.com/p/chromium/issues/detail?id=345433
                    // With nested flexboxes, the inner flexbox's width is proportional to the number of elements intead
                    // of the number of columns.
                    nestedFlexTooLarge: flexRoot.firstElementChild.offsetWidth > expectedWidth,

                    // Detects Firefox issue 995020
                    // https://bugzilla.mozilla.org/show_bug.cgi?id=995020
                    // The three squares we're adding to the nested flexbox should increase the size of the nestedFlex to be 200 pixels wide. This is the case in IE but
                    // currently not in Firefox. In Firefox, the third square will move to the next column, but the container's width won't update for it.
                    nestedFlexTooSmall: flexRoot.firstElementChild.offsetWidth < expectedWidth
                };
            }

            // Clean up the DOM
            site.viewport.removeChild(surface);
        }

        return environmentDetails;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        Layout: _Base.Class.define(function Layout_ctor() {
            /// <signature helpKeyword="exports.Layout.Layout">
            /// <summary locid="exports.Layout.constructor">
            /// Creates a new Layout object.
            /// </summary>
            /// <param name="options" type="Object" locid="exports.Layout.constructor_p:options">
            /// The set of options to be applied initially to the new Layout object.
            /// </param>
            /// <returns type="exports.Layout" locid="exports.Layout.constructor_returnValue">
            /// The new Layout object.
            /// </returns>
            /// </signature>
        }),

        _LayoutCommon: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(exports.Layout, null, {
                /// <field type="String" oamOptionsDatatype="WinJS.UI.HeaderPosition" locid="WinJS.UI._LayoutCommon.groupHeaderPosition" helpKeyword="WinJS.UI._LayoutCommon.groupHeaderPosition">
                /// Gets or sets the position of group headers relative to their items.
                /// The default value is "top".
                /// </field>
                groupHeaderPosition: {
                    enumerable: true,
                    get: function () {
                        return this._groupHeaderPosition;
                    },
                    set: function (position) {
                        this._groupHeaderPosition = position;
                        this._invalidateLayout();
                    }
                },

                // Implementation of part of ILayout interface

                initialize: function _LayoutCommon_initialize(site, groupsEnabled) {
                    site._writeProfilerMark("Layout:initialize,info");
                    if (!this._inListMode) {
                        _ElementUtilities.addClass(site.surface, _Constants._gridLayoutClass);
                    }

                    if (this._backdropColorClassName) {
                        _ElementUtilities.addClass(site.surface, this._backdropColorClassName);
                    }
                    if (this._disableBackdropClassName) {
                        _ElementUtilities.addClass(site.surface, this._disableBackdropClassName);
                    }
                    this._groups = [];
                    this._groupMap = {};
                    this._oldGroupHeaderPosition = null;
                    this._usingStructuralNodes = false;

                    this._site = site;
                    this._groupsEnabled = groupsEnabled;
                    this._resetAnimationCaches(true);
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.Orientation" locid="WinJS.UI._LayoutCommon.orientation" helpKeyword="WinJS.UI._LayoutCommon.orientation">
                /// Gets or sets the orientation for the layout.
                /// The default value is "horizontal".
                /// </field>
                orientation: {
                    enumerable: true,
                    get: function () {
                        return this._orientation;
                    },
                    set: function (orientation) {
                        this._orientation = orientation;
                        this._horizontal = (orientation === "horizontal");
                        this._invalidateLayout();
                    }
                },

                uninitialize: function _LayoutCommon_uninitialize() {
                    var perfId = "Layout:uninitialize,info";
                    function cleanGroups(groups) {
                        var len = groups.length,
                            i;
                        for (i = 0; i < len; i++) {
                            groups[i].cleanUp(true);
                        }
                    }

                    this._elementsToMeasure = {};

                    if (this._site) {
                        this._site._writeProfilerMark(perfId);
                        _ElementUtilities.removeClass(this._site.surface, _Constants._gridLayoutClass);
                        _ElementUtilities.removeClass(this._site.surface, _Constants._headerPositionTopClass);
                        _ElementUtilities.removeClass(this._site.surface, _Constants._headerPositionLeftClass);
                        _ElementUtilities.removeClass(this._site.surface, _Constants._structuralNodesClass);
                        _ElementUtilities.removeClass(this._site.surface, _Constants._singleItemsBlockClass);
                        this._site.surface.style.cssText = "";
                        if (this._groups) {
                            cleanGroups(this._groups);
                            this._groups = null;
                            this._groupMap = null;
                        }
                        if (this._layoutPromise) {
                            this._layoutPromise.cancel();
                            this._layoutPromise = null;
                        }
                        this._resetMeasurements();
                        this._oldGroupHeaderPosition = null;
                        this._usingStructuralNodes = null;
                        // The properties given to us by the app (_groupInfo, _itemInfo,
                        // _groupHeaderPosition) are not cleaned up so that the values are
                        // remembered if the layout is reused.

                        if (this._backdropColorClassName) {
                            _ElementUtilities.removeClass(this._site.surface, this._backdropColorClassName);
                            deleteDynamicCssRule(this._backdropColorClassName);
                            this._backdropColorClassName = null;
                        }
                        if (this._disableBackdropClassName) {
                            _ElementUtilities.removeClass(this._site.surface, this._disableBackdropClassName);
                            deleteDynamicCssRule(this._disableBackdropClassName);
                            this._disableBackdropClassName = null;
                        }

                        this._site = null;
                        this._groupsEnabled = null;
                        if (this._animationsRunning) {
                            this._animationsRunning.cancel();
                        }
                        this._animatingItemsBlocks = {};
                    } else {
                        _WriteProfilerMark("WinJS.UI.ListView:" + perfId);
                    }
                },

                numberOfItemsPerItemsBlock: {
                    get: function _LayoutCommon_getNumberOfItemsPerItemsBlock() {
                        function allGroupsAreUniform() {
                            var groupCount = that._site.groupCount,
                                i;

                            for (i = 0; i < groupCount; i++) {
                                if (that._isCellSpanning(i)) {
                                    return false;
                                }
                            }

                            return true;
                        }

                        var that = this;
                        return that._measureItem(0).then(function () {
                            if (that._sizes.viewportContentSize !== that._getViewportCrossSize()) {
                                that._viewportSizeChanged(that._getViewportCrossSize());
                            }

                            if (!allGroupsAreUniform()) {
                                that._usingStructuralNodes = false;
                                return null;
                            } else if (that._envInfo.nestedFlexTooLarge || that._envInfo.nestedFlexTooSmall) {
                                // Store all items in a single itemsblock
                                that._usingStructuralNodes = true;
                                return Number.MAX_VALUE;
                            } else {
                                that._usingStructuralNodes = exports._LayoutCommon._barsPerItemsBlock > 0;
                                return exports._LayoutCommon._barsPerItemsBlock * that._itemsPerBar;
                            }
                        });
                    }
                },

                layout: function _LayoutCommon_layout(tree, changedRange, modifiedItems, modifiedGroups) {
                    // changedRange implies that the minimum amount of work the layout needs to do is as follows:
                    // - It needs to lay out group shells (header containers and items containers) from
                    //   firstChangedGroup thru lastGroup.
                    // - It needs to ask firstChangedGroup thru lastChangedGroup to lay out their
                    //   contents (i.e. win-containers).
                    // - For each group included in the changedRange, it needs to lay out its
                    //   contents (i.e. win-containers) from firstChangedItem thru lastItem.

                    var that = this;
                    var site = that._site,
                        layoutPerfId = "Layout.layout",
                        realizedRangePerfId = layoutPerfId + ":realizedRange",
                        realizedRangePromise;

                    that._site._writeProfilerMark(layoutPerfId + ",StartTM");
                    that._site._writeProfilerMark(realizedRangePerfId + ",StartTM");

                    // Receives an items container's tree and returns a normalized copy.
                    // This allows us to hold on to a snapshot of the tree without
                    // worrying that items may have been unexpectedly inserted/
                    // removed/moved. The returned tree always appears as though
                    // structural nodes are disabled.
                    function copyItemsContainerTree(itemsContainer) {
                        function copyItems(itemsContainer) {
                            if (that._usingStructuralNodes) {
                                var items = [];
                                itemsContainer.itemsBlocks.forEach(function (itemsBlock) {
                                    items = items.concat(itemsBlock.items.slice(0));
                                });
                                return items;
                            } else {
                                return itemsContainer.items.slice(0);
                            }
                        }

                        return {
                            element: itemsContainer.element,
                            items: copyItems(itemsContainer)
                        };
                    }

                    // Updates the GridLayout's internal state to reflect the current tree.
                    // Similarly tells each group to update its internal state via prepareLayout.
                    // After this function runs, the ILayout functions will return results that
                    // are appropriate for the current tree.
                    function updateGroups() {
                        function createGroup(groupInfo, itemsContainer) {
                            var GroupType = (groupInfo.enableCellSpanning ?
                                Groups.CellSpanningGroup :
                                Groups.UniformGroup);
                            return new GroupType(that, itemsContainer);
                        }

                        var oldRealizedItemRange = (that._groups.length > 0 ?
                                that._getRealizationRange() :
                                null),
                            newGroups = [],
                            prepared = [],
                            cleanUpDom = {},
                            newGroupMap = {},
                            currentIndex = 0,
                            len = tree.length,
                            i;

                        for (i = 0; i < len; i++) {
                            var oldChangedRealizedRangeInGroup = null,
                                groupInfo = that._getGroupInfo(i),
                                groupKey = that._site.groupFromIndex(i).key,
                                oldGroup = that._groupMap[groupKey],
                                wasCellSpanning = oldGroup instanceof Groups.CellSpanningGroup,
                                isCellSpanning = groupInfo.enableCellSpanning;

                            if (oldGroup) {
                                if (wasCellSpanning !== isCellSpanning) {
                                    // The group has changed types so DOM needs to be cleaned up
                                    cleanUpDom[groupKey] = true;
                                } else {
                                    // Compute the range of changed items that is within the group's realized range
                                    var firstChangedIndexInGroup = Math.max(0, changedRange.firstIndex - oldGroup.startIndex),
                                        oldRealizedItemRangeInGroup = that._rangeForGroup(oldGroup, oldRealizedItemRange);
                                    if (oldRealizedItemRangeInGroup && firstChangedIndexInGroup <= oldRealizedItemRangeInGroup.lastIndex) {
                                        // The old changed realized range is non-empty
                                        oldChangedRealizedRangeInGroup = {
                                            firstIndex: Math.max(firstChangedIndexInGroup, oldRealizedItemRangeInGroup.firstIndex),
                                            lastIndex: oldRealizedItemRangeInGroup.lastIndex
                                        };
                                    }
                                }
                            }
                            var group = createGroup(groupInfo, tree[i].itemsContainer.element);
                            var prepareLayoutPromise;
                            if (group.prepareLayoutWithCopyOfTree) {
                                prepareLayoutPromise = group.prepareLayoutWithCopyOfTree(copyItemsContainerTree(tree[i].itemsContainer), oldChangedRealizedRangeInGroup, oldGroup, {
                                    groupInfo: groupInfo,
                                    startIndex: currentIndex,
                                });
                            } else {
                                prepareLayoutPromise = group.prepareLayout(getItemsContainerLength(tree[i].itemsContainer), oldChangedRealizedRangeInGroup, oldGroup, {
                                    groupInfo: groupInfo,
                                    startIndex: currentIndex,
                                });
                            }
                            prepared.push(prepareLayoutPromise);

                            currentIndex += group.count;

                            newGroups.push(group);
                            newGroupMap[groupKey] = group;
                        }

                        return Promise.join(prepared).then(function () {
                            var currentOffset = 0;
                            for (var i = 0, len = newGroups.length; i < len; i++) {
                                var group = newGroups[i];
                                group.offset = currentOffset;
                                currentOffset += that._getGroupSize(group);
                            }

                            // Clean up deleted groups
                            Object.keys(that._groupMap).forEach(function (deletedKey) {
                                var skipDomCleanUp = !cleanUpDom[deletedKey];
                                that._groupMap[deletedKey].cleanUp(skipDomCleanUp);
                            });

                            that._groups = newGroups;
                            that._groupMap = newGroupMap;
                        });
                    }

                    // When doRealizedRange is true, this function is synchronous and has no return value.
                    // When doRealizedRange is false, this function is asynchronous and returns a promise.
                    function layoutGroupContent(groupIndex, realizedItemRange, doRealizedRange) {
                        var group = that._groups[groupIndex],
                            firstChangedIndexInGroup = Math.max(0, changedRange.firstIndex - group.startIndex),
                            realizedItemRangeInGroup = that._rangeForGroup(group, realizedItemRange),
                            beforeRealizedRange;

                        if (doRealizedRange) {
                            group.layoutRealizedRange(firstChangedIndexInGroup, realizedItemRangeInGroup);
                        } else {
                            if (!realizedItemRangeInGroup) {
                                beforeRealizedRange = (group.startIndex + group.count - 1 < realizedItemRange.firstIndex);
                            }

                            return group.layoutUnrealizedRange(firstChangedIndexInGroup, realizedItemRangeInGroup, beforeRealizedRange);
                        }
                    }

                    // Synchronously lays out:
                    // - Realized and unrealized group shells (header containers and items containers).
                    //   This is needed so that each realized group will be positioned at the correct offset.
                    // - Realized items.
                    function layoutRealizedRange() {
                        if (that._groups.length === 0) {
                            return;
                        }

                        var realizedItemRange = that._getRealizationRange(),
                            len = tree.length,
                            i,
                            firstChangedGroup = site.groupIndexFromItemIndex(changedRange.firstIndex);

                        for (i = firstChangedGroup; i < len; i++) {
                            layoutGroupContent(i, realizedItemRange, true);
                            that._layoutGroup(i);
                        }
                    }

                    // Asynchronously lays out the unrealized items
                    function layoutUnrealizedRange() {
                        if (that._groups.length === 0) {
                            return Promise.wrap();
                        }

                        var realizedItemRange = that._getRealizationRange(),
                            // Last group before the realized range which contains 1 or more unrealized items
                            lastGroupBefore = site.groupIndexFromItemIndex(realizedItemRange.firstIndex - 1),
                            // First group after the realized range which contains 1 or more unrealized items
                            firstGroupAfter = site.groupIndexFromItemIndex(realizedItemRange.lastIndex + 1),
                            firstChangedGroup = site.groupIndexFromItemIndex(changedRange.firstIndex),
                            layoutPromises = [],
                            groupCount = that._groups.length;

                        var stop = false;
                        var before = lastGroupBefore;
                        var after = Math.max(firstChangedGroup, firstGroupAfter);
                        after = Math.max(before + 1, after);
                        while (!stop) {
                            stop = true;
                            if (before >= firstChangedGroup) {
                                layoutPromises.push(layoutGroupContent(before, realizedItemRange, false));
                                stop = false;
                                before--;
                            }
                            if (after < groupCount) {
                                layoutPromises.push(layoutGroupContent(after, realizedItemRange, false));
                                stop = false;
                                after++;
                            }
                        }

                        return Promise.join(layoutPromises);
                    }

                    realizedRangePromise = that._measureItem(0).then(function () {
                        _ElementUtilities[(that._usingStructuralNodes) ? "addClass" : "removeClass"]
                            (that._site.surface, _Constants._structuralNodesClass);
                        _ElementUtilities[(that._envInfo.nestedFlexTooLarge || that._envInfo.nestedFlexTooSmall) ? "addClass" : "removeClass"]
                            (that._site.surface, _Constants._singleItemsBlockClass);

                        if (that._sizes.viewportContentSize !== that._getViewportCrossSize()) {
                            that._viewportSizeChanged(that._getViewportCrossSize());
                        }

                        // Move deleted elements to their original positions before calling updateGroups can be slow.
                        that._cacheRemovedElements(modifiedItems, that._cachedItemRecords, that._cachedInsertedItemRecords, that._cachedRemovedItems, false);
                        that._cacheRemovedElements(modifiedGroups, that._cachedHeaderRecords, that._cachedInsertedHeaderRecords, that._cachedRemovedHeaders, true);

                        return updateGroups();
                    }).then(function () {
                        that._syncDomWithGroupHeaderPosition(tree);
                        var surfaceLength = 0;
                        if (that._groups.length > 0) {
                            var lastGroup = that._groups[that._groups.length - 1];
                            surfaceLength = lastGroup.offset + that._getGroupSize(lastGroup);
                        }

                        // Explicitly set the surface width/height. This maintains backwards
                        // compatibility with the original layouts by allowing the items
                        // to be shifted through surface margins.
                        if (that._horizontal) {
                            if (that._groupsEnabled && that._groupHeaderPosition === HeaderPosition.left) {
                                site.surface.style.cssText +=
                                    ";height:" + that._sizes.surfaceContentSize +
                                    "px;-ms-grid-columns: (" + that._sizes.headerContainerWidth + "px auto)[" + tree.length + "]";
                            } else {
                                site.surface.style.height = that._sizes.surfaceContentSize + "px";
                            }
                            if (that._envInfo.nestedFlexTooLarge || that._envInfo.nestedFlexTooSmall) {
                                site.surface.style.width = surfaceLength + "px";
                            }
                        } else {
                            if (that._groupsEnabled && that._groupHeaderPosition === HeaderPosition.top) {
                                site.surface.style.cssText +=
                                    ";width:" + that._sizes.surfaceContentSize +
                                    "px;-ms-grid-rows: (" + that._sizes.headerContainerHeight + "px auto)[" + tree.length + "]";
                            } else {
                                site.surface.style.width = that._sizes.surfaceContentSize + "px";
                            }
                            if (that._envInfo.nestedFlexTooLarge || that._envInfo.nestedFlexTooSmall) {
                                site.surface.style.height = surfaceLength + "px";
                            }
                        }

                        layoutRealizedRange();

                        that._layoutAnimations(modifiedItems, modifiedGroups);

                        that._site._writeProfilerMark(realizedRangePerfId + ":complete,info");
                        that._site._writeProfilerMark(realizedRangePerfId + ",StopTM");
                    }, function (error) {
                        that._site._writeProfilerMark(realizedRangePerfId + ":canceled,info");
                        that._site._writeProfilerMark(realizedRangePerfId + ",StopTM");
                        return Promise.wrapError(error);
                    });

                    that._layoutPromise = realizedRangePromise.then(function () {
                        return layoutUnrealizedRange().then(function () {
                            that._site._writeProfilerMark(layoutPerfId + ":complete,info");
                            that._site._writeProfilerMark(layoutPerfId + ",StopTM");
                        }, function (error) {
                            that._site._writeProfilerMark(layoutPerfId + ":canceled,info");
                            that._site._writeProfilerMark(layoutPerfId + ",StopTM");
                            return Promise.wrapError(error);
                        });
                    });

                    return {
                        realizedRangeComplete: realizedRangePromise,
                        layoutComplete: that._layoutPromise
                    };
                },

                itemsFromRange: function _LayoutCommon_itemsFromRange(firstPixel, lastPixel) {
                    if (this._rangeContainsItems(firstPixel, lastPixel)) {
                        return {
                            firstIndex: this._firstItemFromRange(firstPixel),
                            lastIndex: this._lastItemFromRange(lastPixel)
                        };
                    } else {
                        return {
                            firstIndex: 0,
                            lastIndex: -1
                        };
                    }

                },

                getAdjacent: function _LayoutCommon_getAdjacent(currentItem, pressedKey) {
                    var that = this,
                        groupIndex = that._site.groupIndexFromItemIndex(currentItem.index),
                        group = that._groups[groupIndex],
                        adjustedKey = that._adjustedKeyForOrientationAndBars(that._adjustedKeyForRTL(pressedKey), group instanceof Groups.CellSpanningGroup);

                    if (!currentItem.type) {
                        currentItem.type = _UI.ObjectType.item;
                    }
                    if (currentItem.type !== _UI.ObjectType.item && (pressedKey === Key.pageUp || pressedKey === Key.pageDown)) {
                        // We treat page up and page down keys as if an item had focus
                        var itemIndex = 0;
                        if (currentItem.type === _UI.ObjectType.groupHeader) {
                            itemIndex = that._groups[currentItem.index].startIndex;
                        } else {
                            itemIndex = (currentItem.type === _UI.ObjectType.listHeader ? 0 : that._groups[that._groups.length - 1].count - 1);
                        }
                        currentItem = { type: _UI.ObjectType.item, index: itemIndex };
                    }else if (currentItem.type === _UI.ObjectType.listHeader && adjustedKey === Key.rightArrow) {
                        return { type: (that._groupsEnabled ? _UI.ObjectType.groupHeader : _UI.ObjectType.listFooter), index: 0 };
                    } else if (currentItem.type === _UI.ObjectType.listFooter && adjustedKey === Key.leftArrow) {
                        return { type: (that._groupsEnabled ? _UI.ObjectType.groupHeader : _UI.ObjectType.listHeader), index: 0 };
                    } else if (currentItem.type === _UI.ObjectType.groupHeader) {
                        if (adjustedKey === Key.leftArrow) {
                            var desiredIndex = currentItem.index - 1;
                            desiredIndex = (that._site.listHeader ? desiredIndex : Math.max(0, desiredIndex));
                            return {
                                type: (desiredIndex > -1 ? _UI.ObjectType.groupHeader : _UI.ObjectType.listHeader),
                                index: (desiredIndex > -1 ? desiredIndex : 0)
                            };
                        } else if (adjustedKey === Key.rightArrow) {
                            var desiredIndex = currentItem.index + 1;
                            desiredIndex = (that._site.listHeader ? desiredIndex : Math.min(that._groups.length - 1, currentItem.index + 1));
                            return { 
                                type: (desiredIndex >= that._groups.length ? _UI.ObjectType.listHeader : _UI.ObjectType.groupHeader),
                                index: (desiredIndex >= that._groups.length ? 0 : desiredIndex)
                            };
                        }
                        return currentItem;
                    }

                    function handleArrowKeys() {
                        var currentItemInGroup = {
                            type: currentItem.type,
                            index: currentItem.index - group.startIndex
                        },
                            newItem = group.getAdjacent(currentItemInGroup, adjustedKey);

                        if (newItem === "boundary") {
                            var prevGroup = that._groups[groupIndex - 1],
                                nextGroup = that._groups[groupIndex + 1],
                                lastGroupIndex = that._groups.length - 1;

                            if (adjustedKey === Key.leftArrow) {
                                if (groupIndex === 0) {
                                    // We're at the beginning of the first group so stay put
                                    return currentItem;
                                } else if (prevGroup instanceof Groups.UniformGroup && group instanceof Groups.UniformGroup) {
                                    // Moving between uniform groups so maintain the row/column if possible
                                    var coordinates = that._indexToCoordinate(currentItemInGroup.index);
                                    var currentSlot = (that._horizontal ? coordinates.row : coordinates.column),
                                        indexOfLastBar = Math.floor((prevGroup.count - 1) / that._itemsPerBar),
                                        startOfLastBar = indexOfLastBar * that._itemsPerBar; // first cell of last bar
                                    return {
                                        type: _UI.ObjectType.item,
                                        index: prevGroup.startIndex + Math.min(prevGroup.count - 1, startOfLastBar + currentSlot)
                                    };
                                } else {
                                    // Moving to or from a cell spanning group so go to the last item
                                    return { type: _UI.ObjectType.item, index: group.startIndex - 1 };
                                }
                            } else if (adjustedKey === Key.rightArrow) {
                                if (groupIndex === lastGroupIndex) {
                                    // We're at the end of the last group so stay put
                                    return currentItem;
                                } else if (group instanceof Groups.UniformGroup && nextGroup instanceof Groups.UniformGroup) {
                                    // Moving between uniform groups so maintain the row/column if possible
                                    var coordinates = that._indexToCoordinate(currentItemInGroup.index),
                                        currentSlot = (that._horizontal ? coordinates.row : coordinates.column);
                                    return {
                                        type: _UI.ObjectType.item,
                                        index: nextGroup.startIndex + Math.min(nextGroup.count - 1, currentSlot)
                                    };
                                } else {
                                    // Moving to or from a cell spanning group so go to the first item
                                    return { type: _UI.ObjectType.item, index: nextGroup.startIndex };
                                }
                            } else {
                                return currentItem;
                            }
                        } else {
                            newItem.index += group.startIndex;
                            return newItem;
                        }
                    }

                    switch (that._adjustedKeyForRTL(pressedKey)) {
                        case Key.upArrow:
                        case Key.leftArrow:
                        case Key.downArrow:
                        case Key.rightArrow:
                            return handleArrowKeys();
                        default:
                            return exports._LayoutCommon.prototype._getAdjacentForPageKeys.call(that, currentItem, pressedKey);
                    }
                },

                hitTest: function _LayoutCommon_hitTest(x, y) {
                    var sizes = this._sizes,
                        result;

                    // Make the coordinates relative to grid layout's content box
                    x -= sizes.layoutOriginX;
                    y -= sizes.layoutOriginY;

                    var groupIndex = this._groupFromOffset(this._horizontal ? x : y),
                        group = this._groups[groupIndex];

                    // Make the coordinates relative to the margin box of the group's items container
                    if (this._horizontal) {
                        x -= group.offset;
                    } else {
                        y -= group.offset;
                    }
                    if (this._groupsEnabled) {
                        if (this._groupHeaderPosition === HeaderPosition.left) {
                            x -= sizes.headerContainerWidth;
                        } else {
                            // Headers above
                            y -= sizes.headerContainerHeight;
                        }
                    }

                    result = group.hitTest(x, y);
                    result.index += group.startIndex;
                    result.insertAfterIndex += group.startIndex;
                    return result;
                },

                // Animation cycle:
                //
                // Edits
                //  ---     UpdateTree        Realize
                // |   |      ---               /\/\
                // |   |     |   |             |    |
                // ------------------------------------------------------- Time
                //      |   |     |   |   |   |      |   |
                //       ---      |   |    ---        ---/\/\/\/\/\/\/\/\/
                //     setupAni   |   | layoutAni    endAni  (animations)
                //                 ---/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
                //                layout    (outside realized range)
                //
                //
                // When there is a modification to the DataSource, the first thing that happens is setupAnimations is
                // called with the current tree. This allows us to cache the locations of the existing items.
                //
                // The next 3 steps have to be completely synchronous otherwise users will see intermediate states and
                // items will blink or jump between locations.
                //
                // ListView modifies the DOM tree. A container is added/removed from the group's itemsContainer for each
                // item added/removed to the group. The existing itemBoxes are shuffled between the different containers.
                // The itemBoxes for the removed items will be removed from the containers completely. Since the DOM tree
                // has been modified we have to apply a transform to position the itemBoxes at their original location. We
                // compare the new locations with the cached locations to figure out how far to translate the itemBoxes.
                // Also the removed items need to be placed back in the DOM without affecting layout (by using position
                // absolute) so that they also do not jump or blink.
                //
                // We only tranform and add back removed items for items which were on screen or are now on screen.
                //
                // Now the ListView can realize other items asynchronously. The items to realize are items which have been
                // inserted into the DataSource or items which are in the realization range because a removal has occurred
                // or the user has scroll slightly.
                //
                // During the realization pass the user may scroll. If they scroll to a range outside of the realization
                // range the items will just appear in the correct location without any animations. If they scroll to a
                // location within the old realization range we still have the items and they will animate correctly.
                //
                // During the realization pass another data source edit can occur. A realization pass is unable to run when
                // the tree and layout are out of sync. Otherwise it may try to request item at index X and get item at
                // index X + 1. This means that if another data source edit occurs before endAnimations is called we
                // restart the whole animation cycle. To group the animations between the two edits we do not reset the
                // caches of item box locations. We could add to it if there were items outside of the range however they
                // will only play half of the animation and will probably look just as ugly as not playing the animation at
                // all. This means setupAnimations will just be a no op in this scenario.
                //
                // This also shows that batching data source edits and only changing the data source when in loadingstate
                // "complete" is still a large performance win.
                //
                // Once the realization pass has finished ListView calls executeAnimations. This is where the layout
                // effectively fades out the removed items (and then removes them from the dom), moves the itemBoxes back
                // to translate(0,0), and fades in the inserted itemBoxes. ListView waits for the executeAnimations promise
                // to complete before allowing more data source edits to trigger another animation cycle.
                //
                // If a resize occurs during the animation cycle the animations will be canceled and items will jump to
                // their final positions.

                setupAnimations: function _LayoutCommon_setupAnimations() {
                    // This function is called after a data source change so that we can cache the locations
                    // of the realized items.

                    if (this._groups.length === 0) {
                        // No animations if we haven't measured before
                        this._resetAnimationCaches();
                        return;
                    }

                    if (Object.keys(this._cachedItemRecords).length) {
                        // Ignore the second call.
                        return;
                    }

                    this._site._writeProfilerMark("Animation:setupAnimations,StartTM");

                    var realizationRange = this._getRealizationRange();

                    var tree = this._site.tree;
                    var itemIndex = 0;
                    var horizontal = (this.orientation === "horizontal");
                    for (var i = 0, treeLength = tree.length; i < treeLength; i++) {
                        var groupBundle = tree[i];
                        var groupHasAtleastOneItemRealized = false;
                        var group = this._groups[i];
                        var groupIsCellSpanning = group instanceof Groups.CellSpanningGroup;
                        var groupOffset = (group ? group.offset : 0);

                        forEachContainer(groupBundle.itemsContainer, function (container, j) {
                            // Don't try to cache something outside of the realization range.
                            if (realizationRange.firstIndex <= itemIndex && realizationRange.lastIndex >= itemIndex) {
                                groupHasAtleastOneItemRealized = true;

                                if (!this._cachedItemRecords[itemIndex]) {
                                    var itemPosition = this._getItemPositionForAnimations(itemIndex, i, j);
                                    var row = itemPosition.row;
                                    var column = itemPosition.column;
                                    var left = itemPosition.left;
                                    var top = itemPosition.top;

                                    // Setting both old and new variables now in case layoutAnimations is called multiple times.
                                    this._cachedItemRecords[itemIndex] = {
                                        oldRow: row,
                                        oldColumn: column,
                                        oldLeft: left,
                                        oldTop: top,
                                        width: itemPosition.width,
                                        height: itemPosition.height,
                                        element: container,
                                        inCellSpanningGroup: groupIsCellSpanning
                                    };
                                }
                            }
                            itemIndex++;
                        }.bind(this));

                        if (groupHasAtleastOneItemRealized) {
                            var groupIndex = i;
                            if (!this._cachedHeaderRecords[groupIndex]) {
                                var headerPosition = this._getHeaderPositionForAnimations(groupIndex);
                                this._cachedHeaderRecords[groupIndex] = {
                                    oldLeft: headerPosition.left,
                                    oldTop: headerPosition.top,
                                    width: headerPosition.width,
                                    height: headerPosition.height,
                                    element: groupBundle.header,
                                };
                            }
                            if (!this._cachedGroupRecords[uniqueID(groupBundle.itemsContainer.element)]) {
                                this._cachedGroupRecords[uniqueID(groupBundle.itemsContainer.element)] = {
                                    oldLeft: horizontal ? groupOffset : 0,
                                    left: horizontal ? groupOffset : 0,
                                    oldTop: horizontal ? 0 : groupOffset,
                                    top: horizontal ? 0 : groupOffset,
                                    element: groupBundle.itemsContainer.element,
                                };
                            }
                        }
                    }

                    this._site._writeProfilerMark("Animation:setupAnimations,StopTM");
                },

                _layoutAnimations: function _LayoutCommon_layoutAnimations(modifiedItems, modifiedGroups) {
                    // This function is called after the DOM tree has been modified to match the data source.
                    // In this function we update the cached records and apply transforms to hide the modifications
                    // from the user. We will remove the transforms via animations in execute animation.

                    if (!Object.keys(this._cachedItemRecords).length &&
                        !Object.keys(this._cachedGroupRecords).length &&
                        !Object.keys(this._cachedHeaderRecords).length) {
                        return;
                    }

                    this._site._writeProfilerMark("Animation:layoutAnimation,StartTM");

                    this._updateAnimationCache(modifiedItems, modifiedGroups);

                    var realizationRange = this._getRealizationRange();

                    var tree = this._site.tree;
                    var itemIndex = 0;
                    var horizontal = (this.orientation === "horizontal");
                    for (var i = 0, treeLength = tree.length; i < treeLength; i++) {
                        var groupBundle = tree[i];
                        var group = this._groups[i];
                        var groupIsCellSpanning = group instanceof Groups.CellSpanningGroup;
                        var groupOffset = (group ? group.offset : 0);
                        var groupMovementX = 0;
                        var groupMovementY = 0;

                        var cachedGroupRecord = this._cachedGroupRecords[uniqueID(groupBundle.itemsContainer.element)];
                        if (cachedGroupRecord) {
                            if (horizontal) {
                                groupMovementX = cachedGroupRecord.oldLeft - groupOffset;
                            } else {
                                groupMovementY = cachedGroupRecord.oldTop - groupOffset;
                            }
                        }


                        forEachContainer(groupBundle.itemsContainer, function (container, j) {
                            // Don't try to cache something outside of the realization range.
                            if (realizationRange.firstIndex <= itemIndex && realizationRange.lastIndex >= itemIndex) {
                                var cachedItemRecord = this._cachedItemRecords[itemIndex];
                                if (cachedItemRecord) {
                                    var itemPosition = this._getItemPositionForAnimations(itemIndex, i, j);
                                    var row = itemPosition.row;
                                    var column = itemPosition.column;
                                    var left = itemPosition.left;
                                    var top = itemPosition.top;

                                    cachedItemRecord.inCellSpanningGroup = cachedItemRecord.inCellSpanningGroup || groupIsCellSpanning;

                                    // If the item has moved we need to update the cache and apply a transform to make it
                                    // appear like it has not moved yet.
                                    if (cachedItemRecord.oldRow !== row ||
                                        cachedItemRecord.oldColumn !== column ||
                                        cachedItemRecord.oldTop !== top ||
                                        cachedItemRecord.oldLeft !== left) {

                                        cachedItemRecord.row = row;
                                        cachedItemRecord.column = column;
                                        cachedItemRecord.left = left;
                                        cachedItemRecord.top = top;

                                        var xOffset = cachedItemRecord.oldLeft - cachedItemRecord.left - groupMovementX;
                                        var yOffset = cachedItemRecord.oldTop - cachedItemRecord.top - groupMovementY;
                                        xOffset = (this._site.rtl ? -1 : 1) * xOffset;

                                        cachedItemRecord.xOffset = xOffset;
                                        cachedItemRecord.yOffset = yOffset;
                                        if (xOffset !== 0 || yOffset !== 0) {
                                            var element = cachedItemRecord.element;
                                            cachedItemRecord.needsToResetTransform = true;
                                            element.style[transitionScriptName] = "";
                                            element.style[transformNames.scriptName] = "translate(" + xOffset + "px," + yOffset + "px)";
                                        }

                                        var itemsBlock = container.parentNode;
                                        if (_ElementUtilities.hasClass(itemsBlock, _Constants._itemsBlockClass)) {
                                            this._animatingItemsBlocks[uniqueID(itemsBlock)] = itemsBlock;
                                        }
                                    }

                                } else {
                                    // Treat items that came from outside of the realization range into the realization range
                                    // as a "Move" which means fade it in.
                                    this._cachedInsertedItemRecords[itemIndex] = container;
                                    container.style[transitionScriptName] = "";
                                    container.style.opacity = 0;
                                }
                            }

                            itemIndex++;
                        }.bind(this));

                        var groupIndex = i;
                        var cachedHeader = this._cachedHeaderRecords[groupIndex];
                        if (cachedHeader) {
                            var headerPosition = this._getHeaderPositionForAnimations(groupIndex);
                            // Note: If a group changes width we allow the header to immediately grow/shrink instead of
                            // animating it. However if the header is removed we stick the header to the last known size.
                            cachedHeader.height = headerPosition.height;
                            cachedHeader.width = headerPosition.width;
                            if (cachedHeader.oldLeft !== headerPosition.left ||
                                cachedHeader.oldTop !== headerPosition.top) {

                                cachedHeader.left = headerPosition.left;
                                cachedHeader.top = headerPosition.top;

                                var xOffset = cachedHeader.oldLeft - cachedHeader.left;
                                var yOffset = cachedHeader.oldTop - cachedHeader.top;
                                xOffset = (this._site.rtl ? -1 : 1) * xOffset;
                                if (xOffset !== 0 || yOffset !== 0) {
                                    cachedHeader.needsToResetTransform = true;
                                    var headerContainer = cachedHeader.element;
                                    headerContainer.style[transitionScriptName] = "";
                                    headerContainer.style[transformNames.scriptName] = "translate(" + xOffset + "px," + yOffset + "px)";
                                }
                            }
                        }

                        if (cachedGroupRecord) {
                            if ((horizontal && cachedGroupRecord.left !== groupOffset) ||
                                (!horizontal && cachedGroupRecord.top !== groupOffset)) {
                                var element = cachedGroupRecord.element;
                                if (groupMovementX === 0 && groupMovementY === 0) {
                                    if (cachedGroupRecord.needsToResetTransform) {
                                        cachedGroupRecord.needsToResetTransform = false;
                                        element.style[transformNames.scriptName] = "";
                                    }
                                } else {
                                    var groupOffsetX = (this._site.rtl ? -1 : 1) * groupMovementX,
                                        groupOffsetY = groupMovementY;
                                    cachedGroupRecord.needsToResetTransform = true;
                                    element.style[transitionScriptName] = "";
                                    element.style[transformNames.scriptName] = "translate(" + groupOffsetX + "px, " + groupOffsetY + "px)";
                                }
                            }
                        }
                    }

                    if (this._inListMode || this._itemsPerBar === 1) {
                        var itemsBlockKeys = Object.keys(this._animatingItemsBlocks);
                        for (var b = 0, blockKeys = itemsBlockKeys.length; b < blockKeys; b++) {
                            this._animatingItemsBlocks[itemsBlockKeys[b]].style.overflow = 'visible';
                        }
                    }

                    this._site._writeProfilerMark("Animation:layoutAnimation,StopTM");
                },

                executeAnimations: function _LayoutCommon_executeAnimations() {
                    // This function is called when we should perform an animation to reveal the true location of the items.
                    // We fade out removed items, fade in added items, and move items which need to be shifted. If they moved
                    // across columns we do a reflow animation.

                    var animationSignal = new _Signal();

                    // Only animate the items on screen.
                    this._filterInsertedElements();
                    this._filterMovedElements();
                    this._filterRemovedElements();

                    if (this._insertedElements.length === 0 && this._removedElements.length === 0 && this._itemMoveRecords.length === 0 && this._moveRecords.length === 0) {
                        // Nothing to animate.
                        this._resetAnimationCaches(true);
                        animationSignal.complete();
                        return animationSignal.promise;
                    }
                    this._animationsRunning = animationSignal.promise;

                    var slowAnimations = exports.Layout._debugAnimations || exports.Layout._slowAnimations;
                    var site = this._site;
                    var insertedElements = this._insertedElements;
                    var removedElements = this._removedElements;
                    var itemMoveRecords = this._itemMoveRecords;
                    var moveRecords = this._moveRecords;

                    var removeDelay = 0;
                    var moveDelay = 0;
                    var addDelay = 0;

                    var currentAnimationPromise = null;
                    var pendingTransitionPromises = [];

                    var hasMultisizeMove = false;
                    var hasReflow = false;
                    var minOffset = 0;
                    var maxOffset = 0;
                    var itemContainersToExpand = {};
                    var upOutDist = 0;
                    var downOutDist = 0;
                    var upInDist = 0;
                    var downInDist = 0;
                    var reflowItemRecords = [];
                    var horizontal = (this.orientation === "horizontal");
                    var oldReflowLayoutProperty = horizontal ? "oldColumn" : "oldRow",
                        reflowLayoutProperty = horizontal ? "column" : "row",
                        oldReflowLayoutPosition = horizontal ? "oldTop" : "oldLeft",
                        reflowLayoutPosition = horizontal ? "top" : "left";

                    var animatingItemsBlocks = this._animatingItemsBlocks;

                    for (var i = 0, len = itemMoveRecords.length; i < len; i++) {
                        var cachedItemRecord = itemMoveRecords[i];
                        if (cachedItemRecord.inCellSpanningGroup) {
                            hasMultisizeMove = true;
                            break;
                        }
                    }

                    var that = this;

                    function startAnimations() {
                        removePhase();
                        if (hasMultisizeMove) {
                            cellSpanningFadeOutMove();
                        } else {
                            if (that._itemsPerBar > 1) {
                                var maxDistance = that._itemsPerBar * that._sizes.containerCrossSize + that._getHeaderSizeContentAdjustment() +
                                    that._sizes.containerMargins[horizontal ? "top" : (site.rtl ? "right" : "left")] +
                                    (horizontal ? that._sizes.layoutOriginY : that._sizes.layoutOriginX);
                                for (var i = 0, len = itemMoveRecords.length; i < len; i++) {
                                    var cachedItemRecord = itemMoveRecords[i];
                                    if (cachedItemRecord[oldReflowLayoutProperty] > cachedItemRecord[reflowLayoutProperty]) {
                                        upOutDist = Math.max(upOutDist, cachedItemRecord[oldReflowLayoutPosition] + cachedItemRecord[horizontal ? "height" : "width"]);
                                        upInDist = Math.max(upInDist, maxDistance - cachedItemRecord[reflowLayoutPosition]);
                                        hasReflow = true;
                                        reflowItemRecords.push(cachedItemRecord);
                                    } else if (cachedItemRecord[oldReflowLayoutProperty] < cachedItemRecord[reflowLayoutProperty]) {
                                        downOutDist = Math.max(downOutDist, maxDistance - cachedItemRecord[oldReflowLayoutPosition]);
                                        downInDist = Math.max(downInDist, cachedItemRecord[reflowLayoutPosition] + cachedItemRecord[horizontal ? "height" : "width"]);
                                        reflowItemRecords.push(cachedItemRecord);
                                        hasReflow = true;
                                    }
                                }
                            }

                            if (site.rtl && !horizontal) {
                                upOutDist *= -1;
                                upInDist *= -1;
                                downOutDist *= -1;
                                downInDist *= -1;
                            }

                            if (hasReflow) {
                                reflowPhase(that._itemsPerBar);
                            } else {
                                directMovePhase();
                            }
                        }
                    }

                    if (exports.Layout._debugAnimations) {
                        _BaseUtils._requestAnimationFrame(function () {
                            startAnimations();
                        });
                    } else {
                        startAnimations();
                    }

                    function waitForNextPhase(nextPhaseCallback) {
                        currentAnimationPromise = Promise.join(pendingTransitionPromises);
                        currentAnimationPromise.done(function () {
                            pendingTransitionPromises = [];
                            // The success is called even if the animations are canceled due to the WinJS.UI.executeTransition
                            // API. To deal with that we check the animationSignal variable. If it is null the animations were
                            // canceled so we shouldn't continue.
                            if (animationSignal) {
                                if (exports.Layout._debugAnimations) {
                                    _BaseUtils._requestAnimationFrame(function () {
                                        nextPhaseCallback();
                                    });
                                } else {
                                    nextPhaseCallback();
                                }
                            }
                        });
                    }

                    function removePhase() {
                        if (removedElements.length) {
                            site._writeProfilerMark("Animation:setupRemoveAnimation,StartTM");

                            moveDelay += 60;
                            addDelay += 60;

                            var removeDuration = 120;
                            if (slowAnimations) {
                                removeDuration *= 10;
                            }

                            pendingTransitionPromises.push(_TransitionAnimation.executeTransition(removedElements,
                            [{
                                property: "opacity",
                                delay: removeDelay,
                                duration: removeDuration,
                                timing: "linear",
                                to: 0,
                                skipStylesReset: true
                            }]));

                            site._writeProfilerMark("Animation:setupRemoveAnimation,StopTM");
                        }
                    }

                    function cellSpanningFadeOutMove() {
                        site._writeProfilerMark("Animation:cellSpanningFadeOutMove,StartTM");

                        // For multisize items which move we fade out and then fade in (opacity 1->0->1)
                        var moveElements = [];
                        for (var i = 0, len = itemMoveRecords.length; i < len; i++) {
                            var cachedItemRecord = itemMoveRecords[i];
                            var container = cachedItemRecord.element;
                            moveElements.push(container);
                        }
                        // Including groups and headers.
                        for (var i = 0, len = moveRecords.length; i < len; i++) {
                            var cachedItemRecord = moveRecords[i];
                            var container = cachedItemRecord.element;
                            moveElements.push(container);
                        }

                        var fadeOutDuration = 120;
                        if (slowAnimations) {
                            fadeOutDuration *= 10;
                        }

                        pendingTransitionPromises.push(_TransitionAnimation.executeTransition(moveElements,
                        {
                            property: "opacity",
                            delay: removeDelay,
                            duration: fadeOutDuration,
                            timing: "linear",
                            to: 0
                        }));

                        waitForNextPhase(cellSpanningFadeInMove);
                        site._writeProfilerMark("Animation:cellSpanningFadeOutMove,StopTM");
                    }

                    function cellSpanningFadeInMove() {
                        site._writeProfilerMark("Animation:cellSpanningFadeInMove,StartTM");

                        addDelay = 0;

                        var moveElements = [];
                        // Move them to their final location.
                        for (var i = 0, len = itemMoveRecords.length; i < len; i++) {
                            var cachedItemRecord = itemMoveRecords[i];
                            var container = cachedItemRecord.element;
                            container.style[transformNames.scriptName] = "";
                            moveElements.push(container);
                        }
                        // Including groups and headers.
                        for (var i = 0, len = moveRecords.length; i < len; i++) {
                            var cachedItemRecord = moveRecords[i];
                            var container = cachedItemRecord.element;
                            container.style[transformNames.scriptName] = "";
                            moveElements.push(container);
                        }

                        var fadeInDuration = 120;
                        if (slowAnimations) {
                            fadeInDuration *= 10;
                        }

                        // For multisize items which move we fade out and then fade in (opacity 1->0->1)
                        pendingTransitionPromises.push(_TransitionAnimation.executeTransition(moveElements,
                        {
                            property: "opacity",
                            delay: addDelay,
                            duration: fadeInDuration,
                            timing: "linear",
                            to: 1
                        }));

                        site._writeProfilerMark("Animation:cellSpanningFadeInMove,StopTM");

                        addPhase();
                    }

                    function reflowPhase(itemsPerBar) {
                        site._writeProfilerMark("Animation:setupReflowAnimation,StartTM");

                        var itemContainersLastBarIndices = {};
                        for (var i = 0, len = reflowItemRecords.length; i < len; i++) {
                            var reflowItemRecord = reflowItemRecords[i];
                            var xOffset = reflowItemRecord.xOffset;
                            var yOffset = reflowItemRecord.yOffset;
                            if (reflowItemRecord[oldReflowLayoutProperty] > reflowItemRecord[reflowLayoutProperty]) {
                                if (horizontal) {
                                    yOffset -= upOutDist;
                                } else {
                                    xOffset -= upOutDist;
                                }
                            } else if (reflowItemRecord[oldReflowLayoutProperty] < reflowItemRecord[reflowLayoutProperty]) {
                                if (horizontal) {
                                    yOffset += downOutDist;
                                } else {
                                    xOffset += downOutDist;
                                }
                            }

                            var container = reflowItemRecord.element;

                            minOffset = Math.min(minOffset, horizontal ? xOffset : yOffset);
                            maxOffset = Math.max(maxOffset, horizontal ? xOffset : yOffset);
                            var itemsContainer = container.parentNode;
                            if (!_ElementUtilities.hasClass(itemsContainer, "win-itemscontainer")) {
                                itemsContainer = itemsContainer.parentNode;
                            }

                            // The itemscontainer element is always overflow:hidden for two reasons:
                            // 1) Better panning performance
                            // 2) When there is margin betweeen the itemscontainer and the surface elements, items that
                            //    reflow should not be visible while they travel long distances or overlap with headers.
                            // This introduces an issue when updateTree makes the itemscontainer smaller, but we need its size
                            // to remain the same size during the execution of the animation to avoid having some of the animated
                            // items being clipped. This is only an issue when items from the last column (in horizontal mode) or row
                            // (in vertical mode) of the group will reflow. Therefore, we change the padding so that the contents are larger,
                            // and then use margin to reverse the size change. We don't do this expansion when it is unnecessary because the
                            // layout/formatting caused by these style changes has significant cost when the group has thousands of items.
                            var lastBarIndex = itemContainersLastBarIndices[uniqueID(itemsContainer)];
                            if (!lastBarIndex) {
                                var count = getItemsContainerLength(getItemsContainerTree(itemsContainer, site.tree));
                                itemContainersLastBarIndices[uniqueID(itemsContainer)] = lastBarIndex = Math.ceil(count / itemsPerBar) - 1;
                            }
                            if (reflowItemRecords[i][horizontal ? "column" : "row"] === lastBarIndex) {
                                itemContainersToExpand[uniqueID(itemsContainer)] = itemsContainer;
                            }

                            var reflowDuration = 80;
                            if (slowAnimations) {
                                reflowDuration *= 10;
                            }

                            pendingTransitionPromises.push(_TransitionAnimation.executeTransition(container,
                            {
                                property: transformNames.cssName,
                                delay: moveDelay,
                                duration: reflowDuration,
                                timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                                to: "translate(" + xOffset + "px," + yOffset + "px)"
                            }));
                        }

                        var itemContainerKeys = Object.keys(itemContainersToExpand);
                        for (var i = 0, len = itemContainerKeys.length; i < len; i++) {
                            var itemContainer = itemContainersToExpand[itemContainerKeys[i]];
                            if (site.rtl && horizontal) {
                                itemContainer.style.paddingLeft = (-1 * minOffset) + 'px';
                                itemContainer.style.marginLeft = minOffset + 'px';
                            } else {
                                itemContainer.style[horizontal ? "paddingRight" : "paddingBottom"] = maxOffset + 'px';
                                itemContainer.style[horizontal ? "marginRight" : "marginBottom"] = '-' + maxOffset + 'px';
                            }
                        }
                        var itemsBlockKeys = Object.keys(animatingItemsBlocks);
                        for (var i = 0, len = itemsBlockKeys.length; i < len; i++) {
                            animatingItemsBlocks[itemsBlockKeys[i]].classList.add(_Constants._clipClass);
                        }

                        waitForNextPhase(afterReflowPhase);

                        site._writeProfilerMark("Animation:setupReflowAnimation,StopTM");
                    }

                    function cleanupItemsContainers() {
                        // Reset the styles used to obtain overflow-y: hidden overflow-x: visible.
                        var itemContainerKeys = Object.keys(itemContainersToExpand);
                        for (var i = 0, len = itemContainerKeys.length; i < len; i++) {
                            var itemContainer = itemContainersToExpand[itemContainerKeys[i]];
                            if (site.rtl && horizontal) {
                                itemContainer.style.paddingLeft = '';
                                itemContainer.style.marginLeft = '';
                            } else {
                                itemContainer.style[horizontal ? "paddingRight" : "paddingBottom"] = '';
                                itemContainer.style[horizontal ? "marginRight" : "marginBottom"] = '';
                            }
                        }
                        itemContainersToExpand = {};

                        var itemsBlockKeys = Object.keys(animatingItemsBlocks);
                        for (var i = 0, len = itemsBlockKeys.length; i < len; i++) {
                            var itemsBlock = animatingItemsBlocks[itemsBlockKeys[i]];
                            itemsBlock.style.overflow = '';
                            itemsBlock.classList.remove(_Constants._clipClass);
                        }
                    }

                    function afterReflowPhase() {
                        site._writeProfilerMark("Animation:prepareReflowedItems,StartTM");

                        // Position the items at the edge ready to slide in.
                        for (var i = 0, len = reflowItemRecords.length; i < len; i++) {
                            var reflowItemRecord = reflowItemRecords[i];
                            var xOffset = 0,
                                yOffset = 0;
                            if (reflowItemRecord[oldReflowLayoutProperty] > reflowItemRecord[reflowLayoutProperty]) {
                                if (horizontal) {
                                    yOffset = upInDist;
                                } else {
                                    xOffset = upInDist;
                                }
                            } else if (reflowItemRecord[oldReflowLayoutProperty] < reflowItemRecord[reflowLayoutProperty]) {
                                if (horizontal) {
                                    yOffset = -1 * downInDist;
                                } else {
                                    xOffset = -1 * downInDist;
                                }
                            }
                            reflowItemRecord.element.style[transitionScriptName] = "";
                            reflowItemRecord.element.style[transformNames.scriptName] = "translate(" + xOffset + "px," + yOffset + "px)";
                        }

                        site._writeProfilerMark("Animation:prepareReflowedItems,StopTM");

                        if (exports.Layout._debugAnimations) {
                            _BaseUtils._requestAnimationFrame(function () {
                                directMovePhase(true);
                            });
                        } else {
                            directMovePhase(true);
                        }
                    }

                    function directMovePhase(fastMode) {
                        // For groups and items which move we transition them from transform: translate(Xpx,Ypx) to translate(0px,0px).
                        var duration = 200;
                        if (fastMode) {
                            duration = 150;
                            moveDelay = 0;
                            addDelay = 0;
                        }

                        if (slowAnimations) {
                            duration *= 10;
                        }

                        if (itemMoveRecords.length > 0 || moveRecords.length > 0) {
                            site._writeProfilerMark("Animation:setupMoveAnimation,StartTM");

                            var moveElements = [];
                            for (var i = 0, len = moveRecords.length; i < len; i++) {
                                var container = moveRecords[i].element;
                                moveElements.push(container);
                            }
                            for (var i = 0, len = itemMoveRecords.length; i < len; i++) {
                                var container = itemMoveRecords[i].element;
                                moveElements.push(container);
                            }
                            pendingTransitionPromises.push(_TransitionAnimation.executeTransition(moveElements,
                            {
                                property: transformNames.cssName,
                                delay: moveDelay,
                                duration: duration,
                                timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                                to: ""
                            }));

                            addDelay += 80;

                            site._writeProfilerMark("Animation:setupMoveAnimation,StopTM");
                        }

                        addPhase();
                    }

                    function addPhase() {
                        if (insertedElements.length > 0) {
                            site._writeProfilerMark("Animation:setupInsertAnimation,StartTM");

                            var addDuration = 120;
                            if (slowAnimations) {
                                addDuration *= 10;
                            }

                            pendingTransitionPromises.push(_TransitionAnimation.executeTransition(insertedElements,
                            [{
                                property: "opacity",
                                delay: addDelay,
                                duration: addDuration,
                                timing: "linear",
                                to: 1
                            }]));

                            site._writeProfilerMark("Animation:setupInsertAnimation,StopTM");
                        }

                        waitForNextPhase(completePhase);
                    }
                    function completePhase() {
                        site._writeProfilerMark("Animation:cleanupAnimations,StartTM");

                        cleanupItemsContainers();

                        for (var i = 0, len = removedElements.length; i < len; i++) {
                            var container = removedElements[i];
                            if (container.parentNode) {
                                _Dispose._disposeElement(container);
                                container.parentNode.removeChild(container);
                            }
                        }

                        site._writeProfilerMark("Animation:cleanupAnimations,StopTM");

                        that._animationsRunning = null;
                        animationSignal.complete();
                    }
                    this._resetAnimationCaches(true);

                    // The PVL animation library completes sucessfully even if you cancel an animation.
                    // If the animation promise passed to layout is canceled we should cancel the PVL animations and
                    // set a marker for them to be ignored.
                    animationSignal.promise.then(null, function () {
                        // Since it was canceled make sure we still clean up the styles.
                        cleanupItemsContainers();
                        for (var i = 0, len = moveRecords.length; i < len; i++) {
                            var container = moveRecords[i].element;
                            container.style[transformNames.scriptName] = '';
                            container.style.opacity = 1;
                        }
                        for (var i = 0, len = itemMoveRecords.length; i < len; i++) {
                            var container = itemMoveRecords[i].element;
                            container.style[transformNames.scriptName] = '';
                            container.style.opacity = 1;
                        }
                        for (var i = 0, len = insertedElements.length; i < len; i++) {
                            insertedElements[i].style.opacity = 1;
                        }
                        for (var i = 0, len = removedElements.length; i < len; i++) {
                            var container = removedElements[i];
                            if (container.parentNode) {
                                _Dispose._disposeElement(container);
                                container.parentNode.removeChild(container);
                            }
                        }

                        this._animationsRunning = null;
                        animationSignal = null;
                        currentAnimationPromise && currentAnimationPromise.cancel();

                    }.bind(this));

                    return animationSignal.promise;
                },

                dragOver: function _LayoutCommon_dragOver(x, y, dragInfo) {
                    // The coordinates passed to dragOver should be in ListView's viewport space. 0,0 should be the top left corner of the viewport's padding.
                    var indicesAffected = this.hitTest(x, y),
                        groupAffected = (this._groups ? this._site.groupIndexFromItemIndex(indicesAffected.index) : 0),
                        itemsContainer = this._site.tree[groupAffected].itemsContainer,
                        itemsCount = getItemsContainerLength(itemsContainer),
                        indexOffset = (this._groups ? this._groups[groupAffected].startIndex : 0),
                        visibleRange = this._getVisibleRange();

                    indicesAffected.index -= indexOffset;
                    indicesAffected.insertAfterIndex -= indexOffset;
                    visibleRange.firstIndex = Math.max(visibleRange.firstIndex - indexOffset - 1, 0);
                    visibleRange.lastIndex = Math.min(visibleRange.lastIndex - indexOffset + 1, itemsCount);
                    var indexAfter = Math.max(Math.min(itemsCount - 1, indicesAffected.insertAfterIndex), -1),
                        indexBefore = Math.min(indexAfter + 1, itemsCount);

                    if (dragInfo) {
                        for (var i = indexAfter; i >= visibleRange.firstIndex; i--) {
                            if (!dragInfo._isIncluded(i + indexOffset)) {
                                indexAfter = i;
                                break;
                            } else if (i === visibleRange.firstIndex) {
                                indexAfter = -1;
                            }
                        }

                        for (var i = indexBefore; i < visibleRange.lastIndex; i++) {
                            if (!dragInfo._isIncluded(i + indexOffset)) {
                                indexBefore = i;
                                break;
                            } else if (i === (visibleRange.lastIndex - 1)) {
                                indexBefore = itemsCount;
                            }
                        }
                    }

                    var elementBefore = containerFromIndex(itemsContainer, indexBefore),
                        elementAfter = containerFromIndex(itemsContainer, indexAfter);

                    if (this._animatedDragItems) {
                        for (var i = 0, len = this._animatedDragItems.length; i < len; i++) {
                            var item = this._animatedDragItems[i];
                            if (item) {
                                item.style[transitionScriptName] = this._site.animationsDisabled ? "" : dragBetweenTransition;
                                item.style[transformNames.scriptName] = "";
                            }
                        }
                    }
                    this._animatedDragItems = [];
                    var horizontal = this.orientation === "horizontal",
                        inListMode = this._inListMode || this._itemsPerBar === 1;
                    if (this._groups && this._groups[groupAffected] instanceof Groups.CellSpanningGroup) {
                        inListMode = this._groups[groupAffected]._slotsPerColumn === 1;
                    }
                    var horizontalTransform = 0,
                        verticalTransform = 0;
                    // In general, items should slide in the direction perpendicular to the layout's orientation.
                    // In a horizontal layout, items are laid out top to bottom, left to right. For any two neighboring items in this layout, we want to move the first item up and the second down
                    // to denote that any inserted item would go between those two.
                    // Similarily, vertical layout should have the first item move left and the second move right.
                    // List layout is a special case. A horizontal list layout can only lay things out left to right, so it should slide the two items left and right like a vertical grid.
                    // A vertical list can only lay things out top to bottom, so it should slide items up and down like a horizontal grid.
                    // In other words: Apply horizontal transformations if we're a vertical grid or horizontal list, otherwise use vertical transformations.
                    if ((!horizontal && !inListMode) || (horizontal && inListMode)) {
                        horizontalTransform = this._site.rtl ? -dragBetweenDistance : dragBetweenDistance;
                    } else {
                        verticalTransform = dragBetweenDistance;
                    }
                    if (elementBefore) {
                        elementBefore.style[transitionScriptName] = this._site.animationsDisabled ? "" : dragBetweenTransition;
                        elementBefore.style[transformNames.scriptName] = "translate(" + horizontalTransform + "px, " + verticalTransform + "px)";
                        this._animatedDragItems.push(elementBefore);
                    }
                    if (elementAfter) {
                        elementAfter.style[transitionScriptName] = this._site.animationsDisabled ? "" : dragBetweenTransition;
                        elementAfter.style[transformNames.scriptName] = "translate(" + (-horizontalTransform) + "px, -" + verticalTransform + "px)";
                        this._animatedDragItems.push(elementAfter);
                    }
                },

                dragLeave: function _LayoutCommon_dragLeave() {
                    if (this._animatedDragItems) {
                        for (var i = 0, len = this._animatedDragItems.length; i < len; i++) {
                            this._animatedDragItems[i].style[transitionScriptName] = this._site.animationsDisabled ? "" : dragBetweenTransition;
                            this._animatedDragItems[i].style[transformNames.scriptName] = "";
                        }
                    }
                    this._animatedDragItems = [];
                },

                // Private methods

                _setMaxRowsOrColumns: function _LayoutCommon_setMaxRowsOrColumns(value) {
                    if (value === this._maxRowsOrColumns || this._inListMode) {
                        return;
                    }

                    // If container size is unavailable then we do not need to compute itemsPerBar
                    // as it will be computed along with the container size.
                    if (this._sizes && this._sizes.containerSizeLoaded) {
                        this._itemsPerBar = Math.floor(this._sizes.maxItemsContainerContentSize / this._sizes.containerCrossSize);
                        if (value) {
                            this._itemsPerBar = Math.min(this._itemsPerBar, value);
                        }
                        this._itemsPerBar = Math.max(1, this._itemsPerBar);
                    }
                    this._maxRowsOrColumns = value;

                    this._invalidateLayout();
                },

                _getItemPosition: function _LayoutCommon_getItemPosition(itemIndex) {
                    if (this._groupsEnabled) {
                        var groupIndex = Math.min(this._groups.length - 1, this._site.groupIndexFromItemIndex(itemIndex)),
                            group = this._groups[groupIndex],
                            itemOfGroupIndex = itemIndex - group.startIndex;
                        return this._getItemPositionForAnimations(itemIndex, groupIndex, itemOfGroupIndex);
                    } else {
                        return this._getItemPositionForAnimations(itemIndex, 0, itemIndex);
                    }
                },

                _getRealizationRange: function _LayoutCommon_getRealizationRange() {
                    var realizedRange = this._site.realizedRange;
                    return {
                        firstIndex: this._firstItemFromRange(realizedRange.firstPixel),
                        lastIndex: this._lastItemFromRange(realizedRange.lastPixel)
                    };
                },

                _getVisibleRange: function _LayoutCommon_getVisibleRange() {
                    var visibleRange = this._site.visibleRange;
                    return {
                        firstIndex: this._firstItemFromRange(visibleRange.firstPixel),
                        lastIndex: this._lastItemFromRange(visibleRange.lastPixel)
                    };
                },

                _resetAnimationCaches: function _LayoutCommon_resetAnimationCaches(skipReset) {
                    if (!skipReset) {
                        // Caches with move transforms:
                        this._resetStylesForRecords(this._cachedGroupRecords);
                        this._resetStylesForRecords(this._cachedItemRecords);
                        this._resetStylesForRecords(this._cachedHeaderRecords);

                        // Caches with insert transforms:
                        this._resetStylesForInsertedRecords(this._cachedInsertedItemRecords);
                        this._resetStylesForInsertedRecords(this._cachedInsertedHeaderRecords);

                        // Caches with insert transforms:
                        this._resetStylesForRemovedRecords(this._cachedRemovedItems);
                        this._resetStylesForRemovedRecords(this._cachedRemovedHeaders);

                        var itemsBlockKeys = Object.keys(this._animatingItemsBlocks);
                        for (var i = 0, len = itemsBlockKeys.length; i < len; i++) {
                            var itemsBlock = this._animatingItemsBlocks[itemsBlockKeys[i]];
                            itemsBlock.style.overflow = '';
                            itemsBlock.classList.remove(_Constants._clipClass);
                        }
                    }

                    this._cachedGroupRecords = {};
                    this._cachedItemRecords = {};
                    this._cachedHeaderRecords = {};

                    this._cachedInsertedItemRecords = {};
                    this._cachedInsertedHeaderRecords = {};

                    this._cachedRemovedItems = [];
                    this._cachedRemovedHeaders = [];

                    this._animatingItemsBlocks = {};
                },

                _cacheRemovedElements: function _LayoutCommon_cacheRemovedElements(modifiedElements, cachedRecords, cachedInsertedRecords, removedElements, areHeaders) {
                    var leftStr = "left";
                    if (this._site.rtl) {
                        leftStr = "right";
                    }
                    // Offset between the container's content box and its margin box
                    var outerX, outerY;
                    if (areHeaders) {
                        outerX = this._sizes.headerContainerOuterX;
                        outerY = this._sizes.headerContainerOuterY;
                    } else {
                        outerX = this._sizes.containerMargins[leftStr];
                        outerY = this._sizes.containerMargins.top;
                    }

                    // Cache the removed boxes and place them back in the DOM with position absolute
                    // so that they do not appear like they have moved.
                    for (var i = 0, len = modifiedElements.length; i < len; i++) {
                        var modifiedElementLookup = modifiedElements[i];
                        if (modifiedElementLookup.newIndex === -1) {
                            var container = modifiedElementLookup.element;
                            var cachedItemRecord = cachedRecords[modifiedElementLookup.oldIndex];
                            if (cachedItemRecord) {
                                cachedItemRecord.element = container;
                                // This item can no longer be a moved item.
                                delete cachedRecords[modifiedElementLookup.oldIndex];
                                container.style.position = "absolute";
                                container.style[transitionScriptName] = "";
                                container.style.top = cachedItemRecord.oldTop - outerY + "px";
                                container.style[leftStr] = cachedItemRecord.oldLeft - outerX + "px";
                                container.style.width = cachedItemRecord.width + "px";
                                container.style.height = cachedItemRecord.height + "px";
                                container.style[transformNames.scriptName] = "";
                                this._site.surface.appendChild(container);
                                removedElements.push(cachedItemRecord);
                            }
                            if (cachedInsertedRecords[modifiedElementLookup.oldIndex]) {
                                delete cachedInsertedRecords[modifiedElementLookup.oldIndex];
                            }
                        }
                    }
                },
                _cacheInsertedElements: function _LayoutCommon_cacheInsertedItems(modifiedElements, cachedInsertedRecords, cachedRecords) {
                    var newCachedInsertedRecords = {};

                    for (var i = 0, len = modifiedElements.length; i < len; i++) {
                        var modifiedElementLookup = modifiedElements[i];
                        var wasInserted = cachedInsertedRecords[modifiedElementLookup.oldIndex];
                        if (wasInserted) {
                            delete cachedInsertedRecords[modifiedElementLookup.oldIndex];
                        }

                        if (wasInserted || modifiedElementLookup.oldIndex === -1 || modifiedElementLookup.moved) {
                            var cachedRecord = cachedRecords[modifiedElementLookup.newIndex];
                            if (cachedRecord) {
                                delete cachedRecords[modifiedElementLookup.newIndex];
                            }

                            var modifiedElement = modifiedElementLookup.element;
                            newCachedInsertedRecords[modifiedElementLookup.newIndex] = modifiedElement;
                            modifiedElement.style[transitionScriptName] = "";
                            modifiedElement.style[transformNames.scriptName] = "";
                            modifiedElement.style.opacity = 0;
                        }
                    }

                    var keys = Object.keys(cachedInsertedRecords);
                    for (var i = 0, len = keys.length; i < len; i++) {
                        newCachedInsertedRecords[keys[i]] = cachedInsertedRecords[keys[i]];
                    }

                    return newCachedInsertedRecords;
                },
                _resetStylesForRecords: function _LayoutCommon_resetStylesForRecords(recordsHash) {
                    var recordKeys = Object.keys(recordsHash);
                    for (var i = 0, len = recordKeys.length; i < len; i++) {
                        var record = recordsHash[recordKeys[i]];
                        if (record.needsToResetTransform) {
                            record.element.style[transformNames.scriptName] = "";
                            record.needsToResetTransform = false;
                        }
                    }
                },
                _resetStylesForInsertedRecords: function _LayoutCommon_resetStylesForInsertedRecords(insertedRecords) {
                    var insertedRecordKeys = Object.keys(insertedRecords);
                    for (var i = 0, len = insertedRecordKeys.length; i < len; i++) {
                        var insertedElement = insertedRecords[insertedRecordKeys[i]];
                        insertedElement.style.opacity = 1;
                    }
                },
                _resetStylesForRemovedRecords: function _LayoutCommon_resetStylesForRemovedRecords(removedElements) {
                    for (var i = 0, len = removedElements.length; i < len; i++) {
                        var container = removedElements[i].element;
                        if (container.parentNode) {
                            _Dispose._disposeElement(container);
                            container.parentNode.removeChild(container);
                        }
                    }
                },
                _updateAnimationCache: function _LayoutCommon_updateAnimationCache(modifiedItems, modifiedGroups) {
                    // ItemBoxes can change containers so we have to start them back without transforms
                    // and then update them again. ItemsContainers don't need to do this.
                    this._resetStylesForRecords(this._cachedItemRecords);
                    this._resetStylesForRecords(this._cachedHeaderRecords);
                    // Go through all the inserted records and reset their insert transforms.
                    this._resetStylesForInsertedRecords(this._cachedInsertedItemRecords);
                    this._resetStylesForInsertedRecords(this._cachedInsertedHeaderRecords);

                    var existingContainers = {};
                    var realizationRange = this._getRealizationRange();
                    var tree = this._site.tree;
                    for (var i = 0, itemIndex = 0, treeLength = tree.length; i < treeLength; i++) {
                        forEachContainer(tree[i].itemsContainer, function (container) {
                            if (realizationRange.firstIndex <= itemIndex && realizationRange.lastIndex >= itemIndex) {
                                existingContainers[uniqueID(container)] = true;
                            }
                            itemIndex++;
                        });
                    }

                    // Update the indicies before the insert since insert needs the new containers.
                    function updateIndicies(modifiedElements, cachedRecords) {
                        var updatedCachedRecords = {};

                        for (var i = 0, len = modifiedElements.length; i < len; i++) {
                            var modifiedElementLookup = modifiedElements[i];
                            var cachedRecord = cachedRecords[modifiedElementLookup.oldIndex];
                            if (cachedRecord) {
                                updatedCachedRecords[modifiedElementLookup.newIndex] = cachedRecord;
                                cachedRecord.element = modifiedElementLookup.element;
                                delete cachedRecords[modifiedElementLookup.oldIndex];
                            }
                        }
                        var cachedRecordKeys = Object.keys(cachedRecords);
                        for (var i = 0, len = cachedRecordKeys.length; i < len; i++) {
                            var key = cachedRecordKeys[i],
                                record = cachedRecords[key];
                            // We need to filter out containers which were removed from the DOM. If container's item
                            // wasn't realized container can be removed without adding record to modifiedItems.
                            if (!record.element || existingContainers[uniqueID(record.element)]) {
                                updatedCachedRecords[key] = record;
                            }
                        }
                        return updatedCachedRecords;
                    }

                    this._cachedItemRecords = updateIndicies(modifiedItems, this._cachedItemRecords);
                    this._cachedHeaderRecords = updateIndicies(modifiedGroups, this._cachedHeaderRecords);

                    this._cachedInsertedItemRecords = this._cacheInsertedElements(modifiedItems, this._cachedInsertedItemRecords, this._cachedItemRecords);
                    this._cachedInsertedHeaderRecords = this._cacheInsertedElements(modifiedGroups, this._cachedInsertedHeaderRecords, this._cachedHeaderRecords);
                },
                _filterRemovedElements: function _LayoutCommon_filterRemovedElements() {
                    this._removedElements = [];

                    if (this._site.animationsDisabled) {
                        this._resetStylesForRemovedRecords(this._cachedRemovedItems);
                        this._resetStylesForRemovedRecords(this._cachedRemovedHeaders);
                        return;
                    }

                    var that = this;
                    var oldLeftStr = this.orientation === "horizontal" ? "oldLeft" : "oldTop";
                    var widthStr = this.orientation === "horizontal" ? "width" : "height";

                    var visibleFirstPixel = this._site.scrollbarPos;
                    var visibleLastPixel = visibleFirstPixel + this._site.viewportSize[widthStr] - 1;

                    function filterRemovedElements(removedRecordArray, removedElementsArray) {
                        for (var i = 0, len = removedRecordArray.length; i < len; i++) {
                            var removedItem = removedRecordArray[i];
                            var container = removedItem.element;
                            if (removedItem[oldLeftStr] + removedItem[widthStr] - 1 < visibleFirstPixel || removedItem[oldLeftStr] > visibleLastPixel || !that._site.viewport.contains(container)) {
                                if (container.parentNode) {
                                    _Dispose._disposeElement(container);
                                    container.parentNode.removeChild(container);
                                }
                            } else {
                                removedElementsArray.push(container);
                            }
                        }
                    }

                    filterRemovedElements(this._cachedRemovedItems, this._removedElements);
                    filterRemovedElements(this._cachedRemovedHeaders, this._removedElements);
                },

                _filterInsertedElements: function _LayoutCommon_filterInsertedElements() {
                    this._insertedElements = [];
                    if (this._site.animationsDisabled) {
                        this._resetStylesForInsertedRecords(this._cachedInsertedItemRecords);
                        this._resetStylesForInsertedRecords(this._cachedInsertedHeaderRecords);
                        return;
                    }

                    var that = this;
                    var visibleRange = this._getVisibleRange();

                    function filterInsertedElements(cachedInsertedRecords, insertedElementsArray) {
                        var recordKeys = Object.keys(cachedInsertedRecords);
                        for (var i = 0, len = recordKeys.length; i < len; i++) {
                            var itemIndex = recordKeys[i];
                            var insertedRecord = cachedInsertedRecords[itemIndex];
                            if (itemIndex < visibleRange.firstIndex || itemIndex > visibleRange.lastIndex || that._site.viewport.contains(insertedRecord.element)) {
                                insertedRecord.style.opacity = 1;
                            } else {
                                insertedElementsArray.push(insertedRecord);
                            }
                        }
                    }

                    filterInsertedElements(this._cachedInsertedItemRecords, this._insertedElements);
                    filterInsertedElements(this._cachedInsertedHeaderRecords, this._insertedElements);
                },

                _filterMovedElements: function _LayoutCommon_filterMovedElements() {
                    var that = this;

                    // This filters all the items and groups down which could have moved to just the items on screen.
                    // The items which are not going to animate are immediately shown in their correct final location.
                    var oldLeftStr = this.orientation === "horizontal" ? "oldLeft" : "oldTop";
                    var leftStr = this.orientation === "horizontal" ? "left" : "top";
                    var widthStr = this.orientation === "horizontal" ? "width" : "height";

                    var realizationRange = this._getRealizationRange();
                    var visibleFirstPixel = this._site.scrollbarPos;
                    var visibleLastPixel = visibleFirstPixel + this._site.viewportSize[widthStr] - 1;

                    // ItemMove can reflow across column or fade in/out due to multisize.
                    this._itemMoveRecords = [];
                    this._moveRecords = [];

                    if (!this._site.animationsDisabled) {
                        var tree = this._site.tree;
                        var itemIndex = 0;
                        for (var i = 0, treeLength = tree.length; i < treeLength; i++) {
                            var groupBundle = tree[i];
                            var groupHasItemToAnimate = false;

                            forEachContainer(groupBundle.itemsContainer, function () {
                                if (realizationRange.firstIndex <= itemIndex && realizationRange.lastIndex >= itemIndex) {
                                    var cachedItemRecord = this._cachedItemRecords[itemIndex];
                                    if (cachedItemRecord) {
                                        var shouldAnimate = ((cachedItemRecord[oldLeftStr] + cachedItemRecord[widthStr] - 1 >= visibleFirstPixel && cachedItemRecord[oldLeftStr] <= visibleLastPixel) ||
                                                            (cachedItemRecord[leftStr] + cachedItemRecord[widthStr] - 1 >= visibleFirstPixel && cachedItemRecord[leftStr] <= visibleLastPixel)) &&
                                                            that._site.viewport.contains(cachedItemRecord.element);
                                        if (shouldAnimate) {
                                            groupHasItemToAnimate = true;
                                            if (cachedItemRecord.needsToResetTransform) {
                                                this._itemMoveRecords.push(cachedItemRecord);
                                                delete this._cachedItemRecords[itemIndex];
                                            }
                                        }
                                    }
                                }
                                itemIndex++;
                            }.bind(this));

                            var groupIndex = i;
                            var cachedHeaderRecord = this._cachedHeaderRecords[groupIndex];
                            if (cachedHeaderRecord) {
                                if (groupHasItemToAnimate && cachedHeaderRecord.needsToResetTransform) {
                                    this._moveRecords.push(cachedHeaderRecord);
                                    delete this._cachedHeaderRecords[groupIndex];
                                }
                            }

                            var cachedGroupRecord = this._cachedGroupRecords[uniqueID(groupBundle.itemsContainer.element)];
                            if (cachedGroupRecord) {
                                if (groupHasItemToAnimate && cachedGroupRecord.needsToResetTransform) {
                                    this._moveRecords.push(cachedGroupRecord);
                                    delete this._cachedGroupRecords[uniqueID(groupBundle.itemsContainer.element)];
                                }
                            }
                        }
                    }

                    // Reset transform for groups and items that were never on screen.
                    this._resetStylesForRecords(this._cachedGroupRecords);
                    this._resetStylesForRecords(this._cachedItemRecords);
                    this._resetStylesForRecords(this._cachedHeaderRecords);
                },

                _getItemPositionForAnimations: function _LayoutCommon_getItemPositionForAnimations(itemIndex, groupIndex, itemOfGroupIndex) {
                    // Top/Left are used to know if the item has moved and also used to position the item if removed.
                    // Row/Column are used to know if a reflow animation should occur
                    // Height/Width are used when positioning a removed item without impacting layout.
                    // The returned rectangle refers to the win-container's border/padding/content box. Coordinates
                    // are relative to the viewport.
                    var group = this._groups[groupIndex];
                    var itemPosition = group.getItemPositionForAnimations(itemOfGroupIndex);
                    var groupOffset = (this._groups[groupIndex] ? this._groups[groupIndex].offset : 0);
                    var headerWidth = (this._groupsEnabled && this._groupHeaderPosition === HeaderPosition.left ? this._sizes.headerContainerWidth : 0);
                    var headerHeight = (this._groupsEnabled && this._groupHeaderPosition === HeaderPosition.top ? this._sizes.headerContainerHeight : 0);

                    itemPosition.left += this._sizes.layoutOriginX + headerWidth + this._sizes.itemsContainerOuterX;
                    itemPosition.top += this._sizes.layoutOriginY + headerHeight + this._sizes.itemsContainerOuterY;
                    itemPosition[this._horizontal ? "left" : "top"] += groupOffset;
                    return itemPosition;
                },

                _getHeaderPositionForAnimations: function (groupIndex) {
                    // Top/Left are used to know if the item has moved.
                    // Height/Width are used when positioning a removed item without impacting layout.
                    // The returned rectangle refers to the header container's content box. Coordinates
                    // are relative to the viewport.

                    var headerPosition;

                    if (this._groupsEnabled) {
                        var width = this._sizes.headerContainerWidth - this._sizes.headerContainerOuterWidth,
                            height = this._sizes.headerContainerHeight - this._sizes.headerContainerOuterHeight;
                        if (this._groupHeaderPosition === HeaderPosition.left && !this._horizontal) {
                            height = this._groups[groupIndex].getItemsContainerSize() - this._sizes.headerContainerOuterHeight;
                        } else if (this._groupHeaderPosition === HeaderPosition.top && this._horizontal) {
                            width = this._groups[groupIndex].getItemsContainerSize() - this._sizes.headerContainerOuterWidth;
                        }

                        var offsetX = this._horizontal ? this._groups[groupIndex].offset : 0,
                            offsetY = this._horizontal ? 0 : this._groups[groupIndex].offset;
                        headerPosition = {
                            top: this._sizes.layoutOriginY + offsetY + this._sizes.headerContainerOuterY,
                            left: this._sizes.layoutOriginX + offsetX + this._sizes.headerContainerOuterX,
                            height: height,
                            width: width
                        };
                    } else {
                        headerPosition = {
                            top: 0,
                            left: 0,
                            height: 0,
                            width: 0
                        };
                    }
                    return headerPosition;
                },

                _rangeContainsItems: function _LayoutCommon_rangeContainsItems(firstPixel, lastPixel) {
                    if (this._groups.length === 0) {
                        return false;
                    } else {
                        var lastGroup = this._groups[this._groups.length - 1],
                            lastPixelOfLayout = this._sizes.layoutOrigin + lastGroup.offset + this._getGroupSize(lastGroup) - 1;

                        return lastPixel >= 0 && firstPixel <= lastPixelOfLayout;
                    }
                },

                _itemFromOffset: function _LayoutCommon_itemFromOffset(offset, options) {
                    // supported options are:
                    // - wholeItem: when set to true the fully visible item is returned
                    // - last: if 1 the last item is returned. if 0 the first
                    var that = this;
                    if (this._groups.length === 0) {
                        return 0;
                    }

                    function assignItemMargins(offset) {
                        if (!options.wholeItem) {
                            // This makes it such that if a container's margin is on screen but all of its
                            // content is off screen then we'll treat the container as being off screen.
                            var marginPropLast = (that._horizontal ? (that._site.rtl ? "right" : "left") : "top"),
                                marginPropFirst = (that._horizontal ? (that._site.rtl ? "left" : "right") : "bottom");
                            if (options.last) {
                                // When looking for the *last* item, treat all container margins
                                // as belonging to the container *before* the margin.
                                return offset - that._sizes.containerMargins[marginPropLast];
                            } else {
                                // When looking for the *first* item, treat all container margins
                                // as belonging to the container *after* the margin.
                                return offset + that._sizes.containerMargins[marginPropFirst];
                            }
                        }
                        return offset;
                    }

                    // Assign the headers and margins to the appropriate groups.
                    function assignGroupMarginsAndHeaders(offset) {
                        if (options.last) {
                            // When looking for the *last* group, the *trailing* header and margin belong to the group.
                            return offset - that._getHeaderSizeGroupAdjustment() - that._sizes.itemsContainerOuterStart;
                        } else {
                            // When looking for the *first* group, the *leading* header and margin belong to the group.
                            // No need to make any adjustments to offset because the correct header and margin
                            // already belong to the group.
                            return offset;
                        }
                    }

                    options = options || {};

                    // Make offset relative to layout's content box
                    offset -= this._sizes.layoutOrigin;

                    offset = assignItemMargins(offset);

                    var groupIndex = this._groupFromOffset(assignGroupMarginsAndHeaders(offset)),
                        group = this._groups[groupIndex];

                    // Make offset relative to the margin box of the group's items container
                    offset -= group.offset;
                    offset -= this._getHeaderSizeGroupAdjustment();

                    return group.startIndex + group.itemFromOffset(offset, options);
                },

                _firstItemFromRange: function _LayoutCommon_firstItemFromRange(firstPixel, options) {
                    // supported options are:
                    // - wholeItem: when set to true the first fully visible item is returned
                    options = options || {};
                    options.last = 0;
                    return this._itemFromOffset(firstPixel, options);
                },

                _lastItemFromRange: function _LayoutCommon_lastItemFromRange(lastPixel, options) {
                    // supported options are:
                    // - wholeItem: when set to true the last fully visible item is returned
                    options = options || {};
                    options.last = 1;
                    return this._itemFromOffset(lastPixel, options);
                },

                _adjustedKeyForRTL: function _LayoutCommon_adjustedKeyForRTL(key) {
                    if (this._site.rtl) {
                        if (key === Key.leftArrow) {
                            key = Key.rightArrow;
                        } else if (key === Key.rightArrow) {
                            key = Key.leftArrow;
                        }
                    }
                    return key;
                },

                _adjustedKeyForOrientationAndBars: function _LayoutCommon_adjustedKeyForOrientationAndBars(key, cellSpanningGroup) {
                    var newKey = key;

                    // Don't support cell spanning
                    if (cellSpanningGroup) {
                        return key;
                    }
                    // First, convert the key into a virtual form based off of horizontal layouts.
                    // In a horizontal layout, left/right keys switch between columns (AKA "bars"), and
                    // up/down keys switch between rows (AKA "slots").
                    // In vertical mode, we want up/down to switch between rows (AKA "bars" when vertical),
                    // and left/right to switch between columns (AKA "slots" when vertical).
                    // The first step is to convert keypresses in vertical so that up/down always correspond to moving between slots,
                    // and left/right moving between bars.
                    if (!this._horizontal) {
                        switch (newKey) {
                            case Key.leftArrow:
                                newKey = Key.upArrow;
                                break;
                            case Key.rightArrow:
                                newKey = Key.downArrow;
                                break;
                            case Key.upArrow:
                                newKey = Key.leftArrow;
                                break;
                            case Key.downArrow:
                                newKey = Key.rightArrow;
                                break;
                        }
                    }

                    // Next, if we only have one item per bar, we'll make the change-slots-key the same as the change-bars-key
                    if (this._itemsPerBar === 1) {
                        if (newKey === Key.upArrow) {
                            newKey = Key.leftArrow;
                        } else if (newKey === Key.downArrow) {
                            newKey = Key.rightArrow;
                        }
                    }

                    return newKey;
                },

                _getAdjacentForPageKeys: function _LayoutCommon_getAdjacentForPageKeys(currentItem, pressedKey) {
                    var containerMargins = this._sizes.containerMargins,
                        marginSum = (this.orientation === "horizontal" ?
                            containerMargins.left + containerMargins.right :
                            containerMargins.top + containerMargins.bottom);

                    var viewportLength = this._site.viewportSize[this.orientation === "horizontal" ? "width" : "height"],
                        firstPixel = this._site.scrollbarPos,
                        lastPixel = firstPixel + viewportLength - 1 - containerMargins[(this.orientation === "horizontal" ? "right" : "bottom")],
                        newFocus;

                    // Handles page up by attempting to choose the first fully visible item
                    // on the current page. If that item already has focus, chooses the
                    // first item on the previous page. Page down is handled similarly.

                    var firstIndex = this._firstItemFromRange(firstPixel, { wholeItem: true }),
                        lastIndex = this._lastItemFromRange(lastPixel, { wholeItem: false }),
                        currentItemPosition = this._getItemPosition(currentItem.index);


                    var offscreen = false;
                    if (currentItem.index < firstIndex || currentItem.index > lastIndex) {
                        offscreen = true;
                        if (this.orientation === "horizontal") {
                            firstPixel = currentItemPosition.left - marginSum;
                        } else {
                            firstPixel = currentItemPosition.top - marginSum;
                        }
                        lastPixel = firstPixel + viewportLength - 1;
                        firstIndex = this._firstItemFromRange(firstPixel, { wholeItem: true });
                        lastIndex = this._lastItemFromRange(lastPixel, { wholeItem: false });
                    }

                    if (pressedKey === Key.pageUp) {
                        if (!offscreen && firstIndex !== currentItem.index) {
                            return { type: _UI.ObjectType.item, index: firstIndex };
                        }
                        var end;
                        if (this.orientation === "horizontal") {
                            end = currentItemPosition.left + currentItemPosition.width + marginSum + containerMargins.left;
                        } else {
                            end = currentItemPosition.top + currentItemPosition.height + marginSum + containerMargins.bottom;
                        }
                        var firstIndexOnPrevPage = this._firstItemFromRange(end - viewportLength, { wholeItem: true });
                        if (currentItem.index === firstIndexOnPrevPage) {
                            // The current item is so big that it spanned from the previous page, so we want to at least
                            // move to the previous item.
                            newFocus = Math.max(0, currentItem.index - this._itemsPerBar);
                        } else {
                            newFocus = firstIndexOnPrevPage;
                        }
                    } else {
                        if (!offscreen && lastIndex !== currentItem.index) {
                            return { type: _UI.ObjectType.item, index: lastIndex };
                        }
                        // We need to subtract twice the marginSum from the item's starting position because we need to
                        // consider that ensureVisible will scroll the viewport to include the new items margin as well
                        // which may push the current item just off screen.
                        var start;
                        if (this.orientation === "horizontal") {
                            start = currentItemPosition.left - marginSum - containerMargins.right;
                        } else {
                            start = currentItemPosition.top - marginSum - containerMargins.bottom;
                        }
                        var lastIndexOnNextPage = Math.max(0, this._lastItemFromRange(start + viewportLength - 1, { wholeItem: true }));
                        if (currentItem.index === lastIndexOnNextPage) {
                            // The current item is so big that it spans across the next page, so we want to at least
                            // move to the next item. It is also ok to blindly increment this index w/o bound checking
                            // since the browse mode clamps the bounds for page keys. This way we do not have to
                            // asynchronoulsy request the count here.
                            newFocus = currentItem.index + this._itemsPerBar;
                        } else {
                            newFocus = lastIndexOnNextPage;
                        }
                    }

                    return { type: _UI.ObjectType.item, index: newFocus };
                },

                _isCellSpanning: function _LayoutCommon_isCellSpanning(groupIndex) {
                    var group = this._site.groupFromIndex(groupIndex),
                        groupInfo = this._groupInfo;

                    if (groupInfo) {
                        return !!(typeof groupInfo === "function" ? groupInfo(group) : groupInfo).enableCellSpanning;
                    } else {
                        return false;
                    }
                },

                // Can only be called after measuring has been completed
                _getGroupInfo: function _LayoutCommon_getGroupInfo(groupIndex) {
                    var group = this._site.groupFromIndex(groupIndex),
                        groupInfo = this._groupInfo,
                        margins = this._sizes.containerMargins,
                        adjustedInfo = { enableCellSpanning: false };

                    groupInfo = (typeof groupInfo === "function" ? groupInfo(group) : groupInfo);
                    if (groupInfo) {
                        if (groupInfo.enableCellSpanning && (+groupInfo.cellWidth !== groupInfo.cellWidth || +groupInfo.cellHeight !== groupInfo.cellHeight)) {
                            throw new _ErrorFromName("WinJS.UI.GridLayout.GroupInfoResultIsInvalid", strings.groupInfoResultIsInvalid);
                        }
                        adjustedInfo = {
                            enableCellSpanning: !!groupInfo.enableCellSpanning,
                            cellWidth: groupInfo.cellWidth + margins.left + margins.right,
                            cellHeight: groupInfo.cellHeight + margins.top + margins.bottom
                        };
                    }

                    return adjustedInfo;
                },

                // itemIndex is optional
                _getItemInfo: function _LayoutCommon_getItemInfo(itemIndex) {
                    var result;
                    if (!this._itemInfo || typeof this._itemInfo !== "function") {
                        if (this._useDefaultItemInfo) {
                            result = this._defaultItemInfo(itemIndex);
                        } else {
                            throw new _ErrorFromName("WinJS.UI.GridLayout.ItemInfoIsInvalid", strings.itemInfoIsInvalid);
                        }
                    } else {
                        result = this._itemInfo(itemIndex);
                    }
                    return Promise.as(result).then(function (size) {
                        if (!size || +size.width !== size.width || +size.height !== size.height) {
                            throw new _ErrorFromName("WinJS.UI.GridLayout.ItemInfoIsInvalid", strings.itemInfoIsInvalid);
                        }
                        return size;
                    });
                },

                _defaultItemInfo: function _LayoutCommon_defaultItemInfo(itemIndex) {
                    var that = this;
                    return this._site.renderItem(this._site.itemFromIndex(itemIndex)).then(function (element) {
                        that._elementsToMeasure[itemIndex] = {
                            element: element
                        };
                        return that._measureElements();
                    }).then(
                        function () {
                            var entry = that._elementsToMeasure[itemIndex],
                                size = {
                                    width: entry.width,
                                    height: entry.height
                                };

                            delete that._elementsToMeasure[itemIndex];
                            return size;
                        },
                        function (error) {
                            delete that._elementsToMeasure[itemIndex];
                            return Promise.wrapError(error);
                        }
                    );
                },

                _getGroupSize: function _LayoutCommon_getGroupSize(group) {
                    var headerContainerMinSize = 0;

                    if (this._groupsEnabled) {
                        if (this._horizontal && this._groupHeaderPosition === HeaderPosition.top) {
                            headerContainerMinSize = this._sizes.headerContainerMinWidth;
                        } else if (!this._horizontal && this._groupHeaderPosition === HeaderPosition.left) {
                            headerContainerMinSize = this._sizes.headerContainerMinHeight;
                        }
                    }
                    return Math.max(headerContainerMinSize, group.getItemsContainerSize() + this._getHeaderSizeGroupAdjustment());
                },

                // offset should be relative to the grid layout's content box
                _groupFromOffset: function _LayoutCommon_groupFromOffset(offset) {
                    return offset < this._groups[0].offset ?
                        0 :
                        this._groupFrom(function (group) {
                            return offset < group.offset;
                        });
                },

                _groupFromImpl: function _LayoutCommon_groupFromImpl(fromGroup, toGroup, comp) {
                    if (toGroup < fromGroup) {
                        return null;
                    }

                    var center = fromGroup + Math.floor((toGroup - fromGroup) / 2),
                        centerGroup = this._groups[center];

                    if (comp(centerGroup, center)) {
                        return this._groupFromImpl(fromGroup, center - 1, comp);
                    } else if (center < toGroup && !comp(this._groups[center + 1], center + 1)) {
                        return this._groupFromImpl(center + 1, toGroup, comp);
                    } else {
                        return center;
                    }
                },

                _groupFrom: function _LayoutCommon_groupFrom(comp) {
                    if (this._groups.length > 0) {
                        var lastGroupIndex = this._groups.length - 1,
                            lastGroup = this._groups[lastGroupIndex];

                        if (!comp(lastGroup, lastGroupIndex)) {
                            return lastGroupIndex;
                        } else {
                            return this._groupFromImpl(0, this._groups.length - 1, comp);
                        }
                    } else {
                        return null;
                    }
                },

                _invalidateLayout: function _LayoutCommon_invalidateLayout() {
                    if (this._site) {
                        this._site.invalidateLayout();
                    }
                },

                _resetMeasurements: function _LayoutCommon_resetMeasurements() {
                    if (this._measuringPromise) {
                        this._measuringPromise.cancel();
                        this._measuringPromise = null;
                    }
                    if (this._containerSizeClassName) {
                        _ElementUtilities.removeClass(this._site.surface, this._containerSizeClassName);
                        deleteDynamicCssRule(this._containerSizeClassName);
                        this._containerSizeClassName = null;
                    }
                    this._sizes = null;
                    this._resetAnimationCaches();
                },

                _measureElements: function _LayoutCommon_measureElements() {
                    // batching measurements to minimalize number of layout passes
                    if (!this._measuringElements) {
                        var that = this;
                        // Schedule a job so that:
                        //  1. Calls to _measureElements are batched.
                        //  2. that._measuringElements is set before the promise handler is executed
                        //     (that._measuringElements is used within the handler).
                        that._measuringElements = Scheduler.schedulePromiseHigh(null, "WinJS.UI.GridLayout._measuringElements").then(
                            function measure() {
                                that._site._writeProfilerMark("_measureElements,StartTM");

                                var surface = that._createMeasuringSurface(),
                                    itemsContainer = _Global.document.createElement("div"),
                                    site = that._site,
                                    measuringElements = that._measuringElements,
                                    elementsToMeasure = that._elementsToMeasure,
                                    stopMeasuring = false;

                                itemsContainer.className = _Constants._itemsContainerClass + " " + _Constants._laidOutClass;
                                // This code is executed by CellSpanningGroups where styling is configured for –ms-grid. Let's satisfy these assumptions
                                itemsContainer.style.cssText +=
                                        ";display: -ms-grid" +
                                        ";-ms-grid-column: 1" +
                                        ";-ms-grid-row: 1";

                                var keys = Object.keys(elementsToMeasure),
                                    len,
                                    i;

                                for (i = 0, len = keys.length; i < len; i++) {
                                    var element = elementsToMeasure[keys[i]].element;
                                    element.style["-ms-grid-column"] = i + 1;
                                    element.style["-ms-grid-row"] = i + 1;
                                    itemsContainer.appendChild(element);
                                }

                                surface.appendChild(itemsContainer);
                                site.viewport.insertBefore(surface, site.viewport.firstChild);

                                // Reading from the DOM may cause the app's resize handler to
                                // be run synchronously which may invalidate this measuring
                                // operation. When this happens, stop measuring.
                                measuringElements.then(null, function () {
                                    stopMeasuring = true;
                                });

                                for (i = 0, len = keys.length; i < len && !stopMeasuring; i++) {
                                    var entry = elementsToMeasure[keys[i]],
                                        item = entry.element.querySelector("." + _Constants._itemClass);

                                    entry.width = _ElementUtilities.getTotalWidth(item);
                                    entry.height = _ElementUtilities.getTotalHeight(item);

                                }

                                if (surface.parentNode) {
                                    surface.parentNode.removeChild(surface);
                                }
                                if (measuringElements === that._measuringElements) {
                                    that._measuringElements = null;
                                }

                                site._writeProfilerMark("_measureElements,StopTM");
                            },
                            function (error) {
                                that._measuringElements = null;
                                return Promise.wrapError(error);
                            }
                        );
                    }
                    return this._measuringElements;
                },

                _ensureEnvInfo: function _LayoutCommon_ensureEnvInfo() {
                    if (!this._envInfo) {
                        this._envInfo = getEnvironmentSupportInformation(this._site);
                        if (this._envInfo && !this._envInfo.supportsCSSGrid) {
                            _ElementUtilities.addClass(this._site.surface, _Constants._noCSSGrid);
                        }
                    }
                    return !!this._envInfo;
                },

                _createMeasuringSurface: function _LayoutCommon_createMeasuringSurface() {
                    var surface = _Global.document.createElement("div");

                    surface.style.cssText =
                        "visibility: hidden" +
                        ";-ms-grid-columns: auto" +
                        ";-ms-grid-rows: auto" +
                        ";-ms-flex-align: start" +
                        ";-webkit-align-items: flex-start" +
                        ";align-items: flex-start";
                    surface.className = _Constants._scrollableClass + " " + (this._inListMode ? _Constants._listLayoutClass : _Constants._gridLayoutClass);
                    if (!this._envInfo.supportsCSSGrid) {
                        _ElementUtilities.addClass(surface, _Constants._noCSSGrid);
                    }
                    if (this._groupsEnabled) {
                        if (this._groupHeaderPosition === HeaderPosition.top) {
                            _ElementUtilities.addClass(surface, _Constants._headerPositionTopClass);
                        } else {
                            _ElementUtilities.addClass(surface, _Constants._headerPositionLeftClass);
                        }
                    }

                    return surface;
                },

                // Assumes that the size of the item at the specified index is representative
                // of the size of all items, measures it, and stores the measurements in
                // this._sizes. If necessary, also:
                // - Creates a CSS rule to give the containers a height and width
                // - Stores the name associated with the rule in this._containerSizeClassName
                // - Adds the class name associated with the rule to the surface
                _measureItem: function _LayoutCommon_measureItem(index) {
                    var that = this;
                    var perfId = "Layout:measureItem";
                    var site = that._site;
                    var measuringPromise = that._measuringPromise;

                    // itemPromise is optional. It is provided when taking a second attempt at measuring.
                    function measureItemImpl(index, itemPromise) {
                        var secondTry = !!itemPromise,
                            elementPromises = {},
                            itemPromise,
                            left = site.rtl ? "right" : "left";

                        return site.itemCount.then(function (count) {
                            if (!count || (that._groupsEnabled && !site.groupCount)) {
                                return Promise.cancel;
                            }

                            itemPromise = itemPromise || site.itemFromIndex(index);
                            elementPromises.container = site.renderItem(itemPromise);
                            if (that._groupsEnabled) {
                                elementPromises.headerContainer = site.renderHeader(that._site.groupFromIndex(site.groupIndexFromItemIndex(index)));
                            }

                            return Promise.join(elementPromises);
                        }).then(function (elements) {

                            // Reading from the DOM is tricky because each read may trigger a resize handler which
                            // may invalidate this layout object. To make it easier to minimize bugs in this edge case:
                            //  1. All DOM reads for _LayoutCommon_measureItem should be contained within this function.
                            //  2. This function should remain as simple as possible. Stick to DOM reads, avoid putting
                            //     logic in here, and cache all needed instance variables at the top of the function.
                            //
                            // Returns null if the measuring operation was invalidated while reading from the DOM.
                            // Otherwise, returns an object containing the measurements.
                            function readMeasurementsFromDOM() {
                                var horizontal = that._horizontal;
                                var groupsEnabled = that._groupsEnabled;
                                var stopMeasuring = false;

                                // Reading from the DOM may cause the app's resize handler to
                                // be run synchronously which may invalidate this measuring
                                // operation. When this happens, stop measuring.
                                measuringPromise.then(null, function () {
                                    stopMeasuring = true;
                                });

                                var firstElementOnSurfaceMargins = getMargins(firstElementOnSurface);
                                var firstElementOnSurfaceOffsetX = site.rtl ?
                                    (site.viewport.offsetWidth - (firstElementOnSurface.offsetLeft + firstElementOnSurface.offsetWidth)) :
                                    firstElementOnSurface.offsetLeft;
                                var firstElementOnSurfaceOffsetY = firstElementOnSurface.offsetTop;
                                var sizes = {
                                    // These will be set by _viewportSizeChanged
                                    viewportContentSize: 0,
                                    surfaceContentSize: 0,
                                    maxItemsContainerContentSize: 0,

                                    surfaceOuterHeight: getOuterHeight(surface),
                                    surfaceOuterWidth: getOuterWidth(surface),

                                    // Origin of the grid layout's content in viewport coordinates
                                    layoutOriginX: firstElementOnSurfaceOffsetX - firstElementOnSurfaceMargins[left],
                                    layoutOriginY: firstElementOnSurfaceOffsetY - firstElementOnSurfaceMargins.top,
                                    itemsContainerOuterHeight: getOuterHeight(itemsContainer),
                                    itemsContainerOuterWidth: getOuterWidth(itemsContainer),
                                    // Amount of space between the items container's margin and its content
                                    itemsContainerOuterX: getOuter(site.rtl ? "Right" : "Left", itemsContainer),
                                    itemsContainerOuterY: getOuter("Top", itemsContainer),
                                    itemsContainerMargins: getMargins(itemsContainer),

                                    itemBoxOuterHeight: getOuterHeight(itemBox),
                                    itemBoxOuterWidth: getOuterWidth(itemBox),
                                    containerOuterHeight: getOuterHeight(elements.container),
                                    containerOuterWidth: getOuterWidth(elements.container),
                                    emptyContainerContentHeight: _ElementUtilities.getContentHeight(emptyContainer),
                                    emptyContainerContentWidth: _ElementUtilities.getContentWidth(emptyContainer),

                                    containerMargins: getMargins(elements.container),
                                    // containerWidth/Height are computed when a uniform group is detected
                                    containerWidth: 0,
                                    containerHeight: 0,
                                    // true when both containerWidth and containerHeight have been measured
                                    containerSizeLoaded: false
                                };

                                if (site.listHeader) {
                                    sizes[(horizontal ? "layoutOriginX" : "layoutOriginY")] += _ElementUtilities[(horizontal ? "getTotalWidth" : "getTotalHeight")](site.listHeader);
                                }

                                if (groupsEnabled) {
                                    // Amount of space between the header container's margin and its content
                                    sizes.headerContainerOuterX = getOuter(site.rtl ? "Right" : "Left", elements.headerContainer),
                                    sizes.headerContainerOuterY = getOuter("Top", elements.headerContainer),

                                    sizes.headerContainerOuterWidth = getOuterWidth(elements.headerContainer);
                                    sizes.headerContainerOuterHeight = getOuterHeight(elements.headerContainer);
                                    sizes.headerContainerWidth = _ElementUtilities.getTotalWidth(elements.headerContainer);
                                    sizes.headerContainerHeight = _ElementUtilities.getTotalHeight(elements.headerContainer);
                                    sizes.headerContainerMinWidth = getDimension(elements.headerContainer, "minWidth") + sizes.headerContainerOuterWidth;
                                    sizes.headerContainerMinHeight = getDimension(elements.headerContainer, "minHeight") + sizes.headerContainerOuterHeight;
                                }

                                var measurements = {
                                    // Measurements which are needed after measureItem has returned.
                                    sizes: sizes,

                                    // Measurements which are only needed within measureItem.
                                    viewportContentWidth: _ElementUtilities.getContentWidth(site.viewport),
                                    viewportContentHeight: _ElementUtilities.getContentHeight(site.viewport),
                                    containerContentWidth: _ElementUtilities.getContentWidth(elements.container),
                                    containerContentHeight: _ElementUtilities.getContentHeight(elements.container),
                                    containerWidth: _ElementUtilities.getTotalWidth(elements.container),
                                    containerHeight: _ElementUtilities.getTotalHeight(elements.container)
                                };
                                measurements.viewportCrossSize = measurements[horizontal ? "viewportContentHeight" : "viewportContentWidth"];

                                site.readyToMeasure();

                                return stopMeasuring ? null : measurements;
                            }

                            function cleanUp() {
                                if (surface.parentNode) {
                                    surface.parentNode.removeChild(surface);
                                }
                            }

                            var surface = that._createMeasuringSurface(),
                                itemsContainer = _Global.document.createElement("div"),
                                emptyContainer = _Global.document.createElement("div"),
                                itemBox = elements.container.querySelector("." + _Constants._itemBoxClass),
                                groupIndex = site.groupIndexFromItemIndex(index);

                            emptyContainer.className = _Constants._containerClass;
                            itemsContainer.className = _Constants._itemsContainerClass + " " + _Constants._laidOutClass;
                            // Use display=inline-block so that the width sizes to content when not in list mode.
                            // When in grid mode, put items container and header container in different rows and columns so that the size of the items container does not affect the size of the header container and vice versa.
                            // Use the same for list mode when headers are inline with item containers.
                            // When headers are to the left of a vertical list, or above a horizontal list, put the rows/columns they would be in when laid out normally
                            // into the CSS text for measuring. We have to do this because list item containers should take up 100% of the space left over in the surface
                            // once the group's header is laid out.
                            var itemsContainerRow = 1,
                                itemsContainerColumn = 1,
                                headerContainerRow = 2,
                                headerContainerColumn = 2,
                                firstElementOnSurface = itemsContainer,
                                addHeaderFirst = false;
                            if (that._inListMode && that._groupsEnabled) {
                                if (that._horizontal && that._groupHeaderPosition === HeaderPosition.top) {
                                    itemsContainerRow = 2;
                                    headerContainerColumn = 1;
                                    headerContainerRow = 1;
                                    firstElementOnSurface = elements.headerContainer;
                                    addHeaderFirst = true;
                                } else if (!that._horizontal && that._groupHeaderPosition === HeaderPosition.left) {
                                    itemsContainerColumn = 2;
                                    headerContainerColumn = 1;
                                    headerContainerRow = 1;
                                    firstElementOnSurface = elements.headerContainer;
                                    addHeaderFirst = true;
                                }
                            }
                            // ListMode needs to use display block to proprerly measure items in vertical mode, and display flex to properly measure items in horizontal mode
                            itemsContainer.style.cssText +=
                                    ";display: " + (that._inListMode ? ((that._horizontal ? "flex" : "block") + "; overflow: hidden") : "inline-block") +
                                     ";vertical-align:top" +
                                    ";-ms-grid-column: " + itemsContainerColumn +
                                    ";-ms-grid-row: " + itemsContainerRow;
                            if (!that._inListMode) {
                                elements.container.style.display = "inline-block";
                            }
                            if (that._groupsEnabled) {
                                elements.headerContainer.style.cssText +=
                                    ";display: inline-block" +
                                    ";-ms-grid-column: " + headerContainerColumn +
                                    ";-ms-grid-row: " + headerContainerRow;
                                _ElementUtilities.addClass(elements.headerContainer, _Constants._laidOutClass + " " + _Constants._groupLeaderClass);
                                if ((that._groupHeaderPosition === HeaderPosition.top && that._horizontal) ||
                                    (that._groupHeaderPosition === HeaderPosition.left && !that._horizontal)) {
                                    _ElementUtilities.addClass(itemsContainer, _Constants._groupLeaderClass);
                                }
                            }
                            if (addHeaderFirst) {
                                surface.appendChild(elements.headerContainer);
                            }

                            itemsContainer.appendChild(elements.container);
                            itemsContainer.appendChild(emptyContainer);

                            surface.appendChild(itemsContainer);
                            if (!addHeaderFirst && that._groupsEnabled) {
                                surface.appendChild(elements.headerContainer);
                            }
                            site.viewport.insertBefore(surface, site.viewport.firstChild);

                            var measurements = readMeasurementsFromDOM();

                            if (!measurements) {
                                // While reading from the DOM, the measuring operation was invalidated. Bail out.
                                cleanUp();
                                return Promise.cancel;
                            } else if ((that._horizontal && measurements.viewportContentHeight === 0) || (!that._horizontal && measurements.viewportContentWidth === 0)) {
                                // ListView is invisible so we can't measure. Return a canceled promise.
                                cleanUp();
                                return Promise.cancel;
                            } else if (!secondTry && !that._isCellSpanning(groupIndex) &&
                                    (measurements.containerContentWidth === 0 || measurements.containerContentHeight === 0)) {
                                // win-container has no size. For backwards compatibility, wait for the item promise and then try measuring again.
                                cleanUp();
                                return itemPromise.then(function () {
                                    return measureItemImpl(index, itemPromise);
                                });
                            } else {
                                var sizes = that._sizes = measurements.sizes;

                                // Wrappers for orientation-specific properties.
                                // Sizes prefaced with "cross" refer to the sizes orthogonal to the current layout orientation. Sizes without a preface are in the orientation's direction.
                                Object.defineProperties(sizes, {
                                    surfaceOuterCrossSize: {
                                        get: function () {
                                            return (that._horizontal ? sizes.surfaceOuterHeight : sizes.surfaceOuterWidth);
                                        },
                                        enumerable: true
                                    },
                                    layoutOrigin: {
                                        get: function () {
                                            return (that._horizontal ? sizes.layoutOriginX : sizes.layoutOriginY);
                                        },
                                        enumerable: true
                                    },
                                    itemsContainerOuterSize: {
                                        get: function () {
                                            return (that._horizontal ? sizes.itemsContainerOuterWidth : sizes.itemsContainerOuterHeight);
                                        },
                                        enumerable: true
                                    },
                                    itemsContainerOuterCrossSize: {
                                        get: function () {
                                            return (that._horizontal ? sizes.itemsContainerOuterHeight : sizes.itemsContainerOuterWidth);
                                        },
                                        enumerable: true
                                    },
                                    itemsContainerOuterStart: {
                                        get: function () {
                                            return (that._horizontal ? sizes.itemsContainerOuterX : sizes.itemsContainerOuterY);
                                        },
                                        enumerable: true
                                    },
                                    itemsContainerOuterCrossStart: {
                                        get: function () {
                                            return (that._horizontal ? sizes.itemsContainerOuterY : sizes.itemsContainerOuterX);
                                        },
                                        enumerable: true
                                    },
                                    containerCrossSize: {
                                        get: function () {
                                            return (that._horizontal ? sizes.containerHeight : sizes.containerWidth);
                                        },
                                        enumerable: true
                                    },
                                    containerSize: {
                                        get: function () {
                                            return (that._horizontal ? sizes.containerWidth : sizes.containerHeight);
                                        },
                                        enumerable: true
                                    },
                                });

                                // If the measured group is uniform, measure the container height
                                // and width now. Otherwise, compute them thru itemInfo on demand (via _ensureContainerSize).
                                if (!that._isCellSpanning(groupIndex)) {
                                    if (that._inListMode) {
                                        var itemsContainerContentSize = measurements.viewportCrossSize - sizes.surfaceOuterCrossSize - that._getHeaderSizeContentAdjustment() - sizes.itemsContainerOuterCrossSize;
                                        if (that._horizontal) {
                                            sizes.containerHeight = itemsContainerContentSize;
                                            sizes.containerWidth = measurements.containerWidth;
                                        } else {
                                            sizes.containerHeight = measurements.containerHeight;
                                            sizes.containerWidth = itemsContainerContentSize;
                                        }
                                    } else {
                                        sizes.containerWidth = measurements.containerWidth;
                                        sizes.containerHeight = measurements.containerHeight;
                                    }
                                    sizes.containerSizeLoaded = true;
                                }

                                that._createContainerStyleRule();
                                that._viewportSizeChanged(measurements.viewportCrossSize);

                                cleanUp();
                            }
                        });
                    }

                    if (!measuringPromise) {
                        site._writeProfilerMark(perfId + ",StartTM");
                        // Use a signal to guarantee that measuringPromise is set before the promise
                        // handler is executed (measuringPromise is referenced within measureItemImpl).
                        var promiseStoredSignal = new _Signal();
                        that._measuringPromise = measuringPromise = promiseStoredSignal.promise.then(function () {
                            if (that._ensureEnvInfo()) {
                                return measureItemImpl(index);
                            } else {
                                // Couldn't get envInfo. ListView is invisible. Bail out.
                                return Promise.cancel;
                            }
                        }).then(function () {
                            site._writeProfilerMark(perfId + ":complete,info");
                            site._writeProfilerMark(perfId + ",StopTM");
                        }, function (error) {
                            // The purpose of the measuring promise is so that we only
                            // measure once. If measuring fails, clear the promise because
                            // we still need to measure.
                            that._measuringPromise = null;

                            site._writeProfilerMark(perfId + ":canceled,info");
                            site._writeProfilerMark(perfId + ",StopTM");

                            return Promise.wrapError(error);
                        });
                        promiseStoredSignal.complete();
                    }
                    return measuringPromise;
                },

                _getHeaderSizeGroupAdjustment: function () {
                    if (this._groupsEnabled) {
                        if (this._horizontal && this._groupHeaderPosition === HeaderPosition.left) {
                            return this._sizes.headerContainerWidth;
                        } else if (!this._horizontal && this._groupHeaderPosition === HeaderPosition.top) {
                            return this._sizes.headerContainerHeight;
                        }
                    }

                    return 0;
                },
                _getHeaderSizeContentAdjustment: function () {
                    if (this._groupsEnabled) {
                        if (this._horizontal && this._groupHeaderPosition === HeaderPosition.top) {
                            return this._sizes.headerContainerHeight;
                        } else if (!this._horizontal && this._groupHeaderPosition === HeaderPosition.left) {
                            return this._sizes.headerContainerWidth;
                        }
                    }

                    return 0;
                },

                // Horizontal layouts lay items out top to bottom, left to right, whereas vertical layouts lay items out left to right, top to bottom.
                // The viewport size is the size layouts use to determine how many items can be placed in one bar, so it should be cross to the
                // orientation.
                _getViewportCrossSize: function () {
                    return this._site.viewportSize[this._horizontal ? "height" : "width"];
                },

                // viewportContentSize is the new viewport size
                _viewportSizeChanged: function _LayoutCommon_viewportSizeChanged(viewportContentSize) {
                    var sizes = this._sizes;

                    sizes.viewportContentSize = viewportContentSize;
                    sizes.surfaceContentSize = viewportContentSize - sizes.surfaceOuterCrossSize;
                    sizes.maxItemsContainerContentSize = sizes.surfaceContentSize - sizes.itemsContainerOuterCrossSize - this._getHeaderSizeContentAdjustment();

                    // This calculation is for uniform layouts
                    if (sizes.containerSizeLoaded && !this._inListMode) {
                        this._itemsPerBar = Math.floor(sizes.maxItemsContainerContentSize / sizes.containerCrossSize);
                        if (this.maximumRowsOrColumns) {
                            this._itemsPerBar = Math.min(this._itemsPerBar, this.maximumRowsOrColumns);
                        }
                        this._itemsPerBar = Math.max(1, this._itemsPerBar);
                    } else {
                        if (this._inListMode) {
                            sizes[this._horizontal ? "containerHeight" : "containerWidth"] = sizes.maxItemsContainerContentSize;
                        }
                        this._itemsPerBar = 1;
                    }

                    // Ignore animations if height changed
                    this._resetAnimationCaches();
                },

                _createContainerStyleRule: function _LayoutCommon_createContainerStyleRule() {
                    // Adding CSS rules is expensive. Add a rule to provide a
                    // height and width for containers if the app hasn't provided one.
                    var sizes = this._sizes;
                    if (!this._containerSizeClassName && sizes.containerSizeLoaded && (sizes.emptyContainerContentHeight === 0 || sizes.emptyContainerContentWidth === 0)) {
                        var width = sizes.containerWidth - sizes.containerOuterWidth + "px",
                            height = sizes.containerHeight - sizes.containerOuterHeight + "px";
                        if (this._inListMode) {
                            if (this._horizontal) {
                                height = "calc(100% - " + (sizes.containerMargins.top + sizes.containerMargins.bottom) + "px)";
                            } else {
                                width = "auto";
                            }
                        }

                        if (!this._containerSizeClassName) {
                            this._containerSizeClassName = uniqueCssClassName("containersize");
                            _ElementUtilities.addClass(this._site.surface, this._containerSizeClassName);
                        }
                        var ruleSelector = "." + _Constants._containerClass,
                            ruleBody = "width:" + width + ";height:" + height + ";";
                        addDynamicCssRule(this._containerSizeClassName, this._site, ruleSelector, ruleBody);
                    }
                },

                // Computes container width and height if they haven't been computed yet. This
                // should happen when the first uniform group is created.
                _ensureContainerSize: function _LayoutCommon_ensureContainerSize(group) {
                    var sizes = this._sizes;
                    if (!sizes.containerSizeLoaded && !this._ensuringContainerSize) {
                        var promise;
                        if ((!this._itemInfo || typeof this._itemInfo !== "function") && this._useDefaultItemInfo) {
                            var margins = sizes.containerMargins;
                            promise = Promise.wrap({
                                width: group.groupInfo.cellWidth - margins.left - margins.right,
                                height: group.groupInfo.cellHeight - margins.top - margins.bottom
                            });

                        } else {
                            promise = this._getItemInfo();
                        }

                        var that = this;
                        this._ensuringContainerSize = promise.then(function (itemSize) {
                            sizes.containerSizeLoaded = true;
                            sizes.containerWidth = itemSize.width + sizes.itemBoxOuterWidth + sizes.containerOuterWidth;
                            sizes.containerHeight = itemSize.height + sizes.itemBoxOuterHeight + sizes.containerOuterHeight;
                            if (!that._inListMode) {
                                that._itemsPerBar = Math.floor(sizes.maxItemsContainerContentSize / sizes.containerCrossSize);
                                if (that.maximumRowsOrColumns) {
                                    that._itemsPerBar = Math.min(that._itemsPerBar, that.maximumRowsOrColumns);
                                }
                                that._itemsPerBar = Math.max(1, that._itemsPerBar);
                            } else {
                                that._itemsPerBar = 1;
                            }
                            that._createContainerStyleRule();
                        });

                        promise.done(
                            function () {
                                that._ensuringContainerSize = null;
                            },
                            function () {
                                that._ensuringContainerSize = null;
                            }
                        );

                        return promise;
                    } else {
                        return this._ensuringContainerSize ? this._ensuringContainerSize : Promise.wrap();
                    }
                },

                _indexToCoordinate: function _LayoutCommon_indexToCoordinate(index, itemsPerBar) {
                    itemsPerBar = itemsPerBar || this._itemsPerBar;
                    var bar = Math.floor(index / itemsPerBar);
                    if (this._horizontal) {
                        return {
                            column: bar,
                            row: index - bar * itemsPerBar
                        };
                    } else {
                        return {
                            row: bar,
                            column: index - bar * itemsPerBar
                        };
                    }
                },

                // Empty ranges are represented by null. Non-empty ranges are represented by
                // an object with 2 properties: firstIndex and lastIndex.
                _rangeForGroup: function _LayoutCommon_rangeForGroup(group, range) {
                    var first = group.startIndex,
                        last = first + group.count - 1;

                    if (!range || range.firstIndex > last || range.lastIndex < first) {
                        // There isn't any overlap between range and the group's indices
                        return null;
                    } else {
                        return {
                            firstIndex: Math.max(0, range.firstIndex - first),
                            lastIndex: Math.min(group.count - 1, range.lastIndex - first)
                        };
                    }
                },

                _syncDomWithGroupHeaderPosition: function _LayoutCommon_syncDomWithGroupHeaderPosition(tree) {
                    if (this._groupsEnabled && this._oldGroupHeaderPosition !== this._groupHeaderPosition) {
                        // this._oldGroupHeaderPosition may refer to top, left, or null. It will be null
                        // the first time this function is called which means that no styles have to be
                        // removed.

                        var len = tree.length,
                            i;
                        // Remove styles associated with old group header position
                        if (this._oldGroupHeaderPosition === HeaderPosition.top) {
                            _ElementUtilities.removeClass(this._site.surface, _Constants._headerPositionTopClass);
                            // maxWidth must be cleared because it is used with headers in the top position but not the left position.
                            // The _groupLeaderClass must be removed from the itemsContainer element because the associated styles
                            // should only be applied to it when headers are in the top position.
                            if (this._horizontal) {
                                for (i = 0; i < len; i++) {
                                    tree[i].header.style.maxWidth = "";
                                    _ElementUtilities.removeClass(tree[i].itemsContainer.element, _Constants._groupLeaderClass);
                                }
                            } else {
                                this._site.surface.style.msGridRows = "";
                            }
                        } else if (this._oldGroupHeaderPosition === HeaderPosition.left) {
                            _ElementUtilities.removeClass(this._site.surface, _Constants._headerPositionLeftClass);
                            // msGridColumns is cleared for a similar reason as maxWidth
                            if (!this._horizontal) {
                                for (i = 0; i < len; i++) {
                                    tree[i].header.style.maxHeight = "";
                                    _ElementUtilities.removeClass(tree[i].itemsContainer.element, _Constants._groupLeaderClass);
                                }
                            }
                            this._site.surface.style.msGridColumns = "";
                        }

                        // Add styles associated with new group header position
                        if (this._groupHeaderPosition === HeaderPosition.top) {
                            _ElementUtilities.addClass(this._site.surface, _Constants._headerPositionTopClass);
                            if (this._horizontal) {
                                for (i = 0; i < len; i++) {
                                    _ElementUtilities.addClass(tree[i].itemsContainer.element, _Constants._groupLeaderClass);
                                }
                            }
                        } else {
                            _ElementUtilities.addClass(this._site.surface, _Constants._headerPositionLeftClass);
                            if (!this._horizontal) {
                                for (i = 0; i < len; i++) {
                                    _ElementUtilities.addClass(tree[i].itemsContainer.element, _Constants._groupLeaderClass);
                                }
                            }
                        }

                        this._oldGroupHeaderPosition = this._groupHeaderPosition;
                    }
                },

                _layoutGroup: function _LayoutCommon_layoutGroup(index) {
                    var group = this._groups[index],
                        groupBundle = this._site.tree[index],
                        headerContainer = groupBundle.header,
                        itemsContainer = groupBundle.itemsContainer.element,
                        sizes = this._sizes,
                        groupCrossSize = group.getItemsContainerCrossSize();

                    if (this._groupsEnabled) {
                        if (this._horizontal) {
                            if (this._groupHeaderPosition === HeaderPosition.top) {
                                // Horizontal with headers above
                                //
                                var headerContainerMinContentWidth = sizes.headerContainerMinWidth - sizes.headerContainerOuterWidth,
                                    itemsContainerContentWidth = group.getItemsContainerSize() - sizes.headerContainerOuterWidth;
                                headerContainer.style.maxWidth = Math.max(headerContainerMinContentWidth, itemsContainerContentWidth) + "px";
                                if (this._envInfo.supportsCSSGrid) {
                                    headerContainer.style.msGridColumn = index + 1;
                                    itemsContainer.style.msGridColumn = index + 1;
                                } else {
                                    headerContainer.style.height = (sizes.headerContainerHeight - sizes.headerContainerOuterHeight) + "px";
                                    itemsContainer.style.height = (groupCrossSize - sizes.itemsContainerOuterHeight) + "px";
                                    // If the itemsContainer is too small, the next group's header runs the risk of appearing below the current group's items.
                                    // We need to add a margin to the bottom of the itemsContainer to prevent that from happening.
                                    itemsContainer.style.marginBottom = sizes.itemsContainerMargins.bottom + (sizes.maxItemsContainerContentSize - groupCrossSize + sizes.itemsContainerOuterHeight) + "px";
                                }
                                // itemsContainers only get the _groupLeaderClass when header position is top.
                                _ElementUtilities.addClass(itemsContainer, _Constants._groupLeaderClass);
                            } else {
                                // Horizontal with headers on the left
                                //
                                if (this._envInfo.supportsCSSGrid) {
                                    headerContainer.style.msGridColumn = index * 2 + 1;
                                    itemsContainer.style.msGridColumn = index * 2 + 2;
                                } else {
                                    headerContainer.style.width = sizes.headerContainerWidth - sizes.headerContainerOuterWidth + "px";
                                    headerContainer.style.height = (groupCrossSize - sizes.headerContainerOuterHeight) + "px";
                                    itemsContainer.style.height = (groupCrossSize - sizes.itemsContainerOuterHeight) + "px";
                                }
                            }
                        } else {
                            if (this._groupHeaderPosition === HeaderPosition.left) {
                                // Vertical with headers on the left
                                //
                                var headerContainerMinContentHeight = sizes.headerContainerMinHeight - sizes.headerContainerOuterHeight,
                                    itemsContainerContentHeight = group.getItemsContainerSize() - sizes.headerContainerOuterHeight;
                                headerContainer.style.maxHeight = Math.max(headerContainerMinContentHeight, itemsContainerContentHeight) + "px";
                                if (this._envInfo.supportsCSSGrid) {
                                    headerContainer.style.msGridRow = index + 1;
                                    itemsContainer.style.msGridRow = index + 1;
                                } else {
                                    headerContainer.style.width = (sizes.headerContainerWidth - sizes.headerContainerOuterWidth) + "px";
                                    itemsContainer.style.width = (groupCrossSize - sizes.itemsContainerOuterWidth) + "px";
                                    // If the itemsContainer is too small, the next group's header runs the risk of appearing to the side of the current group's items.
                                    // We need to add a margin to the right of the itemsContainer to prevent that from happening (or the left margin, in RTL).
                                    itemsContainer.style["margin" + (this._site.rtl ? "Left" : "Right")] = (sizes.itemsContainerMargins[(this._site.rtl ? "left" : "right")] +
                                        (sizes.maxItemsContainerContentSize - groupCrossSize + sizes.itemsContainerOuterWidth)) + "px";
                                }
                                // itemsContainers only get the _groupLeaderClass when header position is left.
                                _ElementUtilities.addClass(itemsContainer, _Constants._groupLeaderClass);
                            } else {
                                // Vertical with headers above
                                //
                                headerContainer.style.msGridRow = index * 2 + 1;
                                // It's important to explicitly set the container height in vertical list mode with headers above, since we use flow layout.
                                // When the header's content is taken from the DOM, the headerContainer will shrink unless it has a height set.
                                if (this._inListMode) {
                                    headerContainer.style.height = (sizes.headerContainerHeight - sizes.headerContainerOuterHeight) + "px";
                                } else {
                                    if (this._envInfo.supportsCSSGrid) {
                                        itemsContainer.style.msGridRow = index * 2 + 2;
                                    } else {
                                        headerContainer.style.height = sizes.headerContainerHeight - sizes.headerContainerOuterHeight + "px";
                                        headerContainer.style.width = (groupCrossSize - sizes.headerContainerOuterWidth) + "px";
                                        itemsContainer.style.width = (groupCrossSize - sizes.itemsContainerOuterWidth) + "px";
                                    }
                                }
                            }

                        }
                        // Header containers always get the _groupLeaderClass.
                        _ElementUtilities.addClass(headerContainer, _Constants._laidOutClass + " " + _Constants._groupLeaderClass);
                    }
                    _ElementUtilities.addClass(itemsContainer, _Constants._laidOutClass);
                }
            }, {
                // The maximum number of rows or columns of win-containers to put into each items block.
                // A row/column cannot be split across multiple items blocks. win-containers
                // are grouped into items blocks in order to mitigate the costs of the platform doing
                // a layout in response to insertions and removals of win-containers.
                _barsPerItemsBlock: 4
            });
        }),

        //
        // Layouts
        //

        _LegacyLayout: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(exports._LayoutCommon, null, {
                /// <field type="Boolean" locid="WinJS.UI._LegacyLayout.disableBackdrop" helpKeyword="WinJS.UI._LegacyLayout.disableBackdrop">
                /// Gets or sets a value that indicates whether the layout should disable the backdrop feature
                /// which avoids blank areas while panning in a virtualized list.
                /// <deprecated type="deprecate">
                /// disableBackdrop is deprecated. Style: .win-listview .win-container.win-backdrop { background-color:transparent; } instead.
                /// </deprecated>
                /// </field>
                disableBackdrop: {
                    get: function _LegacyLayout_disableBackdrop_get() {
                        return this._backdropDisabled || false;
                    },
                    set: function _LegacyLayout_disableBackdrop_set(value) {
                        _ElementUtilities._deprecated(_ErrorMessages.disableBackdropIsDeprecated);
                        value = !!value;
                        if (this._backdropDisabled !== value) {
                            this._backdropDisabled = value;
                            if (this._disableBackdropClassName) {
                                deleteDynamicCssRule(this._disableBackdropClassName);
                                this._site && _ElementUtilities.removeClass(this._site.surface, this._disableBackdropClassName);
                                this._disableBackdropClassName = null;
                            }
                            this._disableBackdropClassName = uniqueCssClassName("disablebackdrop");
                            this._site && _ElementUtilities.addClass(this._site.surface, this._disableBackdropClassName);
                            if (value) {
                                var ruleSelector = ".win-container.win-backdrop",
                                    ruleBody = "background-color:transparent;";
                                addDynamicCssRule(this._disableBackdropClassName, this._site, ruleSelector, ruleBody);
                            }
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI._LegacyLayout.backdropColor" helpKeyword="WinJS.UI._LegacyLayout.backdropColor">
                /// Gets or sets the fill color for the default pattern used for the backdrops.
                /// The default value is "rgba(155,155,155,0.23)".
                /// <deprecated type="deprecate">
                /// backdropColor is deprecated. Style: .win-listview .win-container.win-backdrop { rgba(155,155,155,0.23); } instead.
                /// </deprecated>
                /// </field>
                backdropColor: {
                    get: function _LegacyLayout_backdropColor_get() {
                        return this._backdropColor || "rgba(155,155,155,0.23)";
                    },
                    set: function _LegacyLayout_backdropColor_set(value) {
                        _ElementUtilities._deprecated(_ErrorMessages.backdropColorIsDeprecated);
                        if (value && this._backdropColor !== value) {
                            this._backdropColor = value;
                            if (this._backdropColorClassName) {
                                deleteDynamicCssRule(this._backdropColorClassName);
                                this._site && _ElementUtilities.removeClass(this._site.surface, this._backdropColorClassName);
                                this._backdropColorClassName = null;
                            }
                            this._backdropColorClassName = uniqueCssClassName("backdropcolor");
                            this._site && _ElementUtilities.addClass(this._site.surface, this._backdropColorClassName);
                            var ruleSelector = ".win-container.win-backdrop",
                                ruleBody = "background-color:" + value + ";";
                            addDynamicCssRule(this._backdropColorClassName, this._site, ruleSelector, ruleBody);
                        }
                    }
                }
            });
        }),

        GridLayout: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(exports._LegacyLayout, function (options) {
                /// <signature helpKeyword="WinJS.UI.GridLayout">
                /// <summary locid="WinJS.UI.GridLayout">
                /// Creates a new GridLayout.
                /// </summary>
                /// <param name="options" type="Object" locid="WinJS.UI.GridLayout_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control. Each property of the options
                /// object corresponds to one of the control's properties or events.
                /// </param>
                /// <returns type="WinJS.UI.GridLayout" locid="WinJS.UI.GridLayout_returnValue">
                /// The new GridLayout.
                /// </returns>
                /// </signature>
                options = options || {};
                // Executing setters to display compatibility warning
                this.itemInfo = options.itemInfo;
                this.groupInfo = options.groupInfo;
                this._maxRowsOrColumns = 0;
                this._useDefaultItemInfo = true;
                this._elementsToMeasure = {};
                this._groupHeaderPosition = options.groupHeaderPosition || HeaderPosition.top;
                this.orientation = options.orientation || "horizontal";

                if (options.maxRows) {
                    this.maxRows = +options.maxRows;
                }
                if (options.maximumRowsOrColumns) {
                    this.maximumRowsOrColumns = +options.maximumRowsOrColumns;
                }
            }, {

                // Public

                /// <field type="Number" integer="true" locid="WinJS.UI.GridLayout.maximumRowsOrColumns" helpKeyword="WinJS.UI.GridLayout.maximumRowsOrColumns">
                /// Gets the maximum number of rows or columns, depending on the orientation, that should present before it introduces wrapping to the layout.
                /// A value of 0 indicates that there is no maximum. The default value is 0.
                /// </field>
                maximumRowsOrColumns: {
                    get: function () {
                        return this._maxRowsOrColumns;
                    },
                    set: function (value) {
                        this._setMaxRowsOrColumns(value);
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.GridLayout.maxRows" helpKeyword="WinJS.UI.GridLayout.maxRows">
                /// Gets or sets the maximum number of rows displayed by the ListView.
                /// <deprecated type="deprecate">
                /// WinJS.UI.GridLayout.maxRows may be altered or unavailable after the Windows Library for JavaScript 2.0. Instead, use the maximumRowsOrColumns property.
                /// </deprecated>
                /// </field>
                maxRows: {
                    get: function () {
                        return this.maximumRowsOrColumns;
                    },
                    set: function (maxRows) {
                        _ElementUtilities._deprecated(_ErrorMessages.maxRowsIsDeprecated);
                        this.maximumRowsOrColumns = maxRows;
                    }
                },

                /// <field type="Function" locid="WinJS.UI.GridLayout.itemInfo" helpKeyword="WinJS.UI.GridLayout.itemInfo">
                /// Determines the size of the item and whether
                /// the item should be placed in a new column.
                /// <deprecated type="deprecate">
                /// GridLayout.itemInfo may be altered or unavailable in future versions. Instead, use CellSpanningLayout.
                /// </deprecated>
                /// </field>
                itemInfo: {
                    enumerable: true,
                    get: function () {
                        return this._itemInfo;
                    },
                    set: function (itemInfo) {
                        itemInfo && _ElementUtilities._deprecated(_ErrorMessages.itemInfoIsDeprecated);
                        this._itemInfo = itemInfo;
                        this._invalidateLayout();
                    }
                },

                /// <field type="Function" locid="WinJS.UI.GridLayout.groupInfo" helpKeyword="WinJS.UI.GridLayout.groupInfo">
                /// Indicates whether a group has cell spanning items and specifies the dimensions of the cell.
                /// <deprecated type="deprecate">
                /// GridLayout.groupInfo may be altered or unavailable in future versions. Instead, use CellSpanningLayout.
                /// </deprecated>
                /// </field>
                groupInfo: {
                    enumerable: true,
                    get: function () {
                        return this._groupInfo;
                    },
                    set: function (groupInfo) {
                        groupInfo && _ElementUtilities._deprecated(_ErrorMessages.groupInfoIsDeprecated);
                        this._groupInfo = groupInfo;
                        this._invalidateLayout();
                    }
                }
            });
        })
    });

    var Groups = _Base.Namespace.defineWithParent(null, null, {

        UniformGroupBase: _Base.Namespace._lazy(function () {
            return _Base.Class.define(null, {
                cleanUp: function UniformGroupBase_cleanUp() {
                },

                itemFromOffset: function UniformGroupBase_itemFromOffset(offset, options) {
                    // supported options are:
                    // - wholeItem: when set to true the fully visible item is returned
                    // - last: if 1 the last item is returned. if 0 the first
                    options = options || {};

                    var sizes = this._layout._sizes;

                    // Make offset relative to the items container's content box
                    offset -= sizes.itemsContainerOuterStart;

                    if (options.wholeItem) {
                        offset += (options.last ? -1 : 1) * (sizes.containerSize - 1);
                    }
                    var lastIndexOfGroup = this.count - 1,
                        lastBar = Math.floor(lastIndexOfGroup / this._layout._itemsPerBar),
                        bar = clampToRange(0, lastBar, Math.floor(offset / sizes.containerSize)),
                        index = (bar + options.last) * this._layout._itemsPerBar - options.last;
                    return clampToRange(0, this.count - 1, index);
                },

                hitTest: function UniformGroupBase_hitTest(x, y) {
                    var horizontal = this._layout._horizontal,
                        itemsPerBar = this._layout._itemsPerBar,
                        useListSemantics = this._layout._inListMode || itemsPerBar === 1,
                        directionalLocation = horizontal ? x : y,
                        crossLocation = horizontal ? y : x,
                        sizes = this._layout._sizes;

                    directionalLocation -= sizes.itemsContainerOuterStart;
                    crossLocation -= sizes.itemsContainerOuterCrossStart;

                    var bar = Math.floor(directionalLocation / sizes.containerSize);
                    var slotInBar = clampToRange(0, itemsPerBar - 1, Math.floor(crossLocation / sizes.containerCrossSize));
                    var index = Math.max(-1, bar * itemsPerBar + slotInBar);

                    // insertAfterIndex is determined by which half of the target element the mouse cursor is currently in.
                    // The trouble is that we can cut the element in half horizontally or cut it in half vertically.
                    // Which one we choose depends on the order that elements are laid out in the grid.
                    // A horizontal grid with multiple rows per column will lay items out starting from top to bottom, and move left to right.
                    // A vertical list is just a horizontal grid with an infinite number of rows per column, so it follows the same order.
                    // In both of these cases, each item is cut in half horizontally, since for any item n, n-1 should be above it and n+1 below (ignoring column changes).
                    // A vertical grid lays items out left to right, top to bottom, and a horizontal list left to right (with infinite items per row).
                    // In this case for item n, n-1 is on the left and n+1 on the right, so we cut the item in half vertically.
                    var insertAfterSlot;
                    if ((!horizontal && useListSemantics) ||
                        (horizontal && !useListSemantics)) {
                        insertAfterSlot = (y - sizes.containerHeight / 2) / sizes.containerHeight;
                    } else {
                        insertAfterSlot = (x - sizes.containerWidth / 2) / sizes.containerWidth;
                    }
                    if (useListSemantics) {
                        insertAfterSlot = Math.floor(insertAfterSlot);
                        return {
                            index: index,
                            insertAfterIndex: (insertAfterSlot >= 0 && index >= 0 ? insertAfterSlot : -1)
                        };
                    }
                    insertAfterSlot = clampToRange(-1, itemsPerBar - 1, insertAfterSlot);
                    var insertAfterIndex;
                    if (insertAfterSlot < 0) {
                        insertAfterIndex = bar * itemsPerBar - 1;
                    } else {
                        insertAfterIndex = bar * itemsPerBar + Math.floor(insertAfterSlot);
                    }

                    return {
                        index: clampToRange(-1, this.count - 1, index),
                        insertAfterIndex: clampToRange(-1, this.count - 1, insertAfterIndex)
                    };
                },

                getAdjacent: function UniformGroupBase_getAdjacent(currentItem, pressedKey) {
                    var index = currentItem.index,
                        currentBar = Math.floor(index / this._layout._itemsPerBar),
                        currentSlot = index % this._layout._itemsPerBar,
                        newFocus;

                    switch (pressedKey) {
                        case Key.upArrow:
                            newFocus = (currentSlot === 0 ? "boundary" : index - 1);
                            break;
                        case Key.downArrow:
                            var isLastIndexOfGroup = (index === this.count - 1),
                                inLastSlot = (this._layout._itemsPerBar > 1 && currentSlot === this._layout._itemsPerBar - 1);
                            newFocus = (isLastIndexOfGroup || inLastSlot ? "boundary" : index + 1);
                            break;
                        case Key.leftArrow:
                            newFocus = (currentBar === 0 && this._layout._itemsPerBar > 1 ? "boundary" : index - this._layout._itemsPerBar);
                            break;
                        case Key.rightArrow:
                            var lastIndexOfGroup = this.count - 1,
                                lastBar = Math.floor(lastIndexOfGroup / this._layout._itemsPerBar);
                            newFocus = (currentBar === lastBar ? "boundary" : Math.min(index + this._layout._itemsPerBar, this.count - 1));
                            break;
                    }
                    return (newFocus === "boundary" ? newFocus : { type: _UI.ObjectType.item, index: newFocus });
                },

                getItemsContainerSize: function UniformGroupBase_getItemsContainerSize() {
                    var sizes = this._layout._sizes,
                        barCount = Math.ceil(this.count / this._layout._itemsPerBar);
                    return barCount * sizes.containerSize + sizes.itemsContainerOuterSize;
                },

                getItemsContainerCrossSize: function UniformGroupBase_getItemsContainerCrossSize() {
                    var sizes = this._layout._sizes;
                    return this._layout._itemsPerBar * sizes.containerCrossSize + sizes.itemsContainerOuterCrossSize;
                },

                getItemPositionForAnimations: function UniformGroupBase_getItemPositionForAnimations(itemIndex) {
                    // Top/Left are used to know if the item has moved and also used to position the item if removed.
                    // Row/Column are used to know if a reflow animation should occur
                    // Height/Width are used when positioning a removed item without impacting layout.
                    // The returned rectangle refers to the win-container's border/padding/content box. Coordinates
                    // are relative to group's items container.

                    var sizes = this._layout._sizes;
                    var leftStr = this._layout._site.rtl ? "right" : "left";
                    var containerMargins = this._layout._sizes.containerMargins;
                    var coordinates = this._layout._indexToCoordinate(itemIndex);
                    var itemPosition = {
                        row: coordinates.row,
                        column: coordinates.column,
                        top: containerMargins.top + coordinates.row * sizes.containerHeight,
                        left: containerMargins[leftStr] + coordinates.column * sizes.containerWidth,
                        height: sizes.containerHeight - sizes.containerMargins.top - sizes.containerMargins.bottom,
                        width: sizes.containerWidth - sizes.containerMargins.left - sizes.containerMargins.right
                    };
                    return itemPosition;
                }
            });
        }),

        //
        // Groups for GridLayout
        //
        // Each group implements a 3 function layout interface. The interface is used
        // whenever GridLayout has to do a layout. The interface consists of:
        // - prepareLayout/prepareLayoutWithCopyOfTree: Called 1st. Group should update all of its internal
        //   layout state. It should not modify the DOM. Group should implement either prepareLayout or
        //   prepareLayoutWithCopyOfTree. The former is preferable because the latter is expensive as calling
        //   it requires copying the group's tree. Implementing prepareLayoutWithCopyOfTree is necessary when
        //   the group is manually laying out items and is laying out unrealized items asynchronously
        //   (e.g. CellSpanningGroup). This requires a copy of the tree from the previous layout pass.
        // - layoutRealizedRange: Called 2nd. Group should update the DOM so that
        //   the realized range reflects the internal layout state computed during
        //   prepareLayout.
        // - layoutUnrealizedRange: Called 3rd. Group should update the DOM for the items
        //   outside of the realized range. This function returns a promise so
        //   it can do its work asynchronously. When the promise completes, layout will
        //   be done.
        //
        // The motivation for this interface is perceived performance. If groups had just 1
        // layout function, all items would have to be laid out before any animations could
        // begin. With this interface, animations can begin playing after
        // layoutRealizedRange is called.
        //
        // Each group also implements a cleanUp function which is called when the group is
        // no longer needed so that it can clean up the DOM and its resources. After cleanUp
        // is called, the group object cannnot be reused.
        //

        UniformGroup: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(Groups.UniformGroupBase, function UniformGroup_ctor(layout, itemsContainer) {
                this._layout = layout;
                this._itemsContainer = itemsContainer;
                _ElementUtilities.addClass(this._itemsContainer, layout._inListMode ? _Constants._uniformListLayoutClass : _Constants._uniformGridLayoutClass);
            }, {
                cleanUp: function UniformGroup_cleanUp(skipDomCleanUp) {
                    if (!skipDomCleanUp) {
                        _ElementUtilities.removeClass(this._itemsContainer, _Constants._uniformGridLayoutClass);
                        _ElementUtilities.removeClass(this._itemsContainer, _Constants._uniformListLayoutClass);
                        this._itemsContainer.style.height = this._itemsContainer.style.width = "";
                    }
                    this._itemsContainer = null;
                    this._layout = null;
                    this.groupInfo = null;
                    this.startIndex = null;
                    this.offset = null;
                    this.count = null;
                },

                prepareLayout: function UniformGroup_prepareLayout(itemsCount, oldChangedRealizedRange, oldState, updatedProperties) {
                    this.groupInfo = updatedProperties.groupInfo;
                    this.startIndex = updatedProperties.startIndex;
                    this.count = itemsCount;
                    return this._layout._ensureContainerSize(this);
                },

                layoutRealizedRange: function UniformGroup_layoutRealizedRange() {
                    // Explicitly set the items container size. This is required so that the
                    // surface, which is a grid, will have its width sized to content.
                    var sizes = this._layout._sizes;
                    this._itemsContainer.style[this._layout._horizontal ? "width" : "height"] = this.getItemsContainerSize() - sizes.itemsContainerOuterSize + "px";
                    this._itemsContainer.style[this._layout._horizontal ? "height" : "width"] = (this._layout._inListMode ? sizes.maxItemsContainerContentSize + "px" :
                                                                                                 this._layout._itemsPerBar * sizes.containerCrossSize + "px");
                },

                layoutUnrealizedRange: function UniformGroup_layoutUnrealizedRange() {
                    return Promise.wrap();
                }
            });
        }),

        UniformFlowGroup: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(Groups.UniformGroupBase, function UniformFlowGroup_ctor(layout, tree) {
                this._layout = layout;
                this._itemsContainer = tree.element;
                _ElementUtilities.addClass(this._itemsContainer, layout._inListMode ? _Constants._uniformListLayoutClass : _Constants._uniformGridLayoutClass);
            }, {
                cleanUp: function UniformFlowGroup_cleanUp(skipDomCleanUp) {
                    if (!skipDomCleanUp) {
                        _ElementUtilities.removeClass(this._itemsContainer, _Constants._uniformListLayoutClass);
                        _ElementUtilities.removeClass(this._itemsContainer, _Constants._uniformGridLayoutClass);
                        this._itemsContainer.style.height = "";
                    }
                },
                layout: function UniformFlowGroup_layout() {
                    this._layout._site._writeProfilerMark("Layout:_UniformFlowGroup:setItemsContainerHeight,info");
                    this._itemsContainer.style.height = this.count * this._layout._sizes.containerHeight + "px";
                }
            });
        }),

        CellSpanningGroup: _Base.Namespace._lazy(function () {
            return _Base.Class.define(function CellSpanningGroup_ctor(layout, itemsContainer) {
                this._layout = layout;
                this._itemsContainer = itemsContainer;
                _ElementUtilities.addClass(this._itemsContainer, _Constants._cellSpanningGridLayoutClass);

                this.resetMap();
            }, {
                cleanUp: function CellSpanningGroup_cleanUp(skipDomCleanUp) {
                    if (!skipDomCleanUp) {
                        this._cleanContainers();
                        _ElementUtilities.removeClass(this._itemsContainer, _Constants._cellSpanningGridLayoutClass);
                        this._itemsContainer.style.cssText = "";
                    }
                    this._itemsContainer = null;

                    if (this._layoutPromise) {
                        this._layoutPromise.cancel();
                        this._layoutPromise = null;
                    }
                    this.resetMap();
                    this._slotsPerColumn = null;
                    this._offScreenSlotsPerColumn = null;
                    this._items = null;
                    this._layout = null;
                    this._containersToHide = null;
                    this.groupInfo = null;
                    this.startIndex = null;
                    this.offset = null;
                    this.count = null;
                },

                prepareLayoutWithCopyOfTree: function CellSpanningGroup_prepareLayoutWithCopyOfTree(tree, oldChangedRealizedRange, oldState, updatedProperties) {
                    var that = this;
                    var i;

                    // Remember the items in the old realized item range that changed.
                    // During layoutRealizedRange, they either need to be relaid out or hidden.
                    this._containersToHide = {};
                    if (oldChangedRealizedRange) {
                        for (i = oldChangedRealizedRange.firstIndex; i <= oldChangedRealizedRange.lastIndex; i++) {
                            this._containersToHide[uniqueID(oldState._items[i])] = oldState._items[i];
                        }
                    }

                    // Update public properties
                    this.groupInfo = updatedProperties.groupInfo;
                    this.startIndex = updatedProperties.startIndex;
                    this.count = tree.items.length;

                    this._items = tree.items;
                    this._slotsPerColumn = Math.floor(this._layout._sizes.maxItemsContainerContentSize / this.groupInfo.cellHeight);
                    if (this._layout.maximumRowsOrColumns) {
                        this._slotsPerColumn = Math.min(this._slotsPerColumn, this._layout.maximumRowsOrColumns);
                    }
                    this._slotsPerColumn = Math.max(this._slotsPerColumn, 1);

                    this.resetMap();
                    var itemInfoPromises = new Array(this.count);
                    for (i = 0; i < this.count; i++) {
                        itemInfoPromises[i] = this._layout._getItemInfo(this.startIndex + i);
                    }
                    return Promise.join(itemInfoPromises).then(function (itemInfos) {
                        itemInfos.forEach(function (itemInfo, index) {
                            that.addItemToMap(index, itemInfo);
                        });
                    });
                },

                layoutRealizedRange: function CellSpanningGroup_layoutRealizedRange(firstChangedIndex, realizedRange) {
                    // Lay out the changed items within the realized range
                    if (realizedRange) {
                        var firstChangedRealizedIndex = Math.max(firstChangedIndex, realizedRange.firstIndex),
                            i;
                        for (i = firstChangedRealizedIndex; i <= realizedRange.lastIndex; i++) {
                            this._layoutItem(i);
                            delete this._containersToHide[uniqueID(this._items[i])];
                        }
                    }

                    // Hide the old containers that are in the realized range but weren't relaid out
                    Object.keys(this._containersToHide).forEach(function (id) {
                        _ElementUtilities.removeClass(this._containersToHide[id], _Constants._laidOutClass);
                    }.bind(this));
                    this._containersToHide = {};

                    // Explicitly set the items container height. This is required so that the
                    // surface, which is a grid, will have its width sized to content.
                    this._itemsContainer.style.cssText +=
                        ";width:" + (this.getItemsContainerSize() - this._layout._sizes.itemsContainerOuterSize) +
                        "px;height:" + this._layout._sizes.maxItemsContainerContentSize +
                        "px;-ms-grid-columns: (" + this.groupInfo.cellWidth + "px)[" + this.getColumnCount() +
                        "];-ms-grid-rows: (" + this.groupInfo.cellHeight + "px)[" + (this._slotsPerColumn + this._offScreenSlotsPerColumn) + "]";
                },

                layoutUnrealizedRange: function CellSpanningGroup_layoutUnrealizedRange(firstChangedIndex, realizedRange, beforeRealizedRange) {
                    var that = this;
                    var layoutJob;

                    that._layoutPromise = new Promise(function (complete) {
                        function completeLayout() {
                            layoutJob = null;
                            complete();
                        }

                        function schedule(fn) {
                            return Scheduler.schedule(fn, Scheduler.Priority.normal, null,
                                "WinJS.UI.GridLayout.CellSpanningGroup.LayoutUnrealizedRange");
                        }

                        // These loops are built to lay out the items that are closest to
                        // the realized range first.

                        if (realizedRange) {
                            var stop = false;
                            // For laying out the changed items that are before the realized range
                            var before = realizedRange.firstIndex - 1;
                            // For laying out the changed items that are after the realized range
                            var after = Math.max(firstChangedIndex, realizedRange.lastIndex + 1);
                            after = Math.max(before + 1, after);

                            // Alternate between laying out items before and after the realized range
                            layoutJob = schedule(function unrealizedRangeWork(info) {
                                while (!stop) {
                                    if (info.shouldYield) {
                                        info.setWork(unrealizedRangeWork);
                                        return;
                                    }

                                    stop = true;

                                    if (before >= firstChangedIndex) {
                                        that._layoutItem(before);
                                        before--;
                                        stop = false;
                                    }
                                    if (after < that.count) {
                                        that._layoutItem(after);
                                        after++;
                                        stop = false;
                                    }
                                }
                                completeLayout();
                            });
                        } else if (beforeRealizedRange) {
                            // The items we are laying out come before the realized range.
                            // so lay them out in descending order.
                            var i = that.count - 1;
                            layoutJob = schedule(function beforeRealizedRangeWork(info) {
                                for (; i >= firstChangedIndex; i--) {
                                    if (info.shouldYield) {
                                        info.setWork(beforeRealizedRangeWork);
                                        return;
                                    }
                                    that._layoutItem(i);
                                }
                                completeLayout();
                            });
                        } else {
                            // The items we are laying out come after the realized range
                            // so lay them out in ascending order.
                            var i = firstChangedIndex;
                            layoutJob = schedule(function afterRealizedRangeWork(info) {
                                for (; i < that.count; i++) {
                                    if (info.shouldYield) {
                                        info.setWork(afterRealizedRangeWork);
                                        return;
                                    }
                                    that._layoutItem(i);
                                }
                                completeLayout();
                            });
                        }
                    }, function () {
                        // Cancellation handler for that._layoutPromise
                        layoutJob && layoutJob.cancel();
                        layoutJob = null;
                    });

                    return that._layoutPromise;
                },

                itemFromOffset: function CellSpanningGroup_itemFromOffset(offset, options) {
                    // supported options are:
                    // - wholeItem: when set to true the fully visible item is returned
                    // - last: if 1 the last item is returned. if 0 the first
                    options = options || {};

                    var sizes = this._layout._sizes,
                        margins = sizes.containerMargins;

                    // Make offset relative to the items container's content box
                    offset -= sizes.itemsContainerOuterX;

                    offset -= ((options.last ? 1 : -1) * margins[options.last ? "left" : "right"]);

                    var value = this.indexFromOffset(offset, options.wholeItem, options.last).item;
                    return clampToRange(0, this.count - 1, value);
                },

                getAdjacent: function CellSpanningGroup_getAdjacent(currentItem, pressedKey) {
                    var index,
                        originalIndex;

                    index = originalIndex = currentItem.index;

                    var newIndex, inMap, inMapIndex;
                    if (this.lastAdjacent === index) {
                        inMapIndex = this.lastInMapIndex;
                    } else {
                        inMapIndex = this.findItem(index);
                    }

                    do {
                        var column = Math.floor(inMapIndex / this._slotsPerColumn),
                            row = inMapIndex - column * this._slotsPerColumn,
                            lastColumn = Math.floor((this.occupancyMap.length - 1) / this._slotsPerColumn);

                        switch (pressedKey) {
                            case Key.upArrow:
                                if (row > 0) {
                                    inMapIndex--;
                                } else {
                                    return { type: _UI.ObjectType.item, index: originalIndex };
                                }
                                break;
                            case Key.downArrow:
                                if (row + 1 < this._slotsPerColumn) {
                                    inMapIndex++;
                                } else {
                                    return { type: _UI.ObjectType.item, index: originalIndex };
                                }
                                break;
                            case Key.leftArrow:
                                inMapIndex = (column > 0 ? inMapIndex - this._slotsPerColumn : -1);
                                break;
                            case Key.rightArrow:
                                inMapIndex = (column < lastColumn ? inMapIndex + this._slotsPerColumn : this.occupancyMap.length);
                                break;
                        }

                        inMap = inMapIndex >= 0 && inMapIndex < this.occupancyMap.length;
                        if (inMap) {
                            newIndex = this.occupancyMap[inMapIndex] ? this.occupancyMap[inMapIndex].index : undefined;
                        }

                    } while (inMap && (index === newIndex || newIndex === undefined));

                    this.lastAdjacent = newIndex;
                    this.lastInMapIndex = inMapIndex;

                    return (inMap ? { type: _UI.ObjectType.item, index: newIndex } : "boundary");
                },

                hitTest: function CellSpanningGroup_hitTest(x, y) {
                    var sizes = this._layout._sizes,
                        itemIndex = 0;

                    // Make the coordinates relative to the items container's content box
                    x -= sizes.itemsContainerOuterX;
                    y -= sizes.itemsContainerOuterY;

                    if (this.occupancyMap.length > 0) {
                        var result = this.indexFromOffset(x, false, 0);

                        var counter = Math.min(this._slotsPerColumn - 1, Math.floor(y / this.groupInfo.cellHeight)),
                            curr = result.index,
                            lastValidIndex = curr;
                        while (counter-- > 0) {
                            curr++;
                            if (this.occupancyMap[curr]) {
                                lastValidIndex = curr;
                            }
                        }
                        if (!this.occupancyMap[lastValidIndex]) {
                            lastValidIndex--;
                        }
                        itemIndex = this.occupancyMap[lastValidIndex].index;
                    }

                    var itemSize = this.getItemSize(itemIndex),
                        itemLeft = itemSize.column * this.groupInfo.cellWidth,
                        itemTop = itemSize.row * this.groupInfo.cellHeight,
                        useListSemantics = this._slotsPerColumn === 1,
                        insertAfterIndex = itemIndex;

                    if ((useListSemantics && (x < (itemLeft + itemSize.contentWidth / 2))) ||
                        (!useListSemantics && (y < (itemTop + itemSize.contentHeight / 2)))) {
                        insertAfterIndex--;
                    }

                    return {
                        type: _UI.ObjectType.item,
                        index: clampToRange(0, this.count - 1, itemIndex),
                        insertAfterIndex: clampToRange(-1, this.count - 1, insertAfterIndex)
                    };
                },

                getItemsContainerSize: function CellSpanningGroup_getItemsContainerSize() {
                    var sizes = this._layout._sizes;
                    return this.getColumnCount() * this.groupInfo.cellWidth + sizes.itemsContainerOuterSize;
                },

                getItemsContainerCrossSize: function CellSpanningGroup_getItemsContainerCrossSize() {
                    var sizes = this._layout._sizes;
                    return sizes.maxItemsContainerContentSize + sizes.itemsContainerOuterCrossSize;
                },

                getItemPositionForAnimations: function CellSpanningGroup_getItemPositionForAnimations(itemIndex) {
                    // Top/Left are used to know if the item has moved and also used to position the item if removed.
                    // Row/Column are used to know if a reflow animation should occur
                    // Height/Width are used when positioning a removed item without impacting layout.
                    // The returned rectangle refers to the win-container's border/padding/content box. Coordinates
                    // are relative to group's items container.

                    var leftStr = this._layout._site.rtl ? "right" : "left";
                    var containerMargins = this._layout._sizes.containerMargins;
                    var coordinates = this.getItemSize(itemIndex);
                    var groupInfo = this.groupInfo;
                    var itemPosition = {
                        row: coordinates.row,
                        column: coordinates.column,
                        top: containerMargins.top + coordinates.row * groupInfo.cellHeight,
                        left: containerMargins[leftStr] + coordinates.column * groupInfo.cellWidth,
                        height: coordinates.contentHeight,
                        width: coordinates.contentWidth
                    };

                    return itemPosition;
                },

                _layoutItem: function CellSpanningGroup_layoutItem(index) {
                    var entry = this.getItemSize(index);
                    this._items[index].style.cssText +=
                        ";-ms-grid-row:" + (entry.row + 1) +
                        ";-ms-grid-column:" + (entry.column + 1) +
                        ";-ms-grid-row-span:" + entry.rows +
                        ";-ms-grid-column-span:" + entry.columns +
                        ";height:" + entry.contentHeight +
                        "px;width:" + entry.contentWidth + "px";
                    _ElementUtilities.addClass(this._items[index], _Constants._laidOutClass);

                    return this._items[index];
                },

                _cleanContainers: function CellSpanningGroup_cleanContainers() {
                    var items = this._items,
                        len = items.length,
                        i;
                    for (i = 0; i < len; i++) {
                        items[i].style.cssText = "";
                        _ElementUtilities.removeClass(items[i], _Constants._laidOutClass);
                    }
                },

                // Occupancy map

                getColumnCount: function CellSpanningGroup_getColumnCount() {
                    return Math.ceil(this.occupancyMap.length / this._slotsPerColumn);
                },

                getOccupancyMapItemCount: function CellSpanningGroup_getOccupancyMapItemCount() {
                    var index = -1;

                    // Use forEach as the map may be sparse
                    this.occupancyMap.forEach(function (item) {
                        if (item.index > index) {
                            index = item.index;
                        }
                    });

                    return index + 1;
                },

                coordinateToIndex: function CellSpanningGroup_coordinateToIndex(c, r) {
                    return c * this._slotsPerColumn + r;
                },

                markSlotAsFull: function CellSpanningGroup_markSlotAsFull(index, itemEntry) {
                    var coordinates = this._layout._indexToCoordinate(index, this._slotsPerColumn),
                        toRow = coordinates.row + itemEntry.rows;
                    for (var r = coordinates.row; r < toRow && r < this._slotsPerColumn; r++) {
                        for (var c = coordinates.column, toColumn = coordinates.column + itemEntry.columns; c < toColumn; c++) {
                            this.occupancyMap[this.coordinateToIndex(c, r)] = itemEntry;
                        }
                    }
                    this._offScreenSlotsPerColumn = Math.max(this._offScreenSlotsPerColumn, toRow - this._slotsPerColumn);
                },

                isSlotEmpty: function CellSpanningGroup_isSlotEmpty(itemSize, row, column) {
                    for (var r = row, toRow = row + itemSize.rows; r < toRow; r++) {
                        for (var c = column, toColumn = column + itemSize.columns; c < toColumn; c++) {
                            if ((r >= this._slotsPerColumn) || (this.occupancyMap[this.coordinateToIndex(c, r)] !== undefined)) {
                                return false;
                            }
                        }
                    }
                    return true;
                },

                findEmptySlot: function CellSpanningGroup_findEmptySlot(startIndex, itemSize, newColumn) {
                    var coordinates = this._layout._indexToCoordinate(startIndex, this._slotsPerColumn),
                        startRow = coordinates.row,
                        lastColumn = Math.floor((this.occupancyMap.length - 1) / this._slotsPerColumn);

                    if (newColumn) {
                        for (var c = coordinates.column + 1; c <= lastColumn; c++) {
                            if (this.isSlotEmpty(itemSize, 0, c)) {
                                return this.coordinateToIndex(c, 0);
                            }
                        }
                    } else {
                        for (var c = coordinates.column; c <= lastColumn; c++) {
                            for (var r = startRow; r < this._slotsPerColumn; r++) {
                                if (this.isSlotEmpty(itemSize, r, c)) {
                                    return this.coordinateToIndex(c, r);
                                }
                            }
                            startRow = 0;
                        }
                    }

                    return (lastColumn + 1) * this._slotsPerColumn;
                },

                findItem: function CellSpanningGroup_findItem(index) {
                    for (var inMapIndex = index, len = this.occupancyMap.length; inMapIndex < len; inMapIndex++) {
                        var entry = this.occupancyMap[inMapIndex];
                        if (entry && entry.index === index) {
                            return inMapIndex;
                        }
                    }
                    return inMapIndex;
                },

                getItemSize: function CellSpanningGroup_getItemSize(index) {
                    var inMapIndex = this.findItem(index),
                        entry = this.occupancyMap[inMapIndex],
                        coords = this._layout._indexToCoordinate(inMapIndex, this._slotsPerColumn);

                    if (index === entry.index) {
                        return {
                            row: coords.row,
                            column: coords.column,
                            contentWidth: entry.contentWidth,
                            contentHeight: entry.contentHeight,
                            columns: entry.columns,
                            rows: entry.rows
                        };
                    } else {
                        return null;
                    }
                },

                resetMap: function CellSpanningGroup_resetMap() {
                    this.occupancyMap = [];
                    this.lastAdded = 0;
                    this._offScreenSlotsPerColumn = 0;
                },

                addItemToMap: function CellSpanningGroup_addItemToMap(index, itemInfo) {
                    var that = this;

                    function add(mapEntry, newColumn) {
                        var inMapIndex = that.findEmptySlot(that.lastAdded, mapEntry, newColumn);
                        that.lastAdded = inMapIndex;
                        that.markSlotAsFull(inMapIndex, mapEntry);
                    }

                    var groupInfo = that.groupInfo,
                        margins = that._layout._sizes.containerMargins,
                        mapEntry = {
                            index: index,
                            contentWidth: itemInfo.width,
                            contentHeight: itemInfo.height,
                            columns: Math.max(1, Math.ceil((itemInfo.width + margins.left + margins.right) / groupInfo.cellWidth)),
                            rows: Math.max(1, Math.ceil((itemInfo.height + margins.top + margins.bottom) / groupInfo.cellHeight))
                        };

                    add(mapEntry, itemInfo.newColumn);
                },

                indexFromOffset: function CellSpanningGroup_indexFromOffset(adjustedOffset, wholeItem, last) {
                    var measuredWidth = 0,
                        lastItem = 0,
                        groupInfo = this.groupInfo,
                        index = 0;

                    if (this.occupancyMap.length > 0) {
                        lastItem = this.getOccupancyMapItemCount() - 1;
                        measuredWidth = Math.ceil((this.occupancyMap.length - 1) / this._slotsPerColumn) * groupInfo.cellWidth;

                        if (adjustedOffset < measuredWidth) {
                            var counter = this._slotsPerColumn,
                                index = (Math.max(0, Math.floor(adjustedOffset / groupInfo.cellWidth)) + last) * this._slotsPerColumn - last;
                            while (!this.occupancyMap[index] && counter-- > 0) {
                                index += (last > 0 ? -1 : 1);
                            }
                            return {
                                index: index,
                                item: this.occupancyMap[index].index
                            };
                        } else {
                            index = this.occupancyMap.length - 1;
                        }
                    }

                    return {
                        index: index,
                        item: lastItem + (Math.max(0, Math.floor((adjustedOffset - measuredWidth) / groupInfo.cellWidth)) + last) * this._slotsPerColumn - last
                    };
                }
            });
        })

    });

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {

        ListLayout: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(exports._LegacyLayout, function ListLayout_ctor(options) {
                /// <signature helpKeyword="WinJS.UI.ListLayout">
                /// <summary locid="WinJS.UI.ListLayout">
                /// Creates a new ListLayout object.
                /// </summary>
                /// <param name="options" type="Object" locid="WinJS.UI.ListLayout_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control. Each property of the options
                /// object corresponds to one of the object's properties or events. Event names must begin with "on".
                /// </param>
                /// <returns type="WinJS.UI.ListLayout" locid="WinJS.UI.ListLayout_returnValue">
                /// The new ListLayout object.
                /// </returns>
                /// </signature>
                options = options || {};
                this._itemInfo = {};
                this._groupInfo = {};
                this._groupHeaderPosition = options.groupHeaderPosition || HeaderPosition.top;
                this._inListMode = true;
                this.orientation = options.orientation || "vertical";
            }, {
                initialize: function ListLayout_initialize(site, groupsEnabled) {
                    _ElementUtilities.addClass(site.surface, _Constants._listLayoutClass);
                    exports._LegacyLayout.prototype.initialize.call(this, site, groupsEnabled);
                },

                uninitialize: function ListLayout_uninitialize() {
                    if (this._site) {
                        _ElementUtilities.removeClass(this._site.surface, _Constants._listLayoutClass);
                    }
                    exports._LegacyLayout.prototype.uninitialize.call(this);
                },

                layout: function ListLayout_layout(tree, changedRange, modifiedItems, modifiedGroups) {
                    if (!this._groupsEnabled && !this._horizontal) {
                        return this._layoutNonGroupedVerticalList(tree, changedRange, modifiedItems, modifiedGroups);
                    } else {
                        return exports._LegacyLayout.prototype.layout.call(this, tree, changedRange, modifiedItems, modifiedGroups);
                    }
                },

                _layoutNonGroupedVerticalList: function ListLayout_layoutNonGroupedVerticalList(tree, changedRange, modifiedItems, modifiedGroups) {
                    var that = this;
                    var perfId = "Layout:_layoutNonGroupedVerticalList";
                    that._site._writeProfilerMark(perfId + ",StartTM");
                    this._layoutPromise = that._measureItem(0).then(function () {
                        _ElementUtilities[(that._usingStructuralNodes) ? "addClass" : "removeClass"]
                            (that._site.surface, _Constants._structuralNodesClass);
                        _ElementUtilities[(that._envInfo.nestedFlexTooLarge || that._envInfo.nestedFlexTooSmall) ? "addClass" : "removeClass"]
                            (that._site.surface, _Constants._singleItemsBlockClass);


                        if (that._sizes.viewportContentSize !== that._getViewportCrossSize()) {
                            that._viewportSizeChanged(that._getViewportCrossSize());
                        }

                        that._cacheRemovedElements(modifiedItems, that._cachedItemRecords, that._cachedInsertedItemRecords, that._cachedRemovedItems, false);
                        that._cacheRemovedElements(modifiedGroups, that._cachedHeaderRecords, that._cachedInsertedHeaderRecords, that._cachedRemovedHeaders, true);

                        var itemsContainer = tree[0].itemsContainer,
                            group = new Groups.UniformFlowGroup(that, itemsContainer);
                        that._groups = [group];
                        group.groupInfo = { enableCellSpanning: false };
                        group.startIndex = 0;
                        group.count = getItemsContainerLength(itemsContainer);
                        group.offset = 0;
                        group.layout();

                        that._site._writeProfilerMark(perfId + ":setSurfaceWidth,info");
                        that._site.surface.style.width = that._sizes.surfaceContentSize + "px";

                        that._layoutAnimations(modifiedItems, modifiedGroups);
                        that._site._writeProfilerMark(perfId + ":complete,info");
                        that._site._writeProfilerMark(perfId + ",StopTM");
                    }, function (error) {
                        that._site._writeProfilerMark(perfId + ":canceled,info");
                        that._site._writeProfilerMark(perfId + ",StopTM");
                        return Promise.wrapError(error);
                    });
                    return {
                        realizedRangeComplete: this._layoutPromise,
                        layoutComplete: this._layoutPromise
                    };
                },

                numberOfItemsPerItemsBlock: {
                    get: function ListLayout_getNumberOfItemsPerItemsBlock() {
                        var that = this;
                        // Measure when numberOfItemsPerItemsBlock is called so that we measure before ListView has created the full tree structure
                        // which reduces the trident layout required by measure.
                        return this._measureItem(0).then(function () {
                            if (that._envInfo.nestedFlexTooLarge || that._envInfo.nestedFlexTooSmall) {
                                // Store all items in a single itemsblock
                                that._usingStructuralNodes = true;
                                return Number.MAX_VALUE;
                            } else {
                                that._usingStructuralNodes = exports.ListLayout._numberOfItemsPerItemsBlock > 0;
                                return exports.ListLayout._numberOfItemsPerItemsBlock;
                            }
                        });
                    }
                },
            }, {
                // The maximum number of win-containers to put into each items block. win-containers
                // are grouped into items blocks in order to mitigate the costs of the platform doing
                // a layout in response to insertions and removals of win-containers.
                _numberOfItemsPerItemsBlock: 10
            });
        }),

        CellSpanningLayout: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(exports._LayoutCommon, function CellSpanningLayout_ctor(options) {
                /// <signature helpKeyword="WinJS.UI.CellSpanningLayout">
                /// <summary locid="WinJS.UI.CellSpanningLayout">
                /// Creates a new CellSpanningLayout object.
                /// </summary>
                /// <param name="options" type="Object" locid="WinJS.UI.CellSpanningLayout_p:options">
                /// An object that contains one or more property/value pairs to apply to the new object. Each property of the options
                /// object corresponds to one of the object's properties or events. Event names must begin with "on".
                /// </param>
                /// <returns type="WinJS.UI.CellSpanningLayout" locid="WinJS.UI.CellSpanningLayout_returnValue">
                /// The new CellSpanningLayout object.
                /// </returns>
                /// </signature>
                options = options || {};
                this._itemInfo = options.itemInfo;
                this._groupInfo = options.groupInfo;
                this._groupHeaderPosition = options.groupHeaderPosition || HeaderPosition.top;
                this._horizontal = true;
                this._cellSpanning = true;
            }, {

                /// <field type="Number" integer="true" locid="WinJS.UI.CellSpanningLayout.maximumRowsOrColumns" helpKeyword="WinJS.UI.CellSpanningLayout.maximumRowsOrColumns">
                /// Gets or set the maximum number of rows or columns, depending on the orientation, to display before content begins to wrap.
                /// A value of 0 indicates that there is no maximum.
                /// </field>
                maximumRowsOrColumns: {
                    get: function () {
                        return this._maxRowsOrColumns;
                    },
                    set: function (value) {
                        this._setMaxRowsOrColumns(value);
                    }
                },

                /// <field type="Function" locid="WinJS.UI.CellSpanningLayout.itemInfo" helpKeyword="WinJS.UI.CellSpanningLayout.itemInfo">
                /// Gets or sets a function that returns the width and height of an item, as well as whether
                /// it should  appear in a new column. Setting this function improves performance because
                /// the ListView can allocate space for an item without having to measure it first.
                /// The function takes a single parameter: the index of the item to render.
                /// The function returns an object that has three properties:
                /// width: The  total width of the item.
                /// height: The total height of the item.
                /// newColumn: Set to true to create a column break; otherwise, false.
                /// </field>
                itemInfo: {
                    enumerable: true,
                    get: function () {
                        return this._itemInfo;
                    },
                    set: function (itemInfo) {
                        this._itemInfo = itemInfo;
                        this._invalidateLayout();
                    }
                },

                /// <field type="Function" locid="WinJS.UI.CellSpanningLayout.groupInfo" helpKeyword="WinJS.UI.CellSpanningLayout.groupInfo">
                /// Gets or sets a function that enables cell-spanning and establishes base cell dimensions.
                /// The function returns an object that has these properties:
                /// enableCellSpanning: Set to true to allow the ListView to contain items of multiple sizes.
                /// cellWidth: The width of the base cell.
                /// cellHeight: The height of the base cell.
                /// </field>
                groupInfo: {
                    enumerable: true,
                    get: function () {
                        return this._groupInfo;
                    },
                    set: function (groupInfo) {
                        this._groupInfo = groupInfo;
                        this._invalidateLayout();
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.Orientation" locid="WinJS.UI.CellSpanningLayout.orientation" helpKeyword="WinJS.UI.CellSpanningLayout.orientation">
                /// Gets the orientation of the layout. CellSpanning layout only supports horizontal orientation.
                /// </field>
                orientation: {
                    enumerable: true,
                    get: function () {
                        return "horizontal";
                    }
                }
            });
        }),

        _LayoutWrapper: _Base.Namespace._lazy(function () {
            return _Base.Class.define(function LayoutWrapper_ctor(layout) {
                this.defaultAnimations = true;

                // Initialize and hitTest are required
                this.initialize = function LayoutWrapper_initialize(site, groupsEnabled) {
                    layout.initialize(site, groupsEnabled);
                };
                this.hitTest = function LayoutWrapper_hitTest(x, y) {
                    return layout.hitTest(x, y);
                };

                // These methods are optional
                layout.uninitialize && (this.uninitialize = function LayoutWrapper_uninitialize() {
                    layout.uninitialize();
                });

                if ("numberOfItemsPerItemsBlock" in layout) {
                    Object.defineProperty(this, "numberOfItemsPerItemsBlock", {
                        get: function LayoutWrapper_getNumberOfItemsPerItemsBlock() {
                            return layout.numberOfItemsPerItemsBlock;
                        }
                    });
                }

                layout._getItemPosition && (this._getItemPosition = function LayoutWrapper_getItemPosition(index) {
                    return layout._getItemPosition(index);
                });

                layout.itemsFromRange && (this.itemsFromRange = function LayoutWrapper_itemsFromRange(start, end) {
                    return layout.itemsFromRange(start, end);
                });

                layout.getAdjacent && (this.getAdjacent = function LayoutWrapper_getAdjacent(currentItem, pressedKey) {
                    return layout.getAdjacent(currentItem, pressedKey);
                });

                layout.dragOver && (this.dragOver = function LayoutWrapper_dragOver(x, y, dragInfo) {
                    return layout.dragOver(x, y, dragInfo);
                });

                layout.dragLeave && (this.dragLeave = function LayoutWrapper_dragLeave() {
                    return layout.dragLeave();
                });
                var propertyDefinition = {
                    enumerable: true,
                    get: function () {
                        return "vertical";
                    }
                };
                if (layout.orientation !== undefined) {
                    propertyDefinition.get = function () {
                        return layout.orientation;
                    };
                    propertyDefinition.set = function (value) {
                        layout.orientation = value;
                    };
                }
                Object.defineProperty(this, "orientation", propertyDefinition);

                if (layout.setupAnimations || layout.executeAnimations) {
                    this.defaultAnimations = false;
                    this.setupAnimations = function LayoutWrapper_setupAnimations() {
                        return layout.setupAnimations();
                    };
                    this.executeAnimations = function LayoutWrapper_executeAnimations() {
                        return layout.executeAnimations();
                    };
                }

                if (layout.layout) {
                    if (this.defaultAnimations) {
                        var that = this;
                        this.layout = function LayoutWrapper_layout(tree, changedRange, modifiedItems, modifiedGroups) {
                            var promises = normalizeLayoutPromises(layout.layout(tree, changedRange, [], [])),
                                synchronous;
                            promises.realizedRangeComplete.then(function () {
                                synchronous = true;
                            });
                            synchronous && that._layoutAnimations(modifiedItems, modifiedGroups);
                            return promises;
                        };
                    } else {
                        this.layout = function LayoutWrapper_layout(tree, changedRange, modifiedItems, modifiedGroups) {
                            return normalizeLayoutPromises(layout.layout(tree, changedRange, modifiedItems, modifiedGroups));
                        };
                    }
                }
            }, {
                uninitialize: function LayoutWrapper_uninitialize() {
                },
                numberOfItemsPerItemsBlock: {
                    get: function LayoutWrapper_getNumberOfItemsPerItemsBlock() {
                    }
                },
                layout: function LayoutWrapper_layout(tree, changedRange, modifiedItems, modifiedGroups) {
                    if (this.defaultAnimations) {
                        this._layoutAnimations(modifiedItems, modifiedGroups);
                    }
                    return normalizeLayoutPromises();
                },
                itemsFromRange: function LayoutWrapper_itemsFromRange() {
                    return { firstIndex: 0, lastIndex: Number.MAX_VALUE };
                },
                getAdjacent: function LayoutWrapper_getAdjacent(currentItem, pressedKey) {

                    switch (pressedKey) {
                        case Key.pageUp:
                        case Key.upArrow:
                        case Key.leftArrow:
                            return { type: currentItem.type, index: currentItem.index - 1 };
                        case Key.downArrow:
                        case Key.rightArrow:
                        case Key.pageDown:
                            return { type: currentItem.type, index: currentItem.index + 1 };
                    }
                },
                dragOver: function LayoutWrapper_dragOver() {
                },
                dragLeave: function LayoutWrapper_dragLeaver() {
                },
                setupAnimations: function LayoutWrapper_setupAnimations() {
                },
                executeAnimations: function LayoutWrapper_executeAnimations() {
                },
                _getItemPosition: function LayoutWrapper_getItemPosition() {
                },
                _layoutAnimations: function LayoutWrapper_layoutAnimations() {
                },
            });
        }),
    });

    function normalizeLayoutPromises(retVal) {
        if (Promise.is(retVal)) {
            return {
                realizedRangeComplete: retVal,
                layoutComplete: retVal
            };
        } else if (typeof retVal === "object" && retVal && retVal.layoutComplete) {
            return retVal;
        } else {
            return {
                realizedRangeComplete: Promise.wrap(),
                layoutComplete: Promise.wrap()
            };
        }
    }

    var HeaderPosition = {
        left: "left",
        top: "top"
    };

    function getMargins(element) {
        return {
            left: getDimension(element, "marginLeft"),
            right: getDimension(element, "marginRight"),
            top: getDimension(element, "marginTop"),
            bottom: getDimension(element, "marginBottom")
        };
    }

    // Layout, _LayoutCommon, and _LegacyLayout are defined ealier so that their fully
    // qualified names can be used in _Base.Class.derive. This is required by Blend.
    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        HeaderPosition: HeaderPosition,
        _getMargins: getMargins
    });
});
