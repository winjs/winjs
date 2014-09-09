// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Core/_ErrorFromName',
    '../../Core/_Resources',
    '../../ControlProcessor',
    '../../Promise',
    '../../Scheduler',
    '../../Utilities/_Control',
    '../../Utilities/_Dispose',
    '../../Utilities/_ElementUtilities',
    './_Constants'
    ], function pivotItemInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Resources, ControlProcessor, Promise, Scheduler, _Control, _Dispose, _ElementUtilities, _Constants) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.PivotItem">
        /// Defines a Item of a Pivot control.
        /// </summary>
        /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1"/>
        /// </field>
        /// <icon src="ui_winjs.ui.pivotitem.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.pivotitem.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.PivotItem" data-win-options="{header: 'PivotItem Header'}">PivotItem Content</div>]]></htmlSnippet>
        /// <part name="pivotitem" class="win-pivot-item" locid="WinJS.UI.PivotItem_part:pivotitem">The entire PivotItem control.</part>
        /// <part name="content" class="win-pivot-item-content" locid="WinJS.UI.PivotItem_part:content">The content region of the PivotItem.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        PivotItem: _Base.Namespace._lazy(function () {
            var strings = {
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; }
            };

            var PivotItem = _Base.Class.define(function PivotItem_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.PivotItem.PivotItem">
                /// <summary locid="WinJS.UI.PivotItem.constructor">
                /// Creates a new PivotItem.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.PivotItem.constructor_p:element">
                /// The DOM element that hosts the PivotItem control.
                /// </param>
                /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.PivotItem.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// </param>
                /// <returns type="WinJS.UI.PivotItem" locid="WinJS.UI.PivotItem.constructor_returnValue">
                /// The new PivotItem.
                /// </returns>
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1"/>
                /// </signature>
                element = element || _Global.document.createElement("DIV");
                options = options || {};

                if (element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.PivotItem.DuplicateConstruction", strings.duplicateConstruction);
                }

                // Attaching JS control to DOM element
                element.winControl = this;
                this._element = element;
                _ElementUtilities.addClass(this.element, PivotItem._ClassName.pivotItem);
                _ElementUtilities.addClass(this.element, "win-disposable");
                this._element.setAttribute('role', 'tabpanel');

                this._contentElement = _Global.document.createElement("DIV");
                this._contentElement.className = PivotItem._ClassName.pivotItemContent;
                element.appendChild(this._contentElement);

                // Reparent any existing elements inside the new pivot item content element.
                var elementToMove = this.element.firstChild;
                while (elementToMove !== this._contentElement) {
                    var nextElement = elementToMove.nextSibling;
                    this._contentElement.appendChild(elementToMove);
                    elementToMove = nextElement;
                }

                this._processors = [ControlProcessor.processAll];

                _Control.setOptions(this, options);
            }, {
                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.PivotItem.element" helpKeyword="WinJS.UI.PivotItem.element">
                /// Gets the DOM element that hosts the PivotItem.
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1"/>
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },
                /// <field type="HTMLElement" domElement="true" locid="WinJS.UI.PivotItem.contentElement" helpKeyword="WinJS.UI.PivotItem.contentElement">
                /// Gets the DOM element that hosts the PivotItem's content.
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1"/>
                /// </field>
                contentElement: {
                    get: function () {
                        return this._contentElement;
                    }
                },
                /// <field type="Object" locid="WinJS.UI.PivotItem.header" helpKeyword="WinJS.UI.PivotItem.header">
                /// Get or set the PivotItem's header. After you set this property, the Pivot renders the header again.
                /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1"/>
                /// </field>
                header: {
                    get: function () {
                        return this._header;
                    },
                    set: function (value) {
                        // Render again even if it is equal to itself.
                        this._header = value;
                        this._parentPivot && this._parentPivot._headersState.handleHeaderChanged(this);
                    }
                },
                _parentPivot: {
                    get: function () {
                        var el = this._element;
                        while (el && !_ElementUtilities.hasClass(el, _Constants._ClassName.pivot)) {
                            el = el.parentNode;
                        }
                        return el && el.winControl;
                    }
                },
                _process: function PivotItem_process() {
                    var that = this;

                    if (this._processors) {
                        this._processors.push(function () {
                            return Scheduler.schedulePromiseAboveNormal();
                        });
                    }

                    this._processed = (this._processors || []).reduce(function (promise, processor) {
                        return promise.then(function () {
                            return processor(that.contentElement);
                        });
                    }, this._processed || Promise.as());
                    this._processors = null;

                    return this._processed;
                },
                dispose: function PivotItem_dispose() {
                    /// <signature helpKeyword="WinJS.UI.PivotItem.dispose">
                    /// <summary locid="WinJS.UI.PivotItem.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// <compatibleWith platform="WindowsPhoneApp" minVersion="8.1"/>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;
                    this._processors = null;

                    _Dispose.disposeSubTree(this.contentElement);
                }
            }, {
                // Names of classes used by the PivotItem.
                _ClassName: {
                    pivotItem: "win-pivot-item",
                    pivotItemContent: "win-pivot-item-content"
                },
                isDeclarativeControlContainer: _BaseUtils.markSupportedForProcessing(function (item, callback) {
                    if (callback === ControlProcessor.processAll) {
                        return;
                    }

                    item._processors = item._processors || [];
                    item._processors.push(callback);

                    // Once processed the first time synchronously queue up new processors as they come in
                    if (item._processed) {
                        item._process();
                    }
                })
            });

            return PivotItem;
        })
    });

});
