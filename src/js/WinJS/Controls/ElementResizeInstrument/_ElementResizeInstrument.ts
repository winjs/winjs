// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../Core.d.ts" />

import _BaseCoreUtils = require('../../Core/_BaseCoreUtils');
import _Global = require('../../Core/_Global');
import _Base = require('../../Core/_Base');
import _WriteProfilerMark = require('../../Core/_WriteProfilerMark');
import Promise = require('../../Promise');
import _Signal = require('../../_Signal');
import _ElementUtilities = require('../../Utilities/_ElementUtilities');

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
    private _loadingSignal: _Signal<any>;
    private _monitoringSignal: _Signal<any>;
    private _pendingResizeAnimationFrameId: number;
    private _objectElementLoadHandlerBound: () => void;
    private _objectWindowResizeHandlerBound: () => void;

    constructor() {
        this._disposed = false;

        var objEl = <HTMLObjectElement>_Global.document.createElement("OBJECT");
        objEl.setAttribute('style', styleText);
        objEl.type = 'text/html';
        objEl['winControl'] = this;
        this._element = objEl;

        this._objectElementLoadHandlerBound = this._objectElementLoadHandler.bind(this);
        this._objectWindowResizeHandlerBound = this._objectWindowResizeHandler.bind(this);
    }

    /**
     * A hidden HTMLObjectElement used to detect size changes in its nearest positioned ancestor element.
    **/
    private _element: HTMLObjectElement;
    get element() {
        return this._element;
    }
    /**
     * Tells the _ElementResizeInstrument how to start reacting to size changes. 
     * PRECONDIION: When this method is called _ElementResizeInstrument element should already be in the DOM as a child of the element we want to detect size changea for.
     * @param resizeHandler the function to call whenever a size change is detected in the nearest positioned ancestor element.
     * @return A promise that completes once the _ElementResizeInstrument is ready to begin responding to size changes in the monitored ancestor element with the specified resizeHandler.
    **/
    monitorAncestor(resizeHandler: () => void): Promise<any> {

        // If a previous call to monitorAncestor was still waiting on a promise to complete. 
        // Cancel it now notify that previously passed in resizeHandler will never be ready to fire.
        if (this._monitoringSignal) {
            this._monitoringSignal.cancel();
        }

        this._resizeHandler = resizeHandler;

        // Start loading the <object> element's content window, if we haven't already done so.
        if (!this._loadingSignal) {
            this._loadingSignal = new _Signal();

            var objEl = this.element;
            if (!_Global.document.body.contains(objEl)) {
                // TODO
                // Throw Exception !! 
                // IE and Edge need to be in the DOM before we try set the data property or else the element will never be loaded.

                // Question for reviewers: would it be better to use the inDOM helper instead and just wait until the element is in 
                // the DOM before trying to set data, instead of throwing an exception?
            }

            // TODO if(WinJS.log) verify computedStyle of parent element is positioned and not static.

            objEl.onload = this._objectElementLoadHandlerBound;

            // Set the data property to trigger the <object> load event. We MUST do this after the element has been added to the DOM,
            // otherwise some Microsoft browsers will NEVER fire the load event, no matter what else is done to the element or its properties.
            objEl.data = "about:blank";
        }

        // Wait until the object element has loaded before we signal that monitoring 
        // the ancestor element with the specified resizeHandler is ready.
        this._monitoringSignal = new _Signal();
        this._loadingSignal.promise.then(
            () => { // Complete handler
                this._monitoringSignal.complete();
                },
            () => { // Error handler
                this._monitoringSignal.cancel();
                }
            );
        return this._monitoringSignal.promise;
    }
    dispose(): void {
        if (!this._disposed) {
            this._disposed = true;
            var objWindow = this.element.contentDocument.defaultView;
            objWindow.removeEventListener('resize', this._objectWindowResizeHandlerBound);
            this._resizeHandler = null;
            this._loadingSignal.cancel();
        }
    }
    private _objectElementLoadHandler(): void {
        if (!this._disposed) {
            var objEl = this.element;
            var objWindow = objEl.contentDocument.defaultView;
            objWindow.addEventListener('resize', this._objectWindowResizeHandlerBound);
            this._loadingSignal.complete();
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
}