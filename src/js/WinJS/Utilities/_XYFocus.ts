// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
import _Global = require("../Core/_Global");

import _Base = require("../Core/_Base");
import _BaseUtils = require("../Core/_BaseUtils");
import _ElementUtilities = require("../Utilities/_ElementUtilities");
import _Events = require("../Core/_Events");
import _OptionsParser = require("../ControlProcessor/_OptionsParser");

"use strict";

var AttributeNames = {
    focusOverride: "data-win-xyfocus",
    focusOverrideLegacy: "data-win-focus"
};

var ClassNames = {
    focusable: "win-focusable",
};

var CrossDomainMessageConstants = {
    messageDataProperty: "msWinJSXYFocusControlMessage",

    register: "register",
    unregister: "unregister",
    dFocusEnter: "dFocusEnter",
    dFocusExit: "dFocusExit"
};

var DirectionNames = {
    left: "left",
    right: "right",
    up: "up",
    down: "down"
};

var EventNames = {
    focusChanging: "focuschanging",
    focusChanged: "focuschanged"
};

var FocusableTagNames = [
    "A",
    "BUTTON",
    "IFRAME",
    "INPUT",
    "SELECT",
    "TEXTAREA"
];

// These factors can be tweaked to adjust which elements are favored by the focus algorithm  
var ScoringConstants = {
    primaryAxisDistanceWeight: 30,
    secondaryAxisDistanceWeight: 20,
    percentInHistoryShadowWeight: 100000
};

interface ICrossDomainMessage {
    type: string;
    direction?: string;
    referenceRect?: IRect;
}

interface FindNextFocusResult {
    referenceRect: IRect;
    target: HTMLElement;
    targetRect: IRect;
    usedOverride: boolean;
}

export interface XYFocusOptions {
    /**
     * The focus scope, only children of this element are considered in the calculation.
    **/
    focusRoot?: HTMLElement;

    /**
     * A rectangle indicating where focus came from before the current state.
    **/
    historyRect?: IRect;

    /**
     * The element from which to calculate the next focusable element; if specified, referenceRect is ignored.
    **/
    referenceElement?: HTMLElement;

    /**
     * The rectangle from which to calculate next focusable element; ignored if referenceElement is also specified.
    **/
    referenceRect?: IRect;
}

export interface IRect {
    left: number;
    right?: number;
    top: number;
    bottom?: number;

    height: number;
    width: number;
}

/**
 * Gets the mapping object that maps keycodes to XYFocus actions.
**/ 
export var keyCodeMap: { [key: string]: number[] } = {
    left: [_ElementUtilities.Key.leftArrow],
    right: [_ElementUtilities.Key.rightArrow],
    up: [_ElementUtilities.Key.upArrow],
    down: [_ElementUtilities.Key.downArrow]
};

/**
 * Gets or sets the focus root when invoking XYFocus APIs.
**/
export var focusRoot: HTMLElement;

/**
 * Returns the next focusable element from the current active element (or reference, if supplied) towards the specified direction.
 * @param direction The direction to search.
 * @param options An options object configuring the search.
**/
export function findNextFocusElement(direction: string, options?: XYFocusOptions): HTMLElement;
export function findNextFocusElement(direction: "left", options?: XYFocusOptions): HTMLElement;
export function findNextFocusElement(direction: "right", options?: XYFocusOptions): HTMLElement;
export function findNextFocusElement(direction: "up", options?: XYFocusOptions): HTMLElement;
export function findNextFocusElement(direction: "down", options?: XYFocusOptions): HTMLElement;
export function findNextFocusElement(direction: string, options?: XYFocusOptions): HTMLElement {
    var result = _findNextFocusElementInternal(direction, options);
    return result ? result.target : null;
}

/**
 * Moves focus to the next focusable element from the current active element (or reference, if supplied) towards the specific direction.
 * @param direction The direction to move.
 * @param options An options object configuring the focus move.
**/
export function moveFocus(direction: string, options?: XYFocusOptions): HTMLElement;
export function moveFocus(direction: "left", options?: XYFocusOptions): HTMLElement;
export function moveFocus(direction: "right", options?: XYFocusOptions): HTMLElement;
export function moveFocus(direction: "up", options?: XYFocusOptions): HTMLElement;
export function moveFocus(direction: "down", options?: XYFocusOptions): HTMLElement;
export function moveFocus(direction: string, options?: XYFocusOptions): HTMLElement {
    var result = findNextFocusElement(direction, options);
    if (result) {
        var previousFocusElement = _Global.document.activeElement;
        if (_trySetFocus(result, -1)) {
            eventSrc.dispatchEvent(EventNames.focusChanged, { previousFocusElement: previousFocusElement, keyCode: -1 });

            return result;
        }
    }
}

export function enableXYFocus() {
    if (!_xyFocusEnabled) {
        _Global.document.addEventListener("keydown", _handleKeyEvent);
        _xyFocusEnabled = true;
    }
}

export function disableXYFocus() {
    if (_xyFocusEnabled) {
        _Global.document.removeEventListener("keydown", _handleKeyEvent);
        _xyFocusEnabled = false;
    }
}


// Privates
var _xyFocusEnabled = false;
var _lastTarget: HTMLElement;
var _cachedLastTargetRect: IRect;
var _historyRect: IRect;
var _afEnabledFrames: Window[] = [];
function _xyFocus(direction: string, keyCode: number, referenceRect?: IRect): boolean {
    // If focus has moved since the last XYFocus movement, scrolling occured, or an explicit
    // reference rectangle was given to us, then we invalidate the history rectangle.
    if (referenceRect || _Global.document.activeElement !== _lastTarget) {
        _historyRect = null;
        _lastTarget = null;
        _cachedLastTargetRect = null;
    } else if (_lastTarget && _cachedLastTargetRect) {
        var lastTargetRect = _toIRect(_lastTarget.getBoundingClientRect());
        if (lastTargetRect.left !== _cachedLastTargetRect.left || lastTargetRect.top !== _cachedLastTargetRect.top) {
            _historyRect = null;
            _lastTarget = null;
            _cachedLastTargetRect = null;
        }
    }

    var activeElement = _Global.document.activeElement;
    var lastTarget = _lastTarget;

    var result = _findNextFocusElementInternal(direction, {
        focusRoot: focusRoot,
        historyRect: _historyRect,
        referenceElement: _lastTarget,
        referenceRect: referenceRect
    });

    if (result && _trySetFocus(result.target, keyCode)) {
        // A focus target was found
        if (result.usedOverride) {
            // Reset history since the override target could be anywhere
            _historyRect = null;
        } else {
            updateHistoryRect(direction, result);
        }
        _lastTarget = result.target;
        _cachedLastTargetRect = result.targetRect;

        if (result.target.tagName === "IFRAME") {
            var index = _afEnabledFrames.lastIndexOf((<HTMLIFrameElement>result.target).contentWindow);
            if (index >= 0) {
                // If we successfully moved focus and the new focused item is an IFRAME, then we need to notify it
                // Note on coordinates: When signaling enter, DO transform the coordinates into the child frame's coordinate system.
                var refRect = _toIRect({
                    left: result.referenceRect.left - result.targetRect.left,
                    top: result.referenceRect.top - result.targetRect.top,
                    width: result.referenceRect.width,
                    height: result.referenceRect.height
                });

                var message = {};
                message[CrossDomainMessageConstants.messageDataProperty] = <ICrossDomainMessage>{
                    type: CrossDomainMessageConstants.dFocusEnter,
                    direction: direction,
                    referenceRect: refRect
                };
                (<HTMLIFrameElement>result.target).contentWindow.postMessage(message, "*");
            }
        }
        eventSrc.dispatchEvent(EventNames.focusChanged, { previousFocusElement: activeElement, keyCode: keyCode });
        return true;
    } else {
        // No focus target was found; if we are inside an IFRAME, notify the parent that focus is exiting this IFRAME
        // Note on coordinates: When signaling exit, do NOT transform the coordinates into the parent's coordinate system.
        if (top !== window) {
            var refRect = referenceRect;
            if (!refRect) {
                refRect = _Global.document.activeElement ? _toIRect(_Global.document.activeElement.getBoundingClientRect()) : _defaultRect();
            }

            var message = {};
            message[CrossDomainMessageConstants.messageDataProperty] = <ICrossDomainMessage>{
                type: CrossDomainMessageConstants.dFocusExit,
                direction: direction,
                referenceRect: refRect
            };
            _Global.parent.postMessage(message, "*");
            return true;
        }
    }
    return false;

    // Nested Helpers
    function updateHistoryRect(direction: string, result: FindNextFocusResult) {
        var newHistoryRect = _defaultRect();

        // It's possible to get into a situation where the target element has no overlap with the reference edge.
        //  
        //..╔══════════════╗..........................  
        //..║   reference  ║..........................  
        //..╚══════════════╝..........................  
        //.....................╔═══════════════════╗..  
        //.....................║                   ║..  
        //.....................║       target      ║..  
        //.....................║                   ║..  
        //.....................╚═══════════════════╝..  
        //  
        // If that is the case, we need to reset the coordinates to the edge of the target element.  
        if (direction === DirectionNames.left || direction === DirectionNames.right) {
            newHistoryRect.top = _Global.Math.max(result.targetRect.top, result.referenceRect.top, _historyRect ? _historyRect.top : Number.MIN_VALUE);
            newHistoryRect.bottom = _Global.Math.min(result.targetRect.bottom, result.referenceRect.bottom, _historyRect ? _historyRect.bottom : Number.MAX_VALUE);
            if (newHistoryRect.bottom <= newHistoryRect.top) {
                newHistoryRect.top = result.targetRect.top;
                newHistoryRect.bottom = result.targetRect.bottom;
            }
            newHistoryRect.height = newHistoryRect.bottom - newHistoryRect.top;

            newHistoryRect.width = Number.MAX_VALUE;
            newHistoryRect.left = Number.MIN_VALUE;
            newHistoryRect.right = Number.MAX_VALUE;
        } else {
            newHistoryRect.left = _Global.Math.max(result.targetRect.left, result.referenceRect.left, _historyRect ? _historyRect.left : Number.MIN_VALUE);
            newHistoryRect.right = _Global.Math.min(result.targetRect.right, result.referenceRect.right, _historyRect ? _historyRect.right : Number.MAX_VALUE);
            if (newHistoryRect.right <= newHistoryRect.left) {
                newHistoryRect.left = result.targetRect.left;
                newHistoryRect.right = result.targetRect.right;
            }
            newHistoryRect.width = newHistoryRect.right - newHistoryRect.left;

            newHistoryRect.height = Number.MAX_VALUE;
            newHistoryRect.top = Number.MIN_VALUE;
            newHistoryRect.bottom = Number.MAX_VALUE;
        }
        _historyRect = newHistoryRect;
    }
}

function _findNextFocusElementInternal(direction: string, options?: XYFocusOptions): FindNextFocusResult {
    options = options || {};
    options.focusRoot = options.focusRoot || focusRoot || _Global.document.body;
    options.historyRect = options.historyRect || _defaultRect();

    var maxDistance = _Global.Math.max(_Global.screen.availHeight, _Global.screen.availWidth);
    var refObj = getReferenceObject(options.referenceElement, options.referenceRect);

    // Handle override
    if (refObj.element) {
        var manualOverrideOptions = refObj.element.getAttribute(AttributeNames.focusOverride) || refObj.element.getAttribute(AttributeNames.focusOverrideLegacy);
        if (manualOverrideOptions) {
            var parsedOptions = _OptionsParser.optionsParser(manualOverrideOptions);

            // The left-hand side can be cased as either "left" or "Left".
            var selector: string = parsedOptions[direction] || parsedOptions[direction[0].toUpperCase() + direction.substr(1)];

            if (selector) {
                var target: HTMLElement;
                var element = refObj.element;
                while (!target && element) {
                    target = <HTMLElement>element.querySelector(selector);
                    element = element.parentElement;
                }
                if (target) {
                    if (target === _Global.document.activeElement) {
                        return null;
                    }
                    return { target: target, targetRect: _toIRect(target.getBoundingClientRect()), referenceRect: null, usedOverride: true };
                }
            }
        }
    }

    // Calculate scores for each element in the root
    var bestPotential = {
        element: <HTMLElement>null,
        rect: <IRect>null,
        score: 0
    };
    var allElements = options.focusRoot.querySelectorAll("*");
    for (var i = 0, length = allElements.length; i < length; i++) {
        var potentialElement = <HTMLElement>allElements[i];

        if (refObj.element === potentialElement || !isFocusable(potentialElement)) {
            continue;
        }

        var potentialRect = _toIRect(potentialElement.getBoundingClientRect());

        // Skip elements that have either a width of zero or a height of zero  
        if (potentialRect.width === 0 || potentialRect.height === 0) {
            continue;
        }

        var score = calculateScore(direction, maxDistance, options.historyRect, refObj.rect, potentialRect);

        if (score > bestPotential.score) {
            bestPotential.element = potentialElement;
            bestPotential.rect = potentialRect;
            bestPotential.score = score;
        }
    }

    return bestPotential.element ? { target: bestPotential.element, targetRect: bestPotential.rect, referenceRect: refObj.rect, usedOverride: false } : null;


    // Nested Helpers
    function calculatePercentInShadow(minReferenceCoord: number, maxReferenceCoord: number, minPotentialCoord: number, maxPotentialCoord: number) {
        /// Calculates the percentage of the potential element that is in the shadow of the reference element.   
        if ((minReferenceCoord >= maxPotentialCoord) ||
            (maxReferenceCoord <= minPotentialCoord)) {
            return 0;
        }

        var pixelOverlapWithTheReferenceShadow = _Global.Math.min(maxReferenceCoord, maxPotentialCoord) - _Global.Math.max(minReferenceCoord, minPotentialCoord);
        var referenceEdgeLength = maxReferenceCoord - minReferenceCoord;
        return pixelOverlapWithTheReferenceShadow / referenceEdgeLength;
    }

    function calculateScore(direction: string, maxDistance: number, historyRect: IRect, referenceRect: IRect, potentialRect: IRect) {
        var score = 0;

        var percentInShadow: number;
        var primaryAxisDistance: number;
        var secondaryAxisDistance = 0;
        var percentInHistoryShadow = 0;
        switch (direction) {
            case DirectionNames.left:
                // Make sure we don't evaluate any potential elements to the right of the reference element  
                if (potentialRect.left >= referenceRect.left) {
                    break;
                }

                percentInShadow = calculatePercentInShadow(referenceRect.top, referenceRect.bottom, potentialRect.top, potentialRect.bottom);
                primaryAxisDistance = referenceRect.left - potentialRect.right;

                if (percentInShadow > 0) {
                    percentInHistoryShadow = calculatePercentInShadow(historyRect.top, historyRect.bottom, potentialRect.top, potentialRect.bottom);
                } else {
                    // If the potential element is not in the shadow, then we calculate secondary axis distance  
                    secondaryAxisDistance = (referenceRect.bottom <= potentialRect.top) ? (potentialRect.top - referenceRect.bottom) : referenceRect.top - potentialRect.bottom;
                }
                break;

            case DirectionNames.right:
                // Make sure we don't evaluate any potential elements to the left of the reference element  
                if (potentialRect.right <= referenceRect.right) {
                    break;
                }

                percentInShadow = calculatePercentInShadow(referenceRect.top, referenceRect.bottom, potentialRect.top, potentialRect.bottom);
                primaryAxisDistance = potentialRect.left - referenceRect.right;

                if (percentInShadow > 0) {
                    percentInHistoryShadow = calculatePercentInShadow(historyRect.top, historyRect.bottom, potentialRect.top, potentialRect.bottom);
                } else {
                    // If the potential element is not in the shadow, then we calculate secondary axis distance
                    secondaryAxisDistance = (referenceRect.bottom <= potentialRect.top) ? (potentialRect.top - referenceRect.bottom) : referenceRect.top - potentialRect.bottom;
                }
                break;

            case DirectionNames.up:
                // Make sure we don't evaluate any potential elements below the reference element  
                if (potentialRect.top >= referenceRect.top) {
                    break;
                }

                percentInShadow = calculatePercentInShadow(referenceRect.left, referenceRect.right, potentialRect.left, potentialRect.right);
                primaryAxisDistance = referenceRect.top - potentialRect.bottom;

                if (percentInShadow > 0) {
                    percentInHistoryShadow = calculatePercentInShadow(historyRect.left, historyRect.right, potentialRect.left, potentialRect.right);
                } else {
                    // If the potential element is not in the shadow, then we calculate secondary axis distance
                    secondaryAxisDistance = (referenceRect.right <= potentialRect.left) ? (potentialRect.left - referenceRect.right) : referenceRect.left - potentialRect.right;
                }
                break;

            case DirectionNames.down:
                // Make sure we don't evaluate any potential elements above the reference element  
                if (potentialRect.bottom <= referenceRect.bottom) {
                    break;
                }

                percentInShadow = calculatePercentInShadow(referenceRect.left, referenceRect.right, potentialRect.left, potentialRect.right);
                primaryAxisDistance = potentialRect.top - referenceRect.bottom;

                if (percentInShadow > 0) {
                    percentInHistoryShadow = calculatePercentInShadow(historyRect.left, historyRect.right, potentialRect.left, potentialRect.right);
                } else {
                    // If the potential element is not in the shadow, then we calculate secondary axis distance  
                    secondaryAxisDistance = (referenceRect.right <= potentialRect.left) ? (potentialRect.left - referenceRect.right) : referenceRect.left - potentialRect.right;
                }
                break;
        }

        if (primaryAxisDistance >= 0) {
            // The score needs to be a positive number so we make these distances positive numbers  
            primaryAxisDistance = maxDistance - primaryAxisDistance;
            secondaryAxisDistance = maxDistance - secondaryAxisDistance;

            if (primaryAxisDistance >= 0 && secondaryAxisDistance >= 0) {
                // Potential elements in the shadow get a multiplier to their final score  
                primaryAxisDistance += primaryAxisDistance * percentInShadow;

                score = primaryAxisDistance * ScoringConstants.primaryAxisDistanceWeight +
                secondaryAxisDistance * ScoringConstants.secondaryAxisDistanceWeight +
                percentInHistoryShadow * ScoringConstants.percentInHistoryShadowWeight;
            }
        }
        return score;
    }

    function getReferenceObject(referenceElement?: HTMLElement, referenceRect?: IRect) {
        var refElement: HTMLElement;
        var refRect: IRect;

        if ((!referenceElement && !referenceRect) || (referenceElement && !referenceElement.parentNode)) {
            // Note: We need to check to make sure 'parentNode' is not null otherwise there is a case  
            // where _lastTarget is defined, but calling getBoundingClientRect will throw a native exception.  
            // This case happens if the innerHTML of the parent of the _lastTarget is set to "".  

            // If no valid reference is supplied, we'll use _Global.document.activeElement unless it's the body
            if (_Global.document.activeElement !== _Global.document.body) {
                referenceElement = <HTMLElement>_Global.document.activeElement;
            }
        }

        if (referenceElement) {
            refElement = referenceElement;
            refRect = _toIRect(refElement.getBoundingClientRect());
        } else if (referenceRect) {
            refRect = _toIRect(referenceRect);
        } else {
            refRect = _defaultRect();
        }
        return {
            element: refElement,
            rect: refRect
        }
    }

    function isFocusable(element: HTMLElement): boolean {
        var elementTagName = element.tagName;
        if (!element.hasAttribute("tabindex") && FocusableTagNames.indexOf(elementTagName) === -1 && !_ElementUtilities.hasClass(element, ClassNames.focusable)) {
            // If the current potential element is not one of the tags we consider to be focusable, then exit  
            return false;
        }

        if (elementTagName === "IFRAME" && _afEnabledFrames.indexOf((<HTMLIFrameElement>element).contentWindow) === -1) {
            // Skip IFRAMEs without compatible XYFocus implementation
            return false;
        }

        if (elementTagName === "DIV" && element["winControl"] && element["winControl"].disabled) {
            // Skip disabled WinJS controls  
            return false;
        }

        var style = getComputedStyle(element);
        if (element.getAttribute("tabIndex") === "-1" || style.display === "none" || style.visibility === "hidden" || element.disabled) {
            // Skip elements that are hidden  
            // Note: We don't check for opacity === 0, because the browser cannot tell us this value accurately.  
            return false;
        }
        return true;
    }
}

function _defaultRect(): IRect {
    // We set the top, left, bottom and right properties of the referenceBoundingRectangle to '-1'   
    // (as opposed to '0') because we want to make sure that even elements that are up to the edge   
    // of the screen can receive focus.  
    return {
        top: -1,
        bottom: -1,
        right: -1,
        left: -1,
        height: 0,
        width: 0
    };
}

function _toIRect(rect: IRect): IRect {
    return {
        top: _Global.Math.floor(rect.top),
        bottom: _Global.Math.floor(rect.top + rect.height),
        right: _Global.Math.floor(rect.left + rect.width),
        left: _Global.Math.floor(rect.left),
        height: _Global.Math.floor(rect.height),
        width: _Global.Math.floor(rect.width),
    };
}

function _trySetFocus(element: HTMLElement, keyCode: number) {
    // We raise an event on the focusRoot before focus changes to give listeners  
    // a chance to prevent the next focus target from receiving focus if they want.  
    var canceled = eventSrc.dispatchEvent(EventNames.focusChanging, { nextFocusElement: element, keyCode: keyCode });
    if (!canceled) {
        element.focus();
    }
    return _Global.document.activeElement === element;
}

function _getIFrameFromWindow(win: Window) {
    var iframes = _Global.document.querySelectorAll("IFRAME");
    var found = <Array<HTMLIFrameElement>>Array.prototype.filter.call(iframes, (x: HTMLIFrameElement) => x.contentWindow === win);
    return found.length ? found[0] : null;
}

function _handleKeyEvent(e: KeyboardEvent): void {
    if (e.defaultPrevented) {
        return;
    }

    var keys = Object.keys(keyCodeMap);
    for (var i = 0; i < keys.length; i++) {
        // Note: key is 'left', 'right', 'up', or 'down'
        var key = keys[i];
        var keyMappings = keyCodeMap[key];
        if (keyMappings.indexOf(e.keyCode) >= 0) {
            if (_xyFocus(key, e.keyCode)) {
                e.preventDefault();
            }
            return;
        }
    }
}

_Global.addEventListener("message", (e: MessageEvent): void => {
    if (!e.data || !e.data[CrossDomainMessageConstants.messageDataProperty]) {
        return;
    }

    var data: ICrossDomainMessage = e.data[CrossDomainMessageConstants.messageDataProperty];
    switch (data.type) {
        case CrossDomainMessageConstants.register:
            _afEnabledFrames.push(e.source);
            break;

        case CrossDomainMessageConstants.unregister:
            var index = _afEnabledFrames.indexOf(e.source);
            if (index >= 0) {
                _afEnabledFrames.splice(index, 1);
            }
            break;

        case CrossDomainMessageConstants.dFocusEnter:
            // The coordinates stored in data.refRect are already in this frame's coordinate system.
            // When we get this message we will force-enable XYFocus to support scenarios where
            // websites running WinJS are put into an IFRAME and the parent frame has XYFocus enabled.
            enableXYFocus();
            _xyFocus(data.direction, -1, data.referenceRect);
            break;

        case CrossDomainMessageConstants.dFocusExit:
            var iframe = _getIFrameFromWindow(e.source);
            if (_Global.document.activeElement !== iframe) {
                // Since postMessage is async, by the time we get this message, the user may have
                // manually moved the focus elsewhere, if so, ignore this message.
                break;
            }

            // The coordinates stored in data.refRect are in the IFRAME's coordinate system,
            // so we must first transform them into this frame's coordinate system.
            var refRect: IRect = data.referenceRect;
            refRect.left += iframe.offsetLeft;
            refRect.top += iframe.offsetTop;
            _xyFocus(data.direction, -1, refRect);
            break;
    }
});

_Global.document.addEventListener("DOMContentLoaded", () => {
    if (_ElementUtilities.hasWinRT && _Global["Windows"] && _Global["Windows"]["Xbox"]) {
        enableXYFocus();
    }

    // If we are running within an iframe, we send a registration message to the parent window  
    if (_Global.top !== _Global.window) {
        var message = {};
        message[CrossDomainMessageConstants.messageDataProperty] = {
            type: CrossDomainMessageConstants.register,
            version: 1.0
        };
        _Global.parent.postMessage(message, "*");
    }
});


// Publish to WinJS namespace
var toPublish = {
    keyCodeMap: keyCodeMap,
    focusRoot: {
        get: function () {
            return focusRoot;
        },
        set: function (value: HTMLElement) {
            focusRoot = value;
        }
    },

    enableXYFocus: enableXYFocus,
    disableXYFocus: disableXYFocus,
    findNextFocusElement: findNextFocusElement,
    moveFocus: moveFocus,

    _xyFocus: _xyFocus
};
toPublish = _BaseUtils._merge(toPublish, _Events.eventMixin);
toPublish["_listeners"] = {};
var eventSrc = <_Events.eventMixin><any>toPublish;
_Base.Namespace.define("WinJS.UI.XYFocus", toPublish);
