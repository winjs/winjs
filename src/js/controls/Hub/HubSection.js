/*
Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved.

Licensed under the Apache License, Version 2.0.

See License.txt in the project root for license information.
*/

(function hubSectionInit(global, WinJS, undefined) {
    "use strict";

    WinJS.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.HubSection">
        /// Defines a section of a Hub control. 
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.1"/>
        /// </field>
        /// <icon src="ui_winjs.ui.hubsection.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.hubsection.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.HubSection" data-win-options="{header: 'HubSection Header'}">HubSection Content</div>]]></htmlSnippet>
        /// <part name="hubsection" class="win-hub-section" locid="WinJS.UI.HubSection_part:hubsection">The entire HubSection control.</part>
        /// <part name="header" class="win-hub-section-header" locid="WinJS.UI.HubSection_part:header">The header region of the HubSection.</part>
        /// <part name="headertabstop" class="win-hub-section-header-tabstop" locid="WinJS.UI.HubSection_part:headertabstop">The tab stop region of the header region of the HubSection.</part>
        /// <part name="headercontent" class="win-hub-section-header-content" locid="WinJS.UI.HubSection_part:headercontent">The content region of the header region of the HubSection.</part>
        /// <part name="headerchevron" class="win-hub-section-header-chevron" locid="WinJS.UI.HubSection_part:headerchevron">The chevron region of the header region of the HubSection.</part>
        /// <part name="content" class="win-hub-section-content" locid="WinJS.UI.HubSection_part:content">The content region of the HubSection.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        HubSection: WinJS.Namespace._lazy(function () {
            var strings = {
                get duplicateConstruction() { return WinJS.Resources._getWinJSString("ui/duplicateConstruction").value; }
            };

            return WinJS.Class.define(function HubSection_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.HubSection.HubSection">
                /// <summary locid="WinJS.UI.HubSection.constructor">
                /// Creates a new HubSection.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.HubSection.constructor_p:element">
                /// The DOM element that hosts the HubSection control.
                /// </param>
                /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.HubSection.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control. 
                /// Each property of the options object corresponds to one of the control's properties or events. 
                /// </param>
                /// <returns type="WinJS.UI.HubSection" locid="WinJS.UI.HubSection.constructor_returnValue">
                /// The new HubSection.
                /// </returns>
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </signature>
                element = element || document.createElement("DIV");
                options = options || {};

                if (element.winControl) {
                    throw new WinJS.ErrorFromName("WinJS.UI.HubSection.DuplicateConstruction", strings.duplicateConstruction);
                }

                // Attaching JS control to DOM element
                element.winControl = this;
                this._element = element;
                WinJS.Utilities.addClass(this.element, WinJS.UI.HubSection._ClassName.hubSection);
                WinJS.Utilities.addClass(this.element, "win-disposable");

                // Not using innerHTML here because there could have been some children already.
                this._headerElement = document.createElement("DIV");
                this._headerElement.className = WinJS.UI.HubSection._ClassName.hubSectionHeader
                this._headerElement.innerHTML =
                    '<button type="button" role="link" class="' + WinJS.UI.HubSection._ClassName.hubSectionInteractive + ' ' + WinJS.UI.HubSection._ClassName.hubSectionHeaderTabStop + '">' +
                        '<h2 class="' + WinJS.UI.HubSection._ClassName.hubSectionHeaderContent + ' ' + WinJS.UI.HubSection._Constants.ellipsisTypeClassName + ' ' + WinJS.UI.HubSection._Constants.xLargeTypeClassName + '"></h2>' +
                        '<span class="' + WinJS.UI.HubSection._ClassName.hubSectionHeaderChevron + ' ' + WinJS.UI.HubSection._Constants.ellipsisTypeClassName + ' ' + WinJS.UI.HubSection._Constants.xLargeTypeClassName + '"></span>' +
                    '</button>';
                this._headerTabStopElement = this._headerElement.firstElementChild;
                this._headerContentElement = this._headerTabStopElement.firstElementChild;
                this._headerChevronElement = this._headerTabStopElement.lastElementChild;
                element.appendChild(this._headerElement);

                this._winKeyboard = new WinJS.UI._WinKeyboard(this._headerElement);

                this._contentElement = document.createElement("DIV");
                this._contentElement.className = WinJS.UI.HubSection._ClassName.hubSectionContent;
                this._contentElement.style.visibility = "hidden";
                element.appendChild(this._contentElement);

                // Reparent any existing elements inside the new hub section content element.
                var elementToMove = this.element.firstChild;
                while (elementToMove !== this._headerElement) {
                    var nextElement = elementToMove.nextSibling;
                    this._contentElement.appendChild(elementToMove);
                    elementToMove = nextElement;
                }

                this._processors = [WinJS.UI.processAll];

                WinJS.UI.setOptions(this, options);
            }, {
                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.HubSection.element" helpKeyword="WinJS.UI.HubSection.element">
                /// Gets the DOM element that hosts the HubSection.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },
                /// <field type="Boolean" locid="WinJS.UI.HubSection.isHeaderStatic" helpKeyword="WinJS.UI.HubSection.isHeaderStatic">
                /// Gets or sets a value that specifies whether the header is static. Set this value to true to disable clicks and other interactions. 
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                isHeaderStatic: {
                    get: function () {
                        return this._isHeaderStatic;
                    },
                    set: function (value) {
                        this._isHeaderStatic = value;
                        if (!this._isHeaderStatic) {
                            this._headerTabStopElement.setAttribute("role", "link");
                            WinJS.Utilities.addClass(this._headerTabStopElement, WinJS.UI.HubSection._ClassName.hubSectionInteractive);
                        } else {
                            this._headerTabStopElement.setAttribute("role", "heading");
                            WinJS.Utilities.removeClass(this._headerTabStopElement, WinJS.UI.HubSection._ClassName.hubSectionInteractive);
                        }
                    }
                },
                /// <field type="HTMLElement" domElement="true" locid="WinJS.UI.HubSection.contentElement" helpKeyword="WinJS.UI.HubSection.contentElement">
                /// Gets the DOM element that hosts the HubSection's content.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                contentElement: {
                    get: function () {
                        return this._contentElement;
                    }
                },
                /// <field type="Object" locid="WinJS.UI.HubSection.header" helpKeyword="WinJS.UI.HubSection.header">
                /// Get or set the HubSection's header. After you set this property, the Hub renders the header again.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                header: {
                    get: function () {
                        return this._header;
                    },
                    set: function (value) {
                        // Render again even if it is equal to itself.
                        this._header = value;
                        this._renderHeader();
                    }
                },
                _setHeaderTemplate: function HubSection_setHeaderTemplate(template) {
                    this._template = WinJS.Utilities._syncRenderer(template);
                    this._renderHeader();
                },
                _renderHeader: function HubSection_renderHeader() {
                    if (this._template) {
                        WinJS.Utilities._disposeElement(this._headerContentElement);
                        WinJS.Utilities.empty(this._headerContentElement);
                        this._template(this, this._headerContentElement);
                    }
                },
                _process: function HubSection_process() {
                    var that = this;

                    this._processed = (this._processors || []).reduce(function (promise, processor) {
                        return promise.then(function () {
                            return processor(that.contentElement);
                        });
                    }, this._processed || WinJS.Promise.as());
                    this._processors = null;

                    return this._processed;
                },
                dispose: function HubSection_dispose() {
                    /// <signature helpKeyword="WinJS.UI.HubSection.dispose">
                    /// <summary locid="WinJS.UI.HubSection.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.1"/>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;
                    this._processors = null;

                    WinJS.Utilities._disposeElement(this._headerContentElement);
                    WinJS.Utilities.disposeSubTree(this.contentElement);
                }
            }, {
                // Names of classes used by the HubSection.
                _ClassName: {
                    hubSection: "win-hub-section",
                    hubSectionHeader: "win-hub-section-header",
                    hubSectionHeaderTabStop: "win-hub-section-header-tabstop",
                    hubSectionInteractive: "win-hub-section-header-interactive",
                    hubSectionHeaderContent: "win-hub-section-header-content",
                    hubSectionHeaderChevron: "win-hub-section-header-chevron",
                    hubSectionContent: "win-hub-section-content"
                },
                _Constants: {
                    ellipsisTypeClassName: "win-type-ellipsis",
                    xLargeTypeClassName: "win-type-x-large"
                },
                isDeclarativeControlContainer: WinJS.Utilities.markSupportedForProcessing(function (section, callback) {
                    if (callback === WinJS.UI.processAll) {
                        return;
                    }

                    section._processors = section._processors || [];
                    section._processors.push(callback);

                    // Once processed the first time synchronously queue up new processors as they come in
                    if (section._processed) {
                        section._process();
                    }
                })
            });
        })
    });

})(this, WinJS);
