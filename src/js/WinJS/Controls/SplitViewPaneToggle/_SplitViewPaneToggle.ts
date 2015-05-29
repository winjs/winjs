// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../../typings/require.d.ts" />

import _Base = require('../../Core/_Base');
import _BaseUtils = require('../../Core/_BaseUtils');
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

// This control has 2 modes depending on whether or not the app has provided a SplitView:
//   - SplitView not provided
//     SplitViewPaneToggle provides button visuals and fires the invoked event. It's up
//     to the app to do everything else:
//       - Handle the invoked event
//       - Handle the SplitView opening and closing
//       - Handle aria-expanded being mutated by UIA (i.e. screen readers)
//       - Keep the aria-controls attribute, aria-expanded attribute, and SplitView in sync
//   - SplitView is provided via splitView property
//     SplitViewPaneToggle keeps the SplitView, the aria-controls attribute, and the
//     aria-expands attribute in sync. In this use case, apps typically won't listen
//     to the invoked event (but it's still fired).

var ClassNames = {
    splitViewPaneToggle: "win-splitviewpanetoggle"
};
var EventNames = {
    // Fires when the user invokes the button with mouse/keyboard/touch. Does not
    // fire if the SplitViewPaneToggle's state changes due to UIA (i.e. aria-expanded
    // being set) or due to the SplitView pane opening/closing.
    invoked: "invoked"
};
var Strings = {
    get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
    get badButtonElement() { return "Invalid argument: The SplitViewPaneToggle's element must be a button element"; }
};

function getSplitViewControl(splitViewElement: HTMLElement): SplitViewTypeInfo.SplitView {
    return <SplitViewTypeInfo.SplitView>(splitViewElement && splitViewElement["winControl"]);
}

function getPaneOpened(splitViewElement: HTMLElement): boolean {
    var splitViewControl = getSplitViewControl(splitViewElement);
    return splitViewControl ? splitViewControl.paneOpened : false;
}

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
    
    private _onPaneStateSettledBound: EventListener;
    
    private _opened: boolean; // Only used when a splitView is specified
    private _ariaExpandedMutationObserver: _ElementUtilities.IMutationObserverShim;
    
    private _initialized: boolean;
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
        
        this._onPaneStateSettledBound = this._onPaneStateSettled.bind(this);
        this._ariaExpandedMutationObserver = new _ElementUtilities._MutationObserver(this._onAriaExpandedPropertyChanged.bind(this));
        
        this._initializeDom(element || _Global.document.createElement("button"));
        
        // Private state
        this._disposed = false;
        
        // Default values
        this.splitView = null;
        
        _Control.setOptions(this, options);
        
        this._initialized = true;
        this._updateDom();
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
        if (splitView) {
            this._opened = getPaneOpened(splitView);
        }
        
        this._updateDom();
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
        this._splitView && this._removeListeners(this._splitView);
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
    
    // State private to _updateDom. No other method should make use of it.
    //
    // Nothing has been rendered yet so these are all initialized to undefined. Because
    // they are undefined, the first time _updateDom is called, they will all be
    // rendered.
    private _updateDom_rendered = {
        splitView: <HTMLElement>undefined
    };
    private _updateDom(): void {
        if (!this._initialized || this._disposed) {
            return;
        }
        
        var rendered = this._updateDom_rendered;
        
        if (this._splitView !== rendered.splitView) {
            if (rendered.splitView) {
                this._dom.root.removeAttribute("aria-controls");
                this._removeListeners(rendered.splitView);
            }
            
            if (this._splitView) {
                _ElementUtilities._ensureId(this._splitView);
                this._dom.root.setAttribute("aria-controls", this._splitView.id);
                this._addListeners(this._splitView);
            }
            rendered.splitView = this._splitView;
        }
        
        // When no SplitView is provided, it's up to the app to manage aria-expanded.
        if (this._splitView) {
            // Always update aria-expanded and don't cache its most recently rendered value
            // in _updateDom_rendered. The reason is that we're not the only ones that update
            // aria-expanded. aria-expanded may be changed thru UIA APIs. Consequently, if we
            // cached the last value we set in _updateDom_rendered, it may not reflect the current
            // value in the DOM.
            var expanded = this._opened ? "true" : "false";
            _ElementUtilities._setAttribute(this._dom.root, "aria-expanded", expanded);
            
            var splitViewControl = getSplitViewControl(this._splitView);
            if (splitViewControl) {
                splitViewControl.paneOpened = this._opened;
            }
        }
    }
    
    private _addListeners(splitViewElement: HTMLElement) {
        splitViewElement.addEventListener("_openCloseStateSettled", this._onPaneStateSettledBound);
        this._ariaExpandedMutationObserver.observe(this._dom.root, {
            attributes: true,
            attributeFilter: ["aria-expanded"]
        });
    }
    
    private _removeListeners(splitViewElement: HTMLElement) {
        splitViewElement.removeEventListener("_openCloseStateSettled", this._onPaneStateSettledBound);
        this._ariaExpandedMutationObserver.disconnect();
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
    
    // Inputs that change the SplitViewPaneToggle's state
    //
    
    private _onPaneStateSettled(eventObject: Event) {
        if (eventObject.target === this._splitView) {
            this._opened = getPaneOpened(this._splitView);
            this._updateDom();
        }
    }
    
    private _onAriaExpandedPropertyChanged(mutations: _ElementUtilities.IMutationRecordShim[]) {
        var ariaExpanded = this._dom.root.getAttribute("aria-expanded") === "true";
        this._opened = ariaExpanded;
        this._updateDom();
    }
    
    private _onClick(eventObject: MouseEvent): void {
        this._invoked();
    }
    
    // Called by tests.
    private _invoked(): void {
        if (this._disposed) {
            return;
        }
        
        if (this._splitView) {
            this._opened = !this._opened;
            this._updateDom();
        }
        
        this._fireEvent(EventNames.invoked);
    }
}

_Base.Class.mix(SplitViewPaneToggle, _Events.createEventProperties(
    EventNames.invoked
));
_Base.Class.mix(SplitViewPaneToggle, _Control.DOMEventMixin);
