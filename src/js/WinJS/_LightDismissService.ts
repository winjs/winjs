// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

import _Base = require('./Core/_Base');
import _BaseUtils = require('./Core/_BaseUtils');
import _ElementUtilities = require('./Utilities/_ElementUtilities');
import _Global = require('./Core/_Global');
import _Log = require('./Core/_Log');
import _Resources = require('./Core/_Resources');

// TODO: Laziness?

require(["require-style!less/styles-lightdismissservice"]);

"use strict";

var baseZIndex = 1000; // TODO: What should this value be?

var Strings = {
    // TODO: Don't use an overlay specific string
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
    // click (_Overlay.js: _Overlay_handleAppBarClickEatingClick, _Overlay__handleFlyoutClickEatingClick)
    // window blur (_Overlay.js: _GlobalListener_windowBlur)
    // edgy (_Overlay.js: _checkRightClickUp, _GlobalListener_edgyStarting, _GlobalListener_edgyCompleted)
    // escape key
    // hardware back button
    // window resize
    // rotation
    // page navigation?
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
        info.stopPropagation(); // TODO: Maybe we shouldn't stopPropagation here
        return false;
    }  
};
var rightButton = 2;

export interface ILightDismissInfo {
    reason: string;
    topLevel: boolean;
    stopPropagation(): void;
    preventDefault(): void;
}

export interface ILightDismissable {
    setZIndex(zIndex: string): void;
    containsElement(element: HTMLElement): boolean;
    requiresClickEater(): boolean;
    becameTopLevel(): void;
    receivedFocus(element: HTMLElement): void;
    hidden(): void;
    shouldReceiveLightDismiss(info: ILightDismissInfo): boolean;
    
    lightDismiss(info: ILightDismissInfo): void;
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

class LightDismissService {
    private _clickEaterEl: HTMLElement;
    private _clients: ILightDismissable[];
    private _currentTopLevel: ILightDismissable;
    private _focusOrder: ILightDismissable[];
    private _notifying: boolean;
    private _bodyClient: LightDismissableBody;
    
    private _onFocusInBound: (eventObject: FocusEvent) => void;
    private _onKeyDownBound: (eventObject: KeyboardEvent) => void;
    
    constructor() {
        this._clickEaterEl = this._createClickEater();
        this._clients = [];
        this._currentTopLevel = null;
        //this._isLive = false;
        //this._listeners = {};
        this._focusOrder = [];
        this._rendered = {
            clickEaterInDom: false,
            serviceActive: false
        };
        this._notifying = false;
        this._bodyClient = new LightDismissableBody();
        
        this._onFocusInBound = this._onFocusIn.bind(this);
        this._onKeyDownBound = this._onKeyDown.bind(this);
        
        this.shown(this._bodyClient);
        
        //this._onEdgyStartingBound = this._onEdgyStarting.bind(this);
        //this._onEdgyCompletedBound = this._onEdgyCompleted.bind(this);
        //this._onEdgyCanceledBound = this._onEdgyCanceled.bind(this);
        //if (_WinRT.Windows.UI.Input.EdgeGesture) {
        //    var edgy = _WinRT.Windows.UI.Input.EdgeGesture.getForCurrentView();
        //    edgy.addEventListener("starting", this._onEdgyStartingBound);
        //    edgy.addEventListener("completed", this._onEdgyCompletedBound);
        //    edgy.addEventListener("canceled", this._onEdgyCanceledBound);
        //}
        
        //Application.addEventListener("backclick", this._onBackClick.bind(this));
        //_Global.addEventListener("resize", this._onWindowResize.bind(this));
        // Focus handlers generally use WinJS.Utilities._addEventListener with focusout/focusin. This
        // uses the browser's blur event directly beacuse _addEventListener doesn't support focusout/focusin
        // on window.
        //_Global.addEventListener("blur", this._onWindowBlur.bind(this));
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
    
    private _createClickEater(): HTMLElement {
           var clickEater = _Global.document.createElement("section");
        clickEater.className = ClassNames._clickEater;
        _ElementUtilities._addEventListener(clickEater, "pointerdown", this._onClickEaterPointerDown.bind(this), true);
        _ElementUtilities._addEventListener(clickEater, "pointerup", this._onClickEaterPointerUp.bind(this), true);
        clickEater.addEventListener("click", this._onClickEaterClick.bind(this), true);
        // Tell Aria that it's clickable
        clickEater.setAttribute("role", "menuitem");
        clickEater.setAttribute("aria-label", Strings.closeOverlay);
        // Prevent CED from removing any current selection
        clickEater.setAttribute("unselectable", "on");
        return clickEater;
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
            if (serviceActive) {
                _ElementUtilities._addEventListener(_Global.document.documentElement, "focusin", this._onFocusInBound);
                _ElementUtilities._addEventListener(_Global.document.documentElement, "keydown", this._onKeyDownBound);
                this._bodyClient.currentFocus = <HTMLElement>_Global.document.activeElement;
            } else {
                _ElementUtilities._removeEventListener(_Global.document.documentElement, "focusin", this._onFocusInBound);
                _ElementUtilities._removeEventListener(_Global.document.documentElement, "keydown", this._onKeyDownBound);
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
    
    private _onFocusIn(eventObject: FocusEvent) {
        // Commented out code is from _Overlay.js. Think if we need to handle this case in the service.
        // Do not hide focus if focus moved to a CED. Let the click handler on the CED take care of hiding us.
        //if (active &&
        //        (_ElementUtilities.hasClass(active, _Constants._clickEatingFlyoutClass) ||
        //         _ElementUtilities.hasClass(active, _Constants._clickEatingAppBarClass))) {
        //    return;
        //}

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
        // TODO: Original would set _keyboardInvoked to true for escape here.
        // TODO: preventDefault, stopPropagation even if nobody dismisses?
        if (eventObject.keyCode === _ElementUtilities.Key.escape) {
            eventObject.preventDefault();
            eventObject.stopPropagation();
            this._dispatchLightDismiss(LightDismissalReasons.escape);
        }
    }
    
    //
    // Click eater light dismiss triggers
    //
    
    private _clickEaterPointerId: number;
    private _skipClickEaterClick: boolean;
    
    private _onClickEaterPointerDown(eventObject: PointerEvent) {
        eventObject.stopPropagation();
        eventObject.preventDefault();
        
        if (eventObject.button !== rightButton) {
            this._clickEaterPointerId = eventObject.pointerId;
        }
    }

    // Make sure that if we have an up we had an earlier down of the same kind
    private _onClickEaterPointerUp(eventObject: PointerEvent) {
        eventObject.stopPropagation();
        eventObject.preventDefault();
        
        if (eventObject.pointerId === this._clickEaterPointerId) {
            this._clickEaterPointerId = null;
            var element = _Global.document.elementFromPoint(eventObject.clientX, eventObject.clientY);
            
            // Need to ensure that the pointerup was over the click eater in case pointer capture is set.
            if (element === this._clickEaterEl) {
                this._skipClickEaterClick = true;
                _BaseUtils._yieldForEvents(() => {
                    this._skipClickEaterClick = false;
                });
                this._dispatchLightDismiss(LightDismissalReasons.tap);
            }
        }
    }

    // TODO: Think about edgy
    // TODO: How to dismiss on right-click? click event doesn't seem to fire on right-click.
    // AppBars don't want to dismiss on right-click because they are hooked up to edgy which
    // will trigger on right-click.
    private _onClickEaterClick(eventObject: PointerEvent) {
        eventObject.stopPropagation();
        eventObject.preventDefault();
        
        if (!this._skipClickEaterClick) {
            // light dismiss here? original implementation seemed to dismiss in up and click
            this._dispatchLightDismiss(LightDismissalReasons.tap);
        }
    }
}

export interface LightDismissableElementArgs {
    element: HTMLElement;
    context?: any;
    
    setZIndex?(zIndex: string): void;
    containsElement?(element: HTMLElement): boolean;
    requiresClickEater?(): boolean;
    becameTopLevel?(): void;
    receivedFocus?(element: HTMLElement): void;
    hidden?(): void;
    shouldReceiveLightDismiss?(info: ILightDismissInfo): boolean;
    
    lightDismiss?(info: ILightDismissInfo): void;
}

function _() { }

class LightDismissableBody implements ILightDismissable {    
    currentFocus: HTMLElement;
    
    setZIndex = _;
    containsElement(element: HTMLElement): boolean {
        return _Global.document.body.contains(element);
    }
    requiresClickEater(): boolean {
        return false;
    }
    becameTopLevel(): void {
        (this.currentFocus && this.containsElement(this.currentFocus) && _ElementUtilities._tryFocus(this.currentFocus)) ||
            _ElementUtilities._focusFirstFocusableElement(_Global.document.body) ||
            _ElementUtilities._tryFocus(_Global.document.body);
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
    lightDismiss = _;
}

export class LightDismissableElement<T> implements ILightDismissable {
    element: HTMLElement;
    context: T;
    
    private _winCurrentFocus: HTMLElement;
    
    private _winReceivedFocus: (element: HTMLElement) => void;
    private _winHidden: () => void;
    
    constructor(args: LightDismissableElementArgs) {
        this.element = args.element;
        this.context = args.context;
        
        if (args.setZIndex) { this.setZIndex = args.setZIndex; }
        if (args.containsElement) { this.containsElement = args.containsElement; }
        if (args.requiresClickEater) { this.requiresClickEater = args.requiresClickEater; }
        if (args.becameTopLevel) { this.becameTopLevel = args.becameTopLevel; }
        this._winReceivedFocus = args.receivedFocus;
        this._winHidden = args.hidden;
        if (args.shouldReceiveLightDismiss) { this.shouldReceiveLightDismiss = args.shouldReceiveLightDismiss; }
        if (args.lightDismiss) { this.lightDismiss = args.lightDismiss; }
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
            (this._winCurrentFocus && this.containsElement(this._winCurrentFocus) && _ElementUtilities._tryFocus(this._winCurrentFocus)) ||
                _ElementUtilities._focusFirstFocusableElement(this.element) ||
                _ElementUtilities._tryFocus(this.element);
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
    
    lightDismiss(info: ILightDismissInfo): void {
        
    }
}

var service = new LightDismissService();
export var shown = service.shown.bind(service);
export var hidden = service.hidden.bind(service);

_Base.Namespace.define("WinJS.UI._LightDismissService", {
    shown: shown,
    hidden: hidden,
    LightDismissableElement: LightDismissableElement,
    LightDismissalPolicies: LightDismissalPolicies
});