// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../Core.d.ts" />

import _BaseCoreUtils = require('../../Core/_BaseCoreUtils');
import _BaseUtils = require("../../Core/_BaseUtils");
import _Global = require('../../Core/_Global');
import _Base = require('../../Core/_Base');
import _WriteProfilerMark = require('../../Core/_WriteProfilerMark');
import Promise = require('../../Promise');
import _Signal = require('../../_Signal');
import _ElementUtilities = require('../../Utilities/_ElementUtilities');
import _Events = require("../../Core/_Events");

"use strict";

// We will style the _ElementResizeInstrument element to have the same height and width as it's nearest positioned ancestor.
var styleText = 'display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; pointer-events: none; z-index: -1;';


/**
* Creates a hidden <object> instrumentation element that is used to automatically generate and handle "resize" events whenever the nearest 
 * positioned ancestor element has its size changed. Add the instrumented element to the DOM of the element you want to generate-and-handle 
 * "resize" events for. The computed style.position of the host element must be positioned and therefore may not be "static".
**/
export class _ElementResizeInstrument {
    private _disposed: boolean;
    private _resizeHandler: () => void;
    private _loadPromise: Promise<any>
    private _loaded: boolean;
    private _pendingResizeAnimationFrameId: number;
    private _objectWindowResizeHandlerBound: () => void;
    private _eventProxy: _Events.eventMixin;



    constructor() {
        this._disposed = false;
        this._loaded = false;

        var objEl = <HTMLObjectElement>_Global.document.createElement("OBJECT");
        this._loadPromise = new Promise((c) => {
            objEl.onload = () => {
                if (!this._disposed) {
                    var objEl = this.element;
                    var objWindow = objEl.contentDocument.defaultView;
                    objWindow.addEventListener('resize', this._objectWindowResizeHandlerBound);
                    this._loaded = true;
                    c();
                }
            };
        });
        objEl.setAttribute('style', styleText);
        objEl.type = 'text/html';
        objEl['winControl'] = this;
        this._element = objEl;

        this._objectWindowResizeHandlerBound = this._objectWindowResizeHandler.bind(this);


        
        //this["_listeners"] = {};
        //this._eventProxy = <_Events.eventMixin><any>_BaseUtils._merge(this, _Events.eventMixin);
    }

    /**
     * A hidden HTMLObjectElement used to detect size changes in its nearest positioned ancestor element.
    **/
    private _element: HTMLObjectElement;
    get element() {
        return this._element;
    }
    addedToDom() {
        if (!this._loaded) {
            // Set the data property to trigger the <object> load event. We MUST do this after the element has been added to the DOM,
            // otherwise some Microsoft browsers will NEVER fire the load event, no matter what else is done to the element or its properties.
            this.element.data = "about:blank";
        }

        // TODO block events until addedToDom is called.
    }
    dispose(): void {
        if (!this._disposed) {
            this._disposed = true;
            if (this._loaded) {
                // If we had already loaded, unhook listeners from the <object> window.
                var objWindow = this.element.contentDocument.defaultView;
                objWindow.removeEventListener('resize', this._objectWindowResizeHandlerBound);
                this._resizeHandler = null;
            }
        }
    }
    private _objectWindowResizeHandler(): void {
        this._batchResizeEvents(() => {
            if (!this._disposed) {
                this._resizeHandler();
            }
        });
    }
    private _batchResizeEvents(handleResizeFn: () => void): void {
        // Use requestAnimationFrame to batch consecutive resize events.
        if (this._pendingResizeAnimationFrameId) {
            _Global.cancelAnimationFrame(this._pendingResizeAnimationFrameId);
        }

        this._pendingResizeAnimationFrameId = _Global.requestAnimationFrame(() => {
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
        // Expected to be overridden by _Event.Mixin
    }

    /**
     * Raises an event of the specified type and with the specified additional properties.
     * @param type The type (name) of the event.
     * @param eventProperties The set of additional properties to be attached to the event object when the event is raised.
     * @returns true if preventDefault was called on the event.
    **/
    dispatchEvent(type: string, eventProperties: any): boolean {
        // Expected to be overridden by _Event.Mixin
        return false;
    }

    /**
     * Removes an event listener from the control.
     * @param type The type (name) of the event.
     * @param listener The listener to remove.
     * @param useCapture true if capture is to be initiated, otherwise false.
    **/
    removeEventListener(type: string, listener: Function, useCapture?: boolean): void {
        // Expected to be overridden by _Event.Mixin
    }
}
_Base.Class.mix(_ElementResizeInstrument, _Events.eventMixin);