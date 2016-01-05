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

require(["require-style!less/styles-toolbar"]);

"use strict";

// The WinJS ToolBar is a specialized UI wrapper for the private _CommandingSurface UI component. The _CommandingSurface is responsible for rendering 
// opened and closed states, knowing how to create the open and close animations, laying out commands, creating command hide/show animations and 
// keyboard navigation across commands. The WinJS ToolBar is very similar to the WinJS AppBar, however the ToolBar is meant to be positioned in line 
// with your app content whereas the AppBar is meant to overlay your app content.
//
// The responsibilities of the ToolBar include:
//
//    - Seamlessly hosting the _CommandingSurface
//        - From an end user perspective, there should be no visual distinction between where the ToolBar ends and the _CommandingSurface begins.
//            - ToolBar wants to rely on the _CommandingSurface to do as much of the rendering as possible. The ToolBar relies on the _CommandingSurface to render its opened 
//              and closed states-- which defines the overall height of the ToolBar and CommandingSurface elements. The ToolBar has no policy or CSS styles regarding its own 
//              height and ToolBar takes advantage of the default behavior of its DIV element which is to always grow or shrink to match the height of its content.
//        - From an end developer perspective, the _CommandingSurface should be abstracted as an implementation detail of the ToolBar as much as possible.
//            - Developers should never have to interact with the CommandingSurface directly.The ToolBar exposes the majority of _CommandingSurface functionality through its 
//              own APIs
//            - There are some  HTML elements inside of the _CommandingSurface's DOM that a developer might like to style. After the _CommandingSurface has been instantiated 
//              and added to the ToolBar DOM, the ToolBar will inject its own "toolbar" specific class-names onto these elements to make them more discoverable to developers.
//            - Example of developer styling guidelines https://msdn.microsoft.com/en-us/library/windows/apps/jj839733.asp
//
//    - Open direction:
//        - The ToolBar and its _CommandingSurface component can open upwards or downwards.Because there is no policy on where the ToolBar can be placed in an App, the ToolBar 
//          always wants to avoid opening in a direction that would cause any of its content to clip outside of the screen.
//        - When the ToolBar is opening, it will always choose to expand in the direction(up or down) that currently has the most available space between the edge of the 
//          ToolBar element and the corresponding edge of the visual viewport.
//        - This means that the a ToolBar near the bottom of the page will open upwards, but if the page is scrolled down such that the ToolBar is now near the top, the next
//          time the ToolBar is opened it will open downwards.
//
//    - Light dismiss
//        - The ToolBar is a light dismissible when opened. This means that the ToolBar is closed thru a variety of cues such as tapping anywhere outside of it, 
//          pressing the escape key, and resizing the window.ToolBar relies on the _LightDismissService component for most of this functionality.
//          The only pieces the ToolBar is responsible for are:
//            - Describing what happens when a light dismiss is triggered on the ToolBar .
//            - Describing how the ToolBar should take / restore focus when it becomes the topmost light dismissible in the light dismiss stack
//        - Debugging Tip: Light dismiss can make debugging an opened ToolBar tricky.A good idea is to temporarily suspend the light dismiss cue that triggers when clicking
//          outside of the current window.This can be achieved by executing the following code in the JavaScript console window: "WinJS.UI._LightDismissService._setDebug(true)"
//
//    - Inline element when closed, overlay when opened:
//        - The design of the toolbar called for it to be an control that developers can place inline with their other app content.When the ToolBar is closed it exists as a an
//          element in your app, next to other app content and take up space in the flow of the document.
//        - However, when the ToolBar opens, its vertical height will increase.Normally the change in height of an inline element will cause all of the other elements below the
//          expanding element to move out of the way.Rather than push the rest of the app content down when opening, the design of the ToolBar called for it to overlay that content other content, while still taking up the same vertical space in the document as it did when closed.
//        - The implementation of this feature is very complicated:
//            - The only way one element can overlay another is to remove it from the flow of the document and give it a new CSS positioning like "absolute" or "fixed".
//            - However, simply removing the ToolBar element from the document to make it an overlay, would leave behind a gap in the document that all the neighboring elements 
//              would try to fill by shifting over, leading to a jarring reflow of many elements whenever the ToolBar was opened.This was also undesirable
//            - The final solution is as follows
//                - Create a transparent placeholder element that is the exact same height and width as the closed ToolBar element.
//                - Removing the ToolBar element from its place in the document while simultaneously inserting the placeholder element into the same spot the ToolBar element was 
//                  just removed from.
//                - Inserting the ToolBar element as a direct child of the body and giving it css position: fixed; 
//                  We insert it directly into the body element because while opened, ToolBar is a Light dismissible overlay and is subject to the same stacking context pitfalls 
//                  as any other light dismissible. https://github.com/winjs/winjs/wiki/Dismissables-and-Stacking-Contexts
//                - Reposition the ToolBar element to be exactly overlaid on top of the placeholder element.
//                - Render the ToolBar as opened, via the _CommandingSurface API, increasing the overall height of the ToolBar.
//            - Closing the ToolBar is basically the same steps but in reverse.
//        - One limitation to this implementation is that developers may not position the ToolBar element themselves directly via the CSS "position" or "float" properties.
//            - This is because The ToolBar expects its element to be in the flow of the document when closed, and the placeholder element would not receive these same styles
//              when inserted to replace the ToolBar element.
//            - An easy workaround for developers is to wrap the ToolBar into another DIV element that they may style and position however they'd like.
//
//        - Responding to the IHM:
//            - If the ToolBar is opened when the IHM is shown, it will close itself.This is to avoid scenarios where the IHM totally occludes the opened ToolBar. If the ToolBar 
//              did not close itself, then the next mouse or touch input within the App wouldn't appear to do anything since it would just go to closing the light dismissible 
//              ToolBar anyway.

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
    private _handleShowingKeyboardBound: (ev: any) => void;
    private _dismissable: _LightDismissService.LightDismissableElement;
    private _cachedClosedHeight: number;

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
            this._cachedClosedHeight = null;
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
                var openAnimation = this._commandingSurface.createOpenAnimation(this._getClosedHeight());
                this._synchronousOpen();
                return openAnimation.execute();
            },
            onClose: () => {
                var closeAnimation = this._commandingSurface.createCloseAnimation(this._getClosedHeight());
                return closeAnimation.execute().then(() => {
                    this._synchronousClose();
                });
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
        _ElementUtilities._inputPaneListener.addEventListener(this._dom.root, "showing", this._handleShowingKeyboardBound);

        // Initialize private state.
        this._disposed = false;
        this._cachedClosedHeight = null;
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
            },
            onTakeFocus: (useSetActive) => {
                this._dismissable.restoreFocus() ||
                this._commandingSurface.takeFocus(useSetActive);
            }
        });

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
        _LightDismissService.hidden(this._dismissable);
        // Disposing the _commandingSurface will trigger dispose on its OpenCloseMachine and synchronously complete any animations that might have been running.
        this._commandingSurface.dispose();
        // If page navigation is happening, we don't want the ToolBar left behind in the body.
        // Synchronoulsy close the ToolBar to force it out of the body and back into its parent element.
        this._synchronousClose();

        _ElementUtilities._inputPaneListener.removeEventListener(this._dom.root, "showing", this._handleShowingKeyboardBound);

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

    getCommandById(id: string): _Command.ICommand {
        /// <signature helpKeyword="WinJS.UI.ToolBar.getCommandById">
        /// <summary locid="WinJS.UI.ToolBar.getCommandById">
        /// Retrieves the command with the specified ID from this ToolBar.
        /// If more than one command is found, this method returns the first command found.
        /// </summary>
        /// <param name="id" type="String" locid="WinJS.UI.ToolBar.getCommandById_p:id">Id of the command to return.</param>
        /// <returns type="object" locid="WinJS.UI.ToolBar.getCommandById_returnValue">
        /// The command found, or null if no command is found.
        /// </returns>
        /// </signature>
        return this._commandingSurface.getCommandById(id);
    }

    showOnlyCommands(commands: Array<string|_Command.ICommand>): void {
        /// <signature helpKeyword="WinJS.UI.ToolBar.showOnlyCommands">
        /// <summary locid="WinJS.UI.ToolBar.showOnlyCommands">
        /// Show the specified commands, hiding all of the others in the ToolBar.
        /// </summary>
        /// <param name="commands" type="Array" locid="WinJS.UI.ToolBar.showOnlyCommands_p:commands">
        /// An array of the commands to show. The array elements may be Command objects, or the string identifiers (IDs) of commands.
        /// </param>
        /// </signature>
        return this._commandingSurface.showOnlyCommands(commands);
    }

    private _writeProfilerMark(text: string) {
        _WriteProfilerMark("WinJS.UI.ToolBar:" + this._id + ":" + text);
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

    private _handleShowingKeyboard(event: { detail: { originalEvent: _WinRT.Windows.UI.ViewManagement.InputPaneVisibilityEventArgs } }) {
        // Because the ToolBar takes up layout space and is not an overlay, it doesn't have the same expectation 
        // to move itself to get out of the way of a showing IHM. Instsead we just close the ToolBar to avoid 
        // scenarios where the ToolBar is occluded, but the click-eating-div is still present since it may seem 
        // strange to end users that an occluded ToolBar (out of sight, out of mind) is still eating their first 
        // click.

        // Mitigation:
        // Because (1) custom content in a ToolBar can only be included as a 'content' type command, because (2)
        // the ToolBar only supports closedDisplayModes 'compact' and 'full', and because (3) 'content' type
        // commands in the overflowarea use a separate contentflyout to display their contents:
        // Interactable custom content contained within the ToolBar actionarea or overflowarea, will remain
        // visible and interactable even when showing the IHM closes the ToolBar.
        this.close();
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

        this._commandingSurface.updateDom();
    }

    private _getClosedHeight(): number {
        if (this._cachedClosedHeight === null) {
            var wasOpen = this._isOpenedMode;
            if (this._isOpenedMode) {
                this._synchronousClose();
            }
            this._cachedClosedHeight = this._commandingSurface.getBoundingRects().commandingSurface.height;
            if (wasOpen) {
                this._synchronousOpen();
            }
        }

        return this._cachedClosedHeight;
    }

    private _updateDomImpl_renderOpened(): void {

        // Measure closed state.
        this._updateDomImpl_renderedState.prevInlineWidth = this._dom.root.style.width;
        var closedBorderBox = this._dom.root.getBoundingClientRect();
        var closedContentWidth = _ElementUtilities._getPreciseContentWidth(this._dom.root);
        var closedContentHeight = _ElementUtilities._getPreciseContentHeight(this._dom.root);
        var closedStyle = _ElementUtilities._getComputedStyle(this._dom.root);
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

        _ElementUtilities._maintainFocus(() => {
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

        });

        this._commandingSurface.synchronousOpen();
        _LightDismissService.shown(this._dismissable); // Call at the start of the open animation
    }

    private _updateDomImpl_renderClosed(): void {

        _ElementUtilities._maintainFocus(() => {
            if (this._dom.placeHolder.parentElement) {
                // Restore our placement in the DOM
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
        });

        this._commandingSurface.synchronousClose();
        _LightDismissService.hidden(this._dismissable); // Call after the close animation
    }
}

_Base.Class.mix(ToolBar, _Events.createEventProperties(
    _Constants.EventNames.beforeOpen,
    _Constants.EventNames.afterOpen,
    _Constants.EventNames.beforeClose,
    _Constants.EventNames.afterClose));

// addEventListener, removeEventListener, dispatchEvent
_Base.Class.mix(ToolBar, _Control.DOMEventMixin);
