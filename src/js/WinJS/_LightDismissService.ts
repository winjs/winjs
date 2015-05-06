// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.

import Application = require('./Application');
import _Base = require('./Core/_Base');
import _BaseUtils = require('./Core/_BaseUtils');
import _ElementUtilities = require('./Utilities/_ElementUtilities');
import _Global = require('./Core/_Global');
import _KeyboardBehavior = require('./Utilities/_KeyboardBehavior');
import _Log = require('./Core/_Log');
import _Resources = require('./Core/_Resources');

require(["require-style!less/styles-lightdismissservice"]);

"use strict";

var baseZIndex = 1000;

var Strings = {
    get closeOverlay() { return _Resources._getWinJSString("ui/closeOverlay").value; }
};
export var _ClassNames = {
    _clickEater: "win-clickeater"
};
var EventNames = {
    requestingFocusOnKeyboardInput: "requestingfocusonkeyboardinput"
};
export var LightDismissalReasons = {
    tap: "tap",
    lostFocus: "lostFocus",
    escape: "escape",
    hardwareBackButton: "hardwareBackButton",
    windowResize: "windowResize",
    windowBlur: "windowBlur"
};
// Built-in implementations of ILightDismissable's onShouldLightDismiss.
export var DismissalPolicies = {
    light: function LightDismissalPolicies_light_onShouldLightDismiss(info: ILightDismissInfo): boolean {
        switch (info.reason) {
            case LightDismissalReasons.tap:
            case LightDismissalReasons.escape:
                if (info.active) {
                    return true;
                } else {
                    info.stopPropagation();
                    return false;
                }
                break;
            case LightDismissalReasons.hardwareBackButton:
                if (info.active) {
                    info.preventDefault(); // prevent backwards navigation in the app
                    return true;
                } else {
                    info.stopPropagation();
                    return false;
                }
                break;
            case LightDismissalReasons.lostFocus:
            case LightDismissalReasons.windowResize:
            case LightDismissalReasons.windowBlur:
                return true;
        }
    },
    modal: function LightDismissalPolicies_modal_onShouldLightDismiss(info: ILightDismissInfo): boolean {
        // Light dismiss cues should not be seen by dismissables behind the modal
        info.stopPropagation();
        
        switch (info.reason) {
            case LightDismissalReasons.tap:
            case LightDismissalReasons.lostFocus:
            case LightDismissalReasons.windowResize:
            case LightDismissalReasons.windowBlur:
                return false;
                break;
            case LightDismissalReasons.escape:
                return info.active;
                break;
            case LightDismissalReasons.hardwareBackButton:
                info.preventDefault(); // prevent backwards navigation in the app
                return info.active;
                break;
        }
    }
};

export interface ILightDismissInfo {
    reason: string;
    active: boolean;
    stopPropagation(): void;
    preventDefault(): void;
}

var KeyboardInfoType = {
    keyDown: "keyDown",
    keyUp: "keyUp",
    keyPress: "keyPress"
};

export interface IKeyboardInfo {
    type: string;
    keyCode: number;
    propagationStopped: boolean;
    stopPropagation(): void;
}

// Keep in sync with ILightDismissableElementArgs.
export interface ILightDismissable {
    // This dismissable should be rendered at a z-index of *zIndex*.
    setZIndex(zIndex: string): void;
    // How many z-indices are required by this dismissable?
    getZIndexCount(): number;
    // Does the dismissable contain *element*?
    containsElement(element: HTMLElement): boolean;

    // Hooks

    // The dismissable should take focus if focus isn't already inside of it.
    // This fires when the dismissable becomes the focused/active/topmost dismissable
    // and when the topmost dismissable loses focus but doesn't dismiss.
    // *useSetActive* is a hint to onTakeFocus as to whether or not it should draw a
    // keyboard focus visual when taking focus. If the last input type was keyboard,
    // use focus() so a keyboard focus visual is drawn. Otherwise, use setActive() so
    // no focus visual is drawn.
    onTakeFocus(useSetActive: boolean): void;
    // Focus has moved into or within this dismissable (similar to a focusin handler except
    // you don't have to explicitly register for it).
    onFocus(element: HTMLElement): void;
    // This dismissable is now shown (i.e. has been added to the light dismiss service).
    onShow(service: ILightDismissService): void;
    // This dismissable is now hidden (i.e. has been removed from the light dismiss service).
    onHide(): void;
    
    // Keyboard events
    onKeyInStack(info: IKeyboardInfo): void;

    // Dismissal

    // A light dismiss was triggered. Return whether or not this dismissable should be dismissed. Built-in
    // implementations of this method are specified in LightDismissalPolicies.
    onShouldLightDismiss(info: ILightDismissInfo): boolean;
    // Should implement what it means for this dismissable to be dismissed (e.g. call control.hide()). Just because
    // this method is called doesn't mean that the service thinks this dismissable has been dismissed. Consequently,
    // you can decide to do nothing in this method if you want the dismissable to remain shown. However, this decision
    // should generally be made in onShouldLightDismiss if possible. The dismissable is responsible for calling
    // _LightDismissService.hidden at some point.
    onLightDismiss(info: ILightDismissInfo): void;
}

//
// ILightDismissable implementations
//

function tryFocus(element: HTMLElement, useSetActive: boolean) {
    var previousActiveElement = _Global.document.activeElement;

    if (element === previousActiveElement) {
        return true;
    }
    
    if (useSetActive) {
        _ElementUtilities._setActive(element);
    } else {
        element.focus();
    }
    
    return previousActiveElement !== _Global.document.activeElement;
}

// Keep in sync with ILightDismissable and the LightDismissableElement constructor.
export interface ILightDismissableElementArgs {
    element: HTMLElement;
    // This will be set as the tabIndex of the element. All light dismissable elements
    // need to have a tabIndex otherwise they will lose focus when a user taps on a
    // non-focusable descendant. If you are unsure of the appropriate tabIndex, use -1: it
    // will allow the element to be focusable but users will not be able to reach it with
    // the tab key.
    // Style outline to none if you don't want a focus visual on your root element.
    // Including this in ILightDismissableElementArgs has 2 benefits:
    //   - It ensures all light dismissable elements have a tabIndex.
    //   - It makes it clear to the control author that a tabIndex is being set on their
    //     element.
    tabIndex: number;
    onLightDismiss(info: ILightDismissInfo): void;
    
    onTakeFocus?(useSetActive: boolean): void;
}

class AbstractDismissableElement implements ILightDismissable {
    element: HTMLElement;

    // lde prefix stands for LightDismissableElement
    private _ldeCurrentFocus: HTMLElement;
    private _ldeOnKeyDownBound: (eventObject: KeyboardEvent) => void;
    private _ldeOnKeyUpBound: (eventObject: KeyboardEvent) => void;
    private _ldeOnKeyPressBound: (eventObject: KeyboardEvent) => void;
    private _ldeService: ILightDismissService;

    constructor(args: ILightDismissableElementArgs) {
        this.element = args.element;
        this.element.tabIndex = args.tabIndex;
        this.onLightDismiss = args.onLightDismiss;

        // Allow the caller to override the default implementations of our ILightDismissable methods.
        if (args.onTakeFocus) { this.onTakeFocus = args.onTakeFocus; }
        
        this._ldeOnKeyDownBound = this._ldeOnKeyDown.bind(this);
        this._ldeOnKeyUpBound = this._ldeOnKeyUp.bind(this);
        this._ldeOnKeyPressBound = this._ldeOnKeyPress.bind(this);
    }
    
    restoreFocus(): boolean {
        var activeElement = <HTMLElement>_Global.document.activeElement;
        if (activeElement && this.containsElement(activeElement)) {
            this._ldeCurrentFocus = activeElement;
            return true;
        } else {
            // If the last input type was keyboard, use focus() so a keyboard focus visual is drawn.
            // Otherwise, use setActive() so no focus visual is drawn.
            var useSetActive = !_KeyboardBehavior._keyboardSeenLast;

            return this._ldeCurrentFocus && this.containsElement(this._ldeCurrentFocus) && tryFocus(this._ldeCurrentFocus, useSetActive);
        }
    }
    
    private _ldeOnKeyDown(eventObject: KeyboardEvent) {
        this._ldeService.keyDown(this, eventObject);
    }
    private _ldeOnKeyUp(eventObject: KeyboardEvent) {
        this._ldeService.keyUp(this, eventObject);
    }
    private _ldeOnKeyPress(eventObject: KeyboardEvent) {
        this._ldeService.keyPress(this, eventObject);
    }
    
    // ILightDismissable
    //

    setZIndex(zIndex: string) {
        this.element.style.zIndex = zIndex;
    }
    getZIndexCount(): number {
        return 1;
    }
    containsElement(element: HTMLElement): boolean {
        return this.element.contains(element);
    }
    onTakeFocus(useSetActive: boolean): void {
        this.restoreFocus() ||
            _ElementUtilities._focusFirstFocusableElement(this.element, useSetActive) ||
            tryFocus(this.element, useSetActive);
    }
    onFocus(element: HTMLElement): void {
        this._ldeCurrentFocus = element;
    }
    onShow(service: ILightDismissService): void {
        this._ldeService = service;
        this.element.addEventListener("keydown", this._ldeOnKeyDownBound);
        this.element.addEventListener("keyup", this._ldeOnKeyUpBound);
        this.element.addEventListener("keypress", this._ldeOnKeyPressBound);
    }
    onHide(): void {
        this._ldeCurrentFocus = null;
        this._ldeService = null;
        this.element.removeEventListener("keydown", this._ldeOnKeyDownBound);
        this.element.removeEventListener("keyup", this._ldeOnKeyUpBound);
        this.element.removeEventListener("keypress", this._ldeOnKeyPressBound);
    }
    
    // Concrete subclasses are expected to implement these.
    onKeyInStack(info: IKeyboardInfo): void { }
    onShouldLightDismiss(info: ILightDismissInfo): boolean { return false; }
    
    // Consumers of concrete subclasses of AbstractDismissableElement are expected to
    // provide these as parameters to the constructor.
    onLightDismiss(info: ILightDismissInfo): void { }
}

export class LightDismissableElement extends AbstractDismissableElement implements ILightDismissable {
    onKeyInStack(info: IKeyboardInfo): void { }
    onShouldLightDismiss(info: ILightDismissInfo): boolean {
        return DismissalPolicies.light(info);
    }
}

export class ModalElement extends AbstractDismissableElement implements ILightDismissable {
    onKeyInStack(info: IKeyboardInfo): void {
        // stopPropagation so that none of the app's other event handlers will see the event.
        // Don't preventDefault so that the browser's hotkeys will still work.
        info.stopPropagation();
    }
    onShouldLightDismiss(info: ILightDismissInfo): boolean {
        return DismissalPolicies.modal(info);
    }
}

// An implementation of ILightDismissable that represents the HTML body element. It can never be dismissed. The
// service should instantiate one of these to act as the bottommost light dismissable at all times (it isn't expected
// for anybody else to instantiate one). It takes care of restoring focus when the last dismissable is dismissed.
class LightDismissableBody implements ILightDismissable {
    currentFocus: HTMLElement;

    setZIndex(zIndex: string) { }
    getZIndexCount(): number {
        return 1;
    }
    containsElement(element: HTMLElement): boolean {
        return _Global.document.body.contains(element);
    }
    onTakeFocus(useSetActive: boolean): void {
        this.currentFocus && this.containsElement(this.currentFocus) && tryFocus(this.currentFocus, useSetActive);
    }
    onFocus(element: HTMLElement): void {
         this.currentFocus = element;
    }
    onShow(): void { }
    onHide(): void {
        this.currentFocus = null;
    }
    onKeyInStack(info: IKeyboardInfo): void { }
    onShouldLightDismiss(info: ILightDismissInfo): boolean {
        return false;
    }
    onLightDismiss(info: ILightDismissInfo): void { }
}

//
// Light dismiss service
//

// Methods of the LightDismissService that the builtin implementations of
// ILightDismissable take a dependency on.
export interface ILightDismissService {
    keyDown(client: ILightDismissable, eventObject: KeyboardEvent): void;
    keyUp(client: ILightDismissable, eventObject: KeyboardEvent): void;
    keyPress(client: ILightDismissable, eventObject: KeyboardEvent): void;
}

class LightDismissService implements ILightDismissService {
    private _debug = false; // Disables dismiss due to window blur. Useful during debugging.
    
    private _clickEaterEl: HTMLElement;
    private _clients: ILightDismissable[] = [];
    // The *_activeClient.dismissable* is the dismissable that currently has focus. It is also
    // the topmost dismissable. *_activeClient.needsFocus* represents whether or not
    // updateDom needs to set focus on that dismissable.
    private _activeClient: { dismissable: ILightDismissable; needsFocus: boolean; } = {
        dismissable: null,
        needsFocus: false
    };
    private _notifying = false;
    private _bodyClient = new LightDismissableBody();
    
    private _onBeforeRequestingFocusOnKeyboardInputBound: (eventObject: Event) => void;
    private _onFocusInBound: (eventObject: FocusEvent) => void;
    private _onKeyDownBound: (eventObject: KeyboardEvent) => void;
    private _onWindowResizeBound: (eventObject: Event) => void;
    private _onClickEaterPointerUpBound: (eventObject: PointerEvent) => void;
    private _onClickEaterPointerCancelBound: (eventObject: PointerEvent) => void;

    constructor() {
        this._clickEaterEl = this._createClickEater();
        
        this._onBeforeRequestingFocusOnKeyboardInputBound = this._onBeforeRequestingFocusOnKeyboardInput.bind(this);
        this._onFocusInBound = this._onFocusIn.bind(this);
        this._onKeyDownBound = this._onKeyDown.bind(this);
        this._onWindowResizeBound = this._onWindowResize.bind(this);
        this._onClickEaterPointerUpBound = this._onClickEaterPointerUp.bind(this);
        this._onClickEaterPointerCancelBound = this._onClickEaterPointerCancel.bind(this);

        // Register for infrequent events.
        Application.addEventListener("backclick", this._onBackClick.bind(this));
        // Focus handlers generally use _ElementUtilities._addEventListener with focusout/focusin. This
        // uses the browser's blur event directly beacuse _addEventListener doesn't support focusout/focusin
        // on window.
        _Global.window.addEventListener("blur", this._onWindowBlur.bind(this));

        this.shown(this._bodyClient);
    }

    // Dismissables should call this as soon as they are ready to be shown. More specifically, they should call this:
    //   - After they are in the DOM and ready to receive focus (e.g. style.display cannot = "none")
    //   - Before their entrance animation is played
    shown(client: ILightDismissable) {
        var index = this._clients.indexOf(client);
        if (index === -1) {
            this._clients.push(client);
            client.onShow(this);
            this._updateDom();
        }
    }

    // Dismissables should call this when they are done being dismissed (i.e. after their exit animation has finished)
    hidden(client: ILightDismissable) {
        var index = this._clients.indexOf(client);
        if (index !== -1) {
            this._clients.splice(index, 1);
            client.setZIndex("");
            client.onHide();
            this._updateDom();
        }
    }

    // Dismissables should call this when their state has changed such that it'll affect the behavior of some method
    // in its ILightDismissable interface. For example, if the dismissable was altered such that getZIndexCount will
    // now return 2 instead of 1, that dismissable should call *updated* so the LightDismissService can find out about
    // this change.
    updated(client: ILightDismissable) {
        this._updateDom();
    }
    
    keyDown(client: ILightDismissable, eventObject: KeyboardEvent) {
        if (eventObject.keyCode === _ElementUtilities.Key.escape) {
            this._escapePressed(eventObject);
        } else {
            this._dispatchKeyboardEvent(client, KeyboardInfoType.keyDown, eventObject);
        }
    }
    
    keyUp(client: ILightDismissable, eventObject: KeyboardEvent) {
        this._dispatchKeyboardEvent(client, KeyboardInfoType.keyUp, eventObject);
    }
    
    keyPress(client: ILightDismissable, eventObject: KeyboardEvent) {
        this._dispatchKeyboardEvent(client, KeyboardInfoType.keyPress, eventObject);
    }
    
    isShown(client: ILightDismissable) {
        return this._clients.indexOf(client) !== -1;
    }
    
    isTopmost(client: ILightDismissable) {
        return client === this._clients[this._clients.length - 1];
    }
    
    // Disables dismiss due to window blur. Useful during debugging.
    _setDebug(debug: boolean) {
        this._debug = debug;
    }

    // State private to _updateDom. No other method should make use of it.
    private _updateDom_rendered = {
        serviceActive: false
    };
    private _updateDom() {
        var rendered = this._updateDom_rendered;

        if (this._notifying) {
            return;
        }

        var serviceActive = this._clients.length > 1;
        if (serviceActive !== rendered.serviceActive) {
            // Unregister/register for events that occur frequently.
            if (serviceActive) {
                Application.addEventListener("beforerequestingfocusonkeyboardinput", this._onBeforeRequestingFocusOnKeyboardInputBound);
                _ElementUtilities._addEventListener(_Global.document.documentElement, "focusin", this._onFocusInBound);
                _Global.document.documentElement.addEventListener("keydown", this._onKeyDownBound);
                _Global.window.addEventListener("resize", this._onWindowResizeBound);
                this._bodyClient.currentFocus = <HTMLElement>_Global.document.activeElement;
                _Global.document.body.appendChild(this._clickEaterEl);
            } else {
                Application.removeEventListener("beforerequestingfocusonkeyboardinput", this._onBeforeRequestingFocusOnKeyboardInputBound);
                _ElementUtilities._removeEventListener(_Global.document.documentElement, "focusin", this._onFocusInBound);
                _Global.document.documentElement.removeEventListener("keydown", this._onKeyDownBound);
                _Global.window.removeEventListener("resize", this._onWindowResizeBound);
                var parent = this._clickEaterEl.parentNode;
                parent && parent.removeChild(this._clickEaterEl);
            }
            rendered.serviceActive = serviceActive;
        }

        var zIndexGap = 0;
        var lastUsedZIndex = baseZIndex + 1;
        this._clients.forEach(function (c, i) {
            var currentZIndex = lastUsedZIndex + zIndexGap;
            c.setZIndex("" + currentZIndex);
            lastUsedZIndex = currentZIndex;
            // count + 1 so that there's an unused zIndex between each pair of
            // dismissables that can be used by the click eater.
            zIndexGap = c.getZIndexCount() + 1;
        });
        if (serviceActive) {
            this._clickEaterEl.style.zIndex = "" + (lastUsedZIndex - 1);
        }

        var activeDismissable = this._clients.length > 0 ? this._clients[this._clients.length - 1] : null;
        if (this._activeClient.dismissable !== activeDismissable) {
            this._activeClient = {
                dismissable: activeDismissable,
                needsFocus: true
            };
        }
        
        if (this._activeClient.needsFocus) {
            this._activeClient.needsFocus = false;
            // If the last input type was keyboard, use focus() so a keyboard focus visual is drawn.
            // Otherwise, use setActive() so no focus visual is drawn.
            var useSetActive = !_KeyboardBehavior._keyboardSeenLast;
            this._activeClient.dismissable && this._activeClient.dismissable.onTakeFocus(useSetActive);
        }
    }
    
    private _dispatchKeyboardEvent(client: ILightDismissable, keyboardInfoType: string, eventObject: KeyboardEvent) {
        var index = this._clients.indexOf(client);
        if (index !== -1) {
            var info = {
                type: keyboardInfoType,
                keyCode: eventObject.keyCode,
                propagationStopped: false,
                stopPropagation: function () {
                    this.propagationStopped = true;
                    eventObject.stopPropagation();
                }
            };
            var clients = this._clients.slice(0, index + 1);
            for (var i = clients.length - 1; i >= 0 && !info.propagationStopped; i--) {
                clients[i].onKeyInStack(info);
            }
        }
    }

    private _dispatchLightDismiss(reason: string, clients?: ILightDismissable[]) {
        if (this._notifying) {
            _Log.log && _Log.log('_LightDismissService ignored dismiss trigger to avoid re-entrancy: "' + reason + '"', "winjs _LightDismissService", "warning");
            return;
        }

        clients = clients || this._clients.slice(0);
        if (clients.length === 0) {
            return;
        }

        this._notifying = true;
        var lightDismissInfo = {
            // Which of the LightDismissalReasons caused this event to fire?
            reason: reason,
            // Is this dismissable currently the active dismissable?
            active: false,
            _stop: false,
            stopPropagation: function () {
                this._stop = true;
            },
            _doDefault: true,
            preventDefault: function () {
                this._doDefault = false;
            }
        };
        for (var i = clients.length - 1; i >= 0 && !lightDismissInfo._stop; i--) {
            lightDismissInfo.active = this._activeClient.dismissable === clients[i];
            if (clients[i].onShouldLightDismiss(lightDismissInfo)) {
                clients[i].onLightDismiss(lightDismissInfo);
            }
        }

        this._notifying = false;
        this._updateDom();

        return lightDismissInfo._doDefault;
    }
    
    _onBeforeRequestingFocusOnKeyboardInput(eventObject: Event) {
        // Suppress the requestingFocusOnKeyboardInput event.
        return true;
    }

    //
    // Light dismiss triggers
    //
    
    // Called by tests.
    _clickEaterTapped() {
        this._dispatchLightDismiss(LightDismissalReasons.tap);
    }

    private _onFocusIn(eventObject: FocusEvent) {
        var target = <HTMLElement>eventObject.target;
        for (var i = this._clients.length - 1; i >= 0; i--) {
            if (this._clients[i].containsElement(target)) {
                break;
            }
        }
        if (i !== -1) {
            this._clients[i].onFocus(target);
        }
        
        if (i + 1 < this._clients.length) {
            this._activeClient.needsFocus = true;
            this._dispatchLightDismiss(LightDismissalReasons.lostFocus, this._clients.slice(i + 1));
        }
    }

    private _onKeyDown(eventObject: KeyboardEvent) {
        if (eventObject.keyCode === _ElementUtilities.Key.escape) {
            this._escapePressed(eventObject);
        }
    }
    
    private _escapePressed(eventObject: KeyboardEvent) {
        eventObject.preventDefault();
        eventObject.stopPropagation();
        this._dispatchLightDismiss(LightDismissalReasons.escape);
    }

    // Called by tests.
    _onBackClick(eventObject: any): boolean {
        var doDefault = this._dispatchLightDismiss(LightDismissalReasons.hardwareBackButton);
        return !doDefault; // Returns whether or not the event was handled.
    }

    private _onWindowResize(eventObject: Event) {
        this._dispatchLightDismiss(LightDismissalReasons.windowResize);
    }

    private _onWindowBlur(eventObject: FocusEvent) {
        if (this._debug) { return; }
        
        // Want to trigger a light dismiss on window blur.
        // We get blur if we click off the window, including into an iframe within our window.
        // Both blurs call this function, but fortunately document.hasFocus is true if either
        // the document window or our iframe window has focus.
        if (!_Global.document.hasFocus()) {
            // The document doesn't have focus, so they clicked off the app, so light dismiss.
            this._dispatchLightDismiss(LightDismissalReasons.windowBlur);
        } else {
            // We were trying to unfocus the window, but document still has focus,
            // so make sure the iframe that took the focus will check for blur next time.
            var active = _Global.document.activeElement;
            if (active && active.tagName === "IFRAME" && !active["msLightDismissBlur"]) {
                // - This will go away when the IFRAME goes away, and we only create one.
                // - This only works in IE because other browsers don't fire focus events on iframe elements.
                // - Can't use _ElementUtilities._addEventListener's focusout because it doesn't fire when an
                //   iframe loses focus due to changing windows.
                active.addEventListener("blur", this._onWindowBlur.bind(this), false);
                active["msLightDismissBlur"] = true;
            }
        }
    }

    //
    // Click eater
    //
    // Handling a tap on the click eater is tricky. Different input methods trigger different events
    // and we have to be careful not to trigger multiple dismiss notifications for a single input.
    // Here's an overview of the scenarios:
    //   - UIA invoke (e.g. Narrator): UIA invoke only fires a click event. It doesn't fire any pointer
    //     events so it is up to the click handler to handle this case.
    //   - Chrome: In Chrome, we only receive synthetic WinJS pointer events (no click event) because we call
    //     preventDefault on the pointer events. Consequently, it is up to the PointerUp handler to handle this case.
    //   - IE: In IE, we receive both a PointerUp event and a click event. Consequently, these two event
    //     handlers have to communicate so that they don't trigger a double dismiss. In this case,
    //     PointerUp runs first so it triggers the dismiss and the click handler does nothing (due to the
    //     _skipClickEaterClick flag).
    //

    private _clickEaterPointerId: number;
    private _skipClickEaterClick: boolean;
    private _registeredClickEaterCleanUp: boolean;

    private _createClickEater(): HTMLElement {
       var clickEater = _Global.document.createElement("section");
        clickEater.className = _ClassNames._clickEater;
        _ElementUtilities._addEventListener(clickEater, "pointerdown", this._onClickEaterPointerDown.bind(this), true);
        clickEater.addEventListener("click", this._onClickEaterClick.bind(this), true);
        // Tell Aria that it's clickable
        clickEater.setAttribute("role", "menuitem");
        clickEater.setAttribute("aria-label", Strings.closeOverlay);
        // Prevent CED from removing any current selection
        clickEater.setAttribute("unselectable", "on");
        return clickEater;
    }

    private _onClickEaterPointerDown(eventObject: PointerEvent) {
        eventObject.stopPropagation();
        eventObject.preventDefault();

        this._clickEaterPointerId = eventObject.pointerId;
        if (!this._registeredClickEaterCleanUp) {
            _ElementUtilities._addEventListener(_Global.window, "pointerup", this._onClickEaterPointerUpBound);
            _ElementUtilities._addEventListener(_Global.window, "pointercancel", this._onClickEaterPointerCancelBound);
            this._registeredClickEaterCleanUp = true;
        }
    }

    private _onClickEaterPointerUp(eventObject: PointerEvent) {
        eventObject.stopPropagation();
        eventObject.preventDefault();

        if (eventObject.pointerId === this._clickEaterPointerId) {
            this._resetClickEaterPointerState();
            var element = _Global.document.elementFromPoint(eventObject.clientX, eventObject.clientY);

            if (element === this._clickEaterEl) {
                this._skipClickEaterClick = true;
                _BaseUtils._yieldForEvents(() => {
                    this._skipClickEaterClick = false;
                });
                this._clickEaterTapped();
            }
        }
    }

    private _onClickEaterClick(eventObject: MouseEvent) {
        eventObject.stopPropagation();
        eventObject.preventDefault();

        if (!this._skipClickEaterClick) {
            // Handle the UIA invoke action on the click eater. this._skipClickEaterClick is false which tells
            // us that we received a click event without an associated PointerUp event. This means that the click
            // event was triggered thru UIA rather than thru the GUI.
            this._clickEaterTapped();
        }
    }

    private _onClickEaterPointerCancel(eventObject: PointerEvent) {
        if (eventObject.pointerId === this._clickEaterPointerId) {
            this._resetClickEaterPointerState();
        }
    }

    private _resetClickEaterPointerState() {
        if (this._registeredClickEaterCleanUp) {
            _ElementUtilities._removeEventListener(_Global.window, "pointerup", this._onClickEaterPointerUpBound);
            _ElementUtilities._removeEventListener(_Global.window, "pointercancel", this._onClickEaterPointerCancelBound);
        }
        this._clickEaterPointerId = null;
        this._registeredClickEaterCleanUp = false;
    }
}

var service = new LightDismissService();
export var shown = service.shown.bind(service);
export var hidden = service.hidden.bind(service);
export var updated = service.updated.bind(service);
export var isShown = service.isShown.bind(service);
export var isTopmost = service.isTopmost.bind(service);
export var keyDown = service.keyDown.bind(service);
export var keyUp = service.keyUp.bind(service);
export var keyPress = service.keyPress.bind(service);
export var _clickEaterTapped = service._clickEaterTapped.bind(service);
export var _onBackClick = service._onBackClick.bind(service);
export var _setDebug = service._setDebug.bind(service);

_Base.Namespace.define("WinJS.UI._LightDismissService", {
    shown: shown,
    hidden: hidden,
    updated: updated,
    isShown: isShown,
    isTopmost: isTopmost,
    keyDown: keyDown,
    keyUp: keyUp,
    keyPress: keyPress,
    _clickEaterTapped: _clickEaterTapped,
    _onBackClick: _onBackClick,
    _setDebug: _setDebug,
    LightDismissableElement: LightDismissableElement,
    DismissalPolicies: DismissalPolicies,
    LightDismissalReasons: LightDismissalReasons,
    _ClassNames: _ClassNames,

    _service: service
});