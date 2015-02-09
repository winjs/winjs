// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="../../Core.d.ts" />
import Animations = require("../../Animations");
import _Base = require("../../Core/_Base");
import _BaseUtils = require("../../Core/_BaseUtils");
import BindingList = require("../../BindingList");
import ControlProcessor = require("../../ControlProcessor");
import _Constants = require("../ToolBar/_Constants");
import _Command = require("../AppBar/_Command");
import _Control = require("../../Utilities/_Control");
import _Dispose = require("../../Utilities/_Dispose");
import _ElementUtilities = require("../../Utilities/_ElementUtilities");
import _ErrorFromName = require("../../Core/_ErrorFromName");
import _Flyout = require("../../Controls/Flyout");
import _Global = require("../../Core/_Global");
import _Hoverable = require("../../Utilities/_Hoverable");
import _KeyboardBehavior = require("../../Utilities/_KeyboardBehavior");
import Menu = require("../../Controls/Menu");
import _MenuCommand = require("../Menu/_Command");
import _Resources = require("../../Core/_Resources");
import Scheduler = require("../../Scheduler");
import _ToolBarMenuCommand = require("../ToolBar/_MenuCommand");
import _WriteProfilerMark = require("../../Core/_WriteProfilerMark");

require(["require-style!less/styles-toolbar"]);
require(["require-style!less/colors-toolbar"]);

"use strict";

interface ICommandInfo {
    command: _Command.ICommand;
    width: number;
    priority: number;
}

interface ICommandWithType {
    element: HTMLElement;
    type: string;
}

interface IFocusableElementsInfo {
    elements: HTMLElement[];
    focusedIndex: number;
}

interface IDataChangeInfo {
    newElements: HTMLElement[];
    currentElements: HTMLElement[];
    added: HTMLElement[];
    deleted: HTMLElement[];
    affected: HTMLElement[];
}

var strings = {
    get ariaLabel() { return _Resources._getWinJSString("ui/toolbarAriaLabel").value; },
    get overflowButtonAriaLabel() { return _Resources._getWinJSString("ui/toolbarOverflowButtonAriaLabel").value; },
    get badData() { return "Invalid argument: The data property must an instance of a WinJS.Binding.List"; },
    get mustContainCommands() { return "The toolbar can only contain WinJS.UI.Command or WinJS.UI.AppBarCommand controls"; }
};

/// <field>
/// <summary locid="WinJS.UI.ToolBar">
/// Represents a toolbar for displaying commands.
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
    private _overflowButton: HTMLButtonElement;
    private _spacer: HTMLDivElement;
    private _separatorWidth: number;
    private _standardCommandWidth: number;
    private _overflowButtonWidth: number;
    private _menu: Menu.Menu;
    private _element: HTMLElement;
    private _data: BindingList.List<_Command.ICommand>;
    private _primaryCommands: _Command.ICommand[];
    private _secondaryCommands: _Command.ICommand[];
    private _customContentContainer: HTMLElement;
    private _mainActionArea: HTMLElement;
    private _customContentFlyout: _Flyout.Flyout;
    private _chosenCommand: _Command.ICommand;
    private _measured = false;
    private _customContentCommandsWidth: { [uniqueID: string]: number };
    private _initializing = true;
    private _hoverable = _Hoverable.isHoverable; /* force dependency on hoverable module */
    private _winKeyboard: _KeyboardBehavior._WinKeyboard;
    private _refreshPending: boolean;
    private _refreshBound: Function;
    private _resizeHandlerBound: (ev: any) => any;
    private _dataChangedEvents = ["itemchanged", "iteminserted", "itemmoved", "itemremoved", "reload"];
    private _extraClass: string;

    /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.ToolBar.element" helpKeyword="WinJS.UI.ToolBar.element">
    /// Gets the DOM element that hosts the ToolBar.
    /// </field>
    get element() {
        return this._element;
    }

    /// <field type="String" locid="WinJS.UI.ToolBar.extraClass" helpKeyword="WinJS.UI.ToolBar.extraClass">
    /// Gets or sets the extra CSS class that is applied to the host DOM element, and the corresponding
    /// overflow menu created by the ToolBar.
    /// </field>
    get extraClass() {
        return this._extraClass;
    }
    set extraClass(value: string) {
        this._writeProfilerMark("set_extraClass,info");

        if (this._extraClass) {
            _ElementUtilities.removeClass(this._element, this._extraClass);
            this._menu && _ElementUtilities.removeClass(this._menu.element, this._extraClass);
        }

        this._extraClass = value;
        _ElementUtilities.addClass(this._element, this._extraClass);
        this._menu && _ElementUtilities.addClass(this._menu.element, this.extraClass);
    }

    /// <field type="WinJS.Binding.List" locid="WinJS.UI.ToolBar.data" helpKeyword="WinJS.UI.ToolBar.data">
    /// Gets or sets the Binding List of WinJS.UI.Command for the ToolBar.
    /// </field>
    get data() {
        return this._data;
    }
    set data(value: BindingList.List<_Command.ICommand>) {
        this._writeProfilerMark("set_data,info");

        if (value === this.data) {
            return;
        }
        if (!(value instanceof BindingList.List)) {
            throw new _ErrorFromName("WinJS.UI.ToolBar.BadData", strings.badData);
        }

        if (this._data) {
            this._removeDataListeners();
        }
        this._data = value;
        this._addDataListeners();
        this._dataUpdated();
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

        // Make sure there's an element
        this._element = element || _Global.document.createElement("div");

        // Attaching JS control to DOM element
        this._element["winControl"] = this;

        this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
        this._writeProfilerMark("constructor,StartTM");

        if (!this._element.hasAttribute("tabIndex")) {
            this._element.tabIndex = -1;
        }

        // Attach our css class.
        _ElementUtilities.addClass(this._element, _Constants.controlCssClass);

        this._disposed = false;
        _ElementUtilities.addClass(this._element, "win-disposable");

        // Make sure we have an ARIA role
        var role = this._element.getAttribute("role");
        if (!role) {
            this._element.setAttribute("role", "menubar");
        }

        var label = this._element.getAttribute("aria-label");
        if (!label) {
            this._element.setAttribute("aria-label", strings.ariaLabel);
        }

        this._customContentCommandsWidth = {};
        this._separatorWidth = 0;
        this._standardCommandWidth = 0;

        this._refreshBound = this._refresh.bind(this);

        this._setupTree();

        if (!options.data) {
            // Shallow copy object so we can modify it.
            options = _BaseUtils._shallowCopy(options);

            // Set default
            options.data = options.data || this._getDataFromDOMElements();
        }

        _Control.setOptions(this, options);

        this._resizeHandlerBound = this._resizeHandler.bind(this);
        _ElementUtilities._resizeNotifier.subscribe(this._element, this._resizeHandlerBound);

        var initiallyParented = _Global.document.body.contains(this._element);
        _ElementUtilities._addInsertedNotifier(this._element);
        if (initiallyParented) {
            this._measureCommands();
            this._positionCommands();
        } else {
            var nodeInsertedHandler = () => {
                this._writeProfilerMark("_setupTree_WinJSNodeInserted:initiallyParented:" + initiallyParented + ",info");
                this._element.removeEventListener("WinJSNodeInserted", nodeInsertedHandler, false);
                this._measureCommands();
                this._positionCommands();
            };
            this._element.addEventListener("WinJSNodeInserted", nodeInsertedHandler, false);
        }

        this.element.addEventListener('keydown', this._keyDownHandler.bind(this));
        this._winKeyboard = new _KeyboardBehavior._WinKeyboard(this.element);

        this._initializing = false;

        this._writeProfilerMark("constructor,StopTM");

        return this;
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

        _ElementUtilities._resizeNotifier.unsubscribe(this._element, this._resizeHandlerBound);

        if (this._customContentFlyout) {
            this._customContentFlyout.dispose();
            this._customContentFlyout.element.parentNode.removeChild(this._customContentFlyout.element);
        }

        if (this._menu) {
            this._menu.dispose();
            this._menu.element.parentNode.removeChild(this._menu.element);
        }

        _Dispose.disposeSubTree(this.element);
        this._disposed = true;
    }

    forceLayout() {
        /// <signature helpKeyword="WinJS.UI.ToolBar.forceLayout">
        /// <summary locid="WinJS.UI.ToolBar.forceLayout">
        /// Forces the ToolBar to update its layout. Use this function when the window did not change size, but the container of the ToolBar changed size.
        /// </summary>
        /// </signature>
        this._measureCommands();
        this._positionCommands();
    }

    private _writeProfilerMark(text: string) {
        _WriteProfilerMark("WinJS.UI.ToolBar:" + this._id + ":" + text);
    }

    private _setupTree() {
        this._writeProfilerMark("_setupTree,info");

        this._primaryCommands = [];
        this._secondaryCommands = [];

        this._mainActionArea = _Global.document.createElement("div");
        _ElementUtilities.addClass(this._mainActionArea, _Constants.actionAreaCssClass);
        _ElementUtilities._reparentChildren(this.element, this._mainActionArea);
        this.element.appendChild(this._mainActionArea);

        this._spacer = _Global.document.createElement("div");
        _ElementUtilities.addClass(this._spacer, _Constants.spacerCssClass);
        this._mainActionArea.appendChild(this._spacer);

        this._overflowButton = _Global.document.createElement("button");
        this._overflowButton.tabIndex = 0;
        this._overflowButton.innerHTML = "<span class='" + _Constants.ellipsisCssClass + "'></span>";
        _ElementUtilities.addClass(this._overflowButton, _Constants.overflowButtonCssClass);
        this._mainActionArea.appendChild(this._overflowButton);
        this._overflowButton.addEventListener("click", () => {
            if (this._menu) {
                var isRTL = _Global.getComputedStyle(this._element).direction === 'rtl';
                this._menu.show(this._overflowButton, "autovertical", isRTL ? "left" : "right");
            }
        });
        this._overflowButtonWidth = _ElementUtilities.getTotalWidth(this._overflowButton);
    }

    private _getFocusableElementsInfo(): IFocusableElementsInfo {
        var focusableCommandsInfo: IFocusableElementsInfo = {
            elements: [],
            focusedIndex: -1
        };
        var elementsInReach = Array.prototype.slice.call(this._mainActionArea.children);
        elementsInReach.forEach((element: HTMLElement) => {
            if (this._isElementFocusable(element)) {
                focusableCommandsInfo.elements.push(element);
                if (element.contains(<HTMLElement>_Global.document.activeElement)) {
                    focusableCommandsInfo.focusedIndex = focusableCommandsInfo.elements.length - 1;
                }
            }
        });

        return focusableCommandsInfo;
    }

    private _dataUpdated() {
        this._writeProfilerMark("_dataUpdated,info");

        var changeInfo = this._getDataChangeInfo();

        // Take a snapshot of the current state
        var updateCommandAnimation = Animations._createUpdateListAnimation(changeInfo.added, changeInfo.deleted, changeInfo.affected);

        // Remove current elements
        changeInfo.currentElements.forEach((element) => {
            if (element.parentElement) {
                element.parentElement.removeChild(element);
            }
        });

        // Add new elements in the right order.
        changeInfo.newElements.forEach((element) => {
            this._mainActionArea.appendChild(element);
        });

        if (this._overflowButton) {
            // Ensure that the overflow button is the last element in the main action area
            this._mainActionArea.appendChild(this._overflowButton);
        }

        this._primaryCommands = [];
        this._secondaryCommands = [];

        if (this.data.length > 0) {
            _ElementUtilities.removeClass(this.element, _Constants.emptyToolBarCssClass);
            this.data.forEach((command) => {
                if (command.section === "secondary") {
                    this._secondaryCommands.push(command);
                } else {
                    this._primaryCommands.push(command);
                }
            });

            if (!this._initializing) {
                this._measureCommands();
                this._positionCommands();
            }
        } else {
            this._setupOverflowArea([]);
            _ElementUtilities.addClass(this.element, _Constants.emptyToolBarCssClass);
        }

        // Execute the animation.
        updateCommandAnimation.execute();
    }

    private _getDataChangeInfo(): IDataChangeInfo {
        var i = 0, len = 0;
        var added: HTMLElement[] = [];
        var deleted: HTMLElement[] = [];
        var affected: HTMLElement[] = [];

        var currentShown: HTMLElement[] = [];
        var currentElements = Array.prototype.map.call(this._mainActionArea.querySelectorAll(".win-command"), (commandElement: HTMLElement) => {
            if (commandElement.style.display !== "none") {
                currentShown.push(commandElement);
            }
            return commandElement;
        });

        var newShown: HTMLElement[] = [];
        var newHidden: HTMLElement[] = [];
        var newElements = this.data.map((command) => {
            if (command.element.style.display !== "none") {
                newShown.push(command.element);
            } else {
                newHidden.push(command.element);
            }
            return command.element;
        });
        
        deleted = ToolBar._diffElements(currentShown, newShown);
        affected = ToolBar._diffElements(currentShown, deleted);
        // Pad "added" with the elements from newHidden to ensure that we continue to animate
        // part any commands elements that have underflowed back into the action area as a
        // of this data change.
        added = ToolBar._diffElements(newShown, currentShown).concat(newHidden);

        return {
            newElements: newElements,
            currentElements: currentElements,
            added: added,
            deleted: deleted,
            affected: affected,
        };
    }

    //private _diffElements(LHS: Array<HTMLElement>, RHS: Array<HTMLElement>): Array<HTMLElement> {
    //    return LHS.filter((commandElement) => { return RHS.indexOf(commandElement) < 0 })
    //}

    private _refresh() {
        if (!this._refreshPending) {
            this._refreshPending = true;

            // Batch calls to _dataUpdated
            Scheduler.schedule(() => {
                if (this._refreshPending && !this._disposed) {
                    this._dataUpdated();
                    this._refreshPending = false;
                }
            }, Scheduler.Priority.high, null, "WinJS.UI.ToolBar._refresh");
        }
    }

    private _addDataListeners() {
        this._dataChangedEvents.forEach((eventName) => {
            this._data.addEventListener(eventName, this._refreshBound, false);
        });
    }

    private _removeDataListeners() {
        this._dataChangedEvents.forEach((eventName) => {
            this._data.removeEventListener(eventName, this._refreshBound, false);
        });
    }

    private _isElementFocusable(element: HTMLElement): boolean {
        var focusable = false;
        if (element) {
            var command = element["winControl"];
            if (command) {
                focusable = command.element.style.display !== "none" &&
                command.type !== _Constants.typeSeparator &&
                !command.hidden &&
                !command.disabled &&
                (!command.firstElementFocus || command.firstElementFocus.tabIndex >= 0 || command.lastElementFocus.tabIndex >= 0);
            } else {
                // e.g. the overflow button
                focusable = element.style.display !== "none" &&
                getComputedStyle(element).visibility !== "hidden" &&
                element.tabIndex >= 0;
            }
        }
        return focusable;
    }

    private _isMainActionCommand(element: HTMLElement) {
        // Returns true if the element is a command in the main action area, false otherwise
        return element && element["winControl"] && element.parentElement === this._mainActionArea;
    }

    private _getLastElementFocus(element: HTMLElement) {
        if (this._isMainActionCommand(element)) {
            // Only commands in the main action area support lastElementFocus
            return element["winControl"].lastElementFocus;
        } else {
            return element;
        }
    }

    private _getFirstElementFocus(element: HTMLElement) {
        if (this._isMainActionCommand(element)) {
            // Only commands in the main action area support firstElementFocus
            return element["winControl"].firstElementFocus;
        } else {
            return element;
        }
    }

    private _keyDownHandler(ev: any) {
        if (!ev.altKey) {
            if (_ElementUtilities._matchesSelector(ev.target, ".win-interactive, .win-interactive *")) {
                return;
            }
            var Key = _ElementUtilities.Key;
            var rtl = _Global.getComputedStyle(this._element).direction === "rtl";
            var focusableElementsInfo = this._getFocusableElementsInfo();
            var targetCommand: HTMLElement;

            if (focusableElementsInfo.elements.length) {
                switch (ev.keyCode) {
                    case (rtl ? Key.rightArrow : Key.leftArrow):
                    case Key.upArrow:
                        var index = Math.max(0, focusableElementsInfo.focusedIndex - 1);
                        targetCommand = this._getLastElementFocus(focusableElementsInfo.elements[index % focusableElementsInfo.elements.length]);
                        break;

                    case (rtl ? Key.leftArrow : Key.rightArrow):
                    case Key.downArrow:
                        var index = Math.min(focusableElementsInfo.focusedIndex + 1, focusableElementsInfo.elements.length - 1);
                        targetCommand = this._getFirstElementFocus(focusableElementsInfo.elements[index]);
                        break;

                    case Key.home:
                        var index = 0;
                        targetCommand = this._getFirstElementFocus(focusableElementsInfo.elements[index]);
                        break;

                    case Key.end:
                        var index = focusableElementsInfo.elements.length - 1;
                        if (this._isElementFocusable(this._overflowButton)) {
                            // The end key goes to the last command, not the overflow button,
                            // which is the last element when it is visible.
                            index = Math.max(0, index - 1);
                        }
                        targetCommand = this._getLastElementFocus(focusableElementsInfo.elements[index]);
                        break;
                }
            }

            if (targetCommand && targetCommand !== _Global.document.activeElement) {
                targetCommand.focus();
                ev.preventDefault();
            }
        }
    }

    private _getDataFromDOMElements(): BindingList.List<_Command.ICommand> {
        this._writeProfilerMark("_getDataFromDOMElements,info");

        ControlProcessor.processAll(this._mainActionArea, /*skip root*/ true);

        var commands: _Command.ICommand[] = [];
        var childrenLength = this._mainActionArea.children.length;
        var child: Element;
        for (var i = 0; i < childrenLength; i++) {
            child = this._mainActionArea.children[i];
            if (child["winControl"] && child["winControl"] instanceof _Command.AppBarCommand) {
                commands.push(child["winControl"]);
            } else if (!this._overflowButton) {
                throw new _ErrorFromName("WinJS.UI.ToolBar.MustContainCommands", strings.mustContainCommands);
            }
        }
        return new BindingList.List(commands);
    }

    private _resizeHandler() {
        if (this.element.offsetWidth > 0) {
            this._measureCommands(/* skipIfMeasured: */ true);
            this._positionCommands();
        }
    }

    private _commandUniqueId(command: _Command.ICommand): string {
        return _ElementUtilities._uniqueID(command.element);
    }

    private _getCommandsInfo(): ICommandInfo[] {
        var width = 0;
        var commands: ICommandInfo[] = [];
        var priority = 0;
        var currentAssignedPriority = 0;

        for (var i = this._primaryCommands.length - 1; i >= 0; i--) {
            var command = this._primaryCommands[i];
            if (command.priority === undefined) {
                priority = currentAssignedPriority--;
            } else {
                priority = command.priority;
            }
            width = (command.element.style.display === "none" ? 0 : this._getCommandWidth(command));

            commands.unshift({
                command: command,
                width: width,
                priority: priority
            });
        }

        return commands;
    }

    private _getPrimaryCommandsLocation(mainActionWidth: number) {
        this._writeProfilerMark("_getCommandsLocation,info");

        var mainActionCommands: _Command.ICommand[] = [];
        var overflowCommands: _Command.ICommand[] = [];
        var spaceLeft = mainActionWidth;
        var overflowButtonSpace = 0;
        var hasSecondaryCommands = this._secondaryCommands.length > 0;

        var commandsInfo = this._getCommandsInfo();
        var sortedCommandsInfo = commandsInfo.slice(0).sort((commandInfo1: ICommandInfo, commandInfo2: ICommandInfo) => {
            return commandInfo1.priority - commandInfo2.priority;
        });

        var maxPriority = Number.MAX_VALUE;
        var availableWidth = mainActionWidth;

        for (var i = 0, len = sortedCommandsInfo.length; i < len; i++) {
            availableWidth -= sortedCommandsInfo[i].width;

            // The overflow button needs space if there are secondary commands, or we are not evaluating the last command.
            overflowButtonSpace = (hasSecondaryCommands || (i < len - 1) ? this._overflowButtonWidth : 0)

            if (availableWidth - overflowButtonSpace < 0) {
                maxPriority = sortedCommandsInfo[i].priority - 1;
                break;
            }
        }

        commandsInfo.forEach((commandInfo) => {
            if (commandInfo.priority <= maxPriority) {
                mainActionCommands.push(commandInfo.command);
            } else {
                overflowCommands.push(commandInfo.command);
            }
        });

        return {
            mainArea: mainActionCommands,
            overflowArea: overflowCommands
        }
    }

    private _getCommandWidth(command: _Command.ICommand): number {
        if (command.type === _Constants.typeContent) {
            return this._customContentCommandsWidth[this._commandUniqueId(command)];
        } else if (command.type === _Constants.typeSeparator) {
            return this._separatorWidth;
        } else {
            return this._standardCommandWidth;
        }
    }

    private _measureCommands(skipIfMeasured: boolean = false) {
        this._writeProfilerMark("_measureCommands,info");

        if (this._disposed || !_Global.document.body.contains(this._element) || this.element.offsetWidth === 0) {
            return;
        }

        if (!skipIfMeasured) {
            this._customContentCommandsWidth = {};
            this._separatorWidth = 0;
            this._standardCommandWidth = 0;
        }
        this._primaryCommands.forEach((command) => {
            if (!command.element.parentElement) {
                this._mainActionArea.appendChild(command.element);
            }

            // Ensure that the element we are measuring does not have display: none (e.g. it was just added, and it
            // will be animated in)
            var originalDisplayStyle = command.element.style.display;
            command.element.style.display = "";

            if (command.type === _Constants.typeContent && !this._customContentCommandsWidth[this._commandUniqueId(command)]) {
                this._customContentCommandsWidth[this._commandUniqueId(command)] = _ElementUtilities.getTotalWidth(command.element);
            } else if (command.type === _Constants.typeSeparator) {
                if (!this._separatorWidth) {
                    this._separatorWidth = _ElementUtilities.getTotalWidth(command.element);
                }
            } else {
                // Button, toggle, flyout command types have the same width
                if (!this._standardCommandWidth) {
                    this._standardCommandWidth = _ElementUtilities.getTotalWidth(command.element);
                }
            }

            // Restore the original display style
            command.element.style.display = originalDisplayStyle;
        });

        if (this._overflowButton && !this._overflowButtonWidth) {
            this._overflowButtonWidth = _ElementUtilities.getTotalWidth(this._overflowButton);
        }

        this._measured = true;
    }

    private _positionCommands() {
        this._writeProfilerMark("_positionCommands,StartTM");

        if (this._disposed || !this._measured) {
            this._writeProfilerMark("_positionCommands,StopTM");
            return;
        }

        if (this._overflowButton) {
            // Ensure that the overflow button is the last element in the main action area
            this._mainActionArea.appendChild(this._overflowButton);
        }

        this._primaryCommands.forEach((command) => {
            command.element.style.display = (command.hidden ? "none" : "");
        })

        var mainActionWidth = _ElementUtilities.getContentWidth(this.element);

        var commandsLocation = this._getPrimaryCommandsLocation(mainActionWidth);

        this._hideSeparatorsIfNeeded(commandsLocation.mainArea);

        // Primary commands that will be mirrored in the overflow area should be hidden so
        // that they are not visible in the main action area.
        commandsLocation.overflowArea.forEach((command) => {
            command.element.style.display = "none";
        });

        // The secondary commands in the the main action area should be hidden since they are always
        // mirrored as new elements in the overflow area.
        this._secondaryCommands.forEach((command) => {
            command.element.style.display = "none";
        });

        this._setupOverflowArea(commandsLocation.overflowArea);

        this._writeProfilerMark("_positionCommands,StopTM");
    }

    private _getMenuCommand(command: _Command.ICommand): _MenuCommand.MenuCommand {
        var menuCommand = new _ToolBarMenuCommand._MenuCommand(null, {
            label: command.label,
            type: (command.type === _Constants.typeContent ? _Constants.typeFlyout : command.type) || _Constants.typeButton,
            disabled: command.disabled,
            flyout: command.flyout,
            beforeInvoke: () => {
                // Save the command that was selected
                this._chosenCommand = <_Command.ICommand>(menuCommand["_originalToolBarCommand"]);

                // If this WinJS.UI.MenuCommand has type: toggle, we should also toggle the value of the original WinJS.UI.Command
                if (this._chosenCommand.type === _Constants.typeToggle) {
                    this._chosenCommand.selected = !this._chosenCommand.selected;
                }
            }
        });

        if (command.selected) {
            menuCommand.selected = true;
        }

        if (command.extraClass) {
            menuCommand.extraClass = command.extraClass;
        }

        if (command.type === _Constants.typeContent) {
            if (!menuCommand.label) {
                menuCommand.label = _Constants.contentMenuCommandDefaultLabel;
            }
            menuCommand.flyout = this._customContentFlyout;
        } else {
            menuCommand.onclick = command.onclick;
        }
        menuCommand["_originalToolBarCommand"] = command;
        return menuCommand;
    }

    private _setupOverflowArea(additionalCommands: any[]) {
        this._writeProfilerMark("_setupOverflowArea,info");

        // Set up custom flyout for "content" typed commands in the overflow area.
        var isCustomContent = (command: _Command.ICommand) => { return command.type === _Constants.typeContent };
        var hasCustomContent = additionalCommands.some(isCustomContent) || this._secondaryCommands.some(isCustomContent);

        if (hasCustomContent && !this._customContentFlyout) {
            var mainFlyout = _Global.document.createElement("div");
            this._customContentContainer = _Global.document.createElement("div");
            _ElementUtilities.addClass(this._customContentContainer, _Constants.overflowContentFlyoutCssClass);
            mainFlyout.appendChild(this._customContentContainer);
            this._customContentFlyout = new _Flyout.Flyout(mainFlyout);
            _Global.document.body.appendChild(this._customContentFlyout.element);
            this._customContentFlyout.onbeforeshow = () => {
                _ElementUtilities.empty(this._customContentContainer);
                _ElementUtilities._reparentChildren(this._chosenCommand.element, this._customContentContainer);
            };
            this._customContentFlyout.onafterhide = () => {
                _ElementUtilities._reparentChildren(this._customContentContainer, this._chosenCommand.element);
            };
        }

        var showOverflowButton = (additionalCommands.length > 0 || this._secondaryCommands.length > 0);
        this._overflowButton.style.display = showOverflowButton ? "" : "none";

        // Project additional commands into the overflow menu
        if (!this._menu) {
            this._menu = new Menu.Menu();
            _ElementUtilities.addClass(this._menu.element, _Constants.overflowAreaCssClass);
            this.extraClass && _ElementUtilities.addClass(this._menu.element, this.extraClass);
            _Global.document.body.appendChild(this._menu.element);
        }

        var menuCommands: _MenuCommand.MenuCommand[] = [];

        // Add primary commands that should overflow to the menu commands
        additionalCommands.forEach((command) => {
            menuCommands.push(this._getMenuCommand(command));
        });

        // Add separator between primary and secondary command if applicable
        if (additionalCommands.length > 0 && this._secondaryCommands.length > 0) {
            menuCommands.push(new _ToolBarMenuCommand._MenuCommand(null, {
                type: _Constants.typeSeparator
            }));
        }

        // Add secondary commands to the menu commands
        this._secondaryCommands.forEach((command) => {
            if (!command.hidden) {
                menuCommands.push(this._getMenuCommand(command));
            }
        });

        this._hideSeparatorsIfNeeded(menuCommands);

        // Set the menu commands
        this._menu.commands = menuCommands;
    }

    private _hideSeparatorsIfNeeded(commands: ICommandWithType[]): void {
        var prevType = _Constants.typeSeparator;
        var command: ICommandWithType;

        // Hide all leading or consecutive separators
        var commandsLength = commands.length;
        commands.forEach((command) => {
            if (command.type === _Constants.typeSeparator &&
                prevType === _Constants.typeSeparator) {
                command.element.style.display = "none";
            }
            prevType = command.type;
        });

        // Hide trailing separators
        for (var i = commandsLength - 1; i >= 0; i--) {
            command = commands[i];
            if (command.type === _Constants.typeSeparator) {
                command.element.style.display = "none";
            } else {
                break;
            }
        }
    }

    static supportedForProcessing: boolean = true;

    private static _diffElements(LHS: Array<HTMLElement>, RHS: Array<HTMLElement>): Array<HTMLElement> {
        return LHS.filter((commandElement) => { return RHS.indexOf(commandElement) < 0 })
    }
}

// addEventListener, removeEventListener, dispatchEvent
_Base.Class.mix(ToolBar, _Control.DOMEventMixin);
