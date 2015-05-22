// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../../typings/require.d.ts" />

import _Base = require('../../Core/_Base');
import _Control = require('../../Utilities/_Control');
import _ElementUtilities = require('../../Utilities/_ElementUtilities');
import _ErrorFromName = require('../../Core/_ErrorFromName');
import _Events = require('../../Core/_Events');
import _Global = require('../../Core/_Global');
import _KeyboardBehavior = require('../../Utilities/_KeyboardBehavior');
import SplitViewTypeInfo = require('../SplitView/_SplitView'); // Only use for type information so we don't eagerly load the SplitView code

import _Hoverable = require('../../Utilities/_Hoverable');
_Hoverable.isHoverable; // Force dependency on the hoverable module

require(["require-style!less/styles-splitviewpanetoggle"]);
require(["require-style!less/colors-splitviewpanetoggle"]);

"use strict";

var ClassNames = {
    splitViewPaneToggle: "win-splitviewpanetoggle"
};
var EventNames = {
    invoked: "invoked"
};
var Strings = {
    get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
    get badButtonElement() { return "Invalid argument: The SplitViewPaneToggle's element must be a button element"; }
};

/// <field>
/// <summary locid="WinJS.UI.SplitViewPaneToggle">
/// Displays a button which is used for opening and closing a SplitView's pane.
/// </summary>
/// </field>
/// <icon src="ui_winjs.ui.splitviewpanetoggle.12x12.png" width="12" height="12" />
/// <icon src="ui_winjs.ui.splitviewpanetoggle.16x16.png" width="16" height="16" />
/// <htmlSnippet><![CDATA[<button data-win-control="WinJS.UI.SplitViewPaneToggle"></button>]]></htmlSnippet>
/// <part name="splitviewpanetoggle" class="win-splitviewpanetoggle" locid="WinJS.UI.SplitViewPaneToggle_part:splitviewpanetoggle">The SplitViewPaneToggle control itself.</part>
/// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
/// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
export class SplitViewPaneToggle {
    private static _ClassNames = ClassNames;
    
    static supportedForProcessing: boolean = true;
    
    private _disposed: boolean;
    private _dom: {
        root: HTMLButtonElement;
    };

    constructor(element?: HTMLButtonElement, options: any = {}) {
        /// <signature helpKeyword="WinJS.UI.SplitViewPaneToggle.SplitViewPaneToggle">
        /// <summary locid="WinJS.UI.SplitViewPaneToggle.constructor">
        /// Creates a new SplitViewPaneToggle control.
        /// </summary>
        /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.SplitViewPaneToggle.constructor_p:element">
        /// The DOM element that hosts the SplitViewPaneToggle control.
        /// </param>
        /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.SplitViewPaneToggle.constructor_p:options">
        /// An object that contains one or more property/value pairs to apply to the new control.
        /// Each property of the options object corresponds to one of the control's properties or events.
        /// Event names must begin with "on". For example, to provide a handler for the invoked event,
        /// add a property named "oninvoked" to the options object and set its value to the event handler.
        /// </param>
        /// <returns type="WinJS.UI.SplitViewPaneToggle" locid="WinJS.UI.SplitViewPaneToggle.constructor_returnValue">
        /// The new SplitViewPaneToggle.
        /// </returns>
        /// </signature>

        // Check to make sure we weren't duplicated
        if (element && element["winControl"]) {
            throw new _ErrorFromName("WinJS.UI.SplitViewPaneToggle.DuplicateConstruction", Strings.duplicateConstruction);
        }

        this._initializeDom(element || _Global.document.createElement("button"));
        
        this._disposed = false;
        
        _Control.setOptions(this, options);
    }

    /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.SplitViewPaneToggle.element" helpKeyword="WinJS.UI.SplitViewPaneToggle.element">
    /// Gets the DOM element that hosts the SplitViewPaneToggle control.
    /// </field>
    get element(): HTMLElement {
        return this._dom.root;
    }
    
    private _splitView: HTMLElement;
    /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.SplitViewPaneToggle.splitView" helpKeyword="WinJS.UI.SplitViewPaneToggle.splitView">
    /// Gets or sets the DOM element of the SplitView that is associated with the SplitViewPaneToggle control.
    /// When the SplitViewPaneToggle is invoked, it'll toggle this SplitView's pane.
    /// </field>
    get splitView(): HTMLElement {
        return this._splitView;
    }
    set splitView(splitView: HTMLElement) {
        this._splitView = splitView;
    }

    dispose(): void {
        /// <signature helpKeyword="WinJS.UI.SplitViewPaneToggle.dispose">
        /// <summary locid="WinJS.UI.SplitViewPaneToggle.dispose">
        /// Disposes this control.
        /// </summary>
        /// </signature>
        if (this._disposed) {
            return;
        }
        this._disposed = true;
    }

    private _initializeDom(root: HTMLButtonElement): void {
        if (root.tagName !== "BUTTON") {
            throw new _ErrorFromName("WinJS.UI.SplitViewPaneToggle.BadButtonElement", Strings.badButtonElement);
        }
        
        root["winControl"] = this;
        _ElementUtilities.addClass(root, ClassNames.splitViewPaneToggle);
        _ElementUtilities.addClass(root, "win-disposable");
        if (!root.hasAttribute("type")) {
            root.type = "button";
        }
        
        new _KeyboardBehavior._WinKeyboard(root);
        root.addEventListener("click", this._onClick.bind(this));

        this._dom = {
            root: root
        };
    }
    
    private _onClick(eventObject: MouseEvent): void {
        this._invoked();
    }
    
    // Called by tests.
    private _invoked(): void {
        if (this._disposed) {
            return;
        }
        
        var splitViewControl = <SplitViewTypeInfo.SplitView>(this.splitView && this.splitView["winControl"]);
        if (splitViewControl) {
            splitViewControl.paneOpened = !splitViewControl.paneOpened;
        }
        
        this._fireEvent(EventNames.invoked);
    }
    
    private _fireEvent(eventName: string) {
        var eventObject = <CustomEvent>_Global.document.createEvent("CustomEvent");
        eventObject.initCustomEvent(
            eventName, 
            true,  // bubbles
            false, // cancelable
            null   // detail
        );
        return this._dom.root.dispatchEvent(eventObject);
    }
}

_Base.Class.mix(SplitViewPaneToggle, _Events.createEventProperties(
    EventNames.invoked
));
_Base.Class.mix(SplitViewPaneToggle, _Control.DOMEventMixin);
