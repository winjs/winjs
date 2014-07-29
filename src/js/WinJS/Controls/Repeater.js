// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../BindingList',
    '../BindingTemplate',
    '../Promise',
    '../Utilities/_Control',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities'
    ], function repeaterInit(exports, _Global, _Base, _ErrorFromName, _Events, _Resources, _WriteProfilerMark, BindingList, BindingTemplate, Promise, _Control, _Dispose, _ElementUtilities) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.Repeater">
        /// Uses templates to generate HTML from a set of data.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.repeater.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.repeater.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<div data-win-control="WinJS.UI.Repeater"></div>]]></htmlSnippet>
        /// <part name="repeater" class="win-repeater" locid="WinJS.UI.Repeater_part:repeater">The Repeater control itself</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        Repeater: _Base.Namespace._lazy(function () {

            // Constants
            var ITEMSLOADED = "itemsloaded",
                ITEMCHANGING = "itemchanging",
                ITEMCHANGED = "itemchanged",
                ITEMINSERTING = "iteminserting",
                ITEMINSERTED = "iteminserted",
                ITEMMOVING = "itemmoving",
                ITEMMOVED = "itemmoved",
                ITEMREMOVING = "itemremoving",
                ITEMREMOVED = "itemremoved",
                ITEMSRELOADING = "itemsreloading",
                ITEMSRELOADED = "itemsreloaded";

            var createEvent = _Events._createEventProperty;

            function stringifyItem(dataItem) {
                // Repeater uses this as its default renderer when no template is provided.
                var itemElement = _Global.document.createElement("div");
                itemElement.textContent = JSON.stringify(dataItem);
                return itemElement;
            }

            // Statics
            var strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get asynchronousRender() { return "Top level items must render synchronously"; },
                get repeaterReentrancy() { return "Cannot modify Repeater data until Repeater has commited previous modification."; },
            };

            var Repeater = _Base.Class.define(function Repeater_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.Repeater.Repeater">
                /// <summary locid="WinJS.UI.Repeater.constructor">
                /// Creates a new Repeater control.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.Repeater.constructor_p:element">
                /// The DOM element that will host the new control. The Repeater will create an element if this value is null.
                /// </param>
                /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.Repeater.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the 
                /// new Repeater. Each property of the options object corresponds to one of the 
                /// object's properties or events. Event names must begin with "on". 
                /// </param>
                /// <returns type="WinJS.UI.Repeater" locid="WinJS.UI.Repeater.constructor_returnValue">
                /// The new Repeater control.
                /// </returns>
                /// </signature>

                // Check to make sure we weren't duplicated
                if (element && element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.Repeater.DuplicateConstruction", strings.duplicateConstruction);
                }

                this._element = element || _Global.document.createElement("div");
                this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
                this._writeProfilerMark("constructor,StartTM");
                options = options || {};
                _ElementUtilities.addClass(this._element, "win-repeater win-disposable");

                this._render = null;
                this._modifying = false;
                this._disposed = false;
                this._element.winControl = this;
                this._dataListeners = {
                    itemchanged: this._dataItemChangedHandler.bind(this),
                    iteminserted: this._dataItemInsertedHandler.bind(this),
                    itemmoved: this._dataItemMovedHandler.bind(this),
                    itemremoved: this._dataItemRemovedHandler.bind(this),
                    reload: this._dataReloadHandler.bind(this),
                };

                // Consume Repeater innerHTML and return a template.
                var inlineTemplate = this._extractInlineTemplate();
                this._initializing = true;
                // Use the inlinetemplate if a parameter was not given.
                // Either way, Repeater's innerHTML has now been consumed.
                this.template = options.template || inlineTemplate;

                this.data = options.data;
                this._initializing = false;

                _Control._setOptions(this, options, true); // Events only

                this._repeatedDOM = [];
                this._renderAllItems();
                this.dispatchEvent(ITEMSLOADED, {});

                this._writeProfilerMark("constructor,StopTM");
            }, {

                /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.Repeater.element" helpKeyword="WinJS.UI.Repeater.element">
                /// Gets the DOM element that hosts the Repeater.
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="WinJS.Binding.List" locid="WinJS.UI.Repeater.data" helpKeyword="WinJS.UI.Repeater.data">
                /// Gets or sets the WinJS.Binding.List that provides the Repeater control with items to display.
                /// </field>
                data: {
                    get: function () { return this._data; },
                    set: function (data) {
                        this._writeProfilerMark("data.set,StartTM");
                        if (this._data) {
                            this._removeDataListeners();
                        }
                        this._data = data || new BindingList.List();
                        this._addDataListeners();
                        if (!this._initializing) {
                            this._reloadRepeater(true);
                            this.dispatchEvent(ITEMSLOADED, {});
                        }
                        this._writeProfilerMark("data.set,StopTM");
                    }
                },

                /// <field type="Object" locid="WinJS.UI.Repeater.template" helpKeyword="WinJS.UI.Repeater.template" potentialValueSelector="[data-win-control='WinJS.Binding.Template']">
                /// Gets or sets a Template or custom rendering function that defines the HTML of each item within the Repeater.
                /// </field>
                template: {
                    get: function () { return this._template; },
                    set: function (template) {
                        this._writeProfilerMark("template.set,StartTM");
                        this._template = (template || stringifyItem);
                        this._render = _ElementUtilities._syncRenderer(this._template, this.element.tagName);
                        if (!this._initializing) {
                            this._reloadRepeater(true);
                            this.dispatchEvent(ITEMSLOADED, {});
                        }
                        this._writeProfilerMark("template.set,StopTM");
                    }
                },

                /// <field type="Number" hidden="true" locid="WinJS.UI.Repeater.length" helpKeyword="WinJS.UI.Repeater.length">
                /// Gets the number of items in the Repeater control.
                /// </field>
                length: {
                    get: function () { return this._repeatedDOM.length; },
                },

                elementFromIndex: function Repeater_elementFromIndex(index) {
                    /// <signature helpKeyword="WinJS.UI.Repeater.elementFromIndex">
                    /// <summary locid="WinJS.UI.Repeater.elementFromIndex">
                    /// Returns the HTML element for the item with the specified index.
                    /// </summary>
                    /// <param name="index" type="Number" locid="WinJS.UI.Repeater.elementFromIndex _p:index">
                    /// The index of the item.
                    /// </param>
                    /// <returns type="HTMLElement" domElement="true" locid=" WinJS.UI.Repeater.elementFromIndex_returnValue">
                    /// The DOM element for the specified item.
                    /// </returns>
                    /// </signature>
                    return this._repeatedDOM[index];
                },

                dispose: function Repeater_dispose() {
                    /// <signature helpKeyword="WinJS.UI.Repeater.dispose">
                    /// <summary locid="WinJS.UI.Repeater.dispose">
                    /// Prepare this Repeater for garbage collection.
                    /// </summary>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true; // Mark this control as disposed.
                    this._removeDataListeners();
                    this._data = null;
                    this._template = null;
                    for (var i = 0, len = this._repeatedDOM.length; i < len; i++) {
                        _Dispose._disposeElement(this._repeatedDOM[i]);
                    }
                },

                /// <field type="Function" locid="WinJS.UI.Repeater.onitemsloaded" helpKeyword="WinJS.UI.Repeater.onitemsloaded">
                /// Raised when the Repeater has finished loading a new set of data. This event is only fired on construction
                /// or when the Repeater control's data source or template is replaced.
                /// </field>
                onitemsloaded: createEvent(ITEMSLOADED),

                /// <field type="Function" locid="WinJS.UI.Repeater.onitemchanging" helpKeyword="WinJS.UI.Repeater.onitemchanging">
                /// Raised after an item in the Repeater control's data source changes but before the corresponding DOM element has been updated. 
                /// </field>
                onitemchanging: createEvent(ITEMCHANGING),

                /// <field type="Function" locid="WinJS.UI.Repeater.onitemchanged" helpKeyword="WinJS.UI.Repeater.onitemchanged">
                /// Raised after an item in the Repeater control's data source changes and after the corresponding DOM element has been updated. 
                /// </field>
                onitemchanged: createEvent(ITEMCHANGED),

                /// <field type="Function" locid="WinJS.UI.Repeater.oniteminserting" helpKeyword="WinJS.UI.Repeater.oniteminserting">
                /// Raised after an item has been added to the Repeater control's data source but before the corresponding DOM element has been added. 
                /// </field>
                oniteminserting: createEvent(ITEMINSERTING),

                /// <field type="Function" locid="WinJS.UI.Repeater.oniteminserted" helpKeyword="WinJS.UI.Repeater.oniteminserted">
                /// Raised after an item has been added to the Repeater control's data source and after the corresponding DOM element has been added. 
                /// </field>
                oniteminserted: createEvent(ITEMINSERTED),

                /// <field type="Function" locid="WinJS.UI.Repeater.onitemmoving" helpKeyword="WinJS.UI.Repeater.onitemmoving">
                /// Raised after an item has been moved from one index to another in the Repeater control's data source but before the corresponding DOM element has been moved. 
                /// </field>
                onitemmoving: createEvent(ITEMMOVING),

                /// <field type="Function" locid="WinJS.UI.Repeater.onitemmoved" helpKeyword="WinJS.UI.Repeater.onitemmoved">
                /// Raised after an item has been moved from one index to another in the Repeater control's data source and after the corresponding DOM element has been moved. 
                /// </field>
                onitemmoved: createEvent(ITEMMOVED),

                /// <field type="Function" locid="WinJS.UI.Repeater.onitemremoving" helpKeyword="WinJS.UI.Repeater.onitemremoving">
                /// Raised after an item has been removed from the Repeater control's data source but before the corresponding DOM element has been removed. 
                /// </field>
                onitemremoving: createEvent(ITEMREMOVING),

                /// <field type="Function" locid="WinJS.UI.Repeater.onitemremoved" helpKeyword="WinJS.UI.Repeater.onitemremoved">
                /// Raised after an item has been removed from one index to another in the Repeater control's data source and after the corresponding DOM element has been removed.
                /// </field>
                onitemremoved: createEvent(ITEMREMOVED),

                /// <field type="Function" locid="WinJS.UI.Repeater.onitemsreloading" helpKeyword="WinJS.UI.Repeater.onitemsreloading">
                /// The list has been refreshed and any references to data in the list may be incorrect.
                /// Raised after the Repeater control's underlying data has been updated but before the updated HTML has been reloaded.
                /// </field>
                onitemsreloading: createEvent(ITEMSRELOADING),

                /// <field type="Function" locid="WinJS.UI.Repeater.onitemsreloaded" helpKeyword="WinJS.UI.Repeater.onitemsreloaded">
                /// Raised after the Repeater control's underlying data has been updated and after the updated HTML has been reloaded.
                /// </field>
                onitemsreloaded: createEvent(ITEMSRELOADED),

                _extractInlineTemplate: function Repeater_extractInlineTemplate() {
                    // Creates and returns a WinJS.BindingTemplate from the Repeater innerHTML.
                    if (this._element.firstElementChild) {
                        var templateElement = _Global.document.createElement(this._element.tagName);
                        while (this._element.firstElementChild) {
                            // Move each child element from the Repeater to the Template Element
                            templateElement.appendChild(this._element.firstElementChild);
                        }
                        return new BindingTemplate.Template(templateElement, { extractChild: true });
                    }
                },

                _renderAllItems: function Repeater_renderAllItems() {
                    var fragment = _Global.document.createDocumentFragment();
                    for (var i = 0, len = this._data.length; i < len; i++) {
                        var renderedItem = this._render(this._data.getAt(i));
                        if (!renderedItem) {
                            throw new _ErrorFromName("WinJS.UI.Repeater.AsynchronousRender", strings.asynchronousRender);

                        }
                        fragment.appendChild(renderedItem);
                        this._repeatedDOM.push(renderedItem);
                    }
                    this._element.appendChild(fragment);
                },

                _reloadRepeater: function Repeater_reloadRepeater(shouldDisposeElements) {
                    this._unloadRepeatedDOM(shouldDisposeElements);
                    this._repeatedDOM = [];
                    this._renderAllItems();
                },

                _unloadRepeatedDOM: function Repeater_unloadRepeatedDOM(shouldDisposeElements) {
                    for (var i = 0, len = this._repeatedDOM.length; i < len; i++) {
                        var element = this._repeatedDOM[i];
                        if (!!shouldDisposeElements) {
                            // this_dataReloadHandler uses this to defer disposal until after animations have completed,
                            // at which point it manually disposes each element.
                            _Dispose._disposeElement(element);
                        }
                        if (element.parentElement === this._element) {
                            this._element.removeChild(element);
                        }
                    }
                },

                _addDataListeners: function Repeater_addDataListeners() {
                    Object.keys(this._dataListeners).forEach(function (eventName) {
                        this._data.addEventListener(eventName, this._dataListeners[eventName], false);
                    }.bind(this));
                },

                _beginModification: function Repeater_beginModification() {
                    if (this._modifying) {
                        throw new _ErrorFromName("WinJS.UI.Repeater.RepeaterModificationReentrancy", strings.repeaterReentrancy);
                    }
                    this._modifying = true;
                },

                _endModification: function Repeater_endModification() {
                    this._modifying = false;
                },

                _removeDataListeners: function Repeater_removeDataListeners() {
                    Object.keys(this._dataListeners).forEach(function (eventName) {
                        this._data.removeEventListener(eventName, this._dataListeners[eventName], false);
                    }.bind(this));
                },

                _dataItemChangedHandler: function Repeater_dataItemChangedHandler(eventInfo) {
                    // Handles the 'itemchanged' event fired by WinJS.Binding.List

                    this._beginModification();
                    var animationPromise;

                    var root = this._element;
                    var index = eventInfo.detail.index;
                    var renderedItem = this._render(eventInfo.detail.newValue);
                    if (!renderedItem) {
                        throw new _ErrorFromName("WinJS.UI.Repeater.AsynchronousRender", strings.asynchronousRender);
                    }

                    // Append to the event object
                    if (this._repeatedDOM[index]) {
                        eventInfo.detail.oldElement = this._repeatedDOM[index];
                    }
                    eventInfo.detail.newElement = renderedItem;
                    eventInfo.detail.setPromise = function setPromise(delayPromise) {
                        animationPromise = delayPromise;
                    };

                    this._writeProfilerMark(ITEMCHANGING + ",info");
                    this.dispatchEvent(ITEMCHANGING, eventInfo.detail);

                    // Make the change
                    var oldItem = null;
                    if (index < this._repeatedDOM.length) {
                        oldItem = this._repeatedDOM[index];
                        root.replaceChild(renderedItem, oldItem);
                        this._repeatedDOM[index] = renderedItem;
                    } else {
                        root.appendChild(renderedItem);
                        this._repeatedDOM.push(renderedItem);
                    }

                    this._endModification();
                    this._writeProfilerMark(ITEMCHANGED + ",info");
                    this.dispatchEvent(ITEMCHANGED, eventInfo.detail);

                    if (oldItem) { // Give the option to delay element disposal.
                        Promise.as(animationPromise).done(function () {
                            _Dispose._disposeElement(oldItem);
                        }.bind(this));
                    }
                },

                _dataItemInsertedHandler: function Repeater_dataItemInsertedHandler(eventInfo) {
                    // Handles the 'iteminserted' event fired by WinJS.Binding.List

                    this._beginModification();
                    var index = eventInfo.detail.index;
                    var renderedItem = this._render(eventInfo.detail.value);
                    if (!renderedItem) {
                        throw new _ErrorFromName("WinJS.UI.Repeater.AsynchronousRender", strings.asynchronousRender);
                    }

                    var root = this._element;

                    eventInfo.detail.affectedElement = renderedItem;
                    this._writeProfilerMark(ITEMINSERTING + ",info");
                    this.dispatchEvent(ITEMINSERTING, eventInfo.detail);

                    if (index < this._repeatedDOM.length) {
                        var nextSibling = this._repeatedDOM[index];
                        root.insertBefore(renderedItem, nextSibling);
                    } else {
                        root.appendChild(renderedItem);
                    }

                    // Update collection of rendered elements
                    this._repeatedDOM.splice(index, 0, renderedItem);

                    this._endModification();
                    this._writeProfilerMark(ITEMINSERTED + ",info");
                    this.dispatchEvent(ITEMINSERTED, eventInfo.detail);

                },

                _dataItemMovedHandler: function Repeater_dataItemMovedHandler(eventInfo) {
                    // Handles the 'itemmoved' event fired by WinJS.Binding.List 

                    this._beginModification();

                    var movingItem = this._repeatedDOM[eventInfo.detail.oldIndex];

                    // Fire the event before we start the move.
                    eventInfo.detail.affectedElement = movingItem;
                    this._writeProfilerMark(ITEMMOVING + ",info");
                    this.dispatchEvent(ITEMMOVING, eventInfo.detail);

                    // Remove
                    this._repeatedDOM.splice(eventInfo.detail.oldIndex, 1)[0];
                    movingItem.parentNode.removeChild(movingItem);

                    // Insert
                    if (eventInfo.detail.newIndex < (this._data.length) - 1) {
                        var nextSibling = this._repeatedDOM[eventInfo.detail.newIndex];
                        this._element.insertBefore(movingItem, nextSibling);
                        this._repeatedDOM.splice(eventInfo.detail.newIndex, 0, movingItem);
                    } else {
                        this._repeatedDOM.push(movingItem);
                        this._element.appendChild(movingItem);
                    }

                    this._endModification();
                    this._writeProfilerMark(ITEMMOVED + ",info");
                    this.dispatchEvent(ITEMMOVED, eventInfo.detail);
                },

                _dataItemRemovedHandler: function Repeater_dataItemRemoveHandler(eventInfo) {
                    // Handles the 'itemremoved' event fired by WinJS.Binding.List

                    this._beginModification();
                    var animationPromise;
                    var oldItem = this._repeatedDOM[eventInfo.detail.index];

                    // Trim 'value' and 'key' from the eventInfo.details that Binding.List gave for the removal case,
                    // since both of those properties already exist inside of eventInfo.details.item.
                    var eventDetail = { affectedElement: oldItem, index: eventInfo.detail.index, item: eventInfo.detail.item };
                    eventDetail.setPromise = function setPromise(delayPromise) {
                        animationPromise = delayPromise;
                    };

                    this._writeProfilerMark(ITEMREMOVING + ",info");
                    this.dispatchEvent(ITEMREMOVING, eventDetail);

                    oldItem.parentNode.removeChild(oldItem);
                    this._repeatedDOM.splice(eventInfo.detail.index, 1);

                    this._endModification();
                    this._writeProfilerMark(ITEMREMOVED + ",info");
                    this.dispatchEvent(ITEMREMOVED, eventDetail);

                    Promise.as(animationPromise).done(function () {
                        _Dispose._disposeElement(oldItem);
                    }.bind(this));
                },

                _dataReloadHandler: function Repeater_dataReloadHandler() {
                    // Handles the 'reload' event fired by WinJS.Binding.List whenever it performs operations such as reverse() or sort() 

                    this._beginModification();
                    var animationPromise;

                    var shallowCopyBefore = this._repeatedDOM.slice(0);
                    var eventDetail = { affectedElements: shallowCopyBefore };
                    eventDetail.setPromise = function (delayPromise) {
                        animationPromise = delayPromise;
                    };

                    this._writeProfilerMark(ITEMSRELOADING + ",info");
                    this.dispatchEvent(ITEMSRELOADING, eventDetail);
                    this._reloadRepeater(false /*shouldDisposeElements */);

                    var shallowCopyAfter = this._repeatedDOM.slice(0);
                    this._endModification();
                    this._writeProfilerMark(ITEMSRELOADED + ",info");
                    this.dispatchEvent(ITEMSRELOADED, { affectedElements: shallowCopyAfter });

                    Promise.as(animationPromise).done(function () { // Gives the option to defer disposal.
                        for (var i = 0, len = shallowCopyBefore.length; i < len; i++) {
                            _Dispose._disposeElement(shallowCopyBefore[i]);
                        }
                    }.bind(this));
                },

                _writeProfilerMark: function Repeater_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI.Repeater:" + this._id + ":" + text);
                }
            }, {
                isDeclarativeControlContainer: true,
            });
            _Base.Class.mix(Repeater, _Control.DOMEventMixin);
            return Repeater;
        })
    });

});
