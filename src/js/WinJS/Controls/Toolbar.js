// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Toolbar
define([
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Utilities/_Control',
    '../Utilities/_Dispose',
    '../Utilities/_Hoverable',
    '../Utilities/_KeyboardBehavior',
    './Toolbar/_Constants',
    'require-style!less/desktop/controls',
    'require-style!less/phone/controls'
], function toolbarInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Resources, _WriteProfilerMark, _Control, _Dispose, _ElementUtilities, _Hoverable, _KeyboardBehavior, _Constants, _Layouts, _Command, _Icon, _Overlay) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.Toolbar">
        /// Represents an application toolbar for display commands.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.toolbar.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.toolbar.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.Toolbar">
        /// <button data-win-control="WinJS.UI.ToolbarCommand" data-win-options="{id:'',label:'example',icon:'back',type:'button',section:'global'}"></button>
        /// </div>]]></htmlSnippet>
        /// <part name="toolbar" class="win-toolbar" locid="WinJS.UI.Toolbar_part:toolbar">The Toolbar control itself.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        Toolbar: _Base.Namespace._lazy(function () {
            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/toolbarAriaLabel").value; },
                get badOverflowMode() { return "Invalid argument: The overflowMode property must be 'attached' or 'detached'"; }
            };

            var Toolbar = _Base.Class.define(function Toolbar_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.Toolbar.Toolbar">
                /// <summary locid="WinJS.UI.Toolbar.constructor">
                /// Creates a new Toolbar control.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.Toolbar.constructor_p:element">
                /// The DOM element that will host the control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.Toolbar.constructor_p:options">
                /// The set of properties and values to apply to the new Toolbar control.
                /// </param>
                /// <returns type="WinJS.UI.Toolbar" locid="WinJS.UI.Toolbar.constructor_returnValue">
                /// The new Toolbar control.
                /// </returns>
                /// </signature>

                options = options || {};

                // Make sure there's an element
                this._element = element || _Global.document.createElement("div");
                this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
                this._writeProfilerMark("constructor,StartTM");

                if (!this._element.hasAttribute("tabIndex")) {
                    this._element.tabIndex = -1;
                }

                // Attach our css class.
                _ElementUtilities.addClass(this._element, _Constants.cssClass);

                // Make sure we have an ARIA role
                var role = this._element.getAttribute("role");
                if (!role) {
                    this._element.setAttribute("role", "menubar");
                }
                var label = this._element.getAttribute("aria-label");
                if (!label) {
                    this._element.setAttribute("aria-label", strings.ariaLabel);
                }

                _Control.setOptions(this, options);

                this._writeProfilerMark("constructor,StopTM");

                return this;
            }, {
                // Public Properties

                /// <field type="String" defaultValue="commands" oamOptionsDatatype="WinJS.UI.Toolbar.overflowMode" locid="WinJS.UI.Toolbar.overflowMode" helpKeyword="WinJS.UI.Toolbar.overflowMode">
                /// Gets or sets the overflowMode of the Toolbar contents to either "attached" or "detached" (default).
                /// </field>
                overflowMode: {
                    get: function Toolbar_get_overflowMode() {
                        return this._overflowMode;
                    },
                    set: function (mode) {
                        if (mode !== _Constants.overflowModeAttached && mode !== _Constants.overflowModeDetached) {
                            throw new _ErrorFromName("WinJS.UI.Toolbar.BadOverflowMode", strings.badOverflowMode);
                        }
                        this._overflowMode = mode;
                    }
                },

                show: function () {
                    /// <signature helpKeyword="WinJS.UI.Toolbar.show">
                    /// <summary locid="WinJS.UI.Toolbar.show">
                    /// Shows the Toolbar, if hidden and not disabled, regardless of other state.
                    /// </summary>
                    /// </signature>
                    // Just wrap the private one, turning off keyboard invoked flag
                    this._writeProfilerMark("show,StartTM");
                    this._keyboardInvoked = false;
                    this._doNotFocus = !!this.sticky;
                    this._show();
                },

                _dispose: function Toolbar_dispose() {
                    _Dispose.disposeSubTree(this.element);
                },

                _writeProfilerMark: function Toolbar_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI.Toolbar:" + this._id + ":" + text);
                }
            }, {
                // Statics
            });

            return Toolbar;
        })
    });
});
