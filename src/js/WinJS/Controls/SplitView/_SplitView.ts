// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="../../../../../typings/require.d.ts" />

import _Control = require('../../Utilities/_Control');
import _Dispose = require('../../Utilities/_Dispose');
import _ElementUtilities = require('../../Utilities/_ElementUtilities');
import _ErrorFromName = require('../../Core/_ErrorFromName');
import _Global = require('../../Core/_Global');
import _Hoverable = require('../../Utilities/_Hoverable');

require(["require-style!less/styles-splitview"]);
require(["require-style!less/colors-splitview"]);

"use strict";

var Strings = {
    get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; }
};
var ClassNames = {
    splitView: "win-splitview",
    
    _vertical: "win-splitview-vertical",
    _horizontal: "win-splitview-horizontal"
};

export class SplitView {
    static supportedForProcessing: boolean = true;

    private static _ClassNames = ClassNames;

    private _disposed: boolean;
    private _dom: {
        root: HTMLElement;
    };

    constructor(element?: HTMLElement, options: any = {}) {
        // Check to make sure we weren't duplicated
        if (element && element["winControl"]) {
            throw new _ErrorFromName("WinJS.UI.SplitView.DuplicateConstruction", Strings.duplicateConstruction);
        }

        this._disposed = false;
        
        this._initializeDom(element || _Global.document.createElement("div"))
        this.orientation = "horizontal";
        _Control.setOptions(this, options);
    }

    /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.SplitView.element" helpKeyword="WinJS.UI.SplitView.element">
    /// Gets the DOM element that hosts the SplitView control.
    /// </field>
    get element(): HTMLElement {
        return this._dom.root;
    }
    
    private _orientation: string;
    get orientation(): string {
        return this._orientation;
    }
    set orientation(value: string) {
        // TODO: Shouldn't apply this while panes are animating
        if (value === "horizontal") {
            _ElementUtilities.removeClass(this._dom.root, ClassNames._vertical);
            _ElementUtilities.addClass(this._dom.root, ClassNames._horizontal);
        } else if (value === "vertical") {
            _ElementUtilities.removeClass(this._dom.root, ClassNames._horizontal);
            _ElementUtilities.addClass(this._dom.root, ClassNames._vertical);
        }
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
        _ElementUtilities.addClass(root, ClassNames.splitView);
        _ElementUtilities.addClass(root, "win-disposable");

        this._dom = {
            root: root
        };
    }
}
