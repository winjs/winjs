// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _BaseCoreUtils = require('../Core/_BaseCoreUtils');
import _Global = require('../Core/_Global');
import _WinRT = require('../Core/_WinRT');

"use strict";

var _Constants = {
    visualViewportClass: "win-visualviewport-space",
    scrollTimeout: 150,
}

// Definiton of *Visible Document*:
//   Some portions of this file refer to the *visible document* or *visibleDoc*. Generally speaking,
//   this is the portion of the app that is visible to the user (factoring in optical zoom and input pane occlusion).
//   Technically speaking, in most cases, this is equivalent to the *visual viewport*. The exception is
//   when the input pane has shown without resizing the *visual viewport*. In this case, the *visible document*
//   is the *visual viewport* height minus the input pane occlusion.

// This private module provides accurate metrics for the Visual Viewport and WWA's IHM offsets in Win10 WWA 
// where "-ms-device-fixed" CSS positioning is supported. WinJS controls will also use this module for
// positoning themselves relative to the viewport in a web browser outside of WWA. Their preference is still 
// to rely on "-ms-device-fixed" positioning, but currently fallback to "fixed" positioning in enviornments where
// "-ms-device-fixed" is not supported.
export var _KeyboardInfo: {
    _visible: boolean;
    _extraOccluded: number;
    _isResized: boolean;
    _visibleDocBottom: number;
    _visibleDocHeight: number;
    _visibleDocTop: number;
    _visibleDocBottomOffset: number;
    _visualViewportHeight: number;
    _visualViewportWidth: number;
    _visualViewportSpace: ClientRect;
    _animationShowLength: number;
    _scrollTimeout: number;
    _layoutViewportCoords: { visibleDocTop: number; visibleDocBottom: number };
}

// WWA Soft Keyboard offsets
_KeyboardInfo = {
    // Determine if the keyboard is visible or not.
    get _visible(): boolean {
        try {
            return (
                _WinRT.Windows.UI.ViewManagement.InputPane &&
                _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView().occludedRect.height > 0
                );
        } catch (e) {
            return false;
        }
    },

    // See if we have to reserve extra space for the IHM
    get _extraOccluded(): number {
        var occluded = 0;
        // Controls using -ms-device-fixed positioning only need to reposition themselves to remain visible
        // If the IHM has not resized the viewport.  
        if (!_KeyboardInfo._isResized && _WinRT.Windows.UI.ViewManagement.InputPane) {
            occluded = _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView().occludedRect.height;
        }
        return occluded;
    },

    // See if the view has been resized to fit a keyboard
    get _isResized(): boolean {
        // Compare ratios.  Very different includes IHM space.
        var heightRatio = _Global.document.documentElement.clientHeight / _Global.innerHeight,
            widthRatio = _Global.document.documentElement.clientWidth / _Global.innerWidth;

        // If they're nearly identical, then the view hasn't been resized for the IHM
        // Only check one bound because we know the IHM will make it shorter, not skinnier.
        return (widthRatio / heightRatio < 0.99);
    },

    // Get the bottom of the visible area, relative to the top edge of the visible area.
    get _visibleDocBottom(): number {
        return _KeyboardInfo._visibleDocTop + _KeyboardInfo._visibleDocHeight;

    },

    // Get the height of the visible area, e.g. the height of the visual viewport minus any IHM occlusion.
    get _visibleDocHeight(): number {
        return _KeyboardInfo._visualViewportHeight - _KeyboardInfo._extraOccluded;
    },

    // Get the top offset of our visible area, aka the top of the visual viewport.
    // This is always 0 when elements use -ms-device-fixed positioning.
    get _visibleDocTop(): number {
        return 0;
    },

    // Get the offset for, and relative to, the bottom edge of the visual viewport plus any IHM occlusion.
    get _visibleDocBottomOffset(): number {
        // For -ms-device-fixed positioned elements, the bottom is just 0 when there's no IHM.
        // When the IHM appears, the text input that invoked it may be in a position on the page that is occluded by the IHM.
        // In that instance, the default browser behavior is to resize the visual viewport and scroll the input back into view.
        // However, if the viewport resize is prevented by an IHM event listener, the keyboard will still occlude
        // -ms-device-fixed elements, so we adjust the bottom offset of the appbar by the height of the occluded rect of the IHM.
        return _KeyboardInfo._extraOccluded;
    },

    // Get the visual viewport height. window.innerHeight doesn't return floating point values which are present with high DPI.
    get _visualViewportHeight(): number {
        var boundingRect = _KeyboardInfo._visualViewportSpace;
        return boundingRect.height;
    },

    // Get the visual viewport width. window.innerWidth doesn't return floating point values which are present with high DPI.
    get _visualViewportWidth(): number {
        var boundingRect = _KeyboardInfo._visualViewportSpace;
        return boundingRect.width;
    },

    // The visual viewport space element is hidden given -ms-device-fixed positioning and used to calculate
    // the 4 edges of the visual viewport with floating point precision. 
    get _visualViewportSpace(): ClientRect {
        var visualViewportSpace: HTMLElement = <HTMLElement>_Global.document.body.querySelector("." + _Constants.visualViewportClass);
        if (!visualViewportSpace) {
            visualViewportSpace = _Global.document.createElement("DIV");
            visualViewportSpace.className = _Constants.visualViewportClass;
            _Global.document.body.appendChild(visualViewportSpace);
        }
        return visualViewportSpace.getBoundingClientRect();
    },

    // Get total length of the IHM showPanel animation
    get _animationShowLength(): number {
        if (_BaseCoreUtils.hasWinRT) {
            if (_WinRT.Windows.UI.Core.AnimationMetrics) {
                // Desktop exposes the AnimationMetrics API that allows us to look up the relevant IHM animation metrics.
                var a = _WinRT.Windows.UI.Core.AnimationMetrics, animationDescription = new a.AnimationDescription(a.AnimationEffect.showPanel, a.AnimationEffectTarget.primary);
                var animations = animationDescription.animations;
                var max = 0;
                for (var i = 0; i < animations.size; i++) {
                    var animation = animations[i];
                    max = Math.max(max, animation.delay + animation.duration);
                }
                return max;
            } else {
                // Phone platform does not yet expose the Animation Metrics API. 
                // Hard code the correct values for the time being.
                // https://github.com/winjs/winjs/issues/1060
                var animationDuration = 300;
                var animationDelay = 50;
                return animationDelay + animationDuration;
            }
        }
        else {
            return 0;
        }
    },

    // Padding for IHM timer to allow for first scroll event. Tpyically used in conjunction with the
    // _animationShowLength to determine the length of time in which a showing IHM would have triggered
    // a window resize to occur.
    get _scrollTimeout(): number {
        return _Constants.scrollTimeout;
    },

    // _layoutViewportCoords is used with elements that use position:fixed instead of position:-ms-device-fixed
    get _layoutViewportCoords(): { visibleDocTop: number; visibleDocBottom: number } {
        var topOffset = _Global.window.pageYOffset - _Global.document.documentElement.scrollTop;
        var bottomOffset = _Global.document.documentElement.clientHeight - (topOffset + this._visibleDocHeight);

        return {
            visibleDocTop: topOffset,
            visibleDocBottom: bottomOffset
        };
    }
};
