// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../Core.d.ts" />
import Animations = require("../../Animations");
import _Base = require("../../Core/_Base");
import _BaseUtils = require("../../Core/_BaseUtils");
import BindingList = require("../../BindingList");
import ControlProcessor = require("../../ControlProcessor");
import _Constants = require("../AppBar/_Constants");
import _Command = require("../AppBar/_Command");
import _CommandingSurface = require("../CommandingSurface");
import _ICommandingSurface = require("../CommandingSurface/_CommandingSurface");
import _Control = require("../../Utilities/_Control");
import _Dispose = require("../../Utilities/_Dispose");
import _ElementUtilities = require("../../Utilities/_ElementUtilities");
import _ErrorFromName = require("../../Core/_ErrorFromName");
import _Events = require('../../Core/_Events');
import _Flyout = require("../../Controls/Flyout");
import _Global = require("../../Core/_Global");
import _Hoverable = require("../../Utilities/_Hoverable");
import _KeyboardBehavior = require("../../Utilities/_KeyboardBehavior");
import _KeyboardInfo = require('../../Utilities/_KeyboardInfo');
import _LightDismissService = require('../../_LightDismissService');
import Menu = require("../../Controls/Menu");
import _MenuCommand = require("../Menu/_Command");
import Promise = require('../../Promise');
import _Resources = require("../../Core/_Resources");
import Scheduler = require("../../Scheduler");
import _OpenCloseMachine = require('../../Utilities/_OpenCloseMachine');
import _Signal = require('../../_Signal');
import _WinRT = require('../../Core/_WinRT');
import _WriteProfilerMark = require("../../Core/_WriteProfilerMark");

require(["require-style!less/styles-appbar"]);
require(["require-style!less/colors-appbar"]);

"use strict";

var keyboardInfo = _KeyboardInfo._KeyboardInfo;

var strings = {
    get ariaLabel() { return _Resources._getWinJSString("ui/appBarAriaLabel").value; },
    get overflowButtonAriaLabel() { return _Resources._getWinJSString("ui/appBarOverflowButtonAriaLabel").value; },
    get mustContainCommands() { return "The AppBar can only contain WinJS.UI.Command or WinJS.UI.AppBarCommand controls"; },
    get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; }
};

var ClosedDisplayMode = {
    /// <field locid="WinJS.UI.AppBar.ClosedDisplayMode.none" helpKeyword="WinJS.UI.AppBar.ClosedDisplayMode.none">
    /// When the AppBar is closed, it is not visible and doesn't take up any space.
    /// </field>
    none: "none",
    /// <field locid="WinJS.UI.AppBar.ClosedDisplayMode.minimal" helpKeyword="WinJS.UI.AppBar.ClosedDisplayMode.minimal">
    /// When the AppBar is closed, its height is reduced to the minimal height required to display only its overflowbutton. All other content in the AppBar is not displayed.
    /// </field>
    minimal: "minimal",
    /// <field locid="WinJS.UI.AppBar.ClosedDisplayMode.compact" helpKeyword="WinJS.UI.AppBar.ClosedDisplayMode.compact">
    /// When the AppBar is closed, its height is reduced such that button commands are still visible, but their labels are hidden.
    /// </field>
    compact: "compact",
    /// <field locid="WinJS.UI.AppBar.ClosedDisplayMode.full" helpKeyword="WinJS.UI.AppBar.ClosedDisplayMode.full">
    /// When the AppBar is closed, its height is always sized to content.
    /// </field>
    full: "full",
};

var closedDisplayModeClassMap = {};
closedDisplayModeClassMap[ClosedDisplayMode.none] = _Constants.ClassNames.noneClass;
closedDisplayModeClassMap[ClosedDisplayMode.minimal] = _Constants.ClassNames.minimalClass;
closedDisplayModeClassMap[ClosedDisplayMode.compact] = _Constants.ClassNames.compactClass;
closedDisplayModeClassMap[ClosedDisplayMode.full] = _Constants.ClassNames.fullClass;

var Placement = {
    /// <field locid="WinJS.UI.AppBar.Placement.top" helpKeyword="WinJS.UI.AppBar.Placement.top">
    /// The AppBar appears at the top of the main view
    /// </field>
    top: "top",
    /// <field locid="WinJS.UI.AppBar.Placement.bottom" helpKeyword="WinJS.UI.AppBar.Placement.bottom">
    /// The AppBar appears at the bottom of the main view
    /// </field>
    bottom: "bottom",
};
var placementClassMap = {};
placementClassMap[Placement.top] = _Constants.ClassNames.placementTopClass;
placementClassMap[Placement.bottom] = _Constants.ClassNames.placementBottomClass;

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
export class AppBar {
    private _id: string;
    private _disposed: boolean;
    private _commandingSurface: _ICommandingSurface._CommandingSurface;
    private _isOpenedMode: boolean;
    private _adjustedOffsets: { top: string; bottom: string };
    private _handleShowingKeyboardBound: (ev: any) => Promise<any>;
    private _handleHidingKeyboardBound: (ev: any) => any;
    private _dismissable: _LightDismissService.ILightDismissable;

    private _dom: {
        root: HTMLElement;
        commandingSurfaceEl: HTMLElement;
    }

    /// <field locid="WinJS.UI.AppBar.ClosedDisplayMode" helpKeyword="WinJS.UI.AppBar.ClosedDisplayMode">
    /// Display options for the AppBar when closed.
    /// </field>
    static ClosedDisplayMode = ClosedDisplayMode;

    /// <field locid="WinJS.UI.AppBar.Placement" helpKeyword="WinJS.UI.AppBar.Placement">
    /// Display options for AppBar placement in relation to the main view.
    /// </field>
    static Placement = Placement;

    static supportedForProcessing: boolean = true;

    /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.AppBar.element" helpKeyword="WinJS.UI.AppBar.element">
    /// Gets the DOM element that hosts the AppBar.
    /// </field>
    get element() {
        return this._dom.root;
    }

    /// <field type="WinJS.Binding.List" locid="WinJS.UI.AppBar.data" helpKeyword="WinJS.UI.AppBar.data">
    /// Gets or sets the Binding List of WinJS.UI.Command for the AppBar.
    /// </field>
    get data() {
        return this._commandingSurface.data;
    }
    set data(value: BindingList.List<_Command.ICommand>) {
        this._commandingSurface.data = value;
    }

    /// <field type="String" locid="WinJS.UI.AppBar.closedDisplayMode" helpKeyword="WinJS.UI.AppBar.closedDisplayMode">
    /// Gets or sets the closedDisplayMode for the AppBar. Values are "none", "minimal", "compact" and "full".
    /// </field>
    get closedDisplayMode() {
        return this._commandingSurface.closedDisplayMode;
    }
    set closedDisplayMode(value: string) {
        if (ClosedDisplayMode[value]) {
            this._commandingSurface.closedDisplayMode = value;
        }
    }

    private _placement: string;
    /// <field type="Boolean" hidden="true" locid="WinJS.UI.AppBar.placement" helpKeyword="WinJS.UI.AppBar.placement">
    /// Gets or sets a value that specifies whether the AppBar appears at the top or bottom of the main view.
    /// </field>
    get placement(): string {
        return this._placement;
    }
    set placement(value: string) {
        if (Placement[value] && this._placement !== value) {
            this._placement = value;
            switch (value) {
                case Placement.top:
                    this._commandingSurface.overflowDirection = "bottom";
                    break;
                case Placement.bottom:
                    this._commandingSurface.overflowDirection = "top";
                    break;
            }

            this._adjustedOffsets = this._computeAdjustedOffsets();

            this._commandingSurface.deferredDomUpate();
        }
    }

    /// <field type="Boolean" hidden="true" locid="WinJS.UI.AppBar.opened" helpKeyword="WinJS.UI.AppBar.opened">
    /// Gets or sets whether the AppBar is currently opened.
    /// </field>
    get opened(): boolean {
        return this._commandingSurface.opened;
    }
    set opened(value: boolean) {
        this._commandingSurface.opened = value;
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
        var stateMachine = new _OpenCloseMachine.OpenCloseMachine({
            eventElement: this.element,
            onOpen: () => {
                this._synchronousOpen();

                // Animate
                return Promise.wrap();
            },

            onClose: () => {
                this._synchronousClose()
                // Animate
                return Promise.wrap();
            },
            onUpdateDom: () => {
                this._updateDomImpl();
            },
            onUpdateDomWithIsOpened: (isOpened: boolean) => {
                this._isOpenedMode = isOpened;
                this._updateDomImpl();
            }
        });

        // Events
        this._handleShowingKeyboardBound = this._handleShowingKeyboard.bind(this);
        this._handleHidingKeyboardBound = this._handleHidingKeyboard.bind(this);
        _ElementUtilities._inputPaneListener.addEventListener(this._dom.root, "showing", this._handleShowingKeyboardBound);
        _ElementUtilities._inputPaneListener.addEventListener(this._dom.root, "hiding", this._handleHidingKeyboardBound);

        // Initialize private state.
        this._disposed = false;
        this._commandingSurface = new _CommandingSurface._CommandingSurface(this._dom.commandingSurfaceEl, { openCloseMachine: stateMachine });
        addClass(<HTMLElement>this._dom.commandingSurfaceEl.querySelector(".win-commandingsurface-actionarea"), _Constants.ClassNames.actionAreaCssClass);
        addClass(<HTMLElement>this._dom.commandingSurfaceEl.querySelector(".win-commandingsurface-overflowarea"), _Constants.ClassNames.overflowAreaCssClass);
        addClass(<HTMLElement>this._dom.commandingSurfaceEl.querySelector(".win-commandingsurface-overflowbutton"), _Constants.ClassNames.overflowButtonCssClass);
        addClass(<HTMLElement>this._dom.commandingSurfaceEl.querySelector(".win-commandingsurface-ellipsis"), _Constants.ClassNames.ellipsisCssClass);
        this._isOpenedMode = _Constants.defaultOpened;
        this._dismissable = new _LightDismissService.LightDismissableElement({
            element: this._dom.root,
            tabIndex: this._dom.root.hasAttribute("tabIndex") ? this._dom.root.tabIndex : -1,
            onLightDismiss: () => {
                this.close();
            }
        });

        // Initialize public properties.
        this.closedDisplayMode = _Constants.defaultClosedDisplayMode;
        this.placement = _Constants.defaultPlacement;
        this.opened = this._isOpenedMode;
        _Control.setOptions(this, options);

        // Exit the Init state.
        _ElementUtilities._inDom(this.element).then(() => {
            return this._commandingSurface.initialized;
        }).then(() => {
                stateMachine.exitInit();
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
        this._commandingSurface.open();
    }

    close(): void {
        /// <signature helpKeyword="WinJS.UI.AppBar.close">
        /// <summary locid="WinJS.UI.AppBar.close">
        /// Closes the AppBar
        /// </summary>
        /// </signature>
        this._commandingSurface.close();
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
        // Disposing the _commandingSurface will trigger dispose on its OpenCloseMachine
        // and synchronously complete any animations that might have been running.
        this._commandingSurface.dispose();

        _ElementUtilities._inputPaneListener.removeEventListener(this._dom.root, "showing", this._handleShowingKeyboardBound);
        _ElementUtilities._inputPaneListener.removeEventListener(this._dom.root, "hiding", this._handleHidingKeyboardBound);

        _Dispose.disposeSubTree(this.element);
    }

    forceLayout() {
        /// <signature helpKeyword="WinJS.UI.AppBar.forceLayout">
        /// <summary locid="WinJS.UI.AppBar.forceLayout">
        /// Forces the AppBar to update its layout. Use this function when the window did not change size, but the container of the AppBar changed size.
        /// </summary>
        /// </signature>
        this._commandingSurface.forceLayout();
    }

    getCommandById(id: string): _Command.ICommand {
        /// <signature helpKeyword="WinJS.UI.AppBar.getCommandById">
        /// <summary locid="WinJS.UI.AppBar.getCommandById">
        /// Retrieves the command with the specified ID from this AppBar.
        /// If more than one command is found, this method returns the first command found.
        /// </summary>
        /// <param name="id" type="String" locid="WinJS.UI.AppBar.getCommandById_p:id">Id of the command to return.</param>
        /// <returns type="object" locid="WinJS.UI.AppBar.getCommandById_returnValue">
        /// The command found, or null if no command is found.
        /// </returns>
        /// </signature>
        return this._commandingSurface.getCommandById(id);
    }

    private _writeProfilerMark(text: string) {
        _WriteProfilerMark("WinJS.UI.AppBar:" + this._id + ":" + text);
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

        // Create element for commandingSurface and reparent any declarative Commands.
        // commandingSurface will parse child elements as AppBarCommands.
        var commandingSurfaceEl = document.createElement("DIV");
        _ElementUtilities._reparentChildren(root, commandingSurfaceEl);
        root.appendChild(commandingSurfaceEl);

        this._dom = {
            root: root,
            commandingSurfaceEl: commandingSurfaceEl,
        };
    }

    private _handleShowingKeyboard(event: { detail: { originalEvent: _WinRT.Windows.UI.ViewManagement.InputPaneVisibilityEventArgs } }): Promise<any> {
        // If the IHM resized the window, we can rely on -ms-device-fixed positioning to remain visible.
        // If the IHM does not resize the window we will need to adjust our offsets to avoid being occluded
        // The IHM does not cause a window resize to happen right away, set a timeout to check if the viewport
        // has been resized after enough time has passed for both the IHM animation, and scroll-into-view, to
        // complete.

        // If focus is in the AppBar, tell the platform we will move ourselves.
        if (this._dom.root.contains(<HTMLElement>_Global.document.activeElement)) {
            var inputPaneEvent = event.detail.originalEvent;
            inputPaneEvent.ensuredFocusedElementInView = true;
        }

        var duration = keyboardInfo._animationShowLength + keyboardInfo._scrollTimeout;
        // Returns a promise for unit tests to verify the correct behavior after the timeout.
        return Promise.timeout(duration).then(
            () => {
                if (this._shouldAdjustForShowingKeyboard() && !this._disposed) {
                    this._adjustedOffsets = this._computeAdjustedOffsets();
                    this._commandingSurface.deferredDomUpate();
                }
            });
    }

    private _shouldAdjustForShowingKeyboard(): boolean {
        // Overwriteable for unit tests

        // Determines if an AppBar needs to adjust its position to move in response to a shown IHM, or if it can
        // just ride the bottom of the visual viewport to remain visible. The latter requires that the IHM has
        // caused the viewport to resize.
        return keyboardInfo._visible && !keyboardInfo._isResized;
    }

    private _handleHidingKeyboard() {
        // Make sure AppBar has the correct offsets since it could have been displaced by the IHM.
        this._adjustedOffsets = this._computeAdjustedOffsets();
        this._commandingSurface.deferredDomUpate();
    }

    private _computeAdjustedOffsets() {
        // Position the AppBar element relative to the top or bottom edge of the visible
        // document.
        var offsets = { top: "", bottom: "" };

        if (this._placement === Placement.bottom) {
            // If the IHM is open, the bottom of the visual viewport may or may not be occluded
            offsets.bottom = keyboardInfo._visibleDocBottomOffset + "px";
        } else if (this._placement === Placement.top) {
            offsets.top = keyboardInfo._visibleDocTop + "px";
        }
        return offsets;
    }

    private _synchronousOpen(): void {
        this._isOpenedMode = true;
        this._updateDomImpl();
    }

    private _synchronousClose(): void {
        this._isOpenedMode = false;
        this._updateDomImpl();
    }

    // State private to the _updateDomImpl family of method. No other methods should make use of it.
    //
    // Nothing has been rendered yet so these are all initialized to undefined. Because
    // they are undefined, the first time _updateDomImpl is called, they will all be
    // rendered.
    private _updateDomImpl_renderedState = {
        isOpenedMode: <boolean>undefined,
        placement: <string>undefined,
        closedDisplayMode: <string>undefined,
        adjustedOffsets: { top: <string>undefined, bottom: <string>undefined },
    };
    private _updateDomImpl(): void {
        var rendered = this._updateDomImpl_renderedState;

        if (rendered.isOpenedMode !== this._isOpenedMode) {
            if (this._isOpenedMode) {
                this._updateDomImpl_renderOpened();
            } else {
                this._updateDomImpl_renderClosed();
            }
            rendered.isOpenedMode = this._isOpenedMode;
        }

        if (rendered.placement !== this.placement) {
            removeClass(this._dom.root, placementClassMap[rendered.placement]);
            addClass(this._dom.root, placementClassMap[this.placement]);
            rendered.placement = this.placement;
        }

        if (rendered.closedDisplayMode !== this.closedDisplayMode) {
            removeClass(this._dom.root, closedDisplayModeClassMap[rendered.closedDisplayMode]);
            addClass(this._dom.root, closedDisplayModeClassMap[this.closedDisplayMode]);
            rendered.closedDisplayMode = this.closedDisplayMode;
        }

        if (rendered.adjustedOffsets.top !== this._adjustedOffsets.top) {
            this._dom.root.style.top = this._adjustedOffsets.top;
            rendered.adjustedOffsets.top = this._adjustedOffsets.top;
        }
        if (rendered.adjustedOffsets.bottom !== this._adjustedOffsets.bottom) {
            this._dom.root.style.bottom = this._adjustedOffsets.bottom;
            rendered.adjustedOffsets.bottom = this._adjustedOffsets.bottom;
        }

        this._commandingSurface.updateDomImpl();
    }
    private _updateDomImpl_renderOpened(): void {
        addClass(this._dom.root, _Constants.ClassNames.openedClass);
        removeClass(this._dom.root, _Constants.ClassNames.closedClass);
        this._commandingSurface.synchronousOpen();
        _LightDismissService.shown(this._dismissable); // Call at the start of the open animation
    }
    private _updateDomImpl_renderClosed(): void {
        addClass(this._dom.root, _Constants.ClassNames.closedClass);
        removeClass(this._dom.root, _Constants.ClassNames.openedClass);
        this._commandingSurface.synchronousClose();
        _LightDismissService.hidden(this._dismissable); // Call after the close animation
    }
}

_Base.Class.mix(AppBar, _Events.createEventProperties(
    _Constants.EventNames.beforeOpen,
    _Constants.EventNames.afterOpen,
    _Constants.EventNames.beforeClose,
    _Constants.EventNames.afterClose));

// addEventListener, removeEventListener, dispatchEvent
_Base.Class.mix(AppBar, _Control.DOMEventMixin);
