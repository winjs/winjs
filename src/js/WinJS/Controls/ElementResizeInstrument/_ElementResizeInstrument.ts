// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../Core.d.ts" />

import _BaseCoreUtils = require('../../Core/_BaseCoreUtils');
import _BaseUtils = require("../../Core/_BaseUtils");
import _Base = require('../../Core/_Base');
import _Global = require('../../Core/_Global');
import _WriteProfilerMark = require('../../Core/_WriteProfilerMark');
import _Log = require('../../Core/_Log');
import _ErrorFromName = require("../../Core/_ErrorFromName");
import _Events = require("../../Core/_Events");
import Promise = require('../../Promise');
import _Signal = require('../../_Signal');
import _ElementUtilities = require('../../Utilities/_ElementUtilities');

"use strict";

// We will style the _ElementResizeInstrument element to have the same height and width as it's nearest positioned ancestor.
var styleText =
    'display: block;' +
    'position:absolute;' +
    ' top: 0;' +
    'left: 0;' +
    'height: 100%;' +
    'width: 100%;' +
    'overflow: hidden;' +
    'pointer-events: none;' +
    'z-index: -1;';

var className = "winjs-resizeinstrument";

/**
 * Creates a hidden <object> instrumentation element that is used to automatically generate and handle "resize" events whenever the nearest 
 * positioned ancestor element has its size changed. Add the instrumented element to the DOM of the element you want to generate-and-handle 
 * "resize" events for. The computed style.position of the host element must be positioned and therefore may not be "static".
**/
export class _ElementResizeInstrument {
    private _disposed: boolean;
    private _elementLoadPromise: Promise<any>
    private _elementLoaded: boolean;
    private _running: boolean;
    private _pendingResizeAnimationFrameId: number;
    private _objectWindowResizeHandlerBound: () => void;
    private _objWindow: Window;

    constructor() {
        this._disposed = false;
        this._elementLoaded = false;
        this._running = false;

        this._objectWindowResizeHandlerBound = this._objectWindowResizeHandler.bind(this);

        var objEl = <HTMLObjectElement>_Global.document.createElement("OBJECT");
        objEl.setAttribute('style', styleText);
        objEl.type = 'text/html';
        objEl['winControl'] = this;
        _ElementUtilities.addClass(objEl, className);
        this._element = objEl;

        this._elementLoadPromise = new Promise((c) => {
            objEl.onload = () => {
                if (!this._disposed) {
                    this._elementLoaded = true;
                    this._objWindow = objEl.contentDocument.defaultView;
                    this._objWindow.addEventListener('resize', this._objectWindowResizeHandlerBound);
                    c();
                }
            }
        });
    }

    /**
     * A hidden HTMLObjectElement used to detect size changes in its nearest positioned ancestor element.
    **/
    private _element: HTMLObjectElement;
    get element() {
        return this._element;
    }
    addedToDom() {
        // _ElementResizeInstrument should block on firing any events until the Object element has loaded and the _ElementResizeInstrument addedToDom() API has been called.
        // The former is required in order to allow us to get a handle to hook the resize event of the <object> element's content window.
        // The latter is for cross browser consistency. Some browsers will load the <object> element sync or async as soon as its added to the Dom. 
        // Other browsers will not load the element until it is added to the DOM and the data property has been set on the <object>. If the element
        // hasn't already loaded when addedToDom is called, we can set the data property to kickstart the loading process.
        if (!this._disposed) {
            var objEl = this.element;
            if (!_Global.document.body.contains(objEl)) {
                // In IE and Edge the <object> needs to be in the DOM before we set the data property or else the element will get into state where it can never be loaded.
                throw new _ErrorFromName("WinJS.UI._ElementResizeInstrument", "ElementResizeInstrument initialization failed");
            } else {

                if (_Log.log && _ElementUtilities._getComputedStyle(objEl.parentElement).position === "static") {
                    // Notify if the parentElement is not positioned. It is expected that the _ElementResizeInstrument will 
                    // be an immediate child of the element it wants to monitor for size changes.
                    _Log.log("_ElementResizeInstrument can only detect size changes that are made to it's nearest positioned ancestor. " +
                        "Its parent element is not currently positioned.")
            }

                if (!this._elementLoaded) {
                    // If we're in the DOM and the element hasn't loaded yet, some browsers require setting the data property first, 
                    // in order to trigger the <object> load event. We MUST only do this after the element has been added to the DOM, 
                    // otherwise IE10, IE11 & Edge will NEVER fire the load event no matter what else is done to the <object> element 
                    // or its properties.
                    objEl.data = "about:blank";
                }

                this._elementLoadPromise.then(() => {
                    // Once the element has loaded and addedToDom has been called, we can fire our loaded event.

                    this._running = true;
                    this.dispatchEvent("loaded", null);
                });
            }
        }
    }
    dispose(): void {
        if (!this._disposed) {
            this._disposed = true;
            // Cancel loading state
            this._elementLoadPromise.cancel();
            // Unhook loaded state
            if (this._objWindow) {
                // If we had already loaded, unhook listeners from the <object> window.
                this._objWindow.removeEventListener('resize', this._objectWindowResizeHandlerBound);
            }
            // Turn off running state
            this._running = false;
        }
    }
    private _objectWindowResizeHandler(): void {
        if (this._running) {
            this._batchResizeEvents(() => {
                if (!this._disposed) {
                    this.dispatchEvent("resize", null);
                }
            });
        }
    }
    private _batchResizeEvents(handleResizeFn: () => void): void {

        // Use requestAnimationFrame to batch consecutive resize events.
        if (this._pendingResizeAnimationFrameId) {
            _BaseUtils._cancelAnimationFrame(this._pendingResizeAnimationFrameId);
        }

        this._pendingResizeAnimationFrameId = _BaseUtils._requestAnimationFrame(() => {
            handleResizeFn();
        });
    }

    /**
     * Adds an event listener to the control.
     * @param type The type (name) of the event.
     * @param listener The listener to invoke when the event gets raised.
     * @param useCapture If true, initiates capture, otherwise false.
    **/
    addEventListener(type: string, listener: Function, useCapture?: boolean): void {
        // Implementation will be provided by _Events.eventMixin
    }

    /**
     * Raises an event of the specified type and with the specified additional properties.
     * @param type The type (name) of the event.
     * @param eventProperties The set of additional properties to be attached to the event object when the event is raised.
     * @returns true if preventDefault was called on the event.
    **/
    dispatchEvent(type: string, eventProperties: any): boolean {
        // Implementation will be provided by _Events.eventMixin
        return false;
    }

    /**
     * Removes an event listener from the control.
     * @param type The type (name) of the event.
     * @param listener The listener to remove.
     * @param useCapture true if capture is to be initiated, otherwise false.
    **/
    removeEventListener(type: string, listener: Function, useCapture?: boolean): void {
        // Implementation will be provided by _Events.eventMixin
    }
}

// addEventListener, removeEventListener, dispatchEvent
_Base.Class.mix(_ElementResizeInstrument, _Events.eventMixin);