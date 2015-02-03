// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />

import _Base = require('../Core/_Base');
import _Control = require('../Utilities/_Control');
import _Dispose = require('../Utilities/_Dispose');
import _ElementUtilities = require('../Utilities/_ElementUtilities');
import _ErrorFromName = require('../Core/_ErrorFromName');
import _Global = require('../Core/_Global');
import _Hoverable = require('../Utilities/_Hoverable');
import _Pane = require('./Pane');
import _ToolBar = require('./ToolBar/_ToolBar');

require(["require-style!less/styles-toolpane"]);

"use strict";

var ClosedDisplayModes = {
    none: "none",
    minimum: "minimum",
    compact: "compact",
    full: "full"
};

var ClassNames = {
    toolPane: "win-toolpane",
    
    _pane: "win-toolpane-pane",
    _toolBar: "win-toolpane-toolbar",
    _top: "win-toolpane-top",
    _bottom: "win-toolpane-bottom",
    _none: "win-toolpane-none",
    _minimum: "win-toolpane-minimum",
    _compact: "win-toolpane-compact",
    _full: "win-toolpane-full",
    _hiding: "win-toolpane-hiding"
};
var closedDisplayModeClassMap = {};
closedDisplayModeClassMap[ClosedDisplayModes.none] = ClassNames._none;
closedDisplayModeClassMap[ClosedDisplayModes.minimum] = ClassNames._minimum;
closedDisplayModeClassMap[ClosedDisplayModes.compact] = ClassNames._compact;
closedDisplayModeClassMap[ClosedDisplayModes.full] = ClassNames._full;

// Versions of add/removeClass that are no ops when called with falsy class names.
function addClass(element: HTMLElement, className: string): void {
    className && _ElementUtilities.addClass(element, className);
}
function removeClass(element: HTMLElement, className: string): void {
    className && _ElementUtilities.removeClass(element, className);
}

export class ToolPane {
    static supportedForProcessing: boolean = true;

    private static _ClassNames = ClassNames;

    private _disposed: boolean;
    private _pane: _Pane.Pane;
    private _toolBar: _ToolBar.ToolBar;
    private _dom: {
        root: HTMLElement;
        pane: HTMLElement;
        toolBar: HTMLElement;
    };

    constructor(element?: HTMLElement, options: any = {}) {
        this._disposed = false;
        
        this._initializeDom(element || _Global.document.createElement("div"))
        this.placement = "top";
        this.closedDisplayMode = ClosedDisplayModes.compact;
        _Control.setOptions(this, options);
    }

    /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.SplitView.element" helpKeyword="WinJS.UI.SplitView.element">
    /// Gets the DOM element that hosts the SplitView control.
    /// </field>
    get element(): HTMLElement {
        return this._dom.root;
    }
    
    private _placement: string;
    get placement(): string {
        return this._placement;
    }
    set placement(value: string) {
        // TODO: Shouldn't apply this while panes are animating
        if (value === "top") {
            _ElementUtilities.removeClass(this._dom.root, ClassNames._bottom);
            _ElementUtilities.addClass(this._dom.root, ClassNames._top);
        } else if (value === "bottom") {
            _ElementUtilities.removeClass(this._dom.root, ClassNames._top);
            _ElementUtilities.addClass(this._dom.root, ClassNames._bottom);
        } else {
            return;
        }
        this._pane.placement = value;
    }

    private _closedDisplayMode: string;
    get closedDisplayMode(): string {
        return this._closedDisplayMode;
    }
    set closedDisplayMode(value: string) {
        // TODO: Shouldn't apply this while panes are animating
        if (ClosedDisplayModes[value] && this._closedDisplayMode !== value) {
            this._closedDisplayMode = value;
            this._updateDom();
            // TODO: How to signal to pane that it's cachedHiddenPaneThickness may now be invalid?
        }
    }

    show(): void {
        this._pane.show();
    }

    hide(): void {
        this._pane.hide();
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
        this._disposed = true;
        _Dispose._disposeElement(this._dom.root);
    }

    private _initializeDom(root: HTMLElement): void {
        root["winControl"] = this;
        _ElementUtilities.addClass(root, ClassNames.toolPane);
        _ElementUtilities.addClass(root, "win-disposable");
        
        var paneEl = _Global.document.createElement("div");
        _ElementUtilities.addClass(paneEl, ClassNames._pane);
        
        var toolBarEl = _Global.document.createElement("div");
        _ElementUtilities.addClass(toolBarEl, ClassNames._toolBar);
        _ElementUtilities._reparentChildren(root, toolBarEl);
        root.appendChild(toolBarEl);
        
        paneEl.appendChild(toolBarEl);
        root.appendChild(paneEl);
        
        this._dom = {
            root: root,
            pane: paneEl,
            toolBar: toolBarEl
        };
        
        this._pane = new _Pane.Pane(this._dom.pane);
        this._pane.element.addEventListener("beforehide", () => {
            _ElementUtilities.addClass(this._dom.root, ClassNames._hiding);
        });
        this._pane.element.addEventListener("afterhide", () => {
            _ElementUtilities.removeClass(this._dom.root, ClassNames._hiding);
        });

        this._toolBar = new _ToolBar.ToolBar(this._dom.toolBar);
        this._toolBar.element.querySelector(".win-toolbar-overflowbutton").addEventListener("click", () => {
            this._pane.hidden = !this._pane.hidden;
        });
        // TODO: why is this needed?
        _Global.setTimeout(() => {
            this._toolBar.forceLayout();
        }, 0);
    }

    private _updateDom_rendered = {
        closedDisplayMode: <string>undefined
    };
    private _updateDom(): void {
        var rendered = this._updateDom_rendered;
        if (rendered.closedDisplayMode !== this._closedDisplayMode) {
            removeClass(this._dom.root, closedDisplayModeClassMap[rendered.closedDisplayMode]);
            addClass(this._dom.root, closedDisplayModeClassMap[this._closedDisplayMode]);
            this._pane.hiddenDisplayMode = this._closedDisplayMode === ClosedDisplayModes.none ? "none" : "overlay";
            rendered.closedDisplayMode = this._closedDisplayMode;
        }
    }
}
_Base.Namespace.define("WinJS.UI", { ToolPane: ToolPane });