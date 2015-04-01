// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../Core.d.ts" />
import Animations = require("../../Animations");
import _Base = require("../../Core/_Base");
import _BaseUtils = require("../../Core/_BaseUtils");
import BindingList = require("../../BindingList");
import ControlProcessor = require("../../ControlProcessor");
import _Constants = require("../CommandingSurface/_Constants");
import _Command = require("../AppBar/_Command");
import _CommandingSurfaceMenuCommand = require("../CommandingSurface/_MenuCommand");
import _Control = require("../../Utilities/_Control");
import _Dispose = require("../../Utilities/_Dispose");
import _ElementUtilities = require("../../Utilities/_ElementUtilities");
import _ErrorFromName = require("../../Core/_ErrorFromName");
import _Events = require('../../Core/_Events');
import _Flyout = require("../../Controls/Flyout");
import _Global = require("../../Core/_Global");
import _Hoverable = require("../../Utilities/_Hoverable");
import _KeyboardBehavior = require("../../Utilities/_KeyboardBehavior");
import _Log = require('../../Core/_Log');
import Menu = require("../../Controls/Menu");
import _MenuCommand = require("../Menu/_Command");
import Promise = require('../../Promise');
import _Resources = require("../../Core/_Resources");
import Scheduler = require("../../Scheduler");
import _OpenCloseMachine = require('../../Utilities/_OpenCloseMachine');
import _Signal = require('../../_Signal');
import _WriteProfilerMark = require("../../Core/_WriteProfilerMark");

require(["require-style!less/styles-commandingsurface"]);
require(["require-style!less/colors-commandingsurface"]);

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
    get overflowButtonAriaLabel() { return _Resources._getWinJSString("ui/commandingSurfaceOverflowButtonAriaLabel").value; },
    get badData() { return "Invalid argument: The data property must an instance of a WinJS.Binding.List"; },
    get mustContainCommands() { return "The commandingSurface can only contain WinJS.UI.Command or WinJS.UI.AppBarCommand controls"; },
    get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; }
};

var CommandLayoutPipeline = {
    newDataStage: 3,
    measuringStage: 2,
    layoutStage: 1,
    idle: 0,
};

var OverflowDirection = {
    /// The _CommandingSurface expands towards the bottom of the screen when opened and the overflow area renders below the actionarea.
    bottom: "bottom",
    /// The _CommandingSurface expands towards the top of the screen when opened and the overflow area renders above the actionarea.
    top: "top",
}
var overflowDirectionClassMap = {};
overflowDirectionClassMap[OverflowDirection.top] = _Constants.ClassNames.overflowTopClass;
overflowDirectionClassMap[OverflowDirection.bottom] = _Constants.ClassNames.overflowBottomClass;

var ClosedDisplayMode = {
    /// When the _CommandingSurface is closed, the actionarea is not visible and doesn't take up any space.
    none: "none",
    /// When the _CommandingSurface is closed, the height of the actionarea is reduced to the minimal height required to display only the actionarea overflowbutton. All other content in the actionarea is not displayed.
    minimal: "minimal",
    /// When the _CommandingSurface is closed, the height of the actionarea is reduced such that button commands are still visible, but their labels are hidden.
    compact: "compact",
    /// When the _CommandingSurface is closed, the height of the actionarea is always sized to content and does not change between opened and closed states.
    full: "full",
};
var closedDisplayModeClassMap = {};
closedDisplayModeClassMap[ClosedDisplayMode.none] = _Constants.ClassNames.noneClass;
closedDisplayModeClassMap[ClosedDisplayMode.minimal] = _Constants.ClassNames.minimalClass;
closedDisplayModeClassMap[ClosedDisplayMode.compact] = _Constants.ClassNames.compactClass;
closedDisplayModeClassMap[ClosedDisplayMode.full] = _Constants.ClassNames.fullClass;

// Versions of add/removeClass that are no ops when called with falsy class names.
function addClass(element: HTMLElement, className: string): void {
    className && _ElementUtilities.addClass(element, className);
}
function removeClass(element: HTMLElement, className: string): void {
    className && _ElementUtilities.removeClass(element, className);
}

function diffElements(lhs: Array<HTMLElement>, rhs: Array<HTMLElement>): Array<HTMLElement> {
    // Subtract array rhs from array lhs.
    // Returns a new Array containing the subset of elements in lhs that are not also in rhs.
    return lhs.filter((commandElement) => { return rhs.indexOf(commandElement) < 0 })
}

/// Represents an apaptive surface for displaying commands.
export class _CommandingSurface {

    private _id: string;
    private _contentFlyout: _Flyout.Flyout;
    private _contentFlyoutInterior: HTMLElement; /* The reparented content node inside of _contentFlyout.element */
    private _hoverable = _Hoverable.isHoverable; /* force dependency on hoverable module */
    private _winKeyboard: _KeyboardBehavior._WinKeyboard;
    private _refreshBound: Function;
    private _resizeHandlerBound: (ev: any) => any;
    private _dataChangedEvents = ["itemchanged", "iteminserted", "itemmoved", "itemremoved", "reload"];
    private _machine: _OpenCloseMachine.OpenCloseMachine;
    private _data: BindingList.List<_Command.ICommand>;
    private _primaryCommands: _Command.ICommand[];
    private _secondaryCommands: _Command.ICommand[];
    private _chosenCommand: _Command.ICommand;
    private _refreshPending: boolean;
    private _rtl: boolean;
    private _disposed: boolean;
    private _nextLayoutStage: number;
    private _initializedSignal: _Signal<any>;
    private _isOpenedMode: boolean;
    private _overflowAlignmentOffset: number;

    // Measurements
    private _cachedMeasurements: {
        overflowButtonWidth: number;
        separatorWidth: number;
        standardCommandWidth: number;
        contentCommandWidths: { [uniqueID: string]: number };
        actionAreaContentBoxWidth: number;
    };

    // Dom elements
    private _dom: {
        root: HTMLElement;
        actionArea: HTMLElement;
        spacer: HTMLDivElement;
        overflowButton: HTMLButtonElement;
        overflowArea: HTMLElement;
    };

    /// Display options for the actionarea when the _CommandingSurface is closed.
    static ClosedDisplayMode = ClosedDisplayMode;

    /// Display options used by the _Commandingsurface to determine which direction it should expand when opening.
    static OverflowDirection = OverflowDirection;

    static supportedForProcessing: boolean = true;

    /// Gets the DOM element that hosts the CommandingSurface.
    get element() {
        return this._dom.root;
    }

    /// Gets or sets the Binding List of WinJS.UI.Command for the CommandingSurface.
    get data() {
        return this._data;
    }
    set data(value: BindingList.List<_Command.ICommand>) {
        this._writeProfilerMark("set_data,info");

        if (value !== this.data) {
            if (!(value instanceof BindingList.List)) {
                throw new _ErrorFromName("WinJS.UI._CommandingSurface.BadData", strings.badData);
            }

            if (this._data) {
                this._removeDataListeners();
            }
            this._data = value;
            this._addDataListeners();
            this._dataUpdated();
        }
    }

    private _closedDisplayMode: string;
    /// Gets or sets the closedDisplayMode for the CommandingSurface. Values are "none", "minimal", "compact", and "full".
    get closedDisplayMode() {
        return this._closedDisplayMode;
    }
    set closedDisplayMode(value: string) {
        this._writeProfilerMark("set_closedDisplayMode,info");

        var isChangingState = (value !== this._closedDisplayMode);
        if (ClosedDisplayMode[value] && isChangingState) {
            this._closedDisplayMode = value;
            this._machine.updateDom();
        }
    }

    private _overflowDirection: string;
    /// Gets or sets which direction the commandingSurface overflows when opened. Values are "top" and "bottom" for.
    get overflowDirection(): string {
        return this._overflowDirection;
    }
    set overflowDirection(value: string) {
        var isChangingState = (value !== this._overflowDirection);
        if (OverflowDirection[value] && isChangingState) {
            this._overflowDirection = value;
            this._machine.updateDom();
        }
    }

    /// Gets or sets whether the _CommandingSurface is currently opened.
    get opened(): boolean {
        return this._machine.opened;
    }
    set opened(value: boolean) {
        this._machine.opened = value;
    }

    constructor(element?: HTMLElement, options: any = {}) {
        /// Creates a new CommandingSurface control.
        /// @param element: The DOM element that will host the control.
        /// @param options: The set of properties and values to apply to the new CommandingSurface control.
        /// @return: The new CommandingSurface control.

        this._writeProfilerMark("constructor,StartTM");

        // Check to make sure we weren't duplicated
        if (element && element["winControl"]) {
            throw new _ErrorFromName("WinJS.UI._CommandingSurface.DuplicateConstruction", strings.duplicateConstruction);
        }

        this._initializeDom(element || _Global.document.createElement("div"));
        this._machine = options.openCloseMachine || new _OpenCloseMachine.OpenCloseMachine({
            eventElement: this._dom.root,
            onOpen: () => {
                //this._cachedHiddenPaneThickness = null;
                //var hiddenPaneThickness = this._getHiddenPaneThickness();
                this.synchronousOpen();
                //return this._playShowAnimation(hiddenPaneThickness);
                return Promise.wrap();
            },
            onClose: () => {
                //return this._playHideAnimation(this._getHiddenPaneThickness()).then(() => {
                this.synchronousClose();
                //});

                return Promise.wrap();
            },
            onUpdateDom: () => {
                this.updateDomImpl();
            },
            onUpdateDomWithIsOpened: (isOpened: boolean) => {
                if (isOpened) {
                    this.synchronousOpen();
                } else {
                    this.synchronousClose();
                }
            }
        });

        // Initialize private state.
        this._disposed = false;
        this._primaryCommands = [];
        this._secondaryCommands = [];
        this._refreshBound = this._refresh.bind(this);
        this._resizeHandlerBound = this._resizeHandler.bind(this);
        this._winKeyboard = new _KeyboardBehavior._WinKeyboard(this._dom.root);
        this._refreshPending = false;
        this._rtl = false;
        this._initializedSignal = new _Signal();
        this._nextLayoutStage = CommandLayoutPipeline.idle;
        this._isOpenedMode = _Constants.defaultOpened;

        // Initialize public properties.
        this.overflowDirection = _Constants.defaultOverflowDirection;
        this.closedDisplayMode = _Constants.defaultClosedDisplayMode;
        this.opened = this._isOpenedMode;
        if (!options.data) {
            // Shallow copy object so we can modify it.
            options = _BaseUtils._shallowCopy(options);

            // Set default data
            options.data = options.data || this._getDataFromDOMElements();
        }
        _Control.setOptions(this, options);

        // Event handlers
        _ElementUtilities._resizeNotifier.subscribe(this._dom.root, this._resizeHandlerBound);
        this._dom.root.addEventListener('keydown', this._keyDownHandler.bind(this));

        // Exit the Init state.
        _ElementUtilities._inDom(this._dom.root).then(() => {
            this._rtl = _Global.getComputedStyle(this._dom.root).direction === 'rtl';
            if (!options.openCloseMachine) {
                // We should only call exitInit on the machine when we own the machine.
                this._machine.exitInit();
            }
            this._initializedSignal.complete();
            this._writeProfilerMark("constructor,StopTM");
        });

    }
    /// Occurs immediately before the control is opened. Is cancelable.
    onbeforeopen: (ev: CustomEvent) => void;
    /// Occurs immediately after the control is opened.
    onafteropen: (ev: CustomEvent) => void;
    /// Occurs immediately before the control is closed. Is cancelable.
    onbeforeclose: (ev: CustomEvent) => void;
    /// Occurs immediately after the control is closed.
    onafterclose: (ev: CustomEvent) => void;

    open(): void {
        /// Opens the _CommandingSurface's actionarea and overflowarea
        this._machine.open();
    }

    close(): void {
        /// Closes the _CommandingSurface's actionarea and overflowarea
        this._machine.close();
    }

    dispose(): void {
        /// Disposes this CommandingSurface.
        if (this._disposed) {
            return;
        }

        this._disposed = true;
        this._machine.dispose();

        _ElementUtilities._resizeNotifier.unsubscribe(this._dom.root, this._resizeHandlerBound);

        if (this._contentFlyout) {
            this._contentFlyout.dispose();
            this._contentFlyout.element.parentNode.removeChild(this._contentFlyout.element);
        }

        _Dispose.disposeSubTree(this._dom.root);
    }

    forceLayout(): void {
        /// Forces the CommandingSurface to update its layout. Use this function when the window did not change size, but the container of the CommandingSurface changed size.
        this._meaurementsDirty();
        this._machine.updateDom();
    }

    getBoundingRects(): { commandingSurface: ClientRect; overflowArea: ClientRect; } {
        return {
            commandingSurface: this._dom.root.getBoundingClientRect(),
            overflowArea: this._dom.overflowArea.getBoundingClientRect(),
        };
    }

    deferredDomUpate(): void {
        // Notify the machine that an update has been requested.
        this._machine.updateDom();
    }

    get initialized(): Promise<any> {
        return this._initializedSignal.promise;
    }

    private _writeProfilerMark(text: string) {
        _WriteProfilerMark("WinJS.UI._CommandingSurface:" + this._id + ":" + text);
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

        var actionArea = _Global.document.createElement("div");
        _ElementUtilities.addClass(actionArea, _Constants.ClassNames.actionAreaCssClass);
        _ElementUtilities._reparentChildren(root, actionArea);
        root.appendChild(actionArea);

        var spacer = _Global.document.createElement("div");
        _ElementUtilities.addClass(spacer, _Constants.ClassNames.spacerCssClass);
        actionArea.appendChild(spacer);

        var overflowButton = _Global.document.createElement("button");
        overflowButton.tabIndex = 0;
        overflowButton.innerHTML = "<span class='" + _Constants.ClassNames.ellipsisCssClass + "'></span>";
        _ElementUtilities.addClass(overflowButton, _Constants.ClassNames.overflowButtonCssClass);
        actionArea.appendChild(overflowButton);
        overflowButton.addEventListener("click", () => {
            this.opened = !this.opened;
        });

        var overflowArea = _Global.document.createElement("div");
        _ElementUtilities.addClass(overflowArea, _Constants.ClassNames.overflowAreaCssClass);
        _ElementUtilities.addClass(overflowArea, _Constants.ClassNames.menuCssClass);
        root.appendChild(overflowArea);

        this._dom = {
            root: root,
            actionArea: actionArea,
            spacer: spacer,
            overflowButton: overflowButton,
            overflowArea: overflowArea,
        };
    }

    private _getFocusableElementsInfo(): IFocusableElementsInfo {
        var focusableCommandsInfo: IFocusableElementsInfo = {
            elements: [],
            focusedIndex: -1
        };
        var elementsInReach = Array.prototype.slice.call(this._dom.actionArea.children);

        var elementsInReach = Array.prototype.slice.call(this._dom.actionArea.children);
        if (this._dom.overflowArea.style.display !== "none") {
            elementsInReach = elementsInReach.concat(Array.prototype.slice.call(this._dom.overflowArea.children));
        }

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
        this._primaryCommands = [];
        this._secondaryCommands = [];

        if (this.data.length > 0) {
            this.data.forEach((command) => {
                if (command.section === "secondary") {
                    this._secondaryCommands.push(command);
                } else {
                    this._primaryCommands.push(command);
                }
            });
        }
        this._dataDirty();
        this._machine.updateDom();
    }

    private _refresh() {
        if (!this._refreshPending) {
            this._refreshPending = true;

            // Batch calls to _dataUpdated
            Scheduler.schedule(() => {
                if (this._refreshPending && !this._disposed) {
                    this._refreshPending = false;
                    this._dataUpdated();
                }
            }, Scheduler.Priority.high, null, "WinJS.UI._CommandingSurface._refresh");
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

    private _isCommandInActionArea(element: HTMLElement) {
        // Returns true if the element is a command in the actionarea, false otherwise
        return element && element["winControl"] && element.parentElement === this._dom.actionArea;
    }

    private _getLastElementFocus(element: HTMLElement) {
        if (this._isCommandInActionArea(element)) {
            // Only commands in the actionarea support lastElementFocus
            return element["winControl"].lastElementFocus;
        } else {
            return element;
        }
    }

    private _getFirstElementFocus(element: HTMLElement) {
        if (this._isCommandInActionArea(element)) {
            // Only commands in the actionarea support firstElementFocus
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
            var focusableElementsInfo = this._getFocusableElementsInfo();
            var targetCommand: HTMLElement;

            if (focusableElementsInfo.elements.length) {
                switch (ev.keyCode) {
                    case (this._rtl ? Key.rightArrow : Key.leftArrow):
                    case Key.upArrow:
                        var index = Math.max(0, focusableElementsInfo.focusedIndex - 1);
                        targetCommand = this._getLastElementFocus(focusableElementsInfo.elements[index % focusableElementsInfo.elements.length]);
                        break;

                    case (this._rtl ? Key.leftArrow : Key.rightArrow):
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

        ControlProcessor.processAll(this._dom.actionArea, /*skip root*/ true);

        var commands: _Command.ICommand[] = [];
        var childrenLength = this._dom.actionArea.children.length;
        var child: Element;
        for (var i = 0; i < childrenLength; i++) {
            child = this._dom.actionArea.children[i];
            if (child["winControl"] && child["winControl"] instanceof _Command.AppBarCommand) {
                commands.push(child["winControl"]);
            } else if (child !== this._dom.overflowButton && child !== this._dom.spacer) {
                throw new _ErrorFromName("WinJS.UI._CommandingSurface.MustContainCommands", strings.mustContainCommands);
            }
        }
        return new BindingList.List(commands);
    }

    private _resizeHandler() {
        if (this._dom.root.offsetWidth) {
            var currentActionAreaWidth = _ElementUtilities._getPreciseContentWidth(this._dom.actionArea);
            if (this._cachedMeasurements && this._cachedMeasurements.actionAreaContentBoxWidth !== currentActionAreaWidth) {
                this._cachedMeasurements.actionAreaContentBoxWidth = currentActionAreaWidth
                this._layoutDirty();
                this._machine.updateDom();
            }
        }
    }

    // Should be called while _CommandingSurface is rendered in its opened mode
    // Overridden by tests.
    private _playShowAnimation(): Promise<any> {
        return Promise.wrap();
    }
    // Should be called while SplitView is rendered in its opened mode
    // Overridden by tests.
    private _playHideAnimation(): Promise<any> {
        return Promise.wrap();
    }
    private _dataDirty(): void {
        this._nextLayoutStage = Math.max(CommandLayoutPipeline.newDataStage, this._nextLayoutStage);
    }
    private _meaurementsDirty(): void {
        this._nextLayoutStage = Math.max(CommandLayoutPipeline.measuringStage, this._nextLayoutStage);
    }
    private _layoutDirty(): void {
        this._nextLayoutStage = Math.max(CommandLayoutPipeline.layoutStage, this._nextLayoutStage);
    }

    synchronousOpen(): void {

        this._overflowAlignmentOffset = 0;
        this._isOpenedMode = true;
        this.updateDomImpl();
        this._overflowAlignmentOffset = this._computeAdjustedOverflowAreaOffset();
        this.updateDomImpl();
    }

    private _computeAdjustedOverflowAreaOffset(): number {
        // Returns any negative offset needed to prevent the shown overflowarea from clipping outside of the viewport.
        // This function should only be called when CommandingSurface has been rendered in the opened state with
        // an overflowAlignmentOffset of 0.
        if (_Log.log) {
            !this._updateDomImpl_renderedState.isOpenedMode &&
            _Log.log("The CommandingSurface should only attempt to compute adjusted overflowArea offset " +
                " when it has been rendered opened");

            this._updateDomImpl_renderedState.overflowAlignmentOffset !== 0 &&
            _Log.log("The CommandingSurface should only attempt to compute adjusted overflowArea offset " +
            " when it has been rendered with an overflowAlignementOffset of 0");
        }

        var overflowArea = this._dom.overflowArea,
            boundingClientRects = this.getBoundingRects(),
            adjustedOffset = 0;
        if (this._rtl) {
            // In RTL the left edge of overflowarea prefers to align to the LEFT edge of the commandingSurface. 
            // Make sure we avoid clipping through the RIGHT edge of the viewport
            var viewportRight = window.innerWidth,
                rightOffsetFromViewport = boundingClientRects.overflowArea.right;
            adjustedOffset = Math.min(viewportRight - rightOffsetFromViewport, 0);
        } else {
            // In LTR the right edge of overflowarea prefers to align to the RIGHT edge of the commandingSurface.
            // Make sure we avoid clipping through the LEFT edge of the viewport.
            var leftOffsetFromViewport = boundingClientRects.overflowArea.left;
            adjustedOffset = Math.min(0, leftOffsetFromViewport);
        }

        return adjustedOffset;
    }

    synchronousClose(): void {
        this._isOpenedMode = false;
        this.updateDomImpl();
    }

    updateDomImpl(): void {
        this._updateDomImpl_renderDisplayMode();
        this._updateDomImpl_updateCommands();
    }

    // State private to _updateDomImpl_renderDisplayMode. No other method should make use of it.
    //
    // Nothing has been rendered yet so these are all initialized to undefined. Because
    // they are undefined, the first time _updateDomImpl is called, they will all be
    // rendered.
    private _updateDomImpl_renderedState = {
        closedDisplayMode: <string>undefined,
        isOpenedMode: <boolean>undefined,
        overflowDirection: <string>undefined,
        overflowAlignmentOffset: <number>undefined,
    };
    private _updateDomImpl_renderDisplayMode(): void {
        var rendered = this._updateDomImpl_renderedState;


        if (rendered.isOpenedMode !== this._isOpenedMode) {
            if (this._isOpenedMode) {
                // Render opened
                removeClass(this._dom.root, _Constants.ClassNames.closedClass);
                addClass(this._dom.root, _Constants.ClassNames.openedClass);
            } else {
                // Render closed
                removeClass(this._dom.root, _Constants.ClassNames.openedClass);
                addClass(this._dom.root, _Constants.ClassNames.closedClass);
            }
            rendered.isOpenedMode = this._isOpenedMode;
        }

        if (rendered.closedDisplayMode !== this.closedDisplayMode) {
            removeClass(this._dom.root, closedDisplayModeClassMap[rendered.closedDisplayMode]);
            addClass(this._dom.root, closedDisplayModeClassMap[this.closedDisplayMode]);
            rendered.closedDisplayMode = this.closedDisplayMode;
        }

        if (rendered.overflowDirection !== this.overflowDirection) {
            removeClass(this._dom.root, overflowDirectionClassMap[rendered.overflowDirection]);
            addClass(this._dom.root, overflowDirectionClassMap[this.overflowDirection]);
            rendered.overflowDirection = this.overflowDirection;
        }

        if (this._overflowAlignmentOffset !== rendered.overflowAlignmentOffset) {
            var offsetProperty = (this._rtl ? "left" : "right");
            var offsetTextValue = this._overflowAlignmentOffset + "px";
            this._dom.overflowArea.style[offsetProperty] = offsetTextValue;
        }
    }

    private _updateDomImpl_updateCommands(): void {
        this._writeProfilerMark("_updateDomImpl_updateCommands,info");

        var nextStage = this._nextLayoutStage;
        // The flow of stages in the CommandLayoutPipeline is defined as:
        //      newDataStage -> measuringStage -> layoutStage -> idle
        while (nextStage !== CommandLayoutPipeline.idle) {
            var currentStage = nextStage;
            var okToProceed = false;
            switch (currentStage) {
                case CommandLayoutPipeline.newDataStage:
                    nextStage = CommandLayoutPipeline.measuringStage;
                    okToProceed = this._processNewData();
                    break;
                case CommandLayoutPipeline.measuringStage:
                    nextStage = CommandLayoutPipeline.layoutStage;
                    okToProceed = this._measure();
                    break;
                case CommandLayoutPipeline.layoutStage:
                    nextStage = CommandLayoutPipeline.idle;
                    okToProceed = this._layoutCommands();
                    break;
            }

            if (!okToProceed) {
                // If a stage fails, exit the loop and track that stage
                // to be restarted the next time _updateCommands is run.
                nextStage = currentStage;
                break;
            }
        }
        this._nextLayoutStage = nextStage;
    }

    private _getDataChangeInfo(): IDataChangeInfo {
        var i = 0, len = 0;
        var added: HTMLElement[] = [];
        var deleted: HTMLElement[] = [];
        var affected: HTMLElement[] = [];
        var currentShown: HTMLElement[] = [];
        var currentElements: HTMLElement[] = [];
        var newShown: HTMLElement[] = [];
        var newHidden: HTMLElement[] = [];
        var newElements: HTMLElement[] = [];

        Array.prototype.forEach.call(this._dom.actionArea.querySelectorAll(_Constants.commandSelector), (commandElement: HTMLElement) => {
            if (commandElement.style.display !== "none") {
                currentShown.push(commandElement);
            }
            currentElements.push(commandElement);
        });

        this.data.forEach((command) => {
            if (command.element.style.display !== "none") {
                newShown.push(command.element);
            } else {
                newHidden.push(command.element);
            }
            newElements.push(command.element);
        });

        deleted = diffElements(currentShown, newShown);
        affected = diffElements(currentShown, deleted);
        // "added" must also include the elements from "newHidden" to ensure that we continue
        // to animate any command elements that have underflowed back into the actionarea
        // as a part of this data change.
        added = diffElements(newShown, currentShown).concat(newHidden);

        return {
            newElements: newElements,
            currentElements: currentElements,
            added: added,
            deleted: deleted,
            affected: affected,
        };
    }

    private _processNewData(): boolean {
        this._writeProfilerMark("_processNewData,info");

        var changeInfo = this._getDataChangeInfo();

        // Take a snapshot of the current state
        var updateCommandAnimation = Animations._createUpdateListAnimation(changeInfo.added, changeInfo.deleted, changeInfo.affected);

        // Remove current ICommand elements
        changeInfo.currentElements.forEach((element) => {
            if (element.parentElement) {
                element.parentElement.removeChild(element);
            }
        });

        // Add new ICommand elements in the right order.
        changeInfo.newElements.forEach((element) => {
            this._dom.actionArea.appendChild(element);
        });

        // Ensure that the overflow button is always the last element in the actionarea
        this._dom.actionArea.appendChild(this._dom.overflowButton);
        if (this.data.length > 0) {
            _ElementUtilities.removeClass(this._dom.root, _Constants.ClassNames.emptyCommandingSurfaceCssClass);
        } else {
            _ElementUtilities.addClass(this._dom.root, _Constants.ClassNames.emptyCommandingSurfaceCssClass);
        }

        // Execute the animation.
        updateCommandAnimation.execute();

        // Indicate processing was successful.
        return true;
    }

    private _measure(): boolean {
        this._writeProfilerMark("_measure,info");
        var canMeasure = (_Global.document.body.contains(this._dom.root) && this._dom.actionArea.offsetWidth > 0);
        if (canMeasure) {
            var overflowButtonWidth = _ElementUtilities._getPreciseTotalWidth(this._dom.overflowButton),
                actionAreaContentBoxWidth = _ElementUtilities._getPreciseContentWidth(this._dom.actionArea),
                separatorWidth = 0,
                standardCommandWidth = 0,
                contentCommandWidths: { [uniqueID: string]: number; } = {};

            this._primaryCommands.forEach((command) => {
                // Ensure that the element we are measuring does not have display: none (e.g. it was just added, and it
                // will be animated in)
                var originalDisplayStyle = command.element.style.display;
                command.element.style.display = "";

                if (command.type === _Constants.typeContent) {
                    // Measure each 'content' command type that we find
                    contentCommandWidths[this._commandUniqueId(command)] = _ElementUtilities._getPreciseTotalWidth(command.element);
                } else if (command.type === _Constants.typeSeparator) {
                    // Measure the first 'separator' command type we find.
                    if (!separatorWidth) {
                        separatorWidth = _ElementUtilities._getPreciseTotalWidth(command.element);
                    }
                } else {
                    // Button, toggle, 'flyout' command types have the same width. Measure the first one we find.
                    if (!standardCommandWidth) {
                        standardCommandWidth = _ElementUtilities._getPreciseTotalWidth(command.element);
                    }
                }

                // Restore the original display style
                command.element.style.display = originalDisplayStyle;
            });

            this._cachedMeasurements = {
                contentCommandWidths: contentCommandWidths,
                separatorWidth: separatorWidth,
                standardCommandWidth: standardCommandWidth,
                overflowButtonWidth: overflowButtonWidth,
                actionAreaContentBoxWidth: actionAreaContentBoxWidth,
            };

            // Indicate measure was successful
            return true;
        } else {
            // Indicate measure was unsuccessful
            return false;
        }
    }

    private _layoutCommands(): boolean {
        this._writeProfilerMark("_layoutCommands,StartTM");

        //
        // Filter commands that will not be visible in the actionarea
        //

        this._primaryCommands.forEach((command) => {
            command.element.style.display = (command.hidden ? "none" : "");
        })

        var primaryCommandsLocation = this._getPrimaryCommandsLocation();

        this._hideSeparatorsIfNeeded(primaryCommandsLocation.actionArea);

        // Primary commands that will be mirrored in the overflow area should be hidden so
        // that they are not visible in the actionarea.
        primaryCommandsLocation.overflowArea.forEach((command) => {
            command.element.style.display = "none";
        });

        // The secondary commands in the actionarea should be hidden since they are always
        // mirrored as new elements in the overflow area.
        this._secondaryCommands.forEach((command) => {
            command.element.style.display = "none";
        });

        var overflowCommands = primaryCommandsLocation.overflowArea;

        var showOverflowButton = (overflowCommands.length > 0 || this._secondaryCommands.length > 0);
        this._dom.overflowButton.style.display = showOverflowButton ? "" : "none";

        // Set up a custom content flyout if there will be "content" typed commands in the overflowarea.
        var isCustomContent = (command: _Command.ICommand) => { return command.type === _Constants.typeContent };
        var hasCustomContent = overflowCommands.some(isCustomContent) || this._secondaryCommands.some(isCustomContent);

        if (hasCustomContent && !this._contentFlyout) {
            this._contentFlyoutInterior = _Global.document.createElement("div");
            _ElementUtilities.addClass(this._contentFlyoutInterior, _Constants.ClassNames.contentFlyoutCssClass);
            this._contentFlyout = new _Flyout.Flyout();
            this._contentFlyout.element.appendChild(this._contentFlyoutInterior);
            _Global.document.body.appendChild(this._contentFlyout.element);
            this._contentFlyout.onbeforeshow = () => {
                _ElementUtilities.empty(this._contentFlyoutInterior);
                _ElementUtilities._reparentChildren(this._chosenCommand.element, this._contentFlyoutInterior);
            };
            this._contentFlyout.onafterhide = () => {
                _ElementUtilities._reparentChildren(this._contentFlyoutInterior, this._chosenCommand.element);
            };
        }

        //
        // Project overflowing and secondary commands into the overflowArea as MenuCommands
        //

        _ElementUtilities.empty(this._dom.overflowArea);
        var hasToggleCommands = false,
            menuCommandProjections: _MenuCommand.MenuCommand[] = [];

        // Add primary commands that have overflowed.
        overflowCommands.forEach((command) => {
            if (command.type === _Constants.typeToggle) {
                hasToggleCommands = true;
            }
            menuCommandProjections.push(this._projectAsMenuCommand(command));
        });

        // Add separator between primary and secondary command if applicable
        var secondaryCommandsLength = this._secondaryCommands.length;
        if (overflowCommands.length > 0 && secondaryCommandsLength > 0) {
            var separator = new _CommandingSurfaceMenuCommand._MenuCommand(null, {
                type: _Constants.typeSeparator
            });

            menuCommandProjections.push(separator);
        }

        // Add secondary commands
        this._secondaryCommands.forEach((command) => {
            if (!command.hidden) {
                if (command.type === _Constants.typeToggle) {
                    hasToggleCommands = true;
                }
                menuCommandProjections.push(this._projectAsMenuCommand(command));
            }
        });

        this._hideSeparatorsIfNeeded(menuCommandProjections);
        menuCommandProjections.forEach((command) => {
            this._dom.overflowArea.appendChild(command.element);
        })

        _ElementUtilities[hasToggleCommands ? "addClass" : "removeClass"](this._dom.overflowArea, _Constants.ClassNames.menuContainsToggleCommandClass);

        this._writeProfilerMark("_layoutCommands,StopTM");

        // Indicate layout was successful.
        return true;
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

    private _getPrimaryCommandsLocation() {
        this._writeProfilerMark("_getCommandsLocation,info");

        var actionAreaCommands: _Command.ICommand[] = [];
        var overflowAreaCommands: _Command.ICommand[] = [];
        var overflowButtonSpace = 0;
        var hasSecondaryCommands = this._secondaryCommands.length > 0;

        var commandsInfo = this._getCommandsInfo();
        var sortedCommandsInfo = commandsInfo.slice(0).sort((commandInfo1: ICommandInfo, commandInfo2: ICommandInfo) => {
            return commandInfo1.priority - commandInfo2.priority;
        });

        var maxPriority = Number.MAX_VALUE;
        var availableWidth = this._cachedMeasurements.actionAreaContentBoxWidth;

        for (var i = 0, len = sortedCommandsInfo.length; i < len; i++) {
            availableWidth -= sortedCommandsInfo[i].width;

            // The overflow button needs space if there are secondary commands, or we are not evaluating the last command.
            overflowButtonSpace = (hasSecondaryCommands || (i < len - 1) ? this._cachedMeasurements.overflowButtonWidth : 0);

            if (availableWidth - overflowButtonSpace < 0) {
                maxPriority = sortedCommandsInfo[i].priority - 1;
                break;
            }
        }

        commandsInfo.forEach((commandInfo) => {
            if (commandInfo.priority <= maxPriority) {
                actionAreaCommands.push(commandInfo.command);
            } else {
                overflowAreaCommands.push(commandInfo.command);
            }
        });

        return {
            actionArea: actionAreaCommands,
            overflowArea: overflowAreaCommands
        }
    }

    private _getCommandWidth(command: _Command.ICommand): number {
        if (command.type === _Constants.typeContent) {
            return this._cachedMeasurements.contentCommandWidths[this._commandUniqueId(command)];
        } else if (command.type === _Constants.typeSeparator) {
            return this._cachedMeasurements.separatorWidth;
        } else {
            return this._cachedMeasurements.standardCommandWidth;
        }
    }

    private _projectAsMenuCommand(originalCommand: _Command.ICommand): _MenuCommand.MenuCommand {
        var menuCommand = new _CommandingSurfaceMenuCommand._MenuCommand(null, {
            label: originalCommand.label,
            type: (originalCommand.type === _Constants.typeContent ? _Constants.typeFlyout : originalCommand.type) || _Constants.typeButton,
            disabled: originalCommand.disabled,
            flyout: originalCommand.flyout,
            beforeInvoke: () => {
                // Save the command that was selected
                this._chosenCommand = <_Command.ICommand>(menuCommand["_originalICommand"]);

                // If this WinJS.UI.MenuCommand has type: toggle, we should also toggle the value of the original WinJS.UI.Command
                if (this._chosenCommand.type === _Constants.typeToggle) {
                    this._chosenCommand.selected = !this._chosenCommand.selected;
                }
            }
        });

        if (originalCommand.selected) {
            menuCommand.selected = true;
        }

        if (originalCommand.extraClass) {
            menuCommand.extraClass = originalCommand.extraClass;
        }

        if (originalCommand.type === _Constants.typeContent) {
            if (!menuCommand.label) {
                menuCommand.label = _Constants.contentMenuCommandDefaultLabel;
            }
            menuCommand.flyout = this._contentFlyout;
        } else {
            menuCommand.onclick = originalCommand.onclick;
        }
        menuCommand["_originalICommand"] = originalCommand;
        return menuCommand;
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
}

_Base.Class.mix(_CommandingSurface, _Events.createEventProperties(
    _Constants.EventNames.beforeOpen,
    _Constants.EventNames.afterOpen,
    _Constants.EventNames.beforeClose,
    _Constants.EventNames.afterClose));

// addEventListener, removeEventListener, dispatchEvent
_Base.Class.mix(_CommandingSurface, _Control.DOMEventMixin);
