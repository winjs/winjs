// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
import _Global = require("../Core/_Global");

import _Base = require("../Core/_Base");
import _BaseUtils = require("../Core/_BaseUtils");
import _ElementUtilities = require("../Utilities/_ElementUtilities");
import _Events = require("../Core/_Events");
import _OptionsParser = require("../ControlProcessor/_OptionsParser");

"use strict";

var AttributeNames = {
    focusOverride: "data-win-focus"
};

var ClassNames = {
    focusable: "win-focusable",
    manualFocusContainer: "win-autofocus-manualfocuscontainer"
};

var CrossDomainMessageConstants = {
    messageDataProperty: "msWinJSAutoFocusControlMessage",

    register: "register",
    unregister: "unregister",
    autoFocusEnter: "autoFocusEnter",
    autoFocusExit: "autoFocusExit"
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
    primaryAxisDistanceWeight: 3,
    secondaryAxisDistanceWeight: 2,
    percentInHistoryShadowWeight: 10000,
    inShadowThreshold: 0.25
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

export interface AutoFocusOptions {
    /**
     * Indicates whether the override attribute is considered.
    **/
    allowOverride?: boolean;

    /**
     * The focus scope, only children of this element are considered in the calculation.
    **/
    focusRoot?: HTMLElement;

    /**
     * A rectangle indicating where focus came from before the current state.
    **/
    historyRect?: IRect;

    /**
     * The maximum distance a potential can be from the reference element in order to be considered.
    **/
    maxDistance?: number;

    /**
     * A element from which to calculate the next focusable element from; if specified, referenceRect is ignored.
    **/
    referenceElement?: HTMLElement;

    /**
     * A rectangle from which to calculate next focusable element from; ignored if referenceElement is also specified.
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

export var focusRoot: HTMLElement;

export function findNextFocusElement(direction: "left", options?: AutoFocusOptions): HTMLElement;
export function findNextFocusElement(direction: "right", options?: AutoFocusOptions): HTMLElement;
export function findNextFocusElement(direction: "up", options?: AutoFocusOptions): HTMLElement;
export function findNextFocusElement(direction: "down", options?: AutoFocusOptions): HTMLElement;
export function findNextFocusElement(direction: string, options?: AutoFocusOptions): HTMLElement;
export function findNextFocusElement(direction: string, options?: AutoFocusOptions): HTMLElement {
    var result = _findNextFocusElementInternal(direction, options);
    return result ? result.target : null;
}

var _lastAutoFocusTarget: HTMLElement;
var _historyRect: IRect;
var _afEnabledFrames: Window[] = [];
function _autoFocus (direction: string, exitManualFocusContainer?: boolean, referenceRect?: IRect): void {
    if (!exitManualFocusContainer) {
        // AutoFocus is suspended if the activeElement is in a manual-focus-container
        var element = <HTMLElement>_Global.document.activeElement;
        while (element) {
            // Do not use HTMLElement.classList here as the current element may not support it
            if (element.className.indexOf(ClassNames.manualFocusContainer) >= 0) {
                return;
            }
            element = element.parentElement;
        }
    }

    if (referenceRect || _Global.document.activeElement !== _lastAutoFocusTarget) {
        _historyRect = null;
        _lastAutoFocusTarget = null;
    }

    var activeElement = _Global.document.activeElement;
    var lastAutoFocusTarget = _lastAutoFocusTarget;

    var result = _findNextFocusElementInternal(direction, {
        allowOverride: true,
        focusRoot: focusRoot,
        historyRect: _historyRect,
        referenceElement: _lastAutoFocusTarget,
        referenceRect: referenceRect
    });

    if (result) {
        // A focus target was found
        var focusMoved = trySetFocus(result.target);

        if (result.usedOverride) {
            if (focusMoved) {
                // Reset history since the override target could be anywhere
                _historyRect = null;
                _lastAutoFocusTarget = result.target;
            } else {
                // Attempt to focus override target was prevented, try focusing w/o considering override
                result = _findNextFocusElementInternal(direction, {
                    allowOverride: false,
                    focusRoot: focusRoot,
                    historyRect: null,
                    referenceElement: _lastAutoFocusTarget,
                });
                if (result) {
                    focusMoved = trySetFocus(result.target);
                    if (focusMoved) {
                        updateHistoryRect(direction, result);
                        _lastAutoFocusTarget = result.target;
                    }
                }
            }
        } else {
            updateHistoryRect(direction, result);
            _lastAutoFocusTarget = result.target;
        }

        if (focusMoved) {
            if (result.target.tagName === "IFRAME") {
                var index = _afEnabledFrames.lastIndexOf((<HTMLIFrameElement>result.target).contentWindow);
                if (index >= 0) {
                    var iframe = _getIFrameFromWindow(_afEnabledFrames[index]);

                    // If we successfully moved focus and the new focused item is an IFRAME, then we need to notify it
                    // Note on coordinates: When signaling enter, DO transform the coordinates into the child frame's coordinate system.
                    var refRect = _toIRect({
                        left: result.referenceRect.left - iframe.offsetLeft,
                        top: result.referenceRect.top - iframe.offsetTop,
                        width: result.referenceRect.width,
                        height: result.referenceRect.height
                    });

                    var message = {};
                    message[CrossDomainMessageConstants.messageDataProperty] = <ICrossDomainMessage>{
                        type: CrossDomainMessageConstants.autoFocusEnter,
                        direction: direction,
                        referenceRect: refRect
                    };
                    (<HTMLIFrameElement>result.target).contentWindow.postMessage(message, "*");
                }
            }
            var evt = <CustomEvent>_Global.document.createEvent("CustomEvent");
            evt.initCustomEvent(EventNames.focusChanged, true, false, { previousElement: activeElement });
            (<any>toPublish).dispatchEvent(evt);
        }
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
                type: CrossDomainMessageConstants.autoFocusExit,
                direction: direction,
                referenceRect: refRect
            };
            _Global.parent.postMessage(message, "*");
        }
    }


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
        //.....................║ newFocusedElement ║..  
        //.....................║                   ║..  
        //.....................╚═══════════════════╝..  
        //  
        // If that is the case, we need to reset the coordinates to the edge of the target element.  
        if (direction === DirectionNames.left || direction === DirectionNames.right) {
            newHistoryRect.top = Math.max(result.targetRect.top, result.referenceRect.top, _historyRect ? _historyRect.top : Number.MIN_VALUE);
            newHistoryRect.bottom = Math.min(result.targetRect.bottom, result.referenceRect.bottom, _historyRect ? _historyRect.bottom : Number.MAX_VALUE);
            if (newHistoryRect.bottom <= newHistoryRect.top) {
                newHistoryRect.top = result.targetRect.top;
                newHistoryRect.bottom = result.targetRect.bottom;
            }
            newHistoryRect.height = newHistoryRect.bottom - newHistoryRect.top;

            newHistoryRect.width = Number.MAX_VALUE;
            newHistoryRect.left = Number.MIN_VALUE;
            newHistoryRect.right = Number.MAX_VALUE;
        } else {
            newHistoryRect.left = Math.max(result.targetRect.left, result.referenceRect.left, _historyRect ? _historyRect.left : Number.MIN_VALUE);
            newHistoryRect.right = Math.min(result.targetRect.right, result.referenceRect.right, _historyRect ? _historyRect.right : Number.MAX_VALUE);
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

    function trySetFocus(element: HTMLElement) {
        // We raise an event on the focusRoot before focus changes to give listeners  
        // a chance to prevent the next focus target from receiving focus if they want.  
        var evt = <CustomEvent>_Global.document.createEvent("CustomEvent");
        evt.initCustomEvent(EventNames.focusChanging, true, true, { nextFocusElement: element });
        var canceled = (<any>toPublish).dispatchEvent(evt);
        if (!canceled) {
            element.focus();
        }
        return _Global.document.activeElement === element;
    }
}

function _findNextFocusElementInternal(direction: string, options?: AutoFocusOptions): FindNextFocusResult {
    options = options || {};

    options.allowOverride = options.allowOverride || false;
    options.focusRoot = options.focusRoot || focusRoot || _Global.document.body;
    options.historyRect = options.historyRect || _defaultRect();
    options.maxDistance = options.maxDistance || Math.max(screen.availHeight, screen.availWidth);

    var refObj = getReferenceObject(options.referenceElement, options.referenceRect);

    // Handle override
    if (options.allowOverride && refObj.element) {
        var manualOverrideOptions = refObj.element.getAttribute(AttributeNames.focusOverride);
        if (manualOverrideOptions) {
            var target: HTMLElement;

            var parsedOptions = _OptionsParser.optionsParser(manualOverrideOptions);

            // The left-hand side can be cased as either "left" or "Left".
            var selector: string = parsedOptions[direction] || parsedOptions[direction[0].toUpperCase() + direction.substr(1)];

            if (selector) {
                target = <HTMLElement>_Global.document.querySelector(selector);
            }
            if (target) {
                return { target: target, targetRect: null, referenceRect: null, usedOverride: true };
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
    for (var i = 0, l = allElements.length; i < l; i++) {
        var potentialElement = <HTMLElement>allElements[i];

        if (refObj.element === potentialElement || !isFocusable(potentialElement)) {
            continue;
        }

        var potentialRect = _toIRect(potentialElement.getBoundingClientRect());

        // Skip elements that have either a width or zero or a height of zero  
        if (potentialRect.width === 0 || potentialRect.height === 0) {
            continue;
        }

        var score = calculateScore(direction, options.maxDistance, options.historyRect, refObj.rect, potentialRect);

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

        var pixelOverlapWithTheReferenceShadow = (Math.min(maxReferenceCoord, maxPotentialCoord) - Math.max(minReferenceCoord, minPotentialCoord));
        var potentialEdgeLength = maxPotentialCoord - minPotentialCoord;
        var referenceEdgeLength = maxReferenceCoord - minReferenceCoord;

        // If the reference element is bigger than the potential element, then we want to use the length of the reference's edge as the   
        // denominator when we calculate percentInShadow. Otherwise, if the potential element is bigger, we want to use the length  
        // of the potential's edge when calculating percentInShadow.  
        var comparisonEdgeLength = 0;
        if (referenceEdgeLength >= potentialEdgeLength) {
            comparisonEdgeLength = potentialEdgeLength;
        } else {
            comparisonEdgeLength = referenceEdgeLength;
        }

        var percentInShadow = 0;
        if (comparisonEdgeLength !== 0) {
            percentInShadow = Math.min(pixelOverlapWithTheReferenceShadow / comparisonEdgeLength, 1);
        } else {
            percentInShadow = 1;
        }

        return percentInShadow;
    }

    function calculateScore(direction: string, maxDistance: number, historyRect: IRect, referenceRect: IRect, potentialRect: IRect) {
        var score = 0;

        var percentInShadow: number;
        var primaryAxisDistance: number;
        var secondaryAxisDistance: number;
        var percentInHistoryShadow = 0;
        switch (direction) {
            case DirectionNames.left:
                // Make sure we don't evaluate any potential elements to the left of the reference element  
                if (potentialRect.left >= referenceRect.left) {
                    break;
                }

                percentInShadow = calculatePercentInShadow(referenceRect.top, referenceRect.bottom, potentialRect.top, potentialRect.bottom);
                primaryAxisDistance = referenceRect.left - potentialRect.right;

                if (percentInShadow > 0) {
                    percentInHistoryShadow = calculatePercentInShadow(historyRect.top, historyRect.bottom, potentialRect.top, potentialRect.bottom);
                    secondaryAxisDistance = maxDistance;
                } else {
                    // If the potential element is not in the shadow, then we calculate secondary axis distance  
                    if (potentialRect.top < referenceRect.top) {
                        secondaryAxisDistance = Math.abs(referenceRect.top - potentialRect.bottom);
                    } else {
                        secondaryAxisDistance = Math.abs(potentialRect.top - referenceRect.bottom);
                    }
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
                    secondaryAxisDistance = maxDistance;
                } else {
                    // If the potential element is not in the shadow, then we calculate secondary axis distance  
                    if (potentialRect.top < referenceRect.top) {
                        secondaryAxisDistance = Math.abs(referenceRect.top - potentialRect.bottom);
                    } else {
                        secondaryAxisDistance = Math.abs(potentialRect.top - referenceRect.bottom);
                    }
                }
                break;

            case DirectionNames.up:
                // Make sure we don't evaluate any potential elements to the left of the reference element  
                if (potentialRect.top >= referenceRect.top) {
                    break;
                }

                percentInShadow = calculatePercentInShadow(referenceRect.left, referenceRect.right, potentialRect.left, potentialRect.right);
                primaryAxisDistance = referenceRect.top - potentialRect.bottom;

                if (percentInShadow > 0) {
                    percentInHistoryShadow = calculatePercentInShadow(historyRect.left, historyRect.right, potentialRect.left, potentialRect.right);
                    secondaryAxisDistance = maxDistance;
                } else {
                    // If the potential element is not in the shadow, then we calculate secondary axis distance  
                    if (potentialRect.left < referenceRect.left) {
                        secondaryAxisDistance = Math.abs(referenceRect.left - potentialRect.right);
                    } else {
                        secondaryAxisDistance = Math.abs(potentialRect.left - referenceRect.right);
                    }
                }
                break;

            case DirectionNames.down:
                // Make sure we don't evaluate any potential elements to the left of the reference element  
                if (potentialRect.bottom <= referenceRect.bottom) {
                    break;
                }

                percentInShadow = calculatePercentInShadow(referenceRect.left, referenceRect.right, potentialRect.left, potentialRect.right);
                primaryAxisDistance = potentialRect.top - referenceRect.bottom;

                if (percentInShadow > 0) {
                    percentInHistoryShadow = calculatePercentInShadow(historyRect.left, historyRect.right, potentialRect.left, potentialRect.right);
                    secondaryAxisDistance = maxDistance;
                } else {
                    // If the potential element is not in the shadow, then we calculate secondary axis distance  
                    if (potentialRect.left < referenceRect.left) {
                        secondaryAxisDistance = Math.abs(referenceRect.left - potentialRect.right);
                    } else {
                        secondaryAxisDistance = Math.abs(potentialRect.left - referenceRect.right);
                    }
                }
                break;
        }

        if (primaryAxisDistance >= 0) {
            // The score needs to be a positive number so we make these distances positive numbers  
            primaryAxisDistance = maxDistance - primaryAxisDistance;
            secondaryAxisDistance = maxDistance - secondaryAxisDistance;

            if (percentInShadow >= ScoringConstants.inShadowThreshold) {
                // Potential elements in the shadow get a multiplier to their final score  
                primaryAxisDistance *= 2;
            }

            score = primaryAxisDistance * ScoringConstants.primaryAxisDistanceWeight +
            secondaryAxisDistance * ScoringConstants.secondaryAxisDistanceWeight +
            percentInHistoryShadow * ScoringConstants.percentInHistoryShadowWeight;
        }
        return score;
    }

    function getReferenceObject(referenceElement?: HTMLElement, referenceRect?: IRect) {
        var refElement: HTMLElement;
        var refRect: IRect;

        if ((!referenceElement && !referenceRect) || (referenceElement && referenceElement.tabIndex === -1) || (referenceElement && !referenceElement.parentNode)) {
            // Note: We need to check to make sure 'parentNode' is not null otherwise there is a case  
            // where lastFocusedElement is defined, but calling getBoundingClientRect will throw a native exception.  
            // This case happens if the innerHTML of the parent of the lastFocusElement is set to "".  

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
        if (FocusableTagNames.indexOf(elementTagName) === -1 && (!element.classList || !element.classList.contains(ClassNames.focusable))) {
            // If the current potential element is not one of the tags we consider to be focusable, then exit  
            return false;
        }

        if (elementTagName === "IFRAME" && _afEnabledFrames.indexOf((<HTMLIFrameElement>element).contentWindow) === -1) {
            // Skip IFRAMEs without compatible AutoFocus implementation
            return false;
        }

        if (elementTagName === "DIV" && element["winControl"] && element["winControl"].disabled) {
            // Skip disabled WinJS controls  
            return false;
        }

        var style = getComputedStyle(element);
        if (element.tabIndex === -1 || style.display === "none" || style.visibility === "hidden" || element.disabled) {
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
        top: Math.floor(rect.top),
        bottom: Math.floor(rect.top + rect.height),
        right: Math.floor(rect.left + rect.width),
        left: Math.floor(rect.left),
        height: Math.floor(rect.height),
        width: Math.floor(rect.width),
    };
}

function _getIFrameFromWindow(win: Window) {
    var iframes = _Global.document.querySelectorAll("IFRAME");
    var found = <Array<HTMLIFrameElement>>Array.prototype.filter.call(iframes, (x: HTMLIFrameElement) => x.contentWindow === win);
    return found.length ? found[0] : null;
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

        case CrossDomainMessageConstants.autoFocusEnter:
            // The coordinates stored in data.refRect are already in this frame's coordinate system.
            _autoFocus(data.direction, true, data.referenceRect);
            break;

        case CrossDomainMessageConstants.autoFocusExit:
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
            _autoFocus(data.direction, true, refRect);
            break;
    }
});

_Global.document.addEventListener("DOMContentLoaded", () => {
    _Global.document.addEventListener("keydown", (e: KeyboardEvent): void => {
        var direction: string;
        switch (e.keyCode) {
            case _ElementUtilities.Key.upArrow:
                direction = "up";
                break;
            case _ElementUtilities.Key.downArrow:
                direction = "down";
                break;
            case _ElementUtilities.Key.leftArrow:
                direction = "left";
                break;
            case _ElementUtilities.Key.rightArrow:
                direction = "right";
                break;
            default:
                return null;
        }
        e.preventDefault();
        _autoFocus(direction);
    });

    // If we are running within an iframe, we send a registration message to the parent window  
    if (top !== window) {
        var message = {};
        message[CrossDomainMessageConstants.messageDataProperty] = {
            type: CrossDomainMessageConstants.register,
            version: 1.0
        };
        _Global.parent.postMessage(message, "*");
    }
});

_Global.document.addEventListener(CrossDomainMessageConstants.autoFocusExit, (e: CustomEvent): void => {
    if ((<HTMLElement>_Global.document.activeElement).className.indexOf(ClassNames.manualFocusContainer) >= 0) {
        _autoFocus(e.detail.direction, true);
    }
});

var toPublish = {
    focusRoot: {
        get: function () {
            return focusRoot;
        },
        set: function (value: HTMLElement) {
            focusRoot = value;
        }
    },

    findNextFocusElement: findNextFocusElement
};
toPublish = _BaseUtils._merge(toPublish, _Events.eventMixin);
_Base.Namespace.define("WinJS.UI.AutoFocus", toPublish);
