// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define([
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Pages'
    ], function htmlControlInit(exports, _Global, _Base, Pages) {
    "use strict";

    // not supported in WebWorker
    if (!_Global.document) {
        return;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.HtmlControl">
        /// Enables you to include an HTML page dynamically.
        /// </summary>
        /// </field>
        /// <name locid="WinJS.UI.HtmlControl_name">HtmlControl</name>
        /// <icon src="base_winjs.ui.htmlcontrol.12x12.png" width="12" height="12" />
        /// <icon src="base_winjs.ui.htmlcontrol.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<div data-win-control="WinJS.UI.HtmlControl" data-win-options="{ uri: 'somePage.html' }"></div>]]></htmlSnippet>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        HtmlControl: _Base.Class.define(function HtmlControl_ctor(element, options, complete) {
            /// <signature helpKeyword="WinJS.UI.HtmlControl.HtmlControl">
            /// <summary locid="WinJS.UI.HtmlControl.constructor">
            /// Initializes a new instance of HtmlControl to define a new page control.
            /// </summary>
            /// <param name="element" locid="WinJS.UI.HtmlControl.constructor_p:element">
            /// The element that hosts the HtmlControl.
            /// </param>
            /// <param name="options" locid="WinJS.UI.HtmlControl.constructor_p:options">
            /// The options for configuring the page. The uri option is required in order to specify the source
            /// document for the content of the page.
            /// </param>
            /// </signature>
            Pages.render(options.uri, element, options).
                then(complete, function () { complete(); });
        })
    });
});