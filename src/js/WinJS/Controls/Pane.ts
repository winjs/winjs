// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import Animations = require('../Animations');
import _Base = require('../Core/_Base');
import _BaseUtils = require('../Core/_BaseUtils');
import _Control = require('../Utilities/_Control');
import _Dispose = require('../Utilities/_Dispose');
import _ElementUtilities = require('../Utilities/_ElementUtilities');
import _ErrorFromName = require('../Core/_ErrorFromName');
import _Events = require('../Core/_Events');
import _Global = require('../Core/_Global');
import _Hoverable = require('../Utilities/_Hoverable');
import _LightDismissService = require('../_LightDismissService');
import Promise = require('../Promise');
import _Signal = require('../_Signal');
import _TransitionAnimation = require('../Animations/_TransitionAnimation');

require(["require-style!less/styles-pane"]);
require(["require-style!less/colors-pane"]);

"use strict";

interface IRect {
    left: number;
    top: number;
    contentWidth: number;
    contentHeight: number
    totalWidth: number;
    totalHeight: number;
}

export interface IThickness {
    content: number;
    total: number;
}

var transformNames = _BaseUtils._browserStyleEquivalents["transform"];
var Strings = {
    get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; }
};
var ClassNames = {
    pane: "win-pane",
    
    // hidden/shown
    hidden: "win-pane-pane-hidden",
    shown: "win-pane-pane-shown",

    _content: "win-pane-content",
    // placement
    _placementLeft: "win-pane-placementleft",
    _placementRight: "win-pane-placementright",
    _placementTop: "win-pane-placementtop",
    _placementBottom: "win-pane-placementbottom",
    // hidden display mode
    _hiddenDisplayNone: "win-pane-hiddendisplaynone",
    _hiddenDisplayOverlay: "win-pane-hiddendisplayoverlay",
};
var EventNames = {
    beforeShow: "beforeshow",
    afterShow: "aftershow",
    beforeHide: "beforehide",
    afterHide: "afterhide"
};
var Dimension = {
    width: "width",
    height: "height"
};

var HiddenDisplayMode = {
    none: "none",
    overlay: "overlay"
};
var Placement = {
    left: "left",
    right: "right",
    top: "top",
    bottom: "bottom"
};
var hiddenDisplayModeClassMap = {};
hiddenDisplayModeClassMap[HiddenDisplayMode.none] = ClassNames._hiddenDisplayNone;
hiddenDisplayModeClassMap[HiddenDisplayMode.overlay] = ClassNames._hiddenDisplayOverlay;
var placementClassMap = {};
placementClassMap[Placement.left] = ClassNames._placementLeft;
placementClassMap[Placement.right] = ClassNames._placementRight;
placementClassMap[Placement.top] = ClassNames._placementTop;
placementClassMap[Placement.bottom] = ClassNames._placementBottom;

// Versions of add/removeClass that are no ops when called with falsy class names.
function addClass(element: HTMLElement, className: string): void {
    className && _ElementUtilities.addClass(element, className);
}
function removeClass(element: HTMLElement, className: string): void {
    className && _ElementUtilities.removeClass(element, className);
}

function rectToThickness(rect: IRect, dimension: string): IThickness {
    return (dimension === Dimension.width) ? {
        content: rect.contentWidth,
        total: rect.totalWidth
    }: {
        content: rect.contentHeight,
        total: rect.totalHeight
    };
}

// WinJS animation promises always complete successfully. This
// helper allows an animation promise to complete in the canceled state
// so that the success handler can be skipped when the animation is
// interrupted.
function cancelablePromise(animationPromise: Promise<any>) {
    return Promise._cancelBlocker(animationPromise, function () {
        animationPromise.cancel();
    });
}

function showEdgeUI(elements: any, offsets: any): Promise<any> {
    return cancelablePromise(Animations.showEdgeUI(elements, offsets, { mechanism: "transition" }));
}

function hideEdgeUI(elements: any, offsets: any): Promise<any> {
    return cancelablePromise(Animations.hideEdgeUI(elements, offsets, { mechanism: "transition" }));
}

function fadeIn(elements: any): Promise<any> {
    return cancelablePromise(Animations.fadeIn(elements));
}

function resizeTransition(elementClipper: HTMLElement, element: HTMLElement, options: { from: IThickness; to: IThickness; dimension: string; anchorTrailingEdge: boolean; }): Promise<any> {
    return cancelablePromise(Animations._resizeTransition(elementClipper, element, options));
}

//
// State machine
//

// Noop function, used in the various states to indicate that they don't support a given
// message. Named with the somewhat cute name '_' because it reads really well in the states.
function _() { }

// Implementing the control as a state machine helps us correctly handle:
//   - re-entrancy while firing events
//   - calls into the control during asynchronous operations (e.g. animations)
//
// Many of the states do their "enter" work within a promise chain. The idea is that if
// the state is interrupted and exits, the rest of its work can be skipped by canceling
// the promise chain.
// An interesting detail is that anytime the state may call into app code (e.g. due to
// firing an event), the current promise must end and a new promise must be chained off of it.
// This is necessary because the app code may interact with the control and cause it to
// change states. If we didn't create a new promise, then the very next line of code that runs
// after calling into app code may not be valid because the state may have exited. Starting a
// new promise after each call into app code prevents us from having to worry about this
// problem. In this configuration, when a promise's success handler runs, it guarantees that
// the state hasn't exited.
// For similar reasons, each of the promise chains created in "enter" starts off with a _Signal
// which is completed at the end of the "enter" function (this boilerplate is abstracted away by
// the "interruptible" function). The reason is that we don't want any of the code in "enter"
// to run until the promise chain has been stored in a variable. If we didn't do this (e.g. instead,
// started the promise chain with Promise.wrap()), then the "enter" code could trigger the "exit"
// function (via app code) before the promise chain had been stored in a variable. Under these
// circumstances, the promise chain would be uncancelable and so the "enter" work would be
// unskippable. This wouldn't be good when we needed the state to exit early.

// These two functions manage interruptible work promises (one creates them the other cancels
// them). They communicate with each other thru the _interruptibleWorkPromises property which
//  "interruptible" creates on your object.

function interruptible<T>(object: T, workFn: (promise: Promise<any>) => Promise<any>) {
    object["_interruptibleWorkPromises"] = object["_interruptibleWorkPromises"] || [];
    var workStoredSignal = new _Signal();
    object["_interruptibleWorkPromises"].push(workFn(workStoredSignal.promise));
    workStoredSignal.complete();
}

function cancelInterruptibles() {
    (this["_interruptibleWorkPromises"] || []).forEach((workPromise: _Signal<any>) => {
        workPromise.cancel();
    });
}

interface IPaneState {
    // Debugging
    name: string;
    // State lifecyle
    enter(args: any): void;
    exit(): void;
    // SplitView's API surface
    hidden: boolean; // readyonly. Writes go thru show/hide.
    show(): void;
    hide(): void;
    // Misc
    updateDom(): void;
    // Provided by _setState for use within the state
    pane: Pane;
}

// Transitions:
//   When created, the control will take one of the following initialization transitions depending on
//   how the control's APIs have been used by the time it is inserted into the DOM:
//     Init -> Hidden
//     Init -> Shown
//   Following that, the life of the SplitView will be dominated by the following
//   sequences of transitions. In geneneral, these sequences are uninterruptible.
//     Hidden -> BeforeShow -> Hidden (when preventDefault is called on beforeshow event)
//     Hidden -> BeforeShow -> Showing -> Shown
//     Shown -> BeforeHide -> Shown (when preventDefault is called on beforehide event)
//     Shown -> BeforeHide -> Hiding -> Hidden
//   However, any state can be interrupted to go to the Disposed state:
//     * -> Disposed

module States {
    function updateDomImpl(): void {
        this.pane._updateDomImpl();
    }

    // Initial state. Initializes state on the SplitView shared by the various states.
    export class Init implements IPaneState {
        private _hidden: boolean;

        pane: Pane;
        name = "Init";
        enter(options?: any) {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    options = options || {};
                    
                    this.pane._dismissable = new _LightDismissService.LightDismissableElement({
                        element: this.pane._dom.root,
                        tabIndex: -1,
                        onLightDismiss: () => {
                            this.pane.hide();
                        }
                    });
                    this.pane._cachedHiddenPaneThickness = null;

                    this.pane.hidden = true;
                    this.pane.hiddenDisplayMode = HiddenDisplayMode.overlay;
                    this.pane.panePlacement = Placement.left;
                    _Control.setOptions(this.pane, options);

                    return _ElementUtilities._inDom(this.pane._dom.root).then(() => {
                        this.pane._rtl = _Global.getComputedStyle(this.pane._dom.root).direction === 'rtl';
                        this.pane._isShownMode = !this._hidden;
                        this.pane._updateDomImpl();
                        this.pane._setState(this._hidden ? Hidden : Shown);
                    });
                });
            });
        }
        exit = cancelInterruptibles;
        get hidden(): boolean {
            return this._hidden;
        }
        show() {
            this._hidden = false;
        }
        hide() {
            this._hidden = true;
        }
        updateDom = _; // Postponed until immediately before we switch to another state
    }

    // A rest state. The SplitView pane is hidden and is waiting for the app to call show.
    class Hidden implements IPaneState {
        pane: Pane;
        name = "Hidden";
        enter(args?: { showIsPending?: boolean; }) {
            args = args || {};
            if (args.showIsPending) {
                this.show();
            }
        }
        exit = _;
        hidden = true;
        show() {
            this.pane._setState(BeforeShow);
        }
        hide = _;
        updateDom = updateDomImpl;
    }

    // An event state. The SplitView fires the beforeshow event.
    class BeforeShow implements IPaneState {
        pane: Pane;
        name = "BeforeShow";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    return this.pane._fireBeforeShow(); // Give opportunity for chain to be canceled when calling into app code
                }).then((shouldShow) => {
                    if (shouldShow) {
                        this.pane._setState(Showing);
                    } else {
                        this.pane._setState(Hidden);
                    }
                });
            });
        }
        exit = cancelInterruptibles;
        hidden = true;
        show = _;
        hide = _;
        updateDom = updateDomImpl;
    }

    // An animation/event state. The SplitView plays its show animation and fires aftershow.
    class Showing implements IPaneState {
        private _hideIsPending: boolean;

        pane: Pane;
        name = "Showing";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    this._hideIsPending = false;

                    this.pane._cachedHiddenPaneThickness = null;
                    var hiddenPaneThickness = this.pane._getHiddenPaneThickness();

                    this.pane._isShownMode = true;
                    this.pane._updateDomImpl();
                    return this.pane._playShowAnimation(hiddenPaneThickness);
                }).then(() => {
                    this.pane._fireEvent(EventNames.afterShow); // Give opportunity for chain to be canceled when calling into app code
                }).then(() => {
                    this.pane._updateDomImpl();
                    this.pane._setState(Shown, { hideIsPending: this._hideIsPending });
                });
            });
        }
        exit = cancelInterruptibles;
        get hidden() {
            return this._hideIsPending;
        }
        show() {
            this._hideIsPending = false;
        }
        hide() {
            this._hideIsPending = true;
        }
        updateDom = _; // Postponed until immediately before we switch to another state
    }

    // A rest state. The SplitView pane is shown and is waiting for the app to trigger hide.
    class Shown implements IPaneState {
        pane: Pane;
        name = "Shown";
        enter(args?: { hideIsPending?: boolean }) {
            args = args || {};
            if (args.hideIsPending) {
                this.hide();
            }
        }
        exit = _;
        hidden = false;
        show = _;
        hide() {
            this.pane._setState(BeforeHide);
        }
        updateDom = updateDomImpl;
    }

    // An event state. The SplitView fires the beforehide event.
    class BeforeHide implements IPaneState {
        pane: Pane;
        name = "BeforeHide";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    return this.pane._fireBeforeHide(); // Give opportunity for chain to be canceled when calling into app code
                }).then((shouldHide) => {
                    if (shouldHide) {
                        this.pane._setState(Hiding);
                    } else {
                        this.pane._setState(Shown);
                    }
                });
            });
        }
        exit = cancelInterruptibles;
        hidden = false;
        show = _;
        hide = _;
        updateDom = updateDomImpl;
    }

    // An animation/event state. The SpitView plays the hide animation and fires the afterhide event.
    class Hiding implements IPaneState {
        private _showIsPending: boolean;

        pane: Pane;
        name = "Hiding";
        enter() {
            interruptible(this, (ready) => {
                return ready.then(() => {
                    this._showIsPending = false;
                    return this.pane._playHideAnimation(this.pane._getHiddenPaneThickness());
                }).then(() => {
                    this.pane._isShownMode = false;
                    this.pane._updateDomImpl();
                    this.pane._fireEvent(EventNames.afterHide); // Give opportunity for chain to be canceled when calling into app code
                }).then(() => {
                    this.pane._updateDomImpl();
                    this.pane._setState(Hidden, { showIsPending: this._showIsPending });
                });
            });
        }
        exit = cancelInterruptibles;
        get hidden() {
            return !this._showIsPending;
        }
        show() {
            this._showIsPending = true;
        }
        hide() {
            this._showIsPending = false;
        }
        updateDom = _; // Postponed until immediately before we switch to another state
    }

    export class Disposed implements IPaneState {
        pane: Pane;
        name = "Disposed";
        enter() {
            _LightDismissService.hidden(this.pane._dismissable);
        }
        exit = _;
        hidden = true;
        show = _;
        hide = _;
        updateDom = _;
    }
}

/// <field>
/// <summary locid="WinJS.UI.SplitView">
/// Displays a SplitView which renders a collapsable pane next to arbitrary HTML content.
/// </summary>
/// </field>
/// <icon src="ui_winjs.ui.splitview.12x12.png" width="12" height="12" />
/// <icon src="ui_winjs.ui.splitview.16x16.png" width="16" height="16" />
/// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.SplitView"></div>]]></htmlSnippet>
/// <event name="beforeshow" locid="WinJS.UI.SplitView_e:beforeshow">Raised just before showing the pane. Call preventDefault on this event to stop the pane from being shown.</event>
/// <event name="aftershow" locid="WinJS.UI.SplitView_e:aftershow">Raised immediately after the pane is fully shown.</event>
/// <event name="beforehide" locid="WinJS.UI.SplitView_e:beforehide">Raised just before hiding the pane. Call preventDefault on this event to stop the pane from being hidden.</event>
/// <event name="afterhide" locid="WinJS.UI.SplitView_e:afterhide">Raised immediately after the pane is fully hidden.</event>
/// <part name="splitview" class="win-splitview" locid="WinJS.UI.SplitView_part:splitview">The entire SplitView control.</part>
/// <part name="splitview-pane" class="win-splitview-pane" locid="WinJS.UI.SplitView_part:splitview-pane">The element which hosts the SplitView's pane.</part>
/// <part name="splitview-content" class="win-splitview-content" locid="WinJS.UI.SplitView_part:splitview-content">The element which hosts the SplitView's content.</part>
/// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
/// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
export class Pane {
    /// <field locid="WinJS.UI.SplitView.HiddenDisplayMode" helpKeyword="WinJS.UI.SplitView.HiddenDisplayMode">
    /// Display options for a SplitView's pane when it is hidden.
    /// </field>
    static HiddenDisplayMode = HiddenDisplayMode;

    /// <field locid="WinJS.UI.SplitView.PanePlacement" helpKeyword="WinJS.UI.SplitView.PanePlacement">
    /// Placement options for a SplitView's pane.
    /// </field>
    static PanePlacement = Placement;

    static supportedForProcessing: boolean = true;

    private static _ClassNames = ClassNames;

    private _disposed: boolean;
    private _state: IPaneState;
    _dom: {
        root: HTMLElement;
        content: HTMLElement;
    };
    _dismissable: _LightDismissService.ILightDismissable;
    _isShownMode: boolean; // Is ClassNames.paneShown present on the SplitView?
    _rtl: boolean;
    _cachedHiddenPaneThickness: IThickness;

    constructor(element?: HTMLElement, options: any = {}) {
        /// <signature helpKeyword="WinJS.UI.SplitView.SplitView">
        /// <summary locid="WinJS.UI.SplitView.constructor">
        /// Creates a new SplitView control.
        /// </summary>
        /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.SplitView.constructor_p:element">
        /// The DOM element that hosts the SplitView control.
        /// </param>
        /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.SplitView.constructor_p:options">
        /// An object that contains one or more property/value pairs to apply to the new control.
        /// Each property of the options object corresponds to one of the control's properties or events.
        /// Event names must begin with "on". For example, to provide a handler for the beforehide event,
        /// add a property named "onbeforehide" to the options object and set its value to the event handler.
        /// </param>
        /// <returns type="WinJS.UI.SplitView" locid="WinJS.UI.SplitView.constructor_returnValue">
        /// The new SplitView.
        /// </returns>
        /// </signature>

        // Check to make sure we weren't duplicated
        if (element && element["winControl"]) {
            throw new _ErrorFromName("WinJS.UI.SplitView.DuplicateConstruction", Strings.duplicateConstruction);
        }

        this._disposed = false;

        this._initializeDom(element || _Global.document.createElement("div"));
        this._setState(States.Init, options);
    }

    /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.SplitView.element" helpKeyword="WinJS.UI.SplitView.element">
    /// Gets the DOM element that hosts the SplitView control.
    /// </field>
    get element(): HTMLElement {
        return this._dom.root;
    }
    
    private _hiddenDisplayMode: string;
    /// <field type="String" oamOptionsDatatype="WinJS.UI.SplitView.HiddenDisplayMode" locid="WinJS.UI.SplitView.HiddenDisplayMode" helpKeyword="WinJS.UI.SplitView.HiddenDisplayMode">
    /// Gets or sets the display mode of the SplitView's pane when it is hidden.
    /// </field>
    get hiddenDisplayMode(): string {
        return this._hiddenDisplayMode;
    }
    set hiddenDisplayMode(value: string) {
        if (HiddenDisplayMode[value] && this._hiddenDisplayMode !== value) {
            this._hiddenDisplayMode = value;
            this._cachedHiddenPaneThickness = null;
            this._state.updateDom();
        }
    }

    private _panePlacement: string;
    /// <field type="String" oamOptionsDatatype="WinJS.UI.SplitView.PanePlacement" locid="WinJS.UI.SplitView.panePlacement" helpKeyword="WinJS.UI.SplitView.panePlacement">
    /// Gets or sets the placement of the SplitView's pane.
    /// </field>
    get panePlacement(): string {
        return this._panePlacement;
    }
    set panePlacement(value: string) {
        if (Placement[value] && this._panePlacement !== value) {
            this._panePlacement = value;
            this._cachedHiddenPaneThickness = null;
            this._state.updateDom();
        }
    }
    
    get hidden(): boolean {
        return this._state.hidden;
    }
    set hidden(value: boolean) {
        if (value) {
            this.hide();
        } else {
            this.show();
        }
    }

    dispose(): void {
        /// <signature helpKeyword="WinJS.UI.SplitView.dispose">
        /// <summary locid="WinJS.UI.SplitView.dispose">
        /// Disposes this control.
        /// </summary>
        /// </signature>
        if (this._disposed) {
            return;
        }
        this._setState(States.Disposed);
        this._disposed = true;
        _Dispose._disposeElement(this._dom.content);
    }

    show(): void {
        this._state.show();
    }

    hide(): void {
        this._state.hide();
    }

    private _initializeDom(root: HTMLElement): void {
        var contentEl = _Global.document.createElement("div");
        _ElementUtilities.addClass(contentEl, ClassNames._content);
        _ElementUtilities._reparentChildren(root, contentEl);
        root.appendChild(contentEl);

        root["winControl"] = this;
        _ElementUtilities.addClass(root, ClassNames.pane);
        _ElementUtilities.addClass(root, "win-disposable");

        this._dom = {
            root: root,
            content: contentEl
        };
    }

    private _measureElement(element: HTMLElement): IRect {
        var style = getComputedStyle(element);
        var position = _ElementUtilities._getPositionRelativeTo(element, this._dom.root);
        var marginLeft = parseInt(style.marginLeft, 10);
        var marginTop = parseInt(style.marginTop, 10);
        return {
            left: position.left - marginLeft,
            top: position.top - marginTop,
            contentWidth: _ElementUtilities.getContentWidth(element),
            contentHeight: _ElementUtilities.getContentHeight(element),
            totalWidth: _ElementUtilities.getTotalWidth(element),
            totalHeight: _ElementUtilities.getTotalHeight(element)
        };
    }

    // Overridden by tests.
    private _prepareAnimation(paneRect: IRect): void {
        var paneWrapperStyle = this._dom.root.style;
        paneWrapperStyle.position = "absolute";
        paneWrapperStyle.left = paneRect.left + "px";
        paneWrapperStyle.top = paneRect.top + "px";
        paneWrapperStyle.height = paneRect.totalHeight + "px";
        paneWrapperStyle.width = paneRect.totalWidth + "px";
    }

    // Overridden by tests.
    private _clearAnimation(): void {
        var paneWrapperStyle = this._dom.root.style;
        paneWrapperStyle.position = "";
        paneWrapperStyle.left = "";
        paneWrapperStyle.top = "";
        paneWrapperStyle.height = "";
        paneWrapperStyle.width = "";
        paneWrapperStyle[transformNames.scriptName] = "";

        var contentStyle = this._dom.content.style;
        contentStyle.height = "";
        contentStyle.width = "";
        contentStyle[transformNames.scriptName] = "";
    }

    private _getAnimationOffsets(shownPaneRect: IRect): { top: string; left: string; } {
        var placementLeft = this._rtl ? Placement.right : Placement.left;
        return this._horizontal ? {
            left: (this.panePlacement === placementLeft ? -1 : 1) * shownPaneRect.totalWidth + "px",
            top: "0px"
        } : {
            left: "0px",
            top: (this.panePlacement === Placement.top ? -1 : 1) * shownPaneRect.totalHeight + "px"
        };
    }

    private _paneSlideIn(shownPaneRect: IRect): Promise<any> {
        return showEdgeUI(this._dom.root, this._getAnimationOffsets(shownPaneRect));
    }

    private _paneSlideOut(shownPaneRect: IRect): Promise<any> {
        return hideEdgeUI(this._dom.root, this._getAnimationOffsets(shownPaneRect));
    }

    //
    // Methods called by states
    //

    get _horizontal(): boolean {
        return this.panePlacement === Placement.left || this.panePlacement === Placement.right;
    }

    _setState(NewState: any, arg0?: any) {
        if (!this._disposed) {
            this._state && this._state.exit();
            this._state = new NewState();
            this._state.pane = this;
            this._state.enter(arg0);
        }
    }

    // Calls into arbitrary app code
    _fireEvent(eventName: string, options?: { detail?: any; cancelable?: boolean; }): boolean {
        options = options || {};
        var detail = options.detail || null;
        var cancelable = !!options.cancelable;

        var eventObject = <CustomEvent>_Global.document.createEvent("CustomEvent");
        eventObject.initCustomEvent(eventName, true, cancelable, detail);
        return this._dom.root.dispatchEvent(eventObject);
    }

    // Calls into arbitrary app code
    _fireBeforeShow(): boolean {
        return this._fireEvent(EventNames.beforeShow, {
            cancelable: true
        });
    }

    // Calls into arbitrary app code
    _fireBeforeHide(): boolean {
        return this._fireEvent(EventNames.beforeHide, {
            cancelable: true
        });
    }

    _getHiddenPaneThickness(): IThickness {
        if (this._cachedHiddenPaneThickness === null) {
            if (this._hiddenDisplayMode === HiddenDisplayMode.none) {
                this._cachedHiddenPaneThickness = { content: 0, total: 0 };
            } else {
                if (this._isShownMode) {
                    _ElementUtilities.removeClass(this._dom.root, ClassNames.shown);
                    _ElementUtilities.addClass(this._dom.root, ClassNames.hidden);
                }
                var size = this._measureElement(this._dom.root);
                this._cachedHiddenPaneThickness = rectToThickness(size, this._horizontal ? Dimension.width : Dimension.height);
                if (this._isShownMode) {
                    _ElementUtilities.removeClass(this._dom.root, ClassNames.hidden);
                    _ElementUtilities.addClass(this._dom.root, ClassNames.shown);
                }
            }
        }

        return this._cachedHiddenPaneThickness;
    }

    // Should be called while SplitView is rendered in its shown mode
    // Overridden by tests.
    _playShowAnimation(hiddenPaneThickness: IThickness): Promise<any> {
        var dim = this._horizontal ? Dimension.width : Dimension.height;
        var shownPaneRect = this._measureElement(this._dom.root);
        var shownPaneThickness = rectToThickness(shownPaneRect, dim);
        this._prepareAnimation(shownPaneRect);

        var playPaneAnimation = (): Promise<any> => {
            var peek = hiddenPaneThickness.total > 0;

            if (peek) {
                var placementRight = this._rtl ? Placement.left : Placement.right;
                return resizeTransition(this._dom.paneWrapper, this._dom.pane, {
                    from: hiddenPaneThickness,
                    to: shownPaneThickness,
                    dimension: dim,
                    anchorTrailingEdge: this.panePlacement === placementRight || this.panePlacement === Placement.bottom
                });
            } else {
                return this._paneSlideIn(shownPaneRect);
            }
        };

        var playShowAnimation = (): Promise<any> => {
            if (this.shownDisplayMode === ShownDisplayMode.overlay) {
                return playPaneAnimation();
            } else {
                var fadeInDelay = 350 * _TransitionAnimation._animationFactor;

                var contentAnimation = Promise.timeout(fadeInDelay).then(() => {
                    this._setContentRect(shownContentRect);
                    return fadeIn(this._dom.contentWrapper);
                });

                return Promise.join([contentAnimation, playPaneAnimation()]);
            }
        };

        return playShowAnimation().then(() => {
            this._clearAnimation();
        });
    }

    // Should be called while SplitView is rendered in its shown mode
    // Overridden by tests.
    _playHideAnimation(hiddenPaneThickness: IThickness): Promise<any> {
        var dim = this._horizontal ? Dimension.width : Dimension.height;
        var shownPaneRect = this._measureElement(this._dom.pane);
        var shownContentRect = this._measureElement(this._dom.content);
        var shownPaneThickness = rectToThickness(shownPaneRect, dim);
        var hiddenContentRect = this._getHiddenContentRect(shownContentRect, hiddenPaneThickness, shownPaneThickness);
        this._prepareAnimation(shownPaneRect, shownContentRect);

        var playPaneAnimation = (): Promise<any> => {
            var peek = hiddenPaneThickness.total > 0;

            if (peek) {
                var placementRight = this._rtl ? Placement.left : Placement.right;
                return resizeTransition(this._dom.paneWrapper, this._dom.pane, {
                    from: shownPaneThickness,
                    to: hiddenPaneThickness,
                    dimension: dim,
                    anchorTrailingEdge: this.panePlacement === placementRight || this.panePlacement === Placement.bottom
                });
            } else {
                return this._paneSlideOut(shownPaneRect);
            }
        };

        var playHideAnimation = (): Promise<any> => {
            if (this.shownDisplayMode === ShownDisplayMode.overlay) {
                return playPaneAnimation();
            } else {
                var fadeInDelay = 267 * _TransitionAnimation._animationFactor;

                var contentAnimation = Promise.timeout(fadeInDelay).then(() => {
                    this._setContentRect(hiddenContentRect);
                    return fadeIn(this._dom.contentWrapper);
                });

                return Promise.join([contentAnimation, playPaneAnimation()]);
            }
        };


        return playHideAnimation().then(() => {
            this._clearAnimation();
        });
    }
    
    // State private to _updateDomImpl. No other method should make use of it.
    //
    // Nothing has been rendered yet so these are all initialized to undefined. Because
    // they are undefined, the first time _updateDomImpl is called, they will all be
    // rendered.
    private _updateDomImpl_rendered = {
        paneIsFirst: <boolean>undefined,
        isShownMode: <boolean>undefined,
        hiddenDisplayMode: <string>undefined,
        shownDisplayMode: <string>undefined,
        panePlacement: <string>undefined,
        panePlaceholderWidth: <string>undefined,
        panePlaceholderHeight: <string>undefined,
        isOverlayShown: <boolean>undefined
    };
    _updateDomImpl(): void {
        var rendered = this._updateDomImpl_rendered;
        
        var paneShouldBeFirst = this.panePlacement === Placement.left || this.panePlacement === Placement.top;
        if (paneShouldBeFirst !== rendered.paneIsFirst) {
            // TODO: restore focus
            if (paneShouldBeFirst) {
                this._dom.root.appendChild(this._dom.panePlaceholder);
                this._dom.root.appendChild(this._dom.paneWrapper);
                this._dom.root.appendChild(this._dom.contentWrapper);
            } else {
                this._dom.root.appendChild(this._dom.contentWrapper);
                this._dom.root.appendChild(this._dom.paneWrapper);
                this._dom.root.appendChild(this._dom.panePlaceholder);
            }
        }
        rendered.paneIsFirst = paneShouldBeFirst;

        if (rendered.isShownMode !== this._isShownMode) {
            if (this._isShownMode) {
                _ElementUtilities.removeClass(this._dom.root, ClassNames.hidden);
                _ElementUtilities.addClass(this._dom.root, ClassNames.shown);
            } else {
                _ElementUtilities.removeClass(this._dom.root, ClassNames.shown);
                _ElementUtilities.addClass(this._dom.root, ClassNames.hidden);
            }
        }
        rendered.isShownMode = this._isShownMode;

        if (rendered.panePlacement !== this.panePlacement) {
            removeClass(this._dom.root, placementClassMap[rendered.panePlacement]);
            addClass(this._dom.root, placementClassMap[this.panePlacement]);
            rendered.panePlacement = this.panePlacement;
        }
        
        if (rendered.hiddenDisplayMode !== this.hiddenDisplayMode) {
            removeClass(this._dom.root, hiddenDisplayModeClassMap[rendered.hiddenDisplayMode]);
            addClass(this._dom.root, hiddenDisplayModeClassMap[this.hiddenDisplayMode]);
            rendered.hiddenDisplayMode = this.hiddenDisplayMode;
        }
        
        var isOverlayShown = this._isShownMode;
        
        // panePlaceholder's purpose is to take up the amount of space occupied by the
        // hidden pane while the pane is shown in overlay mode. Without this, the content
        // would shift as the pane shows and hides in overlay mode.
        var width: string, height: string;
        if (isOverlayShown) {
            var hiddenPaneThickness = this._getHiddenPaneThickness();
            if (this._horizontal) {
                width = hiddenPaneThickness.total + "px";
                height = "";
            } else {
                width = "";
                height = hiddenPaneThickness.total + "px";
            }
        } else {
            width = "";
            height = "";
        }
        if (rendered.panePlaceholderWidth !== width || rendered.panePlaceholderHeight !== height) {
            var style = this._dom.panePlaceholder.style;
            style.width = width;
            style.height = height;
            rendered.panePlaceholderWidth = width;
            rendered.panePlaceholderHeight = height;
        }
        
        if (rendered.isOverlayShown !== isOverlayShown) {
            if (isOverlayShown) {
                _LightDismissService.shown(this._dismissable);
            } else {
                _LightDismissService.hidden(this._dismissable);
            }
            rendered.isOverlayShown = isOverlayShown;
        }
    }
}

_Base.Class.mix(Pane, _Events.createEventProperties(
    EventNames.beforeShow,
    EventNames.afterShow,
    EventNames.beforeHide,
    EventNames.afterHide
));
_Base.Class.mix(Pane, _Control.DOMEventMixin);
