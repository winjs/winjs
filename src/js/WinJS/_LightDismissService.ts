// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

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

var baseZIndex = 900; // Below Ovelays for now
var rightButton = 2;

var Strings = {
    get closeOverlay() { return _Resources._getWinJSString("ui/closeOverlay").value; }
};
var ClassNames = {
    _clickEater: "win-clickeater"
};
var EventNames = {
    requestingFocusOnKeyboardInput: "requestingfocusonkeyboardinput",
    edgyStarting: "edgystarting",
    edgyCompleted: "edgycompleted",
    edgyCanceled: "edgycanceled"
};
var LightDismissalReasons = {
    tap: "tap",
    lostFocus: "lostFocus",
    escape: "escape",
    hardwareBackButton: "hardwareBackButton",
    windowResize: "windowResize",
    windowBlur: "windowBlur",
    edgy: "edgy"
};
export var LightDismissalPolicies = {
    light: function LightDismissalPolicies_light_shouldReceiveLightDismiss(info: ILightDismissInfo): boolean {
        switch (info.reason) {
            case LightDismissalReasons.tap:
            case LightDismissalReasons.escape:
                if (info.topLevel) {
                    return true;
                } else {
                    info.stopPropagation();
                    return false;
                }
                break;
            case LightDismissalReasons.hardwareBackButton:
                if (info.topLevel) {
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
            case LightDismissalReasons.edgy:
                return true;
        }
    },
    sticky: function LightDismissalPolicies_sticky_shouldReceiveLightDismiss(info: ILightDismissInfo): boolean {
        info.stopPropagation();
        return false;
    }  
};

export interface ILightDismissInfo {
    reason: string;
    topLevel: boolean;
    stopPropagation(): void;
    preventDefault(): void;
}

// Keep in sync with ILightDismissableElementArgs.
export interface ILightDismissable {
    setZIndex(zIndex: string): void;
    containsElement(element: HTMLElement): boolean;
    requiresClickEater(): boolean;
    
    // Hooks
    becameTopLevel(): void;
    receivedFocus(element: HTMLElement): void;
    hidden(): void;
    
    // Dismissal
    shouldReceiveLightDismiss(info: ILightDismissInfo): boolean;
    lightDismiss(info: ILightDismissInfo): void;
}

//
// ILightDismissable implementations
//

// Keep in sync with ILightDismissable and the LightDismissableElement constructor.
export interface ILightDismissableElementArgs {
    element: HTMLElement;
    lightDismiss(info: ILightDismissInfo): void;
    
    setZIndex?(zIndex: string): void;
    containsElement?(element: HTMLElement): boolean;
    requiresClickEater?(): boolean;
    becameTopLevel?(): void;
    receivedFocus?(element: HTMLElement): void;
    hidden?(): void;
    shouldReceiveLightDismiss?(info: ILightDismissInfo): boolean;
}

export class LightDismissableElement implements ILightDismissable {
    element: HTMLElement;
    
    private _winCurrentFocus: HTMLElement;
    
    private _winReceivedFocus: (element: HTMLElement) => void;
    private _winHidden: () => void;
    
    constructor(args: ILightDismissableElementArgs) {
        this.element = args.element;
        this.lightDismiss = args.lightDismiss;
        
        // Allow the caller to override the default implementations of our ILightDismissable methods.
        if (args.setZIndex) { this.setZIndex = args.setZIndex; }
        if (args.containsElement) { this.containsElement = args.containsElement; }
        if (args.requiresClickEater) { this.requiresClickEater = args.requiresClickEater; }
        if (args.becameTopLevel) { this.becameTopLevel = args.becameTopLevel; }
        this._winReceivedFocus = args.receivedFocus;
        this._winHidden = args.hidden;
        if (args.shouldReceiveLightDismiss) { this.shouldReceiveLightDismiss = args.shouldReceiveLightDismiss; }
    }
    
    setZIndex(zIndex: string) {
        this.element.style.zIndex = zIndex;
    }
    containsElement(element: HTMLElement): boolean {
        return this.element.contains(element);
    }
    requiresClickEater(): boolean {
        return true;
    }
    becameTopLevel(): void {
        var activeElement = <HTMLElement>_Global.document.activeElement;
        if (activeElement && this.containsElement(activeElement)) {
            this._winCurrentFocus = activeElement;
        } else {
            // If the last input type was keyboard, use focus() so a keyboard focus visual is drawn.
            // Otherwise, use setActive() so no focus visual is drawn.
            var useSetActive = !_KeyboardBehavior._keyboardSeenLast;
            
            (this._winCurrentFocus && this.containsElement(this._winCurrentFocus) && _ElementUtilities._tryFocus(this._winCurrentFocus, useSetActive)) ||
                _ElementUtilities._focusFirstFocusableElement(this.element, useSetActive) ||
                _ElementUtilities._tryFocus(this.element, useSetActive);
        }
    }
    receivedFocus(element: HTMLElement): void {
        this._winCurrentFocus = element;
        this._winReceivedFocus && this._winReceivedFocus(element);
    }
    hidden(): void {
        this._winCurrentFocus = null;
        this._winHidden && this._winHidden();
    }
    shouldReceiveLightDismiss(info: ILightDismissInfo): boolean {
        return LightDismissalPolicies.light(info);
    }
    lightDismiss(info: ILightDismissInfo): void { }
}

class LightDismissableBody implements ILightDismissable {    
    currentFocus: HTMLElement;
    
    setZIndex(zIndex: string) { }
    containsElement(element: HTMLElement): boolean {
        return _Global.document.body.contains(element);
    }
    requiresClickEater(): boolean {
        return false;
    }
    becameTopLevel(): void {
        // If the last input type was keyboard, use focus() so a keyboard focus visual is drawn.
        // Otherwise, use setActive() so no focus visual is drawn.
        var useSetActive = !_KeyboardBehavior._keyboardSeenLast;
        
        (this.currentFocus && this.containsElement(this.currentFocus) && _ElementUtilities._tryFocus(this.currentFocus, useSetActive)) ||
            _ElementUtilities._focusFirstFocusableElement(_Global.document.body, useSetActive) ||
            _ElementUtilities._tryFocus(_Global.document.body, useSetActive);
    }
    receivedFocus(element: HTMLElement): void {
        this.currentFocus = element;
    }
    hidden(): void {
        this.currentFocus = null;
    }
    shouldReceiveLightDismiss(info: ILightDismissInfo): boolean {
        return false;
    }
    lightDismiss(info: ILightDismissInfo): void { }
}

function moveToFront(array: Array<ILightDismissable>, item: ILightDismissable) {
    removeItem(array, item);
    array.unshift(item);
}

function removeItem(array: Array<ILightDismissable>, item: ILightDismissable) {
    var index = array.indexOf(item);
    if (index !== -1) {
        array.splice(index, 1);
    }
}

//
// Light dismiss service
//

class LightDismissService {
    private _clickEaterEl: HTMLElement;
    private _clients: ILightDismissable[];
    private _currentTopLevel: ILightDismissable;
    private _focusOrder: ILightDismissable[];
    private _notifying: boolean;
    private _bodyClient: LightDismissableBody;
    
    private _onFocusInBound: (eventObject: FocusEvent) => void;
    private _onKeyDownBound: (eventObject: KeyboardEvent) => void;
    private _onWindowResizeBound: (eventObject: Event) => void;
    private _onClickEaterPointerUpBound: (eventObject: PointerEvent) => void;
    private _onClickEaterPointerCancelBound: (eventObject: PointerEvent) => void;
    
    constructor() {
        this._clickEaterEl = this._createClickEater();
        this._clients = [];
        this._currentTopLevel = null;
        this._focusOrder = [];
        this._rendered = {
            clickEaterInDom: false,
            serviceActive: false
        };
        this._notifying = false;
        this._bodyClient = new LightDismissableBody();
        
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
    
    shown(client: ILightDismissable) {
        var index = this._clients.indexOf(client);
        if (index === -1) {
            this._clients.push(client);
            this._updateDom();
        }
    }
    
    hidden(client: ILightDismissable) {
        var index = this._clients.indexOf(client);
        if (index !== -1) {
            this._clients.splice(index, 1);
            removeItem(this._focusOrder, client);
            client.setZIndex("");
            client.hidden();
            this._updateDom();
        }
    }
    
    private _rendered: {
        clickEaterInDom: boolean;
        serviceActive: boolean;
    }
    private _updateDom() {
        if (this._notifying) {
            return;
        }
        
        var serviceActive = this._clients.length > 1;
        if (serviceActive !== this._rendered.serviceActive) {
            // Unregister/register for events that occur frequently.
            if (serviceActive) {
                _ElementUtilities._addEventListener(_Global.document.documentElement, "focusin", this._onFocusInBound);
                _Global.document.documentElement.addEventListener("keydown", this._onKeyDownBound);
                _Global.window.addEventListener("resize", this._onWindowResizeBound);
                this._bodyClient.currentFocus = <HTMLElement>_Global.document.activeElement;
            } else {
                _ElementUtilities._removeEventListener(_Global.document.documentElement, "focusin", this._onFocusInBound);
                _Global.document.documentElement.removeEventListener("keydown", this._onKeyDownBound);
                _Global.window.removeEventListener("resize", this._onWindowResizeBound);
            }
            this._rendered.serviceActive = serviceActive;
        }
         
        var clickEaterIndex = -1;
        this._clients.forEach(function (c, i) {
            if (c.requiresClickEater()) {
                clickEaterIndex = i;
            }
            c.setZIndex("" + (baseZIndex + i * 2 + 1));
        });
        if (clickEaterIndex !== -1) {
            this._clickEaterEl.style.zIndex = "" + (baseZIndex + clickEaterIndex * 2);
        }
        
        var clickEaterInDom = clickEaterIndex !== -1;
        if (clickEaterInDom !== this._rendered.clickEaterInDom) {
            if (clickEaterInDom) {
                _Global.document.body.appendChild(this._clickEaterEl);
            } else {
                var parent = this._clickEaterEl.parentNode;
                parent && parent.removeChild(this._clickEaterEl);
            }
            this._rendered.clickEaterInDom = clickEaterInDom;
        }

        var topLevel: ILightDismissable = null;
        if (this._clients.length > 0) {
            var startIndex = clickEaterIndex === -1 ? 0 : clickEaterIndex;
            var candidates = this._clients.slice(startIndex);
            for (var i = 0, len = this._focusOrder.length; i < len && !topLevel; i++) {
                if (candidates.indexOf(this._focusOrder[i]) !== -1) {
                    topLevel = this._focusOrder[i];
                }
            }
            if (!topLevel) {
                topLevel = candidates[candidates.length - 1];
            }
        }

        if (this._currentTopLevel !== topLevel) {
            this._currentTopLevel = topLevel;
            this._currentTopLevel && this._currentTopLevel.becameTopLevel();
        }
    }
    
    private _dispatchLightDismiss(reason: string, clients?: ILightDismissable[]) {
        if (this._notifying) {
            _Log.log && _Log.log('_LightDismissService ignored dismiss trigger to avoid re-entrancy: "' + reason + '"', "winjs _LightDismissService", "warning");
             return;
         }
        
        this._notifying = true;
        clients = clients || this._clients.slice(0);
        var lightDismissInfo = {
            reason: reason,
            topLevel: true,
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
            if (clients[i].shouldReceiveLightDismiss(lightDismissInfo)) {
                clients[i].lightDismiss(lightDismissInfo);
            }
            lightDismissInfo.topLevel = false;
        }
        
        this._notifying = false;
        this._updateDom();
        
        return lightDismissInfo._doDefault;
    }
    
    //
    // Light dismiss triggers
    //
    
    private _clickEaterTapped() {
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
            moveToFront(this._focusOrder, this._clients[i]);
            this._clients[i].receivedFocus(target);
        }

        this._dispatchLightDismiss(LightDismissalReasons.lostFocus, this._clients.slice(i + 1, this._clients.length));
    }
    
    private _onKeyDown(eventObject: KeyboardEvent) {
        if (eventObject.keyCode === _ElementUtilities.Key.escape) {
            eventObject.preventDefault();
            eventObject.stopPropagation();
            this._dispatchLightDismiss(LightDismissalReasons.escape);
        }
    }
    
    private _onBackClick(eventObject: any) {
        var doDefault = this._dispatchLightDismiss(LightDismissalReasons.hardwareBackButton);
        return !doDefault; // Returns whether or not the event was handled.
    }
    
    private _onWindowResize(eventObject: Event) {
        this._dispatchLightDismiss(LightDismissalReasons.windowResize);
    }
    
    private _onWindowBlur(eventObject: FocusEvent) {
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
    //   - Chrome: In Chrome, we only receive pointer events (no click event) because we call preventDefault
    //     on the pointer events. Consequently, it is up to the PointerUp handler to handle this case.
    //   - IE: In IE, we receive both a PointerUp event and a click event. Consequently, these two event
    //     handlers have to communicate so that they don't trigger a double dismiss. In this case,
    //     PointerUp runs first so it triggers the dismiss and the click handler does nothing (due to the
    //     _skipClickEaterClick flag).
    //  - Right-click: Right-click triggers edgy so we have to be careful not to trigger a double dismiss
    //    (one for edgy and one for clicking on the click eater). Consequently, the pointer event handlers
    //    ignore right-clicks and leave it up to the edgy handler to handle this case. Note: right-click
    //    doesn't trigger click events so we don't have to worry about right-clicks in our click event handler.
    // 
    
    private _clickEaterPointerId: number;
    private _skipClickEaterClick: boolean;
    private _registeredClickEaterCleanUp: boolean;
    
    private _createClickEater(): HTMLElement {
       var clickEater = _Global.document.createElement("section");
        clickEater.className = ClassNames._clickEater;
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
        
        if (eventObject.button !== rightButton) {
            this._clickEaterPointerId = eventObject.pointerId;
            if (!this._registeredClickEaterCleanUp) {
                _ElementUtilities._addEventListener(_Global.window, "pointerup", this._onClickEaterPointerUpBound);
                _ElementUtilities._addEventListener(_Global.window, "pointercancel", this._onClickEaterPointerCancelBound);
                this._registeredClickEaterCleanUp = true;
            }
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
    
    private _onClickEaterClick(eventObject: PointerEvent) {
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

_Base.Namespace.define("WinJS.UI._LightDismissService", {
    shown: shown,
    hidden: hidden,
    LightDismissableElement: LightDismissableElement,
    LightDismissalPolicies: LightDismissalPolicies,
    
    _service: service
});