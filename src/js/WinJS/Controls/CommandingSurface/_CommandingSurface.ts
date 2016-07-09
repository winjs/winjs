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

// Implementation details:
//
//_CommandingSurface is the private UI component that powers most of the experience provided by the WinJS ToolBar and WinJS AppBar.Those controls each act as a specialized 
// wrappers around the _CommandingSurface but the majority of the value they provide is the exposure of the _CommandingSurfaces UI and functionality.
//
//The responsibilities of the_Commanding include:
//    - Receiving and handling a shared state machine.
//        - The _CommandingSurface Constructor looks for a reference to an already instantiated _OpenCloseMachine in the _CommandingSurface constructor arguments.
//          _OpenCloseMachine is a private WinJS component that is responsible for handling state transitions._CommandingSurface expects its host control to have already
//          instantiated and configured the _OpenCloseMachine that it wants the _CommandingSurface to use.
//        - _CommandingSurface has logic to provide its own default _OpenCloseMachine if one is not provided, but in most cases the host control should provide one if it ever
//          wants to make sure that it and the _CommandingSurface's open & close states remain in sync.
//        - _CommandingSurface takes complete ownership of the _OpenCloseMachine once it receives it.The Host control should not store a reference to the _OpenCloseMachine, 
//          and should rely on the _CommandingSurface to own all future communication with it as well as clean it up on dispose.
//        - See the AppBar and ToolBar constructors for examples of how an _OpenCloseMachine is instantiated and passed to the _CommandingSurface.
//
//    - Rendering with Update DOM.CommandingSurface follows the Update DOM pattern for rendering.For more information about this pattern. 
//      See: https://github.com/winjs/winjs/wiki/Update-DOM-Pattern.
//        - Rendering and Laying out commands:
//        	- _CommandingSurface expects its host control to pass it a WinJS.Binding.List < ICommand>, containing the commands that it wants rendered, to the
//            _CommandingSurface.data property.The data property works with a WinJS.Binding.List of type WinJS.UI.AppBarCommand  or type WinJS.UI.Command as both implement the
//            ICommand interface.
//              - WinJS.UI.Commands is just an alias for WinJS.UI.AppBar command.The alias was created in WinJS 4.0 since it seemed strange to have to put WinJS.UI.AppBarCommands
//              .into a WinJS ToolBar control.
//        	- Commands have a "section" property which in WinJS 4.0 should either be "primary" or "secondary".
//              - Any unrecognized section value will be interpreted as  "primary" by the _CommandingSurface.
//              - A Command's section property can only be set during the Commands constructor, else it defaults to "primary"
//        	- _CommandingSurface has two primary elements in its subtree that it uses to host commands.The win-commandingsurface-actionarea and win-commandingsurface-overflowarea.
//              - Pictures of  commands rendered in the actionarea and overflowarea: https://msdn.microsoft.com/en-us/library/windows/apps/dn972389.aspx
//              - The actionarea hosts commands whose section property is set to "primary".
//                  - These commands appear with a label and an icon, and are only ever laid out in a single row.
//                  - The action area may also host a win - commandingsurface - overflowbutton element, designated by an "…" ellipsis icon.
//                        - Clicking the overflowbutton will open / close the _CommandingSurface
//                        - This will always appear to the right of all primary commands in the action area, or the reverse if in RTL.
//                  - There is a finite amount of space in the action area for primary commands and the overflow button.
//              - The overflow area hosts all secondary commands and any primary commands that the actionarea doesn't have enough room for.
//                  - Each time a layout pass occurs, if the actionarea is not sufficiently wide enough to fit all of the primary Commands + overflowbutton on a single row.
//                    The _CommandingSurface will move some primary commands into the overflowarea instead.
//                        - App developers can specify the priority order of their primary commands through the command.priority property to control which comands will move into
//                          the overflow area first whenever there isn't enough space in the actionarea.
//                        - See the Toolbar "dropout & priority" example at http://try.buildwinjs.com/playground/
//                  - The overflow area can fit unlimited content.As it gets more content, its element will grow to a maximum height of 50 % of the viewport, once that height
//                    limit is reached its content will become scrollable.
//
//        	- The Command Layout Pipeline:
//                - Laying out commands is a 4 stage process managed by the function _updateCommands. The flow of stages in the CommandLayoutPipeline are:
//                    - idle - > newDataStage - > measuringStage - > layoutStage - > idle.
//                - Commands Layout may or may not complete synchronously.If a stage in the pipeline cannot be completed successfully, layout will resume from the current stage
//                  the next time Update DOM occurs
//                - Idle stage:
//                    - We enter this stage when there is no pending command layout work to perform:
//                        - the _CommandingSurface is first initialized, before it has any commands in its data property.
//                        - When the final stage of the pipeline, the layoutStage, has completed successfully and there is again no work to do.
//                    - This is the default stage.
//                - newDataStage
//                    - We enter this stage when our data has changed:
//                        - The _CommandingSurface.data property is set to a new BindingList.
//                        - Individual commands in the BindingList stored as the _CommandingSurface.data property are added, removed, moved, or replaced.
//                    - This is the earliest stage of the pipeline and is where we build the animations for all the commands that are being newly shown, newly hidden, or 
//                      previously visible commands that are being shifted arround by other newly shown / hidden commands next to them.
//                - measuringStage
//                    - We enter this stage when something has changed that would invalidate any cached measurements we might have stored for our DOM:
//                        - The newDataStage has just completed successfully.
//                        - _CommandingSurface.forceLayout() API has been called.This would typically be called by a host control to indicate to the _CommandingSurface that 
//                          something in its DOM has changed size and needs to be re - measured.
//                        - _CommandingSurface's event handler for window resize is triggered, but the _CommandSurfaces element is unable to be measured. This could mean that some
//                          element in our ancestor chain has set display none, or that we are not currently in the DOM.
//                    - This is the second stage of the pipeline and is where the _CommandingSurface measures the widths several elements including its actionarea, its
//                      oveflowbutton element, and all of its commands.Once it takes these measurements it caches them to make future operations and the next layoutStages more 
//                      performant.
//                - layoutStage:
//                    - The layout stage is entered whenever we need to re - render commands in the actionarea and overflowarea.For example:
//                        - The measuringStage has just completed successfully:
//                        - In response to the window resizing.The _CommandingSurface width may have been affected, causing the need to re layout so commands can re flow.
//                        - The _CommandingSurface has decided to show / hide its overflowbutton.This will either add to, or take away from, the available space in actionarea for
//                          primary commands, and causing the need to re layout so commands can re flow.
//                        - Any property on a command, that is represented in UI, has changed.The AppBarCommand class manages a whitelist of AppBarCommand property names that can
//                          affect UI.When those properties are changed the AppBarCommand object will throw a private mutation event.The CommandingSurface listens for those event 
//                          and triggers a re-layout.
//                    - All commands in the overflowarea, both primary and secondary, are rendered differently than commands in the actionarea.Commands in the overflow area only
//                      display their labels, not their icons.They also have different hover and active styles than the commands in the actionarea.
//                        - Commands rendered in the overflowArea are actually all projected as WinJS MenuCommands.
//                          - Whenever the CommandingSurface needs to render a secondary command or overflowing primary command into the overflow area, it leaves the original 
//                            AppBarCommand element in the action area DOM but hides it from view.It then instantiates a WinJS MenuCommand and copies over the relevant properties 
//                            from the AppBarCommand onto the MenuCommand.Finally, the MenuCommand Is inserted into DOM of the overflow area.
//                          - This has led to some issues where click event listeners that developers have added onto their AppBarCommand elements, don't work when the command is
//                            represented as a MenuCommand with its own separate element in the overflow area. The only workaround is to use the AppBarCommand.onclick property to 
//                            set the onclick behavior.
//                        - Any time the layout phase is entered, all primary commands are re laid out, all previous MenuCommand projections in the overflow area are disposed, and
//                          all secondary and overflowing primary commands are projected into the Overflow area as new MenuCommands.
//                        - When primary commands need to overflow, the CommandingSurface will render all of the overflowing primary commands into the overflowarea first, followed
//                          by a separator element, followed by all of the secondary commands.
//
//        - Rendering the opened and closed states.
//            - Rendering the opened or closed states will cause the height of the CommandingSurface element to grow or shrink.
//                - Any Control that hosts a _CommandingSurface should not attempt to set any policy on the height of the host control's element. In the Case of AppBar and 
//                  ToolBar, they each rely on the default behavior of their div element to grow or shrink to match the height of the _CommandingSurface element.
//                - When the CommandingSurface opens, the direction in which the actionarea and overflowarea grow and expand will either be oriented upwards towards the top of the
//                  screen, or downwards towards the bottom of the screen.This behavior is controlled through the _CommandingSurface.overflowDirection property.
//                - The _CommandingSurface "closedDisplayMode" property controls how the control should render when closed.
//            - Correctly positioning the win - commandingsurface - overflowarea element.
//                - Vertically:
//                  - The overflowarea should not be visible when the control is closed.When the control is opened the overflowarea should appear either on the top or the bottom 
//                    of the actionarea, depending on the overflowDirection property.
//                  - If there is no content in the overflowarea, opening the control should only expand the actionarea.The overflowarea should remain hidden until both, the 
//                    control is opened AND the overflowarea contains content.
//                - Horizontally:
//                  - Normally, the opened _CommandingSurface prefers its overflowArea to be right aligned with the actionarea, however IF the overflowArea is wider than the
//                    actionarea AND the left edge of the overflowarea would be clipped by the left edge of the screen: THEN the opened _CommandingSurface will instead left align 
//                    its overflowArea with the left edge of the screen.
//                      - This work is encapsulated by the function _computeAdjustedOverflowAreaOffset
//                      - This functionality is especially useful when the host control of the _CommandingSurface isn't very wide, (for example, a WinJS ToolBar with a fixed width
//                        of 100px) and is already positioned near the left edge of the screen.
//                      - This functionality is RTL aware.
//
//        - Rendering the overflow button.The _CommandingSurface does not want to display the overflow button if there would be no additional content for the end user to discover.
//            - The overflowbutton will rendered inside of the action area when any of the following are true:
//                - The control is opened
//                - The control is closed and there are commands in the overflowarea
//                - The control is closed and there is additional content to reveal in the actionarea if it were opened.(determined by the closedDisplayMode property)
//
//    - Keyboarding: The commanding surface owns all the logic for moving focus between commands via the 4 arrow keys and the home and end ke

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
    // 'hidden' refers to the command.hidden property set to true,
    // 'shown' refers to the command.hidden property set to false.

    /*
     * Command elements that are in the DOM after the data change.
     */
    nextElements: HTMLElement[];

    /*
     * Command elements that were in the DOM before the data change.
     */
    prevElements: HTMLElement[];

    /*
     * Command elements that were not in the DOM before the data change but are in the DOM after the data change.
     */
    added: HTMLElement[];

    /*
     * Command elements that are not in the DOM after the data change.
     */
    deleted: HTMLElement[];

    /*
     * Command elements that are overflown after the data change.
     */
    overflown: HTMLElement[];

    /*
     * Command elements that were in the DOM before data change and are still in the DOM after the data change.
     */
    unchanged: HTMLElement[];

    /*
     * Command elements that were shown before but hidden after data change.
     */
    hiding: HTMLElement[];

    /*
     * Command elements that were hidden before but shown after the data change.
     */
    showing: HTMLElement[];
}


interface ICommandingSurface_UpdateDomImpl {
    renderedState: {
        closedDisplayMode: string;
        isOpenedMode: boolean;
        overflowDirection: string;
        overflowAlignmentOffset: number;
    };
    update(): void;
    dataDirty(): void;
    measurementsDirty(): void;
    layoutDirty(): void;
};

var strings = {
    get overflowButtonAriaLabel() { return _Resources._getWinJSString("ui/commandingSurfaceOverflowButtonAriaLabel").value; },
    get badData() { return "Invalid argument: The data property must an instance of a WinJS.Binding.List"; },
    get mustContainCommands() { return "The commandingSurface can only contain WinJS.UI.Command or WinJS.UI.AppBarCommand controls"; },
    get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; }
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

function intersectElements(arr1: HTMLElement[], arr2: HTMLElement[]): HTMLElement[] {
    // Returns a new array that is the intersection between arr1 and arr2.
    return arr1.filter(x => arr2.indexOf(x) !== -1);
}

/// Represents an apaptive surface for displaying commands.
export class _CommandingSurface {

    private _id: string;
    private _contentFlyout: _Flyout.Flyout;
    private _contentFlyoutInterior: HTMLElement; /* The reparented content node inside of _contentFlyout.element */
    private _hoverable = _Hoverable.isHoverable; /* force dependency on hoverable module */
    private _winKeyboard: _KeyboardBehavior._WinKeyboard;
    private _refreshBound: () => void;
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
    private _initializedSignal: _Signal<any>;
    private _isOpenedMode: boolean;
    private _overflowAlignmentOffset: number;
    private _menuCommandProjections: _MenuCommand.MenuCommand[];
    _layoutCompleteCallback: () => any;

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
        content: HTMLElement;
        actionArea: HTMLElement;
        actionAreaContainer: HTMLElement;
        actionAreaSpacer: HTMLElement;
        overflowButton: HTMLButtonElement;
        overflowArea: HTMLElement;
        overflowAreaContainer: HTMLElement;
        overflowAreaSpacer: HTMLElement;
        firstTabStop: HTMLElement;
        finalTabStop: HTMLElement;
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
            // Changing closedDisplayMode can trigger the overflowButton to show/hide itself in the action area.
            // Commands may need to reflow based on any changes to the available width in the action area.
            this._updateDomImpl.layoutDirty();

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


        if (element) {
            // Check to make sure we weren't duplicated
            if (element["winControl"]) {
                throw new _ErrorFromName("WinJS.UI._CommandingSurface.DuplicateConstruction", strings.duplicateConstruction);
            }

            if (!options.data) {
                // Shallow copy object so we can modify it.
                options = _BaseUtils._shallowCopy(options);

                // Get default data from any command defined in markup.
                options.data = options.data || this._getDataFromDOMElements(element);
            }
        }

        this._initializeDom(element || _Global.document.createElement("div"));
        this._machine = options.openCloseMachine || new _OpenCloseMachine.OpenCloseMachine({
            eventElement: this._dom.root,
            onOpen: () => {
                this.synchronousOpen();
                return Promise.wrap();
            },
            onClose: () => {
                this.synchronousClose();
                return Promise.wrap();
            },
            onUpdateDom: () => {
                this._updateDomImpl.update();
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
        this._isOpenedMode = _Constants.defaultOpened;
        this._menuCommandProjections = [];

        // Initialize public properties.
        this.overflowDirection = _Constants.defaultOverflowDirection;
        this.closedDisplayMode = _Constants.defaultClosedDisplayMode;
        this.opened = this._isOpenedMode;

        _Control.setOptions(this, options);

        // Event handlers
        _ElementUtilities._resizeNotifier.subscribe(this._dom.root, this._resizeHandlerBound);
        this._dom.root.addEventListener('keydown', this._keyDownHandler.bind(this));
        _ElementUtilities._addEventListener(this._dom.firstTabStop, "focusin", () => { this._focusLastFocusableElementOrThis(false); });
        _ElementUtilities._addEventListener(this._dom.finalTabStop, "focusin", () => { this._focusFirstFocusableElementOrThis(false); });

        // Exit the Init state.
        _ElementUtilities._inDom(this._dom.root).then(() => {
            this._rtl = _ElementUtilities._getComputedStyle(this._dom.root).direction === 'rtl';
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
        /// Forces the CommandingSurface to update its layout. Use this function when the window did not change 
        /// size, but the container of the CommandingSurface changed size.
        this._updateDomImpl.measurementsDirty();
        this._machine.updateDom();
    }

    getBoundingRects(): { commandingSurface: ClientRect; overflowArea: ClientRect; } {
        return {
            commandingSurface: this._dom.root.getBoundingClientRect(),
            overflowArea: this._dom.overflowArea.getBoundingClientRect(),
        };
    }

    getCommandById(id: string): _Command.ICommand {
        if (this._data) {
            for (var i = 0, len = this._data.length; i < len; i++) {
                var command = this._data.getAt(i);
                if (command.id === id) {
                    return command;
                }
            }
        }
        return null;
    }

    showOnlyCommands(commands: Array<string|_Command.ICommand>): void {
        if (this._data) {
            for (var i = 0, len = this._data.length; i < len; i++) {
                this._data.getAt(i).hidden = true;
            }

            for (var i = 0, len = commands.length; i < len; i++) {
                // The array passed to showOnlyCommands can contain either command ids, or the commands themselves.
                var command: _Command.ICommand = (typeof commands[i] === "string" ? this.getCommandById(<string>commands[i]) : <_Command.ICommand>commands[i]);
                if (command) {
                    command.hidden = false;
                }
            }
        }
    }

    takeFocus(useSetActive: boolean): void {
        this._focusFirstFocusableElementOrThis(useSetActive);
    }

    private _focusFirstFocusableElementOrThis(useSetActive: boolean): void {
        _ElementUtilities._focusFirstFocusableElement(this._dom.content, useSetActive) ||
        _ElementUtilities._tryFocusOnAnyElement(this.element, useSetActive);
    }

    private _focusLastFocusableElementOrThis(useSetActive: boolean): void {
        _ElementUtilities._focusLastFocusableElement(this._dom.content, useSetActive) ||
        _ElementUtilities._tryFocusOnAnyElement(this.element, useSetActive);
    }

    deferredDomUpate(): void {
        // Notify the machine that an update has been requested.
        this._machine.updateDom();
    }

    createOpenAnimation(closedHeight: number): { execute(): Promise<any> } {
        // createOpenAnimation should only be called when the commanding surface is in a closed state. The control using the commanding surface is expected
        // to call createOpenAnimation() before it opens the surface, then open the commanding surface, then call .execute() to start the animation.
        // This function is overridden by our unit tests.
        if (_Log.log) {
            this._updateDomImpl.renderedState.isOpenedMode &&
            _Log.log("The CommandingSurface should only attempt to create an open animation when it's not already opened");
        }
        var that = this;
        return {
            execute(): Promise<any> {
                _ElementUtilities.addClass(that.element, _Constants.ClassNames.openingClass);
                var boundingRects = that.getBoundingRects();
                // The overflowAreaContainer has no size by default. Measure the overflowArea's size and apply it to the overflowAreaContainer before animating
                that._dom.overflowAreaContainer.style.width = boundingRects.overflowArea.width + "px";
                that._dom.overflowAreaContainer.style.height = boundingRects.overflowArea.height + "px";
                return Animations._commandingSurfaceOpenAnimation({
                    actionAreaClipper: that._dom.actionAreaContainer,
                    actionArea: that._dom.actionArea,
                    overflowAreaClipper: that._dom.overflowAreaContainer,
                    overflowArea: that._dom.overflowArea,
                    oldHeight: closedHeight,
                    newHeight: boundingRects.commandingSurface.height,
                    overflowAreaHeight: boundingRects.overflowArea.height,
                    menuPositionedAbove: (that.overflowDirection === OverflowDirection.top),
                }).then(function () {
                        _ElementUtilities.removeClass(that.element, _Constants.ClassNames.openingClass);
                        that._clearAnimation();
                    });
            }
        };
    }

    createCloseAnimation(closedHeight: number): { execute(): Promise<any> } {
        // createCloseAnimation should only be called when the commanding surface is in an opened state. The control using the commanding surface is expected
        // to call createCloseAnimation() before it closes the surface, then call execute() to let the animation run. Once the animation finishes, the control
        // should close the commanding surface.
        // This function is overridden by our unit tests.
        if (_Log.log) {
            !this._updateDomImpl.renderedState.isOpenedMode &&
            _Log.log("The CommandingSurface should only attempt to create an closed animation when it's not already closed");
        }
        var openedHeight = this.getBoundingRects().commandingSurface.height,
            overflowAreaOpenedHeight = this._dom.overflowArea.offsetHeight,
            oldOverflowTop = this._dom.overflowArea.offsetTop,
            that = this;
        return {
            execute(): Promise<any> {
                _ElementUtilities.addClass(that.element, _Constants.ClassNames.closingClass);
                return Animations._commandingSurfaceCloseAnimation({
                    actionAreaClipper: that._dom.actionAreaContainer,
                    actionArea: that._dom.actionArea,
                    overflowAreaClipper: that._dom.overflowAreaContainer,
                    overflowArea: that._dom.overflowArea,
                    oldHeight: openedHeight,
                    newHeight: closedHeight,
                    overflowAreaHeight: overflowAreaOpenedHeight,
                    menuPositionedAbove: (that.overflowDirection === OverflowDirection.top),
                }).then(function () {
                        _ElementUtilities.removeClass(that.element, _Constants.ClassNames.closingClass);
                        that._clearAnimation();
                    });
            }
        };
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

        var content = _Global.document.createElement("div");
        _ElementUtilities.addClass(content, _Constants.ClassNames.contentClass);
        root.appendChild(content);

        var actionArea = _Global.document.createElement("div");
        _ElementUtilities.addClass(actionArea, _Constants.ClassNames.actionAreaCssClass);
        var actionAreaInsetOutline = document.createElement("div");
        _ElementUtilities.addClass(actionAreaInsetOutline, _Constants.ClassNames.insetOutlineClass);
        var actionAreaContainer = _Global.document.createElement("div");
        _ElementUtilities.addClass(actionAreaContainer, _Constants.ClassNames.actionAreaContainerCssClass);

        actionAreaContainer.appendChild(actionArea);
        actionAreaContainer.appendChild(actionAreaInsetOutline);
        content.appendChild(actionAreaContainer);

        // This element helps us work around cross browser flexbox bugs. When there are no primary
        // commands in the action area but there IS a visible overflow button, some browsers will:
        //  1. Collapse the action area.
        //  2. Push overflowbutton outside of the action area's clipping rect.
        var actionAreaSpacer = _Global.document.createElement("div");
        _ElementUtilities.addClass(actionAreaSpacer, _Constants.ClassNames.spacerCssClass);
        actionAreaSpacer.tabIndex = -1;
        actionArea.appendChild(actionAreaSpacer);

        var overflowButton = _Global.document.createElement("button");
        overflowButton.tabIndex = 0;
        overflowButton.innerHTML = "<span class='" + _Constants.ClassNames.ellipsisCssClass + "'></span>";
        overflowButton.setAttribute("aria-label", strings.overflowButtonAriaLabel);
        _ElementUtilities.addClass(overflowButton, _Constants.ClassNames.overflowButtonCssClass);
        actionArea.appendChild(overflowButton);
        overflowButton.addEventListener("click", () => {
            this.opened = !this.opened;
        });

        var overflowArea = _Global.document.createElement("div");
        _ElementUtilities.addClass(overflowArea, _Constants.ClassNames.overflowAreaCssClass);
        _ElementUtilities.addClass(overflowArea, _Constants.ClassNames.menuCssClass);
        var overflowInsetOutline = _Global.document.createElement("DIV");
        _ElementUtilities.addClass(overflowInsetOutline, _Constants.ClassNames.insetOutlineClass);
        var overflowAreaContainer = _Global.document.createElement("div");
        _ElementUtilities.addClass(overflowAreaContainer, _Constants.ClassNames.overflowAreaContainerCssClass);

        overflowAreaContainer.appendChild(overflowArea);
        overflowAreaContainer.appendChild(overflowInsetOutline);
        content.appendChild(overflowAreaContainer);

        // This element is always placed at the end of the overflow area and is used to provide a better
        // "end of scrollable region" visual.
        var overflowAreaSpacer = _Global.document.createElement("div");
        _ElementUtilities.addClass(overflowAreaSpacer, _Constants.ClassNames.spacerCssClass);
        overflowAreaSpacer.tabIndex = -1;
        overflowArea.appendChild(overflowAreaSpacer);

        var firstTabStop = _Global.document.createElement("div");
        _ElementUtilities.addClass(firstTabStop, _Constants.ClassNames.tabStopClass);
        _ElementUtilities._ensureId(firstTabStop);
        root.insertBefore(firstTabStop, root.children[0]);

        var finalTabStop = _Global.document.createElement("div");
        _ElementUtilities.addClass(finalTabStop, _Constants.ClassNames.tabStopClass);
        _ElementUtilities._ensureId(finalTabStop);
        root.appendChild(finalTabStop);

        this._dom = {
            root: root,
            content: content,
            actionArea: actionArea,
            actionAreaContainer: actionAreaContainer,
            actionAreaSpacer: actionAreaSpacer,
            overflowButton: overflowButton,
            overflowArea: overflowArea,
            overflowAreaContainer: overflowAreaContainer,
            overflowAreaSpacer: overflowAreaSpacer,
            firstTabStop: firstTabStop,
            finalTabStop: finalTabStop,
        };
    }

    private _getFocusableElementsInfo(): IFocusableElementsInfo {
        var focusableCommandsInfo: IFocusableElementsInfo = {
            elements: [],
            focusedIndex: -1
        };

        var elementsInReach = Array.prototype.slice.call(this._dom.actionArea.children);
        if (this._updateDomImpl.renderedState.isOpenedMode) {
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
        this._updateDomImpl.dataDirty();
        this._machine.updateDom();
    }

    private _refresh() {
        if (!this._refreshPending) {
            this._refreshPending = true;

            // Batch calls to _dataUpdated
            this._batchDataUpdates(() => {
                if (this._refreshPending && !this._disposed) {
                    this._refreshPending = false;
                    this._dataUpdated();
                }
            });
        }
    }

    // _batchDataUpdates is used by unit tests
    _batchDataUpdates(updateFn: () => void): void {
        Scheduler.schedule(() => {
            updateFn();
        }, Scheduler.Priority.high, null, "WinJS.UI._CommandingSurface._refresh");
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
                focusable = !this._hasAnyHiddenClasses(command) &&
                command.type !== _Constants.typeSeparator &&
                !command.hidden &&
                !command.disabled &&
                (!command.firstElementFocus || command.firstElementFocus.tabIndex >= 0 || command.lastElementFocus.tabIndex >= 0);
            } else {
                // e.g. the overflow button
                focusable = element.style.display !== "none" &&
                _ElementUtilities._getComputedStyle(element).visibility !== "hidden" &&
                element.tabIndex >= 0;
            }
        }
        return focusable;
    }

    private _clearHiddenPolicyClasses(command: _Command.ICommand) {
        _ElementUtilities.removeClass(command.element, _Constants.ClassNames.commandPrimaryOverflownPolicyClass);
        _ElementUtilities.removeClass(command.element, _Constants.ClassNames.commandSecondaryOverflownPolicyClass);
        _ElementUtilities.removeClass(command.element, _Constants.ClassNames.commandSeparatorHiddenPolicyClass);
    }

    private _hasHiddenPolicyClasses(command: _Command.ICommand) {
        return _ElementUtilities.hasClass(command.element, _Constants.ClassNames.commandPrimaryOverflownPolicyClass)
            || _ElementUtilities.hasClass(command.element, _Constants.ClassNames.commandSecondaryOverflownPolicyClass)
            || _ElementUtilities.hasClass(command.element, _Constants.ClassNames.commandSeparatorHiddenPolicyClass);
    }

    private _hasAnyHiddenClasses(command: _Command.ICommand) {
        // Checks if we've processed and recognized a command as being hidden
        return _ElementUtilities.hasClass(command.element, _Constants.ClassNames.commandHiddenClass) || this._hasHiddenPolicyClasses(command);
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

    private _getDataFromDOMElements(root: HTMLElement): BindingList.List<_Command.ICommand> {
        this._writeProfilerMark("_getDataFromDOMElements,info");

        ControlProcessor.processAll(root, /*skip root*/ true);

        var commands: _Command.ICommand[] = [];
        var childrenLength = root.children.length;
        var child: Element;
        for (var i = 0; i < childrenLength; i++) {
            child = root.children[i];
            if (child["winControl"] && child["winControl"] instanceof _Command.AppBarCommand) {
                commands.push(child["winControl"]);
            } else {
                throw new _ErrorFromName("WinJS.UI._CommandingSurface.MustContainCommands", strings.mustContainCommands);
            }
        }
        return new BindingList.List(commands);
    }

    private _canMeasure() {
        return (this._updateDomImpl.renderedState.isOpenedMode ||
            this._updateDomImpl.renderedState.closedDisplayMode === ClosedDisplayMode.compact ||
            this._updateDomImpl.renderedState.closedDisplayMode === ClosedDisplayMode.full) &&
            _Global.document.body.contains(this._dom.root) && this._dom.actionArea.offsetWidth > 0;
    }

    private _resizeHandler() {
        if (this._canMeasure()) {
            var currentActionAreaWidth = _ElementUtilities._getPreciseContentWidth(this._dom.actionArea);
            if (this._cachedMeasurements && this._cachedMeasurements.actionAreaContentBoxWidth !== currentActionAreaWidth) {
                this._cachedMeasurements.actionAreaContentBoxWidth = currentActionAreaWidth
                this._updateDomImpl.layoutDirty();
                this._machine.updateDom();
            }
        } else {
            this._updateDomImpl.measurementsDirty();
        }
    }

    synchronousOpen(): void {

        this._overflowAlignmentOffset = 0;
        this._isOpenedMode = true;
        this._updateDomImpl.update();
        this._overflowAlignmentOffset = this._computeAdjustedOverflowAreaOffset();
        this._updateDomImpl.update();
    }

    private _computeAdjustedOverflowAreaOffset(): number {
        // Returns any negative offset needed to prevent the shown overflowarea from clipping outside of the viewport.
        // This function should only be called when CommandingSurface has been rendered in the opened state with
        // an overflowAlignmentOffset of 0.
        if (_Log.log) {
            !this._updateDomImpl.renderedState.isOpenedMode &&
            _Log.log("The CommandingSurface should only attempt to compute adjusted overflowArea offset " +
                " when it has been rendered opened");

            this._updateDomImpl.renderedState.overflowAlignmentOffset !== 0 &&
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
        this._updateDomImpl.update();
    }

    updateDom(): void {
        this._updateDomImpl.update();
    }

    private _updateDomImpl: ICommandingSurface_UpdateDomImpl = (() => {
        // Self executing function returns a JavaScript Object literal that
        // implements the ICommandingSurface_UpdateDomImpl Inteface.

        // State private to _renderDisplayMode. No other method should make use of it.
        //
        // Nothing has been rendered yet so these are all initialized to undefined. Because
        // they are undefined, the first time _updateDomImpl.update is called, they will all be
        // rendered.
        var _renderedState = {
            closedDisplayMode: <string>undefined,
            isOpenedMode: <boolean>undefined,
            overflowDirection: <string>undefined,
            overflowAlignmentOffset: <number>undefined,
        };

        var _renderDisplayMode = () => {
            var rendered = _renderedState;
            var dom = this._dom;

            if (rendered.isOpenedMode !== this._isOpenedMode) {
                if (this._isOpenedMode) {
                    // Render opened
                    removeClass(dom.root, _Constants.ClassNames.closedClass);
                    addClass(dom.root, _Constants.ClassNames.openedClass);
                    dom.overflowButton.setAttribute("aria-expanded", "true");

                    // Focus should carousel between first and last tab stops while opened.
                    dom.firstTabStop.tabIndex = 0;
                    dom.finalTabStop.tabIndex = 0;
                    dom.firstTabStop.setAttribute("x-ms-aria-flowfrom", dom.finalTabStop.id);
                    dom.finalTabStop.setAttribute("aria-flowto", dom.firstTabStop.id);
                } else {
                    // Render closed
                    removeClass(dom.root, _Constants.ClassNames.openedClass);
                    addClass(dom.root, _Constants.ClassNames.closedClass);
                    dom.overflowButton.setAttribute("aria-expanded", "false");

                    // Focus should not carousel between first and last tab stops while closed.
                    dom.firstTabStop.tabIndex = -1;
                    dom.finalTabStop.tabIndex = -1;
                    dom.firstTabStop.removeAttribute("x-ms-aria-flowfrom");
                    dom.finalTabStop.removeAttribute("aria-flowto");
                }
                rendered.isOpenedMode = this._isOpenedMode;
            }

            if (rendered.closedDisplayMode !== this.closedDisplayMode) {
                removeClass(dom.root, closedDisplayModeClassMap[rendered.closedDisplayMode]);
                addClass(dom.root, closedDisplayModeClassMap[this.closedDisplayMode]);
                rendered.closedDisplayMode = this.closedDisplayMode;
            }

            if (rendered.overflowDirection !== this.overflowDirection) {
                removeClass(dom.root, overflowDirectionClassMap[rendered.overflowDirection]);
                addClass(dom.root, overflowDirectionClassMap[this.overflowDirection]);
                rendered.overflowDirection = this.overflowDirection;
            }

            if (this._overflowAlignmentOffset !== rendered.overflowAlignmentOffset) {
                var offsetProperty = (this._rtl ? "left" : "right");
                var offsetTextValue = this._overflowAlignmentOffset + "px";
                dom.overflowAreaContainer.style[offsetProperty] = offsetTextValue;
            }
        };

        var CommandLayoutPipeline = {
            newDataStage: 3,
            measuringStage: 2,
            layoutStage: 1,
            idle: 0,
        };

        var _currentLayoutStage = CommandLayoutPipeline.idle;

        var _updateCommands = () => {
            this._writeProfilerMark("_updateDomImpl_updateCommands,info");

            var currentStage = _currentLayoutStage;
            // The flow of stages in the CommandLayoutPipeline is defined as:
            //      newDataStage -> measuringStage -> layoutStage -> idle
            while (currentStage !== CommandLayoutPipeline.idle) {
                var prevStage = currentStage;
                var okToProceed = false;
                switch (currentStage) {
                    case CommandLayoutPipeline.newDataStage:
                        currentStage = CommandLayoutPipeline.measuringStage;
                        okToProceed = this._processNewData();
                        break;
                    case CommandLayoutPipeline.measuringStage:
                        currentStage = CommandLayoutPipeline.layoutStage;
                        okToProceed = this._measure();
                        break;
                    case CommandLayoutPipeline.layoutStage:
                        currentStage = CommandLayoutPipeline.idle;
                        okToProceed = this._layoutCommands();
                        break;
                }

                if (!okToProceed) {
                    // If a stage fails, exit the loop and track that stage
                    // to be restarted the next time _updateCommands is run.
                    currentStage = prevStage;
                    break;
                }
            }

            _currentLayoutStage = currentStage;
            if (currentStage === CommandLayoutPipeline.idle) {
                // Callback for unit tests.
                this._layoutCompleteCallback && this._layoutCompleteCallback();
            } else {
                // We didn't reach the end of the pipeline. Therefore
                // one of the stages failed and layout could not complete.
                this._minimalLayout();
            }
        };

        return {
            get renderedState() {
                return {
                    get closedDisplayMode() { return _renderedState.closedDisplayMode },
                    get isOpenedMode() { return _renderedState.isOpenedMode },
                    get overflowDirection() { return _renderedState.overflowDirection },
                    get overflowAlignmentOffset() { return _renderedState.overflowAlignmentOffset },
                };
            },
            update(): void {
                _renderDisplayMode();
                _updateCommands();
            },
            dataDirty: () => {
                _currentLayoutStage = Math.max(CommandLayoutPipeline.newDataStage, _currentLayoutStage);
            },
            measurementsDirty: () => {
                _currentLayoutStage = Math.max(CommandLayoutPipeline.measuringStage, _currentLayoutStage);
            },
            layoutDirty: () => {
                _currentLayoutStage = Math.max(CommandLayoutPipeline.layoutStage, _currentLayoutStage);
            },
            get _currentLayoutStage() {
                // Expose this for its usefulness in F12 debugging.
                return _currentLayoutStage;
            },
        }

    })();

    private _getDataChangeInfo(): IDataChangeInfo {
        var i = 0, len = 0;
        var added: HTMLElement[] = [];
        var deleted: HTMLElement[] = [];
        var unchanged: HTMLElement[] = [];
        var prevVisible: HTMLElement[] = [];
        var prevElements: HTMLElement[] = [];
        var nextVisible: HTMLElement[] = [];
        var nextElements: HTMLElement[] = [];
        var nextOverflown: HTMLElement[] = [];
        var nextHiding: HTMLElement[] = [];
        var nextShowing: HTMLElement[] = [];

        Array.prototype.forEach.call(this._dom.actionArea.querySelectorAll(_Constants.commandSelector), (commandElement: HTMLElement) => {
            if (!this._hasAnyHiddenClasses(commandElement["winControl"])) {
                prevVisible.push(commandElement);
            }
            prevElements.push(commandElement);
        });

        this.data.forEach((command) => {
            var hidden = command.hidden;
            var hiding = hidden && !_ElementUtilities.hasClass(command.element, _Constants.ClassNames.commandHiddenClass);
            var showing = !hidden && _ElementUtilities.hasClass(command.element, _Constants.ClassNames.commandHiddenClass);
            var overflown = _ElementUtilities.hasClass(command.element, _Constants.ClassNames.commandPrimaryOverflownPolicyClass);

            if (!this._hasAnyHiddenClasses(command.element["winControl"])) {
                nextVisible.push(command.element);
            }

            if (overflown) {
                nextOverflown.push(command.element);
            } else if (hiding) {
                nextHiding.push(command.element);
            } else if (showing) {
                nextShowing.push(command.element);
            }
            nextElements.push(command.element);
        });

        deleted = diffElements(prevElements, nextElements);
        unchanged = intersectElements(prevVisible, nextVisible);
        added = diffElements(nextElements, prevElements);

        return {
            nextElements: nextElements,
            prevElements: prevElements,
            added: added,
            deleted: deleted,
            unchanged: unchanged,
            hiding: nextHiding,
            showing: nextShowing,
            overflown: nextOverflown
        };
    }

    private _processNewData(): boolean {
        this._writeProfilerMark("_processNewData,info");

        var changeInfo = this._getDataChangeInfo();

        // Take a snapshot of the current state
        var updateCommandAnimation = Animations._createUpdateListAnimation(
            // We must also include the elements from "overflown" to ensure that we continue
            // to animate any command elements that have underflowed back into the actionarea
            // as a part of this data change.
            changeInfo.added.concat(changeInfo.showing).concat(changeInfo.overflown),
            changeInfo.deleted.concat(changeInfo.hiding),
            changeInfo.unchanged);

        // Unbind property mutation event listener from deleted IObservableCommands
        changeInfo.deleted.forEach((deletedElement) => {
            var command = <_Command.ICommand>(deletedElement['winControl']);
            if (command && command['_propertyMutations']) {
                (<_Command.IObservableCommand>command)._propertyMutations.unbind(this._refreshBound);
            }
        });

        // Bind property mutation event listener to added IObservable commands
        changeInfo.added.forEach((addedElement) => {
            var command = <_Command.ICommand>(addedElement['winControl']);
            if (command && command['_propertyMutations']) {
                (<_Command.IObservableCommand>command)._propertyMutations.bind(this._refreshBound);
            }
        });

        // Remove current ICommand elements
        changeInfo.prevElements.forEach((element) => {
            if (element.parentElement) {
                element.parentElement.removeChild(element);
            }
        });

        // Add new ICommand elements in the right order.
        changeInfo.nextElements.forEach((element) => {
            this._dom.actionArea.appendChild(element);
        });

        // Actually hide commands now that the animation has been created
        changeInfo.hiding.forEach(element => {
            _ElementUtilities.addClass(element, _Constants.ClassNames.commandHiddenClass);
        });

        // Actually show commands now that the animation has been created
        changeInfo.showing.forEach(element => {
            _ElementUtilities.removeClass(element, _Constants.ClassNames.commandHiddenClass);
        });

        // Ensure that the overflow button is always the last element in the actionarea
        this._dom.actionArea.appendChild(this._dom.overflowButton);

        // Execute the animation.
        updateCommandAnimation.execute();

        // Indicate processing was successful.
        return true;
    }

    private _measure(): boolean {
        this._writeProfilerMark("_measure,info");
        if (this._canMeasure()) {

            var originalDisplayStyle = this._dom.overflowButton.style.display;
            this._dom.overflowButton.style.display = "";
            var overflowButtonWidth = _ElementUtilities._getPreciseTotalWidth(this._dom.overflowButton);
            this._dom.overflowButton.style.display = originalDisplayStyle;

            var actionAreaContentBoxWidth = _ElementUtilities._getPreciseContentWidth(this._dom.actionArea);

            var separatorWidth = 0;
            var standardCommandWidth = 0;
            var contentCommandWidths: { [uniqueID: string]: number; } = {};

            this._primaryCommands.forEach((command) => {
                // Ensure that the element we are measuring does not have display: none (e.g. it was just added, and it
                // will be animated in)
                var originalDisplayStyle = command.element.style.display;
                command.element.style.display = "inline-block";

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

        var visibleSecondaryCommands: _Command.ICommand[] = [];
        var visiblePrimaryCommands: _Command.ICommand[] = [];
        var visiblePrimaryCommandsForActionArea: _Command.ICommand[] = [];
        var visiblePrimaryCommandsForOverflowArea: _Command.ICommand[] = [];

        // Separate hidden commands from visible commands.
        // Organize visible commands by section.
        this.data.forEach((command) => {
            this._clearHiddenPolicyClasses(command);
            if (!command.hidden) {
                if (command.section === _Constants.secondaryCommandSection) {
                    visibleSecondaryCommands.push(command);
                } else {
                    visiblePrimaryCommands.push(command);
                }
            }
        });

        var hasVisibleSecondaryCommand = visibleSecondaryCommands.length > 0;
        var primaryCommandsLocation = this._getVisiblePrimaryCommandsLocation(visiblePrimaryCommands, hasVisibleSecondaryCommand);
        visiblePrimaryCommandsForActionArea = primaryCommandsLocation.commandsForActionArea;
        visiblePrimaryCommandsForOverflowArea = primaryCommandsLocation.commandsForOverflowArea;

        //
        // Layout commands in the action area
        //

        // Apply the policy classes for overflown and secondary commands.
        visiblePrimaryCommandsForOverflowArea.forEach(command => _ElementUtilities.addClass(command.element, _Constants.ClassNames.commandPrimaryOverflownPolicyClass));
        visibleSecondaryCommands.forEach(command => _ElementUtilities.addClass(command.element, _Constants.ClassNames.commandSecondaryOverflownPolicyClass));

        this._hideSeparatorsIfNeeded(visiblePrimaryCommandsForActionArea);

        //
        // Layout commands in the overflow area 
        // Project overflowing and secondary commands into the overflowArea as MenuCommands.
        //

        // Clean up previous MenuCommand projections
        _ElementUtilities.empty(this._dom.overflowArea);
        this._menuCommandProjections.map((menuCommand: _MenuCommand.MenuCommand) => {
            menuCommand.dispose();
        });

        // Set up a custom content flyout if there will be "content" typed commands in the overflowarea.
        var isCustomContent = (command: _Command.ICommand) => { return command.type === _Constants.typeContent };
        var hasCustomContent = visiblePrimaryCommandsForOverflowArea.some(isCustomContent) || visibleSecondaryCommands.some(isCustomContent);

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

        var hasToggleCommands = false,
            menuCommandProjections: _MenuCommand.MenuCommand[] = [];

        // Add primary commands that have overflowed.
        visiblePrimaryCommandsForOverflowArea.forEach((command) => {
            if (command.type === _Constants.typeToggle) {
                hasToggleCommands = true;
            }
            menuCommandProjections.push(this._projectAsMenuCommand(command));
        });

        // Add new separator between primary and secondary command, if applicable.
        if (visiblePrimaryCommandsForOverflowArea.length > 0 && visibleSecondaryCommands.length > 0) {
            var separator = new _CommandingSurfaceMenuCommand._MenuCommand(null, {
                type: _Constants.typeSeparator
            });

            menuCommandProjections.push(separator);
        }

        // Add secondary commands
        visibleSecondaryCommands.forEach((command) => {
            if (command.type === _Constants.typeToggle) {
                hasToggleCommands = true;
            }
            menuCommandProjections.push(this._projectAsMenuCommand(command));
        });

        this._hideSeparatorsIfNeeded(menuCommandProjections);

        // Add menuCommandProjections to the DOM.
        menuCommandProjections.forEach((command) => {
            this._dom.overflowArea.appendChild(command.element);
        });
        this._menuCommandProjections = menuCommandProjections;

        // Reserve additional horizontal space for toggle icons if any MenuCommand projection is type "toggle"
        _ElementUtilities[hasToggleCommands ? "addClass" : "removeClass"](this._dom.overflowArea, _Constants.ClassNames.menuContainsToggleCommandClass);

        if (menuCommandProjections.length > 0) {
            // Re-append spacer to the end of the oveflowarea if there are visible commands there.
            // Otherwise the overflow area should be empty and not take up height.
            this._dom.overflowArea.appendChild(this._dom.overflowAreaSpacer);
        }

        //
        // Style the overflow button
        //

        var needsOverflowButton = this._needsOverflowButton(
            /* hasVisibleCommandsInActionArea */ visiblePrimaryCommandsForActionArea.length > 0, 
            /* hasVisibleCommandsInOverflowArea */ menuCommandProjections.length > 0
            );
        this._dom.overflowButton.style.display = needsOverflowButton ? "" : "none";

        this._writeProfilerMark("_layoutCommands,StopTM");

        // Indicate layout was successful.
        return true;
    }

    private _getVisiblePrimaryCommandsInfo(visibleCommands: _Command.ICommand[]): ICommandInfo[] {
        // PRECONDITION: Assumes that for every command in visibleCommands, command.hidden === false;

        // Sorts and designates commands for the actionarea or the overflowarea, 
        // depending on available space and the priority order of the commands
        var width = 0;
        var visibleCommandsInfo: ICommandInfo[] = [];
        var priority = 0;
        var currentAssignedPriority = 0;

        for (var i = visibleCommands.length - 1; i >= 0; i--) {
            var command = visibleCommands[i];
            if (command.priority === undefined) {
                priority = currentAssignedPriority--;
            } else {
                priority = command.priority;
            }
            width = this._getCommandWidth(command);

            visibleCommandsInfo.unshift({
                command: command,
                width: width,
                priority: priority
            });
        }

        return visibleCommandsInfo;
    }

    private _getVisiblePrimaryCommandsLocation(visiblePrimaryCommands: _Command.ICommand[], isThereAVisibleSecondaryCommand: boolean) {
        // Returns two lists of primary commands, those which fit can in the actionarea and those which will overflow.
        var commandsForActionArea: _Command.ICommand[] = [];
        var commandsForOverflowArea: _Command.ICommand[] = [];

        var visibleCommandsInfo = this._getVisiblePrimaryCommandsInfo(visiblePrimaryCommands);

        // Sort by ascending priority 
        var sortedCommandsInfo = visibleCommandsInfo.slice(0).sort((commandInfo1: ICommandInfo, commandInfo2: ICommandInfo) => {
            return commandInfo1.priority - commandInfo2.priority;
        });

        var maxPriority = Number.MAX_VALUE;
        var currentAvailableWidth = this._cachedMeasurements.actionAreaContentBoxWidth;

        // Even though we don't yet know if we will have any primary commands overflowing into the 
        // overflow area, see if our current state already justifies a visible overflow button.
        var overflowButtonAlreadyNeeded = this._needsOverflowButton(
            /* hasVisibleCommandsInActionArea */ visiblePrimaryCommands.length > 0,
            /* hasVisibleCommandsInOverflowArea */ isThereAVisibleSecondaryCommand
            );

        for (var i = 0, len = sortedCommandsInfo.length; i < len; i++) {
            currentAvailableWidth -= sortedCommandsInfo[i].width;

            // Until we have reached the final sorted command, we presume we will need to fit 
            // the overflow button into the action area as well. If we are on the last command, 
            // and we don't already need an overflow button, free up the reserved space before 
            // checking whether or not the last command fits
            var additionalSpaceNeeded = (!overflowButtonAlreadyNeeded && (i === len - 1) ? 0 : this._cachedMeasurements.overflowButtonWidth);

            if (currentAvailableWidth < additionalSpaceNeeded) {
                // All primary commands with a priority greater than this final value should overflow.
                maxPriority = sortedCommandsInfo[i].priority - 1;
                break;
            }
        }

        // Designate each command to either the action area or the overflow area
        visibleCommandsInfo.forEach((commandInfo) => {
            if (commandInfo.priority <= maxPriority) {
                commandsForActionArea.push(commandInfo.command);
            } else {
                commandsForOverflowArea.push(commandInfo.command);
            }
        });

        return {
            commandsForActionArea: commandsForActionArea,
            commandsForOverflowArea: commandsForOverflowArea,
        };
    }

    private _needsOverflowButton(hasVisibleCommandsInActionArea: boolean, hasVisibleCommandsInOverflowArea: boolean): boolean {
        // The following "Inclusive-Or" conditions inform us if an overflow button is needed.
        // 1. There are going to be visible commands in the overflowarea. (primary or secondary)
        // 2. The action area is expandable and contains at least one visible primary command.
        if (hasVisibleCommandsInOverflowArea) {
            return true;
        } else if (this._hasExpandableActionArea() && hasVisibleCommandsInActionArea) {
            return true;
        } else {
            return false;
        }
    }

    private _minimalLayout(): void {
        // Normally the overflowButton will be updated based on the most accurate measurements when layoutCommands() is run, 
        // However if we are unable to measure, then layout will not run. Normally if we cannot measure it means the control
        // is not rendered. However, when the control is closed with closedDisplayMode: 'minimal' we cannot measure and the 
        // control is rendered. Perform a minimal layout to show/hide the overflow button whether or not there are any
        // visible commands to show.
        if (this.closedDisplayMode === ClosedDisplayMode.minimal) {
            var isCommandVisible = (command: _Command.ICommand) => {
                return !command.hidden;
            };

            var hasVisibleCommand = this.data.some(isCommandVisible);
            this._dom.overflowButton.style.display = (hasVisibleCommand ? "" : "none");
        }
    }

    private _commandUniqueId(command: _Command.ICommand): string {
        return _ElementUtilities._uniqueID(command.element);
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
            tooltip: originalCommand.tooltip,
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
                _ElementUtilities.addClass(command.element, _Constants.ClassNames.commandSeparatorHiddenPolicyClass);
            }
            prevType = command.type;
        });

        // Hide trailing separators
        for (var i = commandsLength - 1; i >= 0; i--) {
            command = commands[i];
            if (command.type === _Constants.typeSeparator) {
                _ElementUtilities.addClass(command.element, _Constants.ClassNames.commandSeparatorHiddenPolicyClass);
            } else {
                break;
            }
        }
    }

    private _hasExpandableActionArea(): boolean {
        // Can the actionarea expand to reveal more content given the current closedDisplayMode?
        switch (this.closedDisplayMode) {
            case ClosedDisplayMode.none:
            case ClosedDisplayMode.minimal:
            case ClosedDisplayMode.compact:
                return true;
            case ClosedDisplayMode.full:
            default:
                return false;
        }
    }

    private _clearAnimation(): void {
        var transformScriptName = _BaseUtils._browserStyleEquivalents["transform"].scriptName;
        this._dom.actionAreaContainer.style[transformScriptName] = "";
        this._dom.actionArea.style[transformScriptName] = "";
        this._dom.overflowAreaContainer.style[transformScriptName] = "";
        this._dom.overflowArea.style[transformScriptName] = "";
    }
}

_Base.Class.mix(_CommandingSurface, _Events.createEventProperties(
    _Constants.EventNames.beforeOpen,
    _Constants.EventNames.afterOpen,
    _Constants.EventNames.beforeClose,
    _Constants.EventNames.afterClose));

// addEventListener, removeEventListener, dispatchEvent
_Base.Class.mix(_CommandingSurface, _Control.DOMEventMixin);
