// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../Core.d.ts" />
import Animations = require("../../Animations");
import _Base = require("../../Core/_Base");
import _BaseUtils = require("../../Core/_BaseUtils");
import BindingList = require("../../BindingList");
import ControlProcessor = require("../../ControlProcessor");
import _Constants = require("../ToolBar/_Constants");
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
import Menu = require("../../Controls/Menu");
import _MenuCommand = require("../Menu/_Command");
import Promise = require('../../Promise');
import _Resources = require("../../Core/_Resources");
import Scheduler = require("../../Scheduler");
import _OpenCloseMachine = require('../../Utilities/_OpenCloseMachine');
import _Signal = require('../../_Signal');
import _WriteProfilerMark = require("../../Core/_WriteProfilerMark");

require(["require-style!less/styles-toolbar"]);
require(["require-style!less/colors-toolbar"]);

"use strict";

var strings = {
    get ariaLabel() { return _Resources._getWinJSString("ui/toolbarAriaLabel").value; },
    get overflowButtonAriaLabel() { return _Resources._getWinJSString("ui/toolbarOverflowButtonAriaLabel").value; },
    get mustContainCommands() { return "The toolbar can only contain WinJS.UI.Command or WinJS.UI.AppBarCommand controls"; },
    get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; }
};

var ClosedDisplayMode = {
    /// <field locid="WinJS.UI.ToolBar.ClosedDisplayMode.compact" helpKeyword="WinJS.UI.ToolBar.ClosedDisplayMode.compact">
    /// When the ToolBar is closed, the height of the ToolBar is reduced such that button commands are still visible, but their labels are hidden.
    /// </field>
    compact: "compact",
    /// <field locid="WinJS.UI.ToolBar.ClosedDisplayMode.full" helpKeyword="WinJS.UI.ToolBar.ClosedDisplayMode.full">
    /// When the ToolBar is closed, the height of the ToolBar is always sized to content.
    /// </field>
    full: "full",
};

var closedDisplayModeClassMap = {};
closedDisplayModeClassMap[ClosedDisplayMode.compact] = _Constants.ClassNames.compactClass;
closedDisplayModeClassMap[ClosedDisplayMode.full] = _Constants.ClassNames.fullClass;

// Versions of add/removeClass that are no ops when called with falsy class names.
function addClass(element: HTMLElement, className: string): void {
    className && _ElementUtilities.addClass(element, className);
}
function removeClass(element: HTMLElement, className: string): void {
    className && _ElementUtilities.removeClass(element, className);
}

/// <field>
/// <summary locid="WinJS.UI.ToolBar">
/// Displays ICommands within the flow of the app. Use the ToolBar around other statically positioned app content.
/// </summary>
/// </field>
/// <icon src="ui_winjs.ui.toolbar.12x12.png" width="12" height="12" />
/// <icon src="ui_winjs.ui.toolbar.16x16.png" width="16" height="16" />
/// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.ToolBar">
/// <button data-win-control="WinJS.UI.Command" data-win-options="{id:'',label:'example',icon:'back',type:'button',onclick:null,section:'primary'}"></button>
/// </div>]]></htmlSnippet>
/// <part name="toolbar" class="win-toolbar" locid="WinJS.UI.ToolBar_part:toolbar">The entire ToolBar control.</part>
/// <part name="toolbar-overflowbutton" class="win-toolbar-overflowbutton" locid="WinJS.UI.ToolBar_part:ToolBar-overflowbutton">The toolbar overflow button.</part>
/// <part name="toolbar-overflowarea" class="win-toolbar-overflowarea" locid="WinJS.UI.ToolBar_part:ToolBar-overflowarea">The container for toolbar commands that overflow.</part>
/// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
/// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
export class ToolBar {
    private _id: string;
    private _disposed: boolean;
    private _commandingSurface: _ICommandingSurface._CommandingSurface;
    private _isOpenedMode: boolean;

    private _dom: {
        root: HTMLElement;
        commandingSurfaceEl: HTMLElement;
        placeHolder: HTMLElement;
    }

    /// <field locid="WinJS.UI.ToolBar.ClosedDisplayMode" helpKeyword="WinJS.UI.ToolBar.ClosedDisplayMode">
    /// Display options for the actionarea when the ToolBar is closed.
    /// </field>
    static ClosedDisplayMode = ClosedDisplayMode;

    static supportedForProcessing: boolean = true;

    /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.ToolBar.element" helpKeyword="WinJS.UI.ToolBar.element">
    /// Gets the DOM element that hosts the ToolBar.
    /// </field>
    get element() {
        return this._dom.root;
    }

    /// <field type="WinJS.Binding.List" locid="WinJS.UI.ToolBar.data" helpKeyword="WinJS.UI.ToolBar.data">
    /// Gets or sets the Binding List of WinJS.UI.Command for the ToolBar.
    /// </field>
    get data() {
        return this._commandingSurface.data;
    }
    set data(value: BindingList.List<_Command.ICommand>) {
        this._commandingSurface.data = value;
    }

    /// <field type="String" locid="WinJS.UI.ToolBar.closedDisplayMode" helpKeyword="WinJS.UI.ToolBar.closedDisplayMode">
    /// Gets or sets the closedDisplayMode for the ToolBar. Values are "compact" and "full".
    /// </field>
    get closedDisplayMode() {
        return this._commandingSurface.closedDisplayMode;
    }
    set closedDisplayMode(value: string) {
        if (ClosedDisplayMode[value]) {
            this._commandingSurface.closedDisplayMode = value;
        }
    }

    /// <field type="Boolean" hidden="true" locid="WinJS.UI.ToolBar.opened" helpKeyword="WinJS.UI.ToolBar.opened">
    /// Gets or sets whether the ToolBar is currently opened.
    /// </field>
    get opened(): boolean {
        return this._commandingSurface.opened;
    }
    set opened(value: boolean) {
        this._commandingSurface.opened = value;
    }

    constructor(element?: HTMLElement, options: any = {}) {
        /// <signature helpKeyword="WinJS.UI.ToolBar.ToolBar">
        /// <summary locid="WinJS.UI.ToolBar.constructor">
        /// Creates a new ToolBar control.
        /// </summary>
        /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.ToolBar.constructor_p:element">
        /// The DOM element that will host the control.
        /// </param>
        /// <param name="options" type="Object" locid="WinJS.UI.ToolBar.constructor_p:options">
        /// The set of properties and values to apply to the new ToolBar control.
        /// </param>
        /// <returns type="WinJS.UI.ToolBar" locid="WinJS.UI.ToolBar.constructor_returnValue">
        /// The new ToolBar control.
        /// </returns>
        /// </signature>

        this._writeProfilerMark("constructor,StartTM");

        // Check to make sure we weren't duplicated
        if (element && element["winControl"]) {
            throw new _ErrorFromName("WinJS.UI.ToolBar.DuplicateConstruction", strings.duplicateConstruction);
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
        // Initialize private state.
        this._disposed = false;
        this._commandingSurface = new _CommandingSurface._CommandingSurface(this._dom.commandingSurfaceEl, { openCloseMachine: stateMachine });
        addClass(<HTMLElement>this._dom.commandingSurfaceEl.querySelector(".win-commandingsurface-actionarea"), _Constants.ClassNames.actionAreaCssClass);
        addClass(<HTMLElement>this._dom.commandingSurfaceEl.querySelector(".win-commandingsurface-overflowarea"), _Constants.ClassNames.overflowAreaCssClass);
        addClass(<HTMLElement>this._dom.commandingSurfaceEl.querySelector(".win-commandingsurface-overflowbutton"), _Constants.ClassNames.overflowButtonCssClass);
        addClass(<HTMLElement>this._dom.commandingSurfaceEl.querySelector(".win-commandingsurface-ellipsis"), _Constants.ClassNames.ellipsisCssClass);
        this._isOpenedMode = _Constants.defaultOpened;

        // Initialize public properties.
        this.closedDisplayMode = _Constants.defaultClosedDisplayMode;
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

    /// <field type="Function" locid="WinJS.UI.ToolBar.onbeforeopen" helpKeyword="WinJS.UI.ToolBar.onbeforeopen">
    /// Occurs immediately before the control is opened. Is cancelable.
    /// </field>
    onbeforeopen: (ev: CustomEvent) => void;
    /// <field type="Function" locid="WinJS.UI.ToolBar.onafteropen" helpKeyword="WinJS.UI.ToolBar.onafteropen">
    /// Occurs immediately after the control is opened.
    /// </field>
    onafteropen: (ev: CustomEvent) => void;
    /// <field type="Function" locid="WinJS.UI.ToolBar.onbeforeclose" helpKeyword="WinJS.UI.ToolBar.onbeforeclose">
    /// Occurs immediately before the control is closed. Is cancelable.
    /// </field>
    onbeforeclose: (ev: CustomEvent) => void;
    /// <field type="Function" locid="WinJS.UI.ToolBar.onafterclose" helpKeyword="WinJS.UI.ToolBar.onafterclose">
    /// Occurs immediately after the control is closed.
    /// </field>
    onafterclose: (ev: CustomEvent) => void;

    open(): void {
        /// <signature helpKeyword="WinJS.UI.ToolBar.open">
        /// <summary locid="WinJS.UI.ToolBar.open">
        /// Opens the ToolBar
        /// </summary>
        /// </signature>
        this._commandingSurface.open();
    }

    close(): void {
        /// <signature helpKeyword="WinJS.UI.ToolBar.close">
        /// <summary locid="WinJS.UI.ToolBar.close">
        /// Closes the ToolBar
        /// </summary>
        /// </signature>
        this._commandingSurface.close();
    }

    dispose() {
        /// <signature helpKeyword="WinJS.UI.ToolBar.dispose">
        /// <summary locid="WinJS.UI.ToolBar.dispose">
        /// Disposes this ToolBar.
        /// </summary>
        /// </signature>
        if (this._disposed) {
            return;
        }

        this._disposed = true;
        // Disposing the _commandingSurface will trigger dispose on its OpenCloseMachine and synchronously complete any animations that might have been running.
        this._commandingSurface.dispose();
        // If page navigation is happening, we don't want to ToolBar left behind in the body.
        // Synchronoulsy close the ToolBar to force it out of the body and back into its parent element.
        this._synchronousClose();

        _Dispose.disposeSubTree(this.element);
    }

    forceLayout() {
        /// <signature helpKeyword="WinJS.UI.ToolBar.forceLayout">
        /// <summary locid="WinJS.UI.ToolBar.forceLayout">
        /// Forces the ToolBar to update its layout. Use this function when the window did not change size, but the container of the ToolBar changed size.
        /// </summary>
        /// </signature>
        this._commandingSurface.forceLayout();
    }

    private _writeProfilerMark(text: string) {
        _WriteProfilerMark("WinJS.UI.ToolBar:" + this._id + ":" + text);
    }

    private _initializeDom(root: HTMLElement): void {

        this._writeProfilerMark("_intializeDom,info");

        // Attaching JS control to DOM element
        root["winControl"] = this;

        this._id = root.id || _ElementUtilities._uniqueID(root);

        if (!root.hasAttribute("tabIndex")) {
            root.tabIndex = -1;
        }

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
        // The CommandingSurface constructor will parse child elements as AppBarCommands.
        var commandingSurfaceEl = document.createElement("DIV");
        _ElementUtilities._reparentChildren(root, commandingSurfaceEl);
        root.appendChild(commandingSurfaceEl);

        // While the ToolBar is open, it will place itself in the <body> so it can become a light dismissible
        // overlay. It leaves the placeHolder element behind as stand in at the ToolBar's original DOM location
        // to avoid reflowing surrounding app content and create the illusion that the ToolBar hasn't moved along
        // the x or y planes.
        var placeHolder = _Global.document.createElement("DIV");
        _ElementUtilities.addClass(placeHolder, _Constants.ClassNames.placeHolderCssClass);
        // If the ToolBar's original HTML parent node is disposed while the ToolBar is open and repositioned as 
        // a temporary child of the <body>, make sure that calling dispose on the placeHolder element will trigger 
        // dispose on the ToolBar as well.
        _Dispose.markDisposable(placeHolder, this.dispose.bind(this));

        this._dom = {
            root: root,
            commandingSurfaceEl: commandingSurfaceEl,
            placeHolder: placeHolder,
        };
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
        closedDisplayMode: <string>undefined,
        prevInlineWidth: <string>undefined,
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

        if (rendered.closedDisplayMode !== this.closedDisplayMode) {
            removeClass(this._dom.root, closedDisplayModeClassMap[rendered.closedDisplayMode]);
            addClass(this._dom.root, closedDisplayModeClassMap[this.closedDisplayMode]);
            rendered.closedDisplayMode = this.closedDisplayMode;
        }

        this._commandingSurface.updateDomImpl();
    }

    private _updateDomImpl_renderOpened(): void {

        // Measure closed state.
        this._updateDomImpl_renderedState.prevInlineWidth = this._dom.root.style.width;
        var closedBorderBox = this._dom.root.getBoundingClientRect();
        var closedContentWidth = _ElementUtilities._getPreciseContentWidth(this._dom.root);
        var closedContentHeight = _ElementUtilities._getPreciseContentHeight(this._dom.root);
        var closedStyle = getComputedStyle(this._dom.root);
        var closedPaddingTop = _ElementUtilities._convertToPrecisePixels(closedStyle.paddingTop);
        var closedBorderTop = _ElementUtilities._convertToPrecisePixels(closedStyle.borderTopWidth);
        var closedMargins = _ElementUtilities._getPreciseMargins(this._dom.root);
        var closedContentBoxTop = closedBorderBox.top + closedBorderTop + closedPaddingTop;
        var closedContentBoxBottom = closedContentBoxTop + closedContentHeight;

        // Size our placeHolder. Set height and width to match borderbox of the closed ToolBar.
        // Copy ToolBar margins to the placeholder.
        var placeHolder = this._dom.placeHolder;
        var placeHolderStyle = placeHolder.style;
        placeHolderStyle.width = closedBorderBox.width + "px";
        placeHolderStyle.height = closedBorderBox.height + "px";
        placeHolderStyle.marginTop = closedMargins.top + "px";
        placeHolderStyle.marginRight = closedMargins.right + "px";
        placeHolderStyle.marginBottom = closedMargins.bottom + "px";
        placeHolderStyle.marginLeft = closedMargins.left + "px";

        // Move ToolBar element to the body in preparation of becoming a light dismissible. Leave an equal sized placeHolder element 
        // at our original DOM location to avoid reflowing surrounding app content.
        this._dom.root.parentElement.insertBefore(placeHolder, this._dom.root);
        _Global.document.body.appendChild(this._dom.root);

        // Position the ToolBar to completely cover the same region as the placeholder element.
        this._dom.root.style.width = closedContentWidth + "px";
        this._dom.root.style.left = closedBorderBox.left - closedMargins.left + "px";

        // Determine which direction to expand the CommandingSurface elements when opened. The overflow area will be rendered at the corresponding edge of 
        // the ToolBar's content box, so we choose the direction that offers the most space between that edge and the corresponding edge of the viewport. 
        // This is to reduce the chance that the overflow area might clip through the edge of the viewport.
        var topOfViewport = 0;
        var bottomOfViewport = _Global.innerHeight;
        var distanceFromTop = closedContentBoxTop - topOfViewport;
        var distanceFromBottom = bottomOfViewport - closedContentBoxBottom;

        if (distanceFromTop > distanceFromBottom) {
            // CommandingSurface is going to expand updwards.
            this._commandingSurface.overflowDirection = _Constants.OverflowDirection.top;
            // Position the bottom edge of the ToolBar marginbox over the bottom edge of the placeholder marginbox.
            this._dom.root.style.bottom = (bottomOfViewport - closedBorderBox.bottom) - closedMargins.bottom + "px";
        } else {
            // CommandingSurface is going to expand downwards.
            this._commandingSurface.overflowDirection = _Constants.OverflowDirection.bottom;
            // Position the top edge of the ToolBar marginbox over the top edge of the placeholder marginbox.
            this._dom.root.style.top = (topOfViewport + closedBorderBox.top) - closedMargins.top + "px";
        }

        // Render opened state
        _ElementUtilities.addClass(this._dom.root, _Constants.ClassNames.openedClass);
        _ElementUtilities.removeClass(this._dom.root, _Constants.ClassNames.closedClass);
        this._commandingSurface.synchronousOpen();
    }

    private _updateDomImpl_renderClosed(): void {

        // Restore our placement in the DOM
        if (this._dom.placeHolder.parentElement) {
            var placeHolder = this._dom.placeHolder;
            placeHolder.parentElement.insertBefore(this._dom.root, placeHolder);
            placeHolder.parentElement.removeChild(placeHolder);
        }

        // Render Closed
        this._dom.root.style.top = "";
        this._dom.root.style.right = "";
        this._dom.root.style.bottom = "";
        this._dom.root.style.left = "";
        this._dom.root.style.width = this._updateDomImpl_renderedState.prevInlineWidth;
        _ElementUtilities.addClass(this._dom.root, _Constants.ClassNames.closedClass);
        _ElementUtilities.removeClass(this._dom.root, _Constants.ClassNames.openedClass);
        this._commandingSurface.synchronousClose();
    }
}

_Base.Class.mix(ToolBar, _Events.createEventProperties(
    _Constants.EventNames.beforeOpen,
    _Constants.EventNames.afterOpen,
    _Constants.EventNames.beforeClose,
    _Constants.EventNames.afterClose));

// addEventListener, removeEventListener, dispatchEvent
_Base.Class.mix(ToolBar, _Control.DOMEventMixin);
