// Note: ScrollViewer is currently only used on Xbox and therefore can leverage platform specific APIs and event names

import _Global = require("../../Core/_Global");

import _Control = require("../../Utilities/_Control");
import _Dispose = require("../../Utilities/_Dispose");
import _ElementUtilities = require("../../Utilities/_ElementUtilities");
import _Resources = require("../../Core/_Resources");

import ControlProcessor = require("../../ControlProcessor");
import Scheduler = require("../../Scheduler");
import XYFocus = require("../../XYFocus");

require(["require-style!less/styles-scrollviewer"]);
require(["require-style!less/colors-scrollviewer"]);

"use strict";

var SMALL_SCROLL_AMOUNT = 200;
var PERCENTAGE_OF_PAGE_TO_SCROLL = 0.8;
var THRESHOLD_TO_SHOW_TOP_ARROW = 50;

var Keys = _ElementUtilities.Key;

var strings = {
    get pageDown() { return _Resources._getWinJSString("tv/scrollViewerPageDown").value; },
    get pageUp() { return _Resources._getWinJSString("tv/scrollViewerPageUp").value;  }
};

export var ScrollMode = {
    /// <field type="String" locid="WinJS.UI.ScrollMode.text" helpKeyword="WinJS.UI.ScrollMode.text">  
    /// Indicates the ScrollViewer contains text and must be invoked with the A button, then the contents can be scrolled  
    /// using directional navigation.  
    /// </field>  
    text: "text",
    /// <field type="String" locid="WinJS.UI.ScrollMode.nonModalText" helpKeyword="WinJS.UI.ScrollMode.nonModalText">  
    /// This mode is similar to text mode except the user does not need to press A to begin scrolling. Instead they move  
    /// focus to the ScrollViewer and are able to scroll text. This mode should only be used if there are no focusable   
    /// UI elements above or below the control.  
    /// </field>  
    nonModalText: "nonModalText",
    /// <field type="String" locid="WinJS.UI.ScrollMode.list" helpKeyword="WinJS.UI.ScrollMode.list">  
    /// Indicates the ScrollViewer contains focusable elements and those elements that are off-screen are scrolled into view  
    /// when the user selects those elements.  
    /// </field>  
    list: "list"
};

export class ScrollViewer {
    static isDeclarativeControlContainer = true;
    static supportedForProcessing = true;

    private _element: HTMLElement;
    private _canScrollDown = false;
    private _canScrollUp = false;
    private _disposed = false;
    private _previousFocusRoot: HTMLElement;
    private _pendingRefresh = false;
    private _scrollingContainer: HTMLElement;
    private _scrollingIndicatorElement: HTMLElement;
    private _scrollMode: string;
    private _vuiActive = false;
    private _vuiPageUpElement: HTMLElement;
    private _vuiPageDownElement: HTMLElement;

    // Used for testing
    private _refreshDone: () => any;

    /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.ScrollViewer.element" helpKeyword="WinJS.UI.ScrollViewer.element">  
    /// Gets the DOM element that hosts the ScrollViewer.  
    /// </field>  
    get element() {
        return this._element;
    }

    /// <field type="String" locid="WinJS.UI.ScrollViewer.interactionMode" helpKeyword="WinJS.UI.ScrollViewer.interactionMode">  
    /// Gets or sets a property that indicates whether there are focusable elements within the ScrollViewer. The default value is false.  
    /// </field>  
    get scrollMode() {
        return this._scrollMode;
    }
    set scrollMode(value: string) {
        this._scrollMode = value;

        // If there are no focusable elements then we need to listen for the A button.  
        if (this._scrollMode === ScrollMode.list) {
            _ElementUtilities.removeClass(this._element, "win-scrollviewer-scrollmode-text");
            _ElementUtilities.removeClass(this._scrollingContainer, "win-xyfocus-togglemode");
            _ElementUtilities.addClass(this._element, "win-scrollviewer-scrollmode-list");
            this._element.removeEventListener("keydown", this._handleKeyDown, true);
            this._setInactive();
        } else {
            _ElementUtilities.removeClass(this._element, "win-scrollviewer-scrollmode-list");
            _ElementUtilities.addClass(this._element, "win-scrollviewer-scrollmode-text");
            _ElementUtilities.addClass(this._scrollingContainer, "win-xyfocus-togglemode");
            this._element.addEventListener("keydown", this._handleKeyDown, true);
        }
    }

    constructor(element?: HTMLElement, options: any = {}) {
        this._element = element || document.createElement("div");
        this._element["winControl"] = this;

        _ElementUtilities.addClass(this._element, "win-disposable");
        _ElementUtilities.addClass(this._element, "win-scrollviewer");

        this._handleFocus = this._handleFocus.bind(this);
        this._handleFocusOut = this._handleFocusOut.bind(this);
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleListeningStateChanged = this._handleListeningStateChanged.bind(this);
        this._handleScroll = this._handleScroll.bind(this);
        this._scrollDownBySmallAmount = this._scrollDownBySmallAmount.bind(this);
        this._scrollUpBySmallAmount = this._scrollUpBySmallAmount.bind(this);
        this._scrollDownByLargeAmount = this._scrollDownByLargeAmount.bind(this);
        this._scrollUpByLargeAmount = this._scrollUpByLargeAmount.bind(this);

        this._scrollingIndicatorElement = document.createElement("div");
        this._scrollingIndicatorElement.className = "win-scrollindicator";

        this._scrollingIndicatorElement.innerHTML =
        "<div class='win-overlay-arrowindicators'>" +
        "  <div class='win-overlay-scrollupindicator'></div>" +
        "  <div class='win-overlay-scrolldownindicator'></div>" +
        "</div>" +
        "<div class='win-overlay-voiceindicators'>" +
        "  <div class='win-overlay-voice-command win-overlay-pageupindicator' aria-label='" + strings.pageUp + "'></div>" +
        "  <div class='win-overlay-voice-command win-overlay-pagedownindicator' aria-label='" + strings.pageDown + "'></div>" +
        "</div>";
        this._scrollingIndicatorElement.addEventListener("listeningstatechanged", this._handleListeningStateChanged);

        this._vuiPageUpElement = <HTMLElement>this._scrollingIndicatorElement.querySelector(".win-overlay-pageupindicator");
        this._vuiPageUpElement.addEventListener("click", this._scrollUpByLargeAmount);

        this._vuiPageDownElement = <HTMLElement>this._scrollingIndicatorElement.querySelector(".win-overlay-pagedownindicator");
        this._vuiPageDownElement.addEventListener("click", this._scrollDownByLargeAmount);

        this._scrollingContainer = document.createElement("div");
        this._scrollingContainer.tabIndex = 0;
        _ElementUtilities.addClass(this._scrollingContainer, "win-scrollviewer-contentelement");

        // Put the contents in a scrolling container  
        var child = this._element.firstChild;
        while (child) {
            var sibling = child.nextSibling;
            this._scrollingContainer.appendChild(child);
            child = sibling;
        }

        this._element.appendChild(this._scrollingContainer);
        this._element.appendChild(this._scrollingIndicatorElement);

        this._scrollingContainer.addEventListener("scroll", this._handleScroll, false);
        this._scrollingContainer.addEventListener("focus", this._handleFocus, false);
        this._element.addEventListener("focusout", this._handleFocusOut, false);

        // Set the default scroll mode  
        this.scrollMode = ScrollMode.text;
        _Control.setOptions(this, options);

        // The scroll viewer has two interaction modes:  
        //   1. Normal - In this state there is focusable content within the scrollable  
        //      region. Automatic focus handles directional navigation and scrolls  
        //      elements into view.   
        //   2. Text - In this state there is no focusable content within the scrollable  
        //      region. Typically, this case is free text. In this case, the ScrollViewer  
        //      handles directional navigation and scrolls up and down.  
        //  
        //   To determine which mode we are in, we look for focusable content. If there  
        //   is no focusable content, then we know we are in "Text" mode.  

        // We need to wait for processAll to finish on the inner contents of the scrollable region, because we need accurate   
        // sizing information to determine if a region is scrollable or not.  
        ControlProcessor.processAll(this.element).done(() => {
            this.refresh();
        });
    }

    /// <signature helpKeyword="WinJS.UI.ScrollViewer.dispose">  
    /// <summary locid="WinJS.UI.ScrollViewer.dispose">  
    /// Disposes the control.  
    /// </summary>  
    /// </signature>  
    dispose() {
        if (this._disposed) {
            return;
        }
        this._disposed = true;

        _ElementUtilities.removeClass(this._element, "win-xyfocus-suspended");
        _Dispose.disposeSubTree(this.element);
    }

    /// <signature helpKeyword="WinJS.UI.ScrollViewer.refresh">  
    /// <summary locid="WinJS.UI.ScrollViewer.refresh">  
    /// Call this function whenever the contents of the ScrollViewer changes.  
    /// </summary>  
    /// </signature>  
    refresh() {
        this._refreshVisuals();
    }

    private _moveFocus(direction: string) {
        // If we successfully move focus to a new target element, then set the ScrollViewer as inactive  
        if (this._isActive()) {
            var previousFocusRectangleObject = this._scrollingContainer.getBoundingClientRect();
            var previousFocusRectangle = {
                top: previousFocusRectangleObject.top,
                left: previousFocusRectangleObject.left,
                width: previousFocusRectangleObject.width,
                height: previousFocusRectangleObject.height
            };

            var nextFocusElement = XYFocus.moveFocus(direction, { referenceRect: previousFocusRectangle });
            if (nextFocusElement) {
                this._setInactive();
                // Sound: Choose one of the 4 focus sounds to play at random  
            }
        }
    }

    private _refreshScrollClassNames() {
        if (this._scrollingContainer.scrollTop >= THRESHOLD_TO_SHOW_TOP_ARROW) {
            this._canScrollUp = true;
        } else {
            this._canScrollUp = false;
        }
        if (this._scrollingContainer.scrollTop >= (this._scrollingContainer.scrollHeight - this._element.clientHeight)) {
            this._canScrollDown = false;
        } else {
            this._canScrollDown = true;
        }

        // Note: We remove the classes in order so we can avoid labels flashing  
        if (!this._canScrollUp && !this._canScrollDown) {
            _ElementUtilities.removeClass(this._scrollingIndicatorElement, "win-scrollable-down");
            _ElementUtilities.removeClass(this._scrollingIndicatorElement, "win-scrollable-up");

            _ElementUtilities.addClass(this._vuiPageUpElement, "win-voice-disableoverride");
            _ElementUtilities.addClass(this._vuiPageDownElement, "win-voice-disableoverride");
        } else if (!this._canScrollUp && this._canScrollDown) {
            _ElementUtilities.removeClass(this._vuiPageUpElement, "win-voice-disableoverride");
            _ElementUtilities.removeClass(this._vuiPageDownElement, "win-voice-disableoverride");

            _ElementUtilities.removeClass(this._scrollingIndicatorElement, "win-scrollable-up");
            _ElementUtilities.addClass(this._scrollingIndicatorElement, "win-scrollable-down");

            _ElementUtilities.addClass(this._vuiPageUpElement, "win-voice-disabledlabel");
            _ElementUtilities.removeClass(this._vuiPageDownElement, "win-voice-disabledlabel");
        } else if (this._canScrollUp && !this._canScrollDown) {
            _ElementUtilities.addClass(this._scrollingIndicatorElement, "win-scrollable-up");
            _ElementUtilities.removeClass(this._scrollingIndicatorElement, "win-scrollable-down");

            _ElementUtilities.removeClass(this._vuiPageUpElement, "win-voice-disabledlabel");
            _ElementUtilities.addClass(this._vuiPageDownElement, "win-voice-disabledlabel");

            _ElementUtilities.removeClass(this._vuiPageUpElement, "win-voice-disableoverride");
            _ElementUtilities.removeClass(this._vuiPageDownElement, "win-voice-disableoverride");
        } else {
            _ElementUtilities.addClass(this._scrollingIndicatorElement, "win-scrollable-up");
            _ElementUtilities.addClass(this._scrollingIndicatorElement, "win-scrollable-down");

            _ElementUtilities.removeClass(this._vuiPageUpElement, "win-voice-disabledlabel");
            _ElementUtilities.removeClass(this._vuiPageDownElement, "win-voice-disabledlabel");

            _ElementUtilities.removeClass(this._vuiPageUpElement, "win-voice-disableoverride");
            _ElementUtilities.removeClass(this._vuiPageDownElement, "win-voice-disableoverride");
        }
    }

    private _refreshVisuals() {
        if (this._pendingRefresh) {
            return;
        }
        this._pendingRefresh = true;
        
        // We call this function any time the size of the contents within the ScrollViewer changes. This function  
        // determines if we need to display the visual treatment for "more content".
        Scheduler.schedule(() => {
            this._pendingRefresh = false;

            if (this._disposed) {
                this._refreshDone && this._refreshDone();
                return;
            }

            // Set initial visibility for the arrow indicators if the contents of the scrollable region  
            // is bigger than the viewable area.  
            if (this._scrollingContainer.clientHeight < this._scrollingContainer.scrollHeight) {
                this._refreshScrollClassNames();

                // We only make the ScrollViewer focusable if it has text content and the  
                // text content does not fit on the screen. If the text content does fit  
                // on the screen then there is no reason to make the user scroll because  
                // they can see all of the text.  
                if (this._scrollMode === ScrollMode.text ||
                    this._scrollMode === ScrollMode.nonModalText) {
                    _ElementUtilities.addClass(this._scrollingContainer, "win-focusable");
                }

                // Add a class to indicate that the content within the ScrollViewer is bigger than  
                // the visible area which means the ScrollViewer will need to be able to Scroll.  
                _ElementUtilities.addClass(this._element, "win-scrollable");
            } else {
                _ElementUtilities.removeClass(this._element, "win-scrollable");
                _ElementUtilities.addClass(this._vuiPageUpElement, "win-voice-disableoverride");
                _ElementUtilities.addClass(this._vuiPageDownElement, "win-voice-disableoverride");
            }
            this._refreshDone && this._refreshDone();
        }, Scheduler.Priority.high, this, "ScrollViewer_refreshVisuals");
    }

    private _scrollDownBySmallAmount() {
        if (this._isActive()) {
            _ElementUtilities._zoomTo(this._scrollingContainer, { contentX: 0, contentY: this._scrollingContainer.scrollTop + SMALL_SCROLL_AMOUNT, viewportX: 0, viewportY: 0 });
        }
    }

    private _scrollUpBySmallAmount() {
        if (this._isActive()) {
            _ElementUtilities._zoomTo(this._scrollingContainer, { contentX: 0, contentY: this._scrollingContainer.scrollTop - SMALL_SCROLL_AMOUNT, viewportX: 0, viewportY: 0 });
        }
    }

    private _scrollDownByLargeAmount() {
        if (this._isActive() || this._vuiActive) {
            _ElementUtilities._zoomTo(this._scrollingContainer, { contentX: 0, contentY: this._scrollingContainer.scrollTop + (PERCENTAGE_OF_PAGE_TO_SCROLL * this._scrollingContainer.clientHeight), viewportX: 0, viewportY: 0 });
        }
    }

    private _scrollUpByLargeAmount() {
        if (this._isActive() || this._vuiActive) {
            _ElementUtilities._zoomTo(this._scrollingContainer, { contentX: 0, contentY: this._scrollingContainer.scrollTop - (PERCENTAGE_OF_PAGE_TO_SCROLL * this._scrollingContainer.clientHeight), viewportX: 0, viewportY: 0 });
        }
    }

    private _isActive() {
        return _ElementUtilities.hasClass(this._scrollingContainer, "win-xyfocus-togglemode-active");
    }

    private _setActive() {
        _ElementUtilities.addClass(this._scrollingContainer, "win-xyfocus-togglemode-active");
    }

    private _setInactive() {
        _ElementUtilities.removeClass(this._scrollingContainer, "win-xyfocus-togglemode-active");
    }

    private _handleFocus(ev: FocusEvent) {
        if (this._scrollMode === ScrollMode.nonModalText) {
            this._setActive();
        } else if (this._scrollMode === ScrollMode.list) {
            _ElementUtilities._focusFirstFocusableElement(this._scrollingContainer, false, this._scrollingContainer);
        }
    }

    private _handleFocusOut(ev: FocusEvent) {
        // If focus leaves the ScrollViewer & it was in the "invoked" state,  
        // we need to reset it's state.  
        if (this._isActive() && !this._element.contains(<HTMLElement>document.activeElement)) {
            this._setInactive();
        }
    }

    private _handleKeyDown(ev: KeyboardEvent) {
        // Only set handled = true for shoulder button cases so that   
        // scroll viewer doesn't trigger a hub interaction.  
        var handled = false;

        switch (ev.keyCode) {
            case Keys.upArrow:
            case Keys.GamepadDPadUp:
            case Keys.GamepadLeftThumbstickUp:
                if (this._scrollMode === ScrollMode.nonModalText) {
                    if (this._scrollingContainer.scrollTop >= THRESHOLD_TO_SHOW_TOP_ARROW) {
                        // No-op - the user can scroll up.  
                    } else {
                        var nextFocusElement = XYFocus.findNextFocusElement("up");
                        if (nextFocusElement) {
                            nextFocusElement.focus();
                        }
                    }
                }
                this._scrollUpBySmallAmount();
                break;
            case Keys.downArrow:
            case Keys.GamepadDPadDown:
            case Keys.GamepadLeftThumbstickDown:
                if (this._scrollMode === ScrollMode.nonModalText) {
                    if (this._scrollingContainer.scrollTop >= (this._scrollingContainer.scrollHeight - this._element.clientHeight)) {
                        var nextFocusElement = XYFocus.findNextFocusElement("down");
                        if (nextFocusElement) {
                            nextFocusElement.focus();
                        }
                    } else {
                        // No-op - the user can scroll down  
                    }
                }
                this._scrollDownBySmallAmount();
                break;
            case Keys.leftArrow:
            case Keys.GamepadDPadLeft:
            case Keys.GamepadLeftThumbstickLeft:
                this._moveFocus("left");
                break;
            case Keys.rightArrow:
            case Keys.GamepadDPadRight:
            case Keys.GamepadLeftThumbstickRight:
                this._moveFocus("right");
                break;
            case Keys.pageUp:
            case Keys.GamepadLeftShoulder:
                this._scrollUpByLargeAmount();
                handled = true;
                break;
            case Keys.pageDown:
            case Keys.GamepadRightShoulder:
                this._scrollDownByLargeAmount();
                handled = true;
                break;
            default:
                break;
        }

        if (handled) {
            ev.stopPropagation();
        }
    }

    private _handleListeningStateChanged(e: any) {
        if (e.state === "inactive") {
            _ElementUtilities.removeClass(this._element, "win-voice-voicemodeactive");
            this._vuiActive = false;
        } else {
            _ElementUtilities.addClass(this._element, "win-voice-voicemodeactive");
            this._vuiActive = true;
        }
    }

    private _handleScroll(ev: MouseEvent) {
        this._refreshScrollClassNames();
    }
}
