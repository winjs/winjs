// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../Core.d.ts" />
import Animations = require("../../Animations");
import _Base = require("../../Core/_Base");
import ControlProcessor = require("../../ControlProcessor"); // remove?
import _Constants = require("../Pane/_Constants");
import _Control = require("../../Utilities/_Control");
import _Dispose = require("../../Utilities/_Dispose");
import _ElementUtilities = require("../../Utilities/_ElementUtilities");
import _ErrorFromName = require("../../Core/_ErrorFromName");
import _Events = require('../../Core/_Events');
import _Global = require("../../Core/_Global");
import _LightDismissService = require('../../_LightDismissService');
import Promise = require('../../Promise');
import _Resources = require("../../Core/_Resources");
import _OpenCloseMachine = require('../../Utilities/_OpenCloseMachine');
import _WriteProfilerMark = require("../../Core/_WriteProfilerMark");

require(["require-style!less/styles-pane"]);

"use strict";

var strings = {
    get ariaLabel() { return _Resources._getWinJSString("ui/appBarAriaLabel").value; },
    get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; }
};

// Versions of add/removeClass that are no ops when called with falsy class names.
function addClass(element: HTMLElement, className: string): void {
    className && _ElementUtilities.addClass(element, className);
}
function removeClass(element: HTMLElement, className: string): void {
    className && _ElementUtilities.removeClass(element, className);
}
/// <field>
/// <summary locid="WinJS.UI.AppBar">
/// Represents an appbar for displaying commands.
/// </summary>
/// </field>
/// <icon src="ui_winjs.ui.appbar.12x12.png" width="12" height="12" />
/// <icon src="ui_winjs.ui.appbar.16x16.png" width="16" height="16" />
/// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.AppBar">
/// <button data-win-control="WinJS.UI.Command" data-win-options="{id:'',label:'example',icon:'back',type:'button',onclick:null,section:'primary'}"></button>
/// </div>]]></htmlSnippet>
/// <part name="appbar" class="win-appbar" locid="WinJS.UI.AppBar_part:appbar">The entire AppBar control.</part>
/// <part name="appbar-overflowbutton" class="win-appbar-overflowbutton" locid="WinJS.UI.AppBar_part:AppBar-overflowbutton">The appbar overflow button.</part>
/// <part name="appbar-overflowarea" class="win-appbar-overflowarea" locid="WinJS.UI.AppBar_part:AppBar-overflowarea">The container for appbar commands that overflow.</part>
/// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
/// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
export class Pane {
    private _id: string;
    private _disposed: boolean;
    
    private _isOpenedMode: boolean;
    private _dismissable: _LightDismissService.ILightDismissable;
    private _cachedClosedHeight: number;
    private _machine: _OpenCloseMachine.OpenCloseMachine;

    static supportedForProcessing: boolean = true;

    private _element: HTMLElement;
    /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.AppBar.element" helpKeyword="WinJS.UI.AppBar.element">
    /// Gets the DOM element that hosts the AppBar.
    /// </field>
    get element() {
        return this._element;
    }

    /// <field type="Boolean" hidden="true" locid="WinJS.UI.AppBar.opened" helpKeyword="WinJS.UI.AppBar.opened">
    /// Gets or sets whether the AppBar is currently opened.
    /// </field>
    get opened(): boolean {
        return this._machine.opened;
    }
    set opened(value: boolean) {
        this._machine.opened = value;
    }

    constructor(element?: HTMLElement, options: any = {}) {
        /// <signature helpKeyword="WinJS.UI.AppBar.AppBar">
        /// <summary locid="WinJS.UI.AppBar.constructor">
        /// Creates a new AppBar control.
        /// </summary>
        /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.AppBar.constructor_p:element">
        /// The DOM element that will host the control.
        /// </param>
        /// <param name="options" type="Object" locid="WinJS.UI.AppBar.constructor_p:options">
        /// The set of properties and values to apply to the new AppBar control.
        /// </param>
        /// <returns type="WinJS.UI.AppBar" locid="WinJS.UI.AppBar.constructor_returnValue">
        /// The new AppBar control.
        /// </returns>
        /// </signature>

        this._writeProfilerMark("constructor,StartTM");

        // Check to make sure we weren't duplicated
        if (element && element["winControl"]) {
            throw new _ErrorFromName("WinJS.UI.AppBar.DuplicateConstruction", strings.duplicateConstruction);
        }

        this._initializeDom(element || _Global.document.createElement("div"));
        this._machine = new _OpenCloseMachine.OpenCloseMachine({
            eventElement: this.element,
            onOpen: () => {
                //var openAnimation = this._commandingSurface.createOpenAnimation(this._getClosedHeight());
                this._synchronousOpen();
                //return openAnimation.execute().then(() => {
                return Promise.wrap();
                //});
            },
            onClose: () => {
                //var closeAnimation = this._commandingSurface.createCloseAnimation(this._getClosedHeight());
                //return closeAnimation.execute().then(() => {
                this._synchronousClose();
                return Promise.wrap();
                //});
            },
            onUpdateDom: () => {
                this._updateDomImpl();
            },
            onUpdateDomWithIsOpened: (isOpened: boolean) => {
                this._isOpenedMode = isOpened;
                this._updateDomImpl();
            }
        });

        // Events?

        // Initialize private state.
        this._disposed = false;
        this._cachedClosedHeight = null;
        this._isOpenedMode = _Constants.defaultOpened;
        this._dismissable = new _LightDismissService.LightDismissableElement({
            element: this.element,
            tabIndex: this.element.hasAttribute("tabIndex") ? this.element.tabIndex : -1,
            onLightDismiss: () => {
                this.close();
            }
        });

        // Initialize public properties.
        this.opened = this._isOpenedMode;
        _Control.setOptions(this, options);

        // Exit the Init state.
        _ElementUtilities._inDom(this.element)
            .then(() => {
                this._machine.exitInit();
                this._writeProfilerMark("constructor,StopTM");
            });
    }

    /// <field type="Function" locid="WinJS.UI.AppBar.onbeforeopen" helpKeyword="WinJS.UI.AppBar.onbeforeopen">
    /// Occurs immediately before the control is opened. Is cancelable.
    /// </field>
    onbeforeopen: (ev: CustomEvent) => void;
    /// <field type="Function" locid="WinJS.UI.AppBar.onafteropen" helpKeyword="WinJS.UI.AppBar.onafteropen">
    /// Occurs immediately after the control is opened.
    /// </field>
    onafteropen: (ev: CustomEvent) => void;
    /// <field type="Function" locid="WinJS.UI.AppBar.onbeforeclose" helpKeyword="WinJS.UI.AppBar.onbeforeclose">
    /// Occurs immediately before the control is closed. Is cancelable.
    /// </field>
    onbeforeclose: (ev: CustomEvent) => void;
    /// <field type="Function" locid="WinJS.UI.AppBar.onafterclose" helpKeyword="WinJS.UI.AppBar.onafterclose">
    /// Occurs immediately after the control is closed.
    /// </field>
    onafterclose: (ev: CustomEvent) => void;

    open(): void {
        /// <signature helpKeyword="WinJS.UI.AppBar.open">
        /// <summary locid="WinJS.UI.AppBar.open">
        /// Opens the AppBar
        /// </summary>
        /// </signature>
        this._machine.open();
    }

    close(): void {
        /// <signature helpKeyword="WinJS.UI.AppBar.close">
        /// <summary locid="WinJS.UI.AppBar.close">
        /// Closes the AppBar
        /// </summary>
        /// </signature>
        this._machine.close();
    }

    dispose() {
        /// <signature helpKeyword="WinJS.UI.AppBar.dispose">
        /// <summary locid="WinJS.UI.AppBar.dispose">
        /// Disposes this AppBar.
        /// </summary>
        /// </signature>
        if (this._disposed) {
            return;
        }

        this._disposed = true;
        _LightDismissService.hidden(this._dismissable);
        // Disposing the OpenCloseMachine will synchronously complete any animations that might have been running.
        this._machine.dispose();

        _Dispose.disposeSubTree(this.element);
    }

    private _writeProfilerMark(text: string) {
        _WriteProfilerMark("WinJS.UI.Pane:" + this._id + ":" + text);
    }

    private _initializeDom(root: HTMLElement): void {

        this._writeProfilerMark("_intializeDom,info");

        // Attaching JS control to DOM element
        root["winControl"] = this;

        this._id = root.id || _ElementUtilities._uniqueID(root);

        _ElementUtilities.addClass(root, _Constants.ClassNames.controlCssClass);
        _ElementUtilities.addClass(root, _Constants.ClassNames.disposableCssClass);

        // Make sure we have an ARIA role
        var role = root.getAttribute("role");
        if (!role) {
            root.setAttribute("role", "menubar");
        }

        var label = root.getAttribute("aria-label");
        if (!label) {
            root.setAttribute("aria-label", strings.ariaLabel);
        }

        this._element = root;
    }

    private _synchronousOpen(): void {
        this._isOpenedMode = true;
        this._updateDomImpl();
        _LightDismissService.shown(this._dismissable); // Call at the start of the open animation
    }

    private _synchronousClose(): void {
        this._isOpenedMode = false;
        this._updateDomImpl();
        _LightDismissService.hidden(this._dismissable); // Call after the close animation
    }

    // State private to the _updateDomImpl family of method. No other methods should make use of it.
    //
    // Nothing has been rendered yet so these are all initialized to undefined. Because
    // they are undefined, the first time _updateDomImpl is called, they will all be
    // rendered.
    private _updateDomImpl_renderedState = {
        isOpenedMode: <boolean>undefined,
    };
    private _updateDomImpl(): void {
        var rendered = this._updateDomImpl_renderedState;

        if (rendered.isOpenedMode !== this._isOpenedMode) {
            if (this._isOpenedMode) {
                // Render opened
                removeClass(this.element, _Constants.ClassNames.closedClass);
                addClass(this.element, _Constants.ClassNames.openedClass);
            } else {
                // Render closed
                removeClass(this.element, _Constants.ClassNames.openedClass);
                addClass(this.element, _Constants.ClassNames.closedClass);
            }
            rendered.isOpenedMode = this._isOpenedMode;
        }
    }

    private _getClosedHeight(): number {
        if (this._cachedClosedHeight === null) {
            var wasOpen = this._isOpenedMode;
            if (this._isOpenedMode) {
                this._synchronousClose();
            }
            this._cachedClosedHeight = this.element.getBoundingClientRect().height;
            if (wasOpen) {
                this._synchronousOpen();
            }
        }

        return this._cachedClosedHeight;
    }
}

_Base.Class.mix(Pane, _Events.createEventProperties(
    _Constants.EventNames.beforeOpen,
    _Constants.EventNames.afterOpen,
    _Constants.EventNames.beforeClose,
    _Constants.EventNames.afterClose));

// addEventListener, removeEventListener, dispatchEvent
_Base.Class.mix(Pane, _Control.DOMEventMixin);
