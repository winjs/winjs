// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../../typings/require.d.ts" />

import Animations = require('../../Animations');
import _Base = require('../../Core/_Base');
import _BaseUtils = require('../../Core/_BaseUtils');
import _Control = require('../../Utilities/_Control');
import _Dispose = require('../../Utilities/_Dispose');
import _ElementUtilities = require('../../Utilities/_ElementUtilities');
import _ErrorFromName = require('../../Core/_ErrorFromName');
import _Events = require('../../Core/_Events');
import _Global = require('../../Core/_Global');
import _Hoverable = require('../../Utilities/_Hoverable');
import _LightDismissService = require('../../_LightDismissService');
import Promise = require('../../Promise');
import _OpenCloseMachine = require('../../Utilities/_OpenCloseMachine');
import _TransitionAnimation = require('../../Animations/_TransitionAnimation');

require(["require-style!less/styles-splitview"]);
require(["require-style!less/colors-splitview"]);

"use strict";

interface IRect {
    left: number;
    top: number;
    contentWidth: number;
    contentHeight: number
    totalWidth: number;
    totalHeight: number;
}

export interface IThickness {
    content: number;
    total: number;
}

var transformNames = _BaseUtils._browserStyleEquivalents["transform"];
var Strings = {
    get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; }
};
var ClassNames = {
    splitView: "win-splitview",
    pane: "win-splitview-pane",
    content: "win-splitview-content",
    // closed/opened
    paneClosed: "win-splitview-pane-closed",
    paneOpened: "win-splitview-pane-opened",

    _panePlaceholder: "win-splitview-paneplaceholder",
    _paneOutline: "win-splitview-paneoutline",
    _tabStop: "win-splitview-tabstop",
    _paneWrapper: "win-splitview-panewrapper",
    _contentWrapper: "win-splitview-contentwrapper",
    _animating: "win-splitview-animating",
    // placement
    _placementLeft: "win-splitview-placementleft",
    _placementRight: "win-splitview-placementright",
    _placementTop: "win-splitview-placementtop",
    _placementBottom: "win-splitview-placementbottom",
    // closed display mode
    _closedDisplayNone: "win-splitview-closeddisplaynone",
    _closedDisplayInline: "win-splitview-closeddisplayinline",
    // opened display mode
    _openedDisplayInline: "win-splitview-openeddisplayinline",
    _openedDisplayOverlay: "win-splitview-openeddisplayoverlay"
};
var EventNames = {
    beforeOpen: "beforeopen",
    afterOpen: "afteropen",
    beforeClose: "beforeclose",
    afterClose: "afterclose"
};
var Dimension = {
    width: "width",
    height: "height"
};

var ClosedDisplayMode = {
    /// <field locid="WinJS.UI.SplitView.ClosedDisplayMode.none" helpKeyword="WinJS.UI.SplitView.ClosedDisplayMode.none">
    /// When the pane is closed, it is not visible and doesn't take up any space.
    /// </field>
    none: "none",
    /// <field locid="WinJS.UI.SplitView.ClosedDisplayMode.inline" helpKeyword="WinJS.UI.SplitView.ClosedDisplayMode.inline">
    /// When the pane is closed, it occupies space leaving less room for the SplitView's content.
    /// </field>
    inline: "inline"
};
var OpenedDisplayMode = {
    /// <field locid="WinJS.UI.SplitView.OpenedDisplayMode.inline" helpKeyword="WinJS.UI.SplitView.OpenedDisplayMode.inline">
    /// When the pane is open, it occupies space leaving less room for the SplitView's content.
    /// </field>
    inline: "inline",
    /// <field locid="WinJS.UI.SplitView.OpenedDisplayMode.overlay" helpKeyword="WinJS.UI.SplitView.OpenedDisplayMode.overlay">
    /// When the pane is open, it doesn't take up any space and it is light dismissable.
    /// </field>
    overlay: "overlay"
};
var PanePlacement = {
    /// <field locid="WinJS.UI.SplitView.PanePlacement.left" helpKeyword="WinJS.UI.SplitView.PanePlacement.left">
    /// Pane is positioned left of the SplitView's content.
    /// </field>
    left: "left",
    /// <field locid="WinJS.UI.SplitView.PanePlacement.right" helpKeyword="WinJS.UI.SplitView.PanePlacement.right">
    /// Pane is positioned right of the SplitView's content.
    /// </field>
    right: "right",
    /// <field locid="WinJS.UI.SplitView.PanePlacement.top" helpKeyword="WinJS.UI.SplitView.PanePlacement.top">
    /// Pane is positioned above the SplitView's content.
    /// </field>
    top: "top",
    /// <field locid="WinJS.UI.SplitView.PanePlacement.bottom" helpKeyword="WinJS.UI.SplitView.PanePlacement.bottom">
    /// Pane is positioned below the SplitView's content.
    /// </field>
    bottom: "bottom"
};
var closedDisplayModeClassMap = {};
closedDisplayModeClassMap[ClosedDisplayMode.none] = ClassNames._closedDisplayNone;
closedDisplayModeClassMap[ClosedDisplayMode.inline] = ClassNames._closedDisplayInline;
var openedDisplayModeClassMap = {};
openedDisplayModeClassMap[OpenedDisplayMode.overlay] = ClassNames._openedDisplayOverlay;
openedDisplayModeClassMap[OpenedDisplayMode.inline] = ClassNames._openedDisplayInline;
var panePlacementClassMap = {};
panePlacementClassMap[PanePlacement.left] = ClassNames._placementLeft;
panePlacementClassMap[PanePlacement.right] = ClassNames._placementRight;
panePlacementClassMap[PanePlacement.top] = ClassNames._placementTop;
panePlacementClassMap[PanePlacement.bottom] = ClassNames._placementBottom;

// Versions of add/removeClass that are no ops when called with falsy class names.
function addClass(element: HTMLElement, className: string): void {
    className && _ElementUtilities.addClass(element, className);
}
function removeClass(element: HTMLElement, className: string): void {
    className && _ElementUtilities.removeClass(element, className);
}

function rectToThickness(rect: IRect, dimension: string): IThickness {
    return (dimension === Dimension.width) ? {
        content: rect.contentWidth,
        total: rect.totalWidth
    }: {
        content: rect.contentHeight,
        total: rect.totalHeight
    };
}

/// <field>
/// <summary locid="WinJS.UI.SplitView">
/// Displays a SplitView which renders a collapsable pane next to arbitrary HTML content.
/// </summary>
/// </field>
/// <icon src="ui_winjs.ui.splitview.12x12.png" width="12" height="12" />
/// <icon src="ui_winjs.ui.splitview.16x16.png" width="16" height="16" />
/// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.SplitView"></div>]]></htmlSnippet>
/// <event name="beforeopen" locid="WinJS.UI.SplitView_e:beforeopen">Raised just before opening the pane. Call preventDefault on this event to stop the pane from opening.</event>
/// <event name="afteropen" locid="WinJS.UI.SplitView_e:afteropen">Raised immediately after the pane is fully opened.</event>
/// <event name="beforeclose" locid="WinJS.UI.SplitView_e:beforeclose">Raised just before closing the pane. Call preventDefault on this event to stop the pane from closing.</event>
/// <event name="afterclose" locid="WinJS.UI.SplitView_e:afterclose">Raised immediately after the pane is fully closed.</event>
/// <part name="splitview" class="win-splitview" locid="WinJS.UI.SplitView_part:splitview">The entire SplitView control.</part>
/// <part name="splitview-pane" class="win-splitview-pane" locid="WinJS.UI.SplitView_part:splitview-pane">The element which hosts the SplitView's pane.</part>
/// <part name="splitview-content" class="win-splitview-content" locid="WinJS.UI.SplitView_part:splitview-content">The element which hosts the SplitView's content.</part>
/// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/WinJS.js" shared="true" />
/// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
export class SplitView {
    /// <field locid="WinJS.UI.SplitView.ClosedDisplayMode" helpKeyword="WinJS.UI.SplitView.ClosedDisplayMode">
    /// Display options for a SplitView's pane when it is closed.
    /// </field>
    static ClosedDisplayMode = ClosedDisplayMode;

    /// <field locid="WinJS.UI.SplitView.OpenedDisplayMode" helpKeyword="WinJS.UI.SplitView.OpenedDisplayMode">
    /// Display options for a SplitView's pane when it is open.
    /// </field>
    static OpenedDisplayMode = OpenedDisplayMode;

    /// <field locid="WinJS.UI.SplitView.PanePlacement" helpKeyword="WinJS.UI.SplitView.PanePlacement">
    /// Placement options for a SplitView's pane.
    /// </field>
    static PanePlacement = PanePlacement;

    static supportedForProcessing: boolean = true;

    private static _ClassNames = ClassNames;

    private _disposed: boolean;
    private _machine: _OpenCloseMachine.OpenCloseMachine;
    _dom: {
        root: HTMLElement;
        pane: HTMLElement;
        startPaneTab: HTMLElement;
        endPaneTab: HTMLElement;
        paneOutline: HTMLElement;
        paneWrapper: HTMLElement; // Shouldn't have any margin, padding, or border.
        panePlaceholder: HTMLElement; // Shouldn't have any margin, padding, or border.
        content: HTMLElement;
        contentWrapper: HTMLElement; // Shouldn't have any margin, padding, or border.
    };
    private _dismissable: _LightDismissService.LightDismissableElement;
    private _isOpenedMode: boolean; // Is ClassNames.paneOpened present on the SplitView?
    private _rtl: boolean;
    private _cachedHiddenPaneThickness: IThickness;
    private _lowestPaneTabIndex: number;
    private _highestPaneTabIndex: number;
    private _updateTabIndicesThrottled: Function;

    constructor(element?: HTMLElement, options: any = {}) {
        /// <signature helpKeyword="WinJS.UI.SplitView.SplitView">
        /// <summary locid="WinJS.UI.SplitView.constructor">
        /// Creates a new SplitView control.
        /// </summary>
        /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.SplitView.constructor_p:element">
        /// The DOM element that hosts the SplitView control.
        /// </param>
        /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.SplitView.constructor_p:options">
        /// An object that contains one or more property/value pairs to apply to the new control.
        /// Each property of the options object corresponds to one of the control's properties or events.
        /// Event names must begin with "on". For example, to provide a handler for the beforeclose event,
        /// add a property named "onbeforeclose" to the options object and set its value to the event handler.
        /// </param>
        /// <returns type="WinJS.UI.SplitView" locid="WinJS.UI.SplitView.constructor_returnValue">
        /// The new SplitView.
        /// </returns>
        /// </signature>

        // Check to make sure we weren't duplicated
        if (element && element["winControl"]) {
            throw new _ErrorFromName("WinJS.UI.SplitView.DuplicateConstruction", Strings.duplicateConstruction);
        }

        this._initializeDom(element || _Global.document.createElement("div"));
        this._machine = new _OpenCloseMachine.OpenCloseMachine({
            eventElement: this._dom.root,
            onOpen: () => {
                this._cachedHiddenPaneThickness = null;
                var hiddenPaneThickness = this._getHiddenPaneThickness();

                this._isOpenedMode = true;
                this._updateDomImpl();
                
                _ElementUtilities.addClass(this._dom.root, ClassNames._animating);
                return this._playShowAnimation(hiddenPaneThickness).then(() => {
                    _ElementUtilities.removeClass(this._dom.root, ClassNames._animating);
                });
            },
            onClose: () => {
                _ElementUtilities.addClass(this._dom.root, ClassNames._animating);
                return this._playHideAnimation(this._getHiddenPaneThickness()).then(() => {
                    _ElementUtilities.removeClass(this._dom.root, ClassNames._animating);
                    this._isOpenedMode = false;
                    this._updateDomImpl();
                });
            },
            onUpdateDom: () => {
                this._updateDomImpl();
            },
            onUpdateDomWithIsOpened: (isOpened: boolean) => {
                this._isOpenedMode = isOpened;
                this._updateDomImpl();
            }
        });

        // Initialize private state.
        this._disposed = false;
        this._dismissable = new _LightDismissService.LightDismissableElement({
            element: this._dom.paneWrapper,
            tabIndex: -1,
            onLightDismiss: () => {
                this.closePane();
            },
            onTakeFocus: (useSetActive) => {
                this._dismissable.restoreFocus() ||
                    _ElementUtilities._tryFocusOnAnyElement(this._dom.pane, useSetActive);
            }
        });
        this._cachedHiddenPaneThickness = null;

        // Initialize public properties.
        this.paneOpened = false;
        this.closedDisplayMode = ClosedDisplayMode.inline;
        this.openedDisplayMode = OpenedDisplayMode.overlay;
        this.panePlacement = PanePlacement.left;
        _Control.setOptions(this, options);

        // Exit the Init state.
        _ElementUtilities._inDom(this._dom.root).then(() => {
            this._rtl = _ElementUtilities._getComputedStyle(this._dom.root).direction === 'rtl';
            this._updateTabIndices();
            this._machine.exitInit();
        });
    }

    /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.SplitView.element" helpKeyword="WinJS.UI.SplitView.element">
    /// Gets the DOM element that hosts the SplitView control.
    /// </field>
    get element(): HTMLElement {
        return this._dom.root;
    }

    /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.SplitView.paneElement" helpKeyword="WinJS.UI.SplitView.paneElement">
    /// Gets the DOM element that hosts the SplitView pane.
    /// </field>
    get paneElement(): HTMLElement {
        return this._dom.pane;
    }

    /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.SplitView.contentElement" helpKeyword="WinJS.UI.SplitView.contentElement">
    /// Gets the DOM element that hosts the SplitView's content.
    /// </field>
    get contentElement(): HTMLElement {
        return this._dom.content;
    }

    private _closedDisplayMode: string;
    /// <field type="String" oamOptionsDatatype="WinJS.UI.SplitView.ClosedDisplayMode" locid="WinJS.UI.SplitView.closedDisplayMode" helpKeyword="WinJS.UI.SplitView.closedDisplayMode">
    /// Gets or sets the display mode of the SplitView's pane when it is hidden.
    /// </field>
    get closedDisplayMode(): string {
        return this._closedDisplayMode;
    }
    set closedDisplayMode(value: string) {
        if (ClosedDisplayMode[value] && this._closedDisplayMode !== value) {
            this._closedDisplayMode = value;
            this._cachedHiddenPaneThickness = null;
            this._machine.updateDom();
        }
    }

    private _openedDisplayMode: string;
    /// <field type="String" oamOptionsDatatype="WinJS.UI.SplitView.OpenedDisplayMode" locid="WinJS.UI.SplitView.openedDisplayMode" helpKeyword="WinJS.UI.SplitView.openedDisplayMode">
    /// Gets or sets the display mode of the SplitView's pane when it is open.
    /// </field>
    get openedDisplayMode(): string {
        return this._openedDisplayMode;
    }
    set openedDisplayMode(value: string) {
        if (OpenedDisplayMode[value] && this._openedDisplayMode !== value) {
            this._openedDisplayMode = value;
            this._cachedHiddenPaneThickness = null;
            this._machine.updateDom();
        }
    }

    private _panePlacement: string;
    /// <field type="String" oamOptionsDatatype="WinJS.UI.SplitView.PanePlacement" locid="WinJS.UI.SplitView.panePlacement" helpKeyword="WinJS.UI.SplitView.panePlacement">
    /// Gets or sets the placement of the SplitView's pane.
    /// </field>
    get panePlacement(): string {
        return this._panePlacement;
    }
    set panePlacement(value: string) {
        if (PanePlacement[value] && this._panePlacement !== value) {
            this._panePlacement = value;
            this._cachedHiddenPaneThickness = null;
            this._machine.updateDom();
        }
    }

    /// <field type="Boolean" hidden="true" locid="WinJS.UI.SplitView.paneOpened" helpKeyword="WinJS.UI.SplitView.paneOpened">
    /// Gets or sets whether the SpitView's pane is currently opened.
    /// </field>
    get paneOpened(): boolean {
        return this._machine.opened;
    }
    set paneOpened(value: boolean) {
        this._machine.opened = value;
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
        this._machine.dispose();
        _LightDismissService.hidden(this._dismissable);
        _Dispose._disposeElement(this._dom.pane);
        _Dispose._disposeElement(this._dom.content);
    }

    openPane(): void {
        /// <signature helpKeyword="WinJS.UI.SplitView.openPane">
        /// <summary locid="WinJS.UI.SplitView.openPane">
        /// Opens the SplitView's pane.
        /// </summary>
        /// </signature>
        this._machine.open();
    }

    closePane(): void {
        /// <signature helpKeyword="WinJS.UI.SplitView.closePane">
        /// <summary locid="WinJS.UI.SplitView.closePane">
        /// Closes the SplitView's pane.
        /// </summary>
        /// </signature>
        this._machine.close();
    }

    private _initializeDom(root: HTMLElement): void {
        // The first child is the pane
        var paneEl = <HTMLElement>root.firstElementChild || _Global.document.createElement("div");
        _ElementUtilities.addClass(paneEl, ClassNames.pane);
        if (!paneEl.hasAttribute("tabIndex")) {
            paneEl.tabIndex = -1;
        }

        // All other children are members of the content
        var contentEl = _Global.document.createElement("div");
        _ElementUtilities.addClass(contentEl, ClassNames.content);
        var child = paneEl.nextSibling;
        while (child) {
            var sibling = child.nextSibling;
            contentEl.appendChild(child);
            child = sibling;
        }
        
        var startPaneTabEl = _Global.document.createElement("div");
        startPaneTabEl.className = ClassNames._tabStop;
        _ElementUtilities._ensureId(startPaneTabEl);
        var endPaneTabEl = _Global.document.createElement("div");
        endPaneTabEl.className = ClassNames._tabStop;
        _ElementUtilities._ensureId(endPaneTabEl);
        
        // paneOutline's purpose is to render an outline around the pane in high contrast mode
        var paneOutlineEl = _Global.document.createElement("div");
        paneOutlineEl.className = ClassNames._paneOutline;

        // paneWrapper's purpose is to clip the pane during the pane resize animation
        var paneWrapperEl = _Global.document.createElement("div");
        paneWrapperEl.className = ClassNames._paneWrapper;
        paneWrapperEl.appendChild(startPaneTabEl);
        paneWrapperEl.appendChild(paneEl);
        paneWrapperEl.appendChild(paneOutlineEl);
        paneWrapperEl.appendChild(endPaneTabEl);

        var panePlaceholderEl = _Global.document.createElement("div");
        panePlaceholderEl.className = ClassNames._panePlaceholder;

        // contentWrapper is an extra element we need to allow heights to be specified as percentages (e.g. height: 100%)
        // for elements within the content area. It works around this Chrome bug:
        //   Issue 428049: 100% height doesn't work on child of a definite-flex-basis flex item (in vertical flex container)
        //   https://code.google.com/p/chromium/issues/detail?id=428049
        // The workaround is that putting a position: absolute element (_dom.content) within the flex item (_dom.contentWrapper)
        // allows percentage heights to work within the absolutely positioned element (_dom.content).
        var contentWrapperEl = _Global.document.createElement("div");
        contentWrapperEl.className = ClassNames._contentWrapper;
        contentWrapperEl.appendChild(contentEl);

        root["winControl"] = this;
        _ElementUtilities.addClass(root, ClassNames.splitView);
        _ElementUtilities.addClass(root, "win-disposable");

        this._dom = {
            root: root,
            pane: paneEl,
            startPaneTab: startPaneTabEl,
            endPaneTab: endPaneTabEl,
            paneOutline: paneOutlineEl,
            paneWrapper: paneWrapperEl,
            panePlaceholder: panePlaceholderEl,
            content: contentEl,
            contentWrapper: contentWrapperEl
        };
        
        _ElementUtilities._addEventListener(paneEl, "keydown", this._onKeyDown.bind(this));
        _ElementUtilities._addEventListener(startPaneTabEl, "focusin", this._onStartPaneTabFocusIn.bind(this));
        _ElementUtilities._addEventListener(endPaneTabEl, "focusin", this._onEndPaneTabFocusIn.bind(this));
    }
    
    private _onKeyDown(eventObject: KeyboardEvent) {
        if (eventObject.keyCode === _ElementUtilities.Key.tab) {
            this._updateTabIndices();
        }
    }
    
    private _onStartPaneTabFocusIn(eventObject: FocusEvent) {
        _ElementUtilities._focusLastFocusableElement(this._dom.pane);
    }
    
    private _onEndPaneTabFocusIn(eventObject: FocusEvent) {
        _ElementUtilities._focusFirstFocusableElement(this._dom.pane);
    }

    private _measureElement(element: HTMLElement): IRect {
        var style = _ElementUtilities._getComputedStyle(element);
        var position = _ElementUtilities._getPositionRelativeTo(element, this._dom.root);
        var marginLeft = parseInt(style.marginLeft, 10);
        var marginTop = parseInt(style.marginTop, 10);
        return {
            left: position.left - marginLeft,
            top: position.top - marginTop,
            contentWidth: _ElementUtilities.getContentWidth(element),
            contentHeight: _ElementUtilities.getContentHeight(element),
            totalWidth: _ElementUtilities.getTotalWidth(element),
            totalHeight: _ElementUtilities.getTotalHeight(element)
        };
    }

    private _setContentRect(contentRect: IRect) {
        var contentWrapperStyle = this._dom.contentWrapper.style;
        contentWrapperStyle.left = contentRect.left + "px";
        contentWrapperStyle.top = contentRect.top + "px";
        contentWrapperStyle.height = contentRect.contentHeight + "px";
        contentWrapperStyle.width = contentRect.contentWidth + "px";
    }

    // Overridden by tests.
    private _prepareAnimation(paneRect: IRect, contentRect: IRect): void {
        var paneWrapperStyle = this._dom.paneWrapper.style;
        paneWrapperStyle.position = "absolute";
        paneWrapperStyle.left = paneRect.left + "px";
        paneWrapperStyle.top = paneRect.top + "px";
        paneWrapperStyle.height = paneRect.totalHeight + "px";
        paneWrapperStyle.width = paneRect.totalWidth + "px";

        var contentWrapperStyle = this._dom.contentWrapper.style;
        contentWrapperStyle.position = "absolute";
        this._setContentRect(contentRect);
    }

    // Overridden by tests.
    private _clearAnimation(): void {
        var paneWrapperStyle = this._dom.paneWrapper.style;
        paneWrapperStyle.position = "";
        paneWrapperStyle.left = "";
        paneWrapperStyle.top = "";
        paneWrapperStyle.height = "";
        paneWrapperStyle.width = "";
        paneWrapperStyle[transformNames.scriptName] = "";

        var contentWrapperStyle = this._dom.contentWrapper.style;
        contentWrapperStyle.position = "";
        contentWrapperStyle.left = "";
        contentWrapperStyle.top = "";
        contentWrapperStyle.height = "";
        contentWrapperStyle.width = "";
        contentWrapperStyle[transformNames.scriptName] = "";

        var paneStyle = this._dom.pane.style;
        paneStyle.height = "";
        paneStyle.width = "";
        paneStyle[transformNames.scriptName] = "";
    }

    private _getHiddenContentRect(shownContentRect: IRect, hiddenPaneThickness: IThickness, shownPaneThickness: IThickness): IRect {
        if (this.openedDisplayMode === OpenedDisplayMode.overlay) {
            return shownContentRect;
        } else {
            var placementRight = this._rtl ? PanePlacement.left : PanePlacement.right;
            var multiplier = this.panePlacement === placementRight || this.panePlacement === PanePlacement.bottom ? 0 : 1;
            var paneDiff = {
                content: shownPaneThickness.content - hiddenPaneThickness.content,
                total: shownPaneThickness.total - hiddenPaneThickness.total
            };
            return this._horizontal ? {
                left: shownContentRect.left - multiplier * paneDiff.total,
                top: shownContentRect.top,
                contentWidth: shownContentRect.contentWidth + paneDiff.content,
                contentHeight: shownContentRect.contentHeight,
                totalWidth: shownContentRect.totalWidth + paneDiff.total,
                totalHeight: shownContentRect.totalHeight
            } : {
                left: shownContentRect.left,
                top: shownContentRect.top - multiplier * paneDiff.total,
                contentWidth: shownContentRect.contentWidth,
                contentHeight: shownContentRect.contentHeight + paneDiff.content,
                totalWidth: shownContentRect.totalWidth,
                totalHeight: shownContentRect.totalHeight + paneDiff.total
            }
        }
    }

    private get _horizontal(): boolean {
        return this.panePlacement === PanePlacement.left || this.panePlacement === PanePlacement.right;
    }

    private _getHiddenPaneThickness(): IThickness {
        if (this._cachedHiddenPaneThickness === null) {
            if (this._closedDisplayMode === ClosedDisplayMode.none) {
                this._cachedHiddenPaneThickness = { content: 0, total: 0 };
            } else {
                if (this._isOpenedMode) {
                    _ElementUtilities.removeClass(this._dom.root, ClassNames.paneOpened);
                    _ElementUtilities.addClass(this._dom.root, ClassNames.paneClosed);
                }
                var size = this._measureElement(this._dom.pane);
                this._cachedHiddenPaneThickness = rectToThickness(size, this._horizontal ? Dimension.width : Dimension.height);
                if (this._isOpenedMode) {
                    _ElementUtilities.removeClass(this._dom.root, ClassNames.paneClosed);
                    _ElementUtilities.addClass(this._dom.root, ClassNames.paneOpened);
                }
            }
        }

        return this._cachedHiddenPaneThickness;
    }

    // Should be called while SplitView is rendered in its opened mode
    // Overridden by tests.
    private _playShowAnimation(hiddenPaneThickness: IThickness): Promise<any> {
        var dim = this._horizontal ? Dimension.width : Dimension.height;
        var shownPaneRect = this._measureElement(this._dom.pane);
        var shownContentRect = this._measureElement(this._dom.content);
        var shownPaneThickness = rectToThickness(shownPaneRect, dim);
        var hiddenContentRect = this._getHiddenContentRect(shownContentRect, hiddenPaneThickness, shownPaneThickness);
        this._prepareAnimation(shownPaneRect, hiddenContentRect);

        var playPaneAnimation = (): Promise<any> => {
            var placementRight = this._rtl ? PanePlacement.left : PanePlacement.right;
            // What percentage of the size change should be skipped? (e.g. let's do the first
            // 30% of the size change instantly and then animate the other 70%)
            var animationOffsetFactor = 0.3;
            var from = hiddenPaneThickness.total + animationOffsetFactor * (shownPaneThickness.total - hiddenPaneThickness.total);

            return Animations._resizeTransition(this._dom.paneWrapper, this._dom.pane, {
                from: from,
                to: shownPaneThickness.total,
                actualSize: shownPaneThickness.total,
                dimension: dim,
                anchorTrailingEdge: this.panePlacement === placementRight || this.panePlacement === PanePlacement.bottom
            });
        };

        var playShowAnimation = (): Promise<any> => {
            if (this.openedDisplayMode === OpenedDisplayMode.inline) {
                this._setContentRect(shownContentRect);
            }
            return playPaneAnimation();
        };

        return playShowAnimation().then(() => {
            this._clearAnimation();
        });
    }

    // Should be called while SplitView is rendered in its opened mode
    // Overridden by tests.
    private _playHideAnimation(hiddenPaneThickness: IThickness): Promise<any> {
        var dim = this._horizontal ? Dimension.width : Dimension.height;
        var shownPaneRect = this._measureElement(this._dom.pane);
        var shownContentRect = this._measureElement(this._dom.content);
        var shownPaneThickness = rectToThickness(shownPaneRect, dim);
        var hiddenContentRect = this._getHiddenContentRect(shownContentRect, hiddenPaneThickness, shownPaneThickness);
        this._prepareAnimation(shownPaneRect, shownContentRect);

        var playPaneAnimation = (): Promise<any> => {
            var placementRight = this._rtl ? PanePlacement.left : PanePlacement.right;
            // What percentage of the size change should be skipped? (e.g. let's do the first
            // 30% of the size change instantly and then animate the other 70%)
            var animationOffsetFactor = 0.3;
            var from = shownPaneThickness.total - animationOffsetFactor * (shownPaneThickness.total - hiddenPaneThickness.total);

            return Animations._resizeTransition(this._dom.paneWrapper, this._dom.pane, {
                from: from,
                to: hiddenPaneThickness.total,
                actualSize: shownPaneThickness.total,
                dimension: dim,
                anchorTrailingEdge: this.panePlacement === placementRight || this.panePlacement === PanePlacement.bottom
            });
        };

        var playHideAnimation = (): Promise<any> => {
            if (this.openedDisplayMode === OpenedDisplayMode.inline) {
                this._setContentRect(hiddenContentRect);
            }
            return playPaneAnimation();
        };


        return playHideAnimation().then(() => {
            this._clearAnimation();
        });
    }
    
    // _updateTabIndices and _updateTabIndicesImpl are used in tests
    private _updateTabIndices() {
        if (!this._updateTabIndicesThrottled) {
            this._updateTabIndicesThrottled = _BaseUtils._throttledFunction(100, this._updateTabIndicesImpl.bind(this));
        }
        this._updateTabIndicesThrottled();
    }
    private _updateTabIndicesImpl() {
        var tabIndex = _ElementUtilities._getHighAndLowTabIndices(this._dom.pane);
        this._highestPaneTabIndex = tabIndex.highest;
        this._lowestPaneTabIndex = tabIndex.lowest;
        this._machine.updateDom();
    }

    // State private to _updateDomImpl. No other method should make use of it.
    //
    // Nothing has been rendered yet so these are all initialized to undefined. Because
    // they are undefined, the first time _updateDomImpl is called, they will all be
    // rendered.
    private _updateDomImpl_rendered = {
        paneIsFirst: <boolean>undefined,
        isOpenedMode: <boolean>undefined,
        closedDisplayMode: <string>undefined,
        openedDisplayMode: <string>undefined,
        panePlacement: <string>undefined,
        panePlaceholderWidth: <string>undefined,
        panePlaceholderHeight: <string>undefined,
        isOverlayShown: <boolean>undefined,
        startPaneTabIndex: <number>undefined,
        endPaneTabIndex: <number>undefined
    };
    private _updateDomImpl(): void {
        var rendered = this._updateDomImpl_rendered;

        var paneShouldBeFirst = this.panePlacement === PanePlacement.left || this.panePlacement === PanePlacement.top;
        if (paneShouldBeFirst !== rendered.paneIsFirst) {
            // TODO: restore focus
            if (paneShouldBeFirst) {
                this._dom.root.appendChild(this._dom.panePlaceholder);
                this._dom.root.appendChild(this._dom.paneWrapper);
                this._dom.root.appendChild(this._dom.contentWrapper);
            } else {
                this._dom.root.appendChild(this._dom.contentWrapper);
                this._dom.root.appendChild(this._dom.paneWrapper);
                this._dom.root.appendChild(this._dom.panePlaceholder);
            }
        }
        rendered.paneIsFirst = paneShouldBeFirst;

        if (rendered.isOpenedMode !== this._isOpenedMode) {
            if (this._isOpenedMode) {
                _ElementUtilities.removeClass(this._dom.root, ClassNames.paneClosed);
                _ElementUtilities.addClass(this._dom.root, ClassNames.paneOpened);
            } else {
                _ElementUtilities.removeClass(this._dom.root, ClassNames.paneOpened);
                _ElementUtilities.addClass(this._dom.root, ClassNames.paneClosed);
            }
        }
        rendered.isOpenedMode = this._isOpenedMode;

        if (rendered.panePlacement !== this.panePlacement) {
            removeClass(this._dom.root, panePlacementClassMap[rendered.panePlacement]);
            addClass(this._dom.root, panePlacementClassMap[this.panePlacement]);
            rendered.panePlacement = this.panePlacement;
        }

        if (rendered.closedDisplayMode !== this.closedDisplayMode) {
            removeClass(this._dom.root, closedDisplayModeClassMap[rendered.closedDisplayMode]);
            addClass(this._dom.root, closedDisplayModeClassMap[this.closedDisplayMode]);
            rendered.closedDisplayMode = this.closedDisplayMode;
        }

        if (rendered.openedDisplayMode !== this.openedDisplayMode) {
            removeClass(this._dom.root, openedDisplayModeClassMap[rendered.openedDisplayMode]);
            addClass(this._dom.root, openedDisplayModeClassMap[this.openedDisplayMode]);
            rendered.openedDisplayMode = this.openedDisplayMode;
        }

        var isOverlayShown = this._isOpenedMode && this.openedDisplayMode === OpenedDisplayMode.overlay;
        
        var startPaneTabIndex = isOverlayShown ? this._lowestPaneTabIndex : -1;
        var endPaneTabIndex = isOverlayShown ? this._highestPaneTabIndex : -1;
        if (rendered.startPaneTabIndex !== startPaneTabIndex) {
            this._dom.startPaneTab.tabIndex = startPaneTabIndex;
            if (startPaneTabIndex === -1) {
                this._dom.startPaneTab.removeAttribute("x-ms-aria-flowfrom");
            } else {
                this._dom.startPaneTab.setAttribute("x-ms-aria-flowfrom", this._dom.endPaneTab.id);
            }
            rendered.startPaneTabIndex = startPaneTabIndex;
        }
        if (rendered.endPaneTabIndex !== endPaneTabIndex) {
            this._dom.endPaneTab.tabIndex = endPaneTabIndex;
            if (endPaneTabIndex === -1) {
                this._dom.endPaneTab.removeAttribute("aria-flowto");
            } else {
                this._dom.endPaneTab.setAttribute("aria-flowto", this._dom.startPaneTab.id);
            }
            rendered.endPaneTabIndex = endPaneTabIndex;
        }

        // panePlaceholder's purpose is to take up the amount of space occupied by the
        // hidden pane while the pane is shown in overlay mode. Without this, the content
        // would shift as the pane shows and hides in overlay mode.
        var width: string, height: string;
        if (isOverlayShown) {
            var hiddenPaneThickness = this._getHiddenPaneThickness();
            if (this._horizontal) {
                width = hiddenPaneThickness.total + "px";
                height = "";
            } else {
                width = "";
                height = hiddenPaneThickness.total + "px";
            }
        } else {
            width = "";
            height = "";
        }
        if (rendered.panePlaceholderWidth !== width || rendered.panePlaceholderHeight !== height) {
            var style = this._dom.panePlaceholder.style;
            style.width = width;
            style.height = height;
            rendered.panePlaceholderWidth = width;
            rendered.panePlaceholderHeight = height;
        }

        if (rendered.isOverlayShown !== isOverlayShown) {
            if (isOverlayShown) {
                _LightDismissService.shown(this._dismissable);
            } else {
                _LightDismissService.hidden(this._dismissable);
            }
            rendered.isOverlayShown = isOverlayShown;
        }
    }
}

_Base.Class.mix(SplitView, _Events.createEventProperties(
    EventNames.beforeOpen,
    EventNames.afterOpen,
    EventNames.beforeClose,
    EventNames.afterClose
));
_Base.Class.mix(SplitView, _Control.DOMEventMixin);
