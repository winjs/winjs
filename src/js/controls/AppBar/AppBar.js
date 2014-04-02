// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// AppBar
/// <dictionary>appbar,appBars,Flyout,Flyouts,iframe,Statics,unfocus,WinJS</dictionary>
(function appBarInit(WinJS) {
    "use strict";

    WinJS.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.AppBar">
        /// Represents an application toolbar for display commands. 
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.appbar.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.appbar.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.AppBar">
        /// <button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{id:'',label:'example',icon:'back',type:'button',onclick:null,section:'global'}"></button>
        /// </div>]]></htmlSnippet>
        /// <event name="beforeshow" locid="WinJS.UI.AppBar_e:beforeshow">Raised just before showing the AppBar.</event>
        /// <event name="aftershow" locid="WinJS.UI.AppBar_e:aftershow">Raised immediately after the AppBar is fully shown.</event>
        /// <event name="beforehide" locid="WinJS.UI.AppBar_e:beforehide">Raised just before hiding the AppBar.</event>
        /// <event name="afterhide" locid="WinJS.UI.AppBar_e:afterhide">Raised immediately after the AppBar is fully hidden.</event>
        /// <part name="appbar" class="win-commandlayout" locid="WinJS.UI.AppBar_part:appbar">The AppBar control itself.</part>
        /// <part name="appBarCustom" class="win-appbar" locid="WinJS.UI.AppBar_part:appBarCustom">Style for a custom layout AppBar.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        AppBar: WinJS.Namespace._lazy(function () {
            var thisWinUI = WinJS.UI;
            var Key = WinJS.Utilities.Key;

            // Class Names
            var commandClass = "win-commandlayout",
                appBarClass = "win-appbar",
                reducedClass = "win-reduced",
                settingsFlyoutClass = "win-settingsflyout",
                topClass = "win-top",
                bottomClass = "win-bottom",
                appBarCommandClass = "win-command";

            var firstDivClass = "win-firstdiv",
                finalDivClass = "win-finaldiv";

            // Constants for placement
            var appBarPlacementTop = "top",
                appBarPlacementBottom = "bottom";

            // Constants for layout
            var appBarLayoutCustom = "custom",
                appBarLayoutCommands = "commands";

            // Constants for AppBarCommands
            var typeSeparator = "separator",
                typeContent = "content",
                separatorWidth = 60,
                buttonWidth = 100;

            // Hook into event
            var appBarCommandEvent = false;
            var edgyHappening = null;

            // Handler for the edgy starting/completed/cancelled events
            function _completedEdgy(e) {
                // If we had a right click on a flyout, ignore it.
                if (thisWinUI._Overlay._rightMouseMightEdgy &&
                    e.kind === Windows.UI.Input.EdgeGestureKind.mouse) {
                    return;
                }
                if (edgyHappening) {
                    // Edgy was happening, just skip it
                    edgyHappening = null;
                } else {
                    // Edgy wasn't happening, so toggle
                    var keyboardInvoked = e.kind === Windows.UI.Input.EdgeGestureKind.keyboard;
                    WinJS.UI.AppBar._toggleAppBarEdgy(keyboardInvoked);
                }
            }

            function _startingEdgy() {
                if (!edgyHappening) {
                    // Edgy wasn't happening, so toggle & start it
                    edgyHappening = WinJS.UI.AppBar._toggleAppBarEdgy(false);
                }
            }

            function _canceledEdgy() {
                // Shouldn't get here unless edgy was happening.
                // Undo whatever we were doing.
                var bars = _getDynamicBarsForEdgy();
                if (edgyHappening === "showing") {
                    _hideAllBars(bars, false);
                } else if (edgyHappening === "hiding") {
                    _showAllBars(bars, false);
                }
                edgyHappening = null;
            }

            function _allManipulationChanged(event) {
                var elements = document.querySelectorAll("." + appBarClass);
                if (elements) {
                    var len = elements.length;
                    for (var i = 0; i < len; i++) {
                        var element = elements[i];
                        var appbar = element.winControl;
                        if (appbar && !element.disabled) {
                            appbar._manipulationChanged(event);
                        }
                    }
                }
            }

            // Get all the non-sticky bars and return them.
            // Returns array of AppBar objects.
            // The array also has _hidden and/or _visible set if ANY are hidden or visible.
            function _getDynamicBarsForEdgy() {
                var elements = document.querySelectorAll("." + appBarClass);
                var len = elements.length;
                var AppBars = [];
                AppBars._visible = false;
                AppBars._hidden = false;
                for (var i = 0; i < len; i++) {
                    var element = elements[i];
                    if (element.disabled) {
                        // Skip disabled AppBars
                        continue;
                    }
                    var AppBar = element.winControl;
                    if (AppBar) {
                        AppBars.push(AppBar);
                        // Middle of animation is different than animated
                        if (AppBar._element.winAnimating) {
                            // If animating, look at showing/hiding
                            if (AppBar._element.winAnimating === "hiding") {
                                AppBars._hidden = true;
                            } else {
                                AppBars._visible = true;
                            }
                        } else {
                            // Not animating, so check visibility
                            if (AppBar._element.style.visibility === "hidden") {
                                AppBars._hidden = true;
                            } else {
                                AppBars._visible = true;
                            }
                        }
                    }
                }

                return AppBars;
            }

            // Show or hide all bars
            function _hideAllBars(bars, keyboardInvoked) {
                var len = bars.length;
                var allBarsAnimationPromises = new Array(len);
                for (var i = 0; i < len; i++) {
                    bars[i]._keyboardInvoked = keyboardInvoked;
                    bars[i].hide();
                    allBarsAnimationPromises[i] = bars[i]._animationPromise;
                }
                return WinJS.Promise.join(allBarsAnimationPromises);
            }

            function _showAllBars(bars, keyboardInvoked) {
                var len = bars.length;
                var allBarsAnimationPromises = new Array(len);
                for (var i = 0; i < len; i++) {
                    bars[i]._keyboardInvoked = keyboardInvoked;
                    bars[i]._doNotFocus = false;
                    bars[i]._show();
                    allBarsAnimationPromises[i] = bars[i]._animationPromise;
                }
                return WinJS.Promise.join(allBarsAnimationPromises);
            }

            // Sets focus to the last AppBar in the provided appBars array with given placement.
            // Returns true if focus was set.  False otherwise.
            function _setFocusToPreviousAppBarHelper(startIndex, appBarPlacement, appBars) {
                for (var i = startIndex; i >= 0; i--) {
                    if (appBars[i].winControl
                     && appBars[i].winControl.placement === appBarPlacement
                     && !appBars[i].winControl.hidden
                     && appBars[i].winControl._focusOnLastFocusableElement
                     && appBars[i].winControl._focusOnLastFocusableElement()) {
                        return true;
                    }
                }
                return false;
            }

            // Sets focus to the last AppBar in the provided appBars array with other placement.
            // Returns true if focus was set.  False otherwise.
            function _setFocusToPreviousAppBarHelperNeither(startIndex, appBars) {
                for (var i = startIndex; i >= 0; i--) {
                    if (appBars[i].winControl
                     && appBars[i].winControl.placement != appBarPlacementBottom
                     && appBars[i].winControl.placement != appBarPlacementTop
                     && !appBars[i].winControl.hidden
                     && appBars[i].winControl._focusOnLastFocusableElement
                     && appBars[i].winControl._focusOnLastFocusableElement()) {
                        return true;
                    }
                }
                return false;
            }

            // Sets focus to the last tab stop of the previous AppBar
            // AppBar tabbing order:
            //    1) Bottom AppBars
            //    2) Top AppBars
            //    3) Other AppBars
            // DOM order is respected, because an AppBar should not have a defined tabIndex
            function _setFocusToPreviousAppBar() {
                var appBars = document.querySelectorAll("." + appBarClass);
                if (!appBars.length) {
                    return;
                }

                var thisAppBarIndex = 0;
                for (var i = 0; i < appBars.length; i++) {
                    if (appBars[i] === this.parentElement) {
                        thisAppBarIndex = i;
                        break;
                    }
                }

                var appBarControl = this.parentElement.winControl;
                if (appBarControl.placement === appBarPlacementBottom) {
                    // Bottom appBar: Focus order: (1)previous bottom appBars (2)other appBars (3)top appBars (4)bottom appBars
                    if (thisAppBarIndex && _setFocusToPreviousAppBarHelper(thisAppBarIndex - 1, appBarPlacementBottom, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelperNeither(appBars.length - 1, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelper(appBars.length - 1, appBarPlacementTop, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelper(appBars.length - 1, appBarPlacementBottom, appBars)) { return; }
                } else if (appBarControl.placement === appBarPlacementTop) {
                    // Top appBar: Focus order: (1)previous top appBars (2)bottom appBars (3)other appBars (4)top appBars
                    if (thisAppBarIndex && _setFocusToPreviousAppBarHelper(thisAppBarIndex - 1, appBarPlacementTop, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelper(appBars.length - 1, appBarPlacementBottom, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelperNeither(appBars.length - 1, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelper(appBars.length - 1, appBarPlacementTop, appBars)) { return; }
                } else {
                    // Other appBar: Focus order: (1)previous other appBars (2)top appBars (3)bottom appBars (4)other appBars
                    if (thisAppBarIndex && _setFocusToPreviousAppBarHelperNeither(thisAppBarIndex - 1, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelper(appBars.length - 1, appBarPlacementTop, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelper(appBars.length - 1, appBarPlacementBottom, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelperNeither(appBars.length - 1, appBars)) { return; }
                }
            }

            // Sets focus to the first AppBar in the provided appBars array with given placement.
            // Returns true if focus was set.  False otherwise.
            function _setFocusToNextAppBarHelper(startIndex, appBarPlacement, appBars) {
                for (var i = startIndex; i < appBars.length; i++) {
                    if (appBars[i].winControl
                     && appBars[i].winControl.placement === appBarPlacement
                     && !appBars[i].winControl.hidden
                     && appBars[i].winControl._focusOnFirstFocusableElement
                     && appBars[i].winControl._focusOnFirstFocusableElement()) {
                        return true;
                    }
                }
                return false;
            }

            // Sets focus to the first AppBar in the provided appBars array with other placement.
            // Returns true if focus was set.  False otherwise.
            function _setFocusToNextAppBarHelperNeither(startIndex, appBars) {
                for (var i = startIndex; i < appBars.length; i++) {
                    if (appBars[i].winControl
                     && appBars[i].winControl.placement != appBarPlacementBottom
                     && appBars[i].winControl.placement != appBarPlacementTop
                     && !appBars[i].winControl.hidden
                     && appBars[i].winControl._focusOnFirstFocusableElement
                     && appBars[i].winControl._focusOnFirstFocusableElement()) {
                        return true;
                    }
                }
                return false;
            }

            // Sets focus to the first tab stop of the next AppBar
            // AppBar tabbing order:
            //    1) Bottom AppBars
            //    2) Top AppBars
            //    3) Other AppBars
            // DOM order is respected, because an AppBar should not have a defined tabIndex
            function _setFocusToNextAppBar() {
                var appBars = document.querySelectorAll("." + appBarClass);

                var thisAppBarIndex = 0;
                for (var i = 0; i < appBars.length; i++) {
                    if (appBars[i] === this.parentElement) {
                        thisAppBarIndex = i;
                        break;
                    }
                }

                var appBarControl = this.parentElement.winControl;
                if (this.parentElement.winControl.placement === appBarPlacementBottom) {
                    // Bottom appBar: Focus order: (1)next bottom appBars (2)top appBars (3)other appBars (4)bottom appBars
                    if (_setFocusToNextAppBarHelper(thisAppBarIndex + 1, appBarPlacementBottom, appBars)) { return; }
                    if (_setFocusToNextAppBarHelper(0, appBarPlacementTop, appBars)) { return; }
                    if (_setFocusToNextAppBarHelperNeither(0, appBars)) { return; }
                    if (_setFocusToNextAppBarHelper(0, appBarPlacementBottom, appBars)) { return; }
                } else if (this.parentElement.winControl.placement === appBarPlacementTop) {
                    // Top appBar: Focus order: (1)next top appBars (2)other appBars (3)bottom appBars (4)top appBars
                    if (_setFocusToNextAppBarHelper(thisAppBarIndex + 1, appBarPlacementTop, appBars)) { return; }
                    if (_setFocusToNextAppBarHelperNeither(0, appBars)) { return; }
                    if (_setFocusToNextAppBarHelper(0, appBarPlacementBottom, appBars)) { return; }
                    if (_setFocusToNextAppBarHelper(0, appBarPlacementTop, appBars)) { return; }
                } else {
                    // Other appBar: Focus order: (1)next other appBars (2)bottom appBars (3)top appBars (4)other appBars
                    if (_setFocusToNextAppBarHelperNeither(thisAppBarIndex + 1, appBars)) { return; }
                    if (_setFocusToNextAppBarHelper(0, appBarPlacementBottom, appBars)) { return; }
                    if (_setFocusToNextAppBarHelper(0, appBarPlacementTop, appBars)) { return; }
                    if (_setFocusToNextAppBarHelperNeither(0, appBars)) { return; }
                }
            }

            // Updates the firstDiv & finalDiv of all visible AppBars
            function _updateAllAppBarsFirstAndFinalDiv() {
                var appBars = document.querySelectorAll("." + appBarClass);

                for (var i = 0; i < appBars.length; i++) {
                    if (appBars[i].winControl
                     && !appBars[i].winControl.hidden
                     && appBars[i].winControl._updateFirstAndFinalDiv) {
                        appBars[i].winControl._updateFirstAndFinalDiv();
                    }
                }
            }

            // Returns true if a visible non-sticky (light dismiss) AppBar is found in the document
            function _isThereVisibleNonStickyBar() {
                var appBars = document.querySelectorAll("." + appBarClass);
                for (var i = 0; i < appBars.length; i++) {
                    var appBarControl = appBars[i].winControl;
                    if (appBarControl && !appBarControl.sticky &&
                        (!appBarControl.hidden || appBarControl._element.winAnimating === "showing")) {
                        return true;
                    }
                }

                return false;
            }

            // Hide all light dismiss AppBars if what has focus is not part of a AppBar or flyout.
            function _hideIfAllAppBarsLostFocus() {
                if (!thisWinUI.AppBar._isAppBarOrChild(document.activeElement)) {
                    thisWinUI.AppBar._hideLightDismissAppBars(null, false);
                    // Ensure that sticky appbars clear cached focus after light dismiss are dismissed, which moved focus.
                    thisWinUI.AppBar._ElementWithFocusPreviousToAppBar = null;
                }
            }

            // If the previous focus was not a AppBar or CED, store it in the cache
            // (_isAppBarOrChild tests CED for us).
            function _checkStorePreviousFocus(focusEvent) {
                if (focusEvent.relatedTarget
                 && focusEvent.relatedTarget.focus
                 && !thisWinUI.AppBar._isAppBarOrChild(focusEvent.relatedTarget)) {
                    _storePreviousFocus(focusEvent.relatedTarget);
                }
            }

            // Cache the previous focus information
            function _storePreviousFocus(element) {
                if (element) {
                    thisWinUI.AppBar._ElementWithFocusPreviousToAppBar = element;
                }
            }

            // Try to return focus to what had focus before.
            // If successfully return focus to a textbox, restore the selection too.
            function _restorePreviousFocus() {
                thisWinUI._Overlay._trySetActive(thisWinUI.AppBar._ElementWithFocusPreviousToAppBar);
            }

            var strings = {
                get ariaLabel() { return WinJS.Resources._getWinJSString("ui/appBarAriaLabel").value; },
                get requiresCommands() { return WinJS.Resources._getWinJSString("ui/requiresCommands").value; },
                get nullCommand() { return WinJS.Resources._getWinJSString("ui/nullCommand").value; },
                get cannotChangePlacementWhenVisible() { return WinJS.Resources._getWinJSString("ui/cannotChangePlacementWhenVisible").value; },
                get badLayout() { return WinJS.Resources._getWinJSString("ui/badLayout").value; },
                get cannotChangeLayoutWhenVisible() { return WinJS.Resources._getWinJSString("ui/cannotChangeLayoutWhenVisible").value; }
            };

            var AppBar = WinJS.Class.derive(WinJS.UI._Overlay, function AppBar_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.AppBar.AppBar">
                /// <summary locid="WinJS.UI.AppBar.constructor">
                /// Creates a new AppBar control. 
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.AppBar.constructor_p:element">
                /// The DOM element that will host the control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.AppBar.constructor_p:options">
                /// The set of properties and values to apply to the new AppBar control.
                /// </param>
                /// <returns type="WinJS.UI.AppBar" locid="WinJS.UI.AppBar.constructor_returnValue">
                /// The new AppBar control.
                /// </returns>
                /// </signature>

                this._initializing = true;

                // Simplify checking later
                options = options || {};

                // Make sure there's an input element            
                this._element = element || document.createElement("div");
                this._id = this._element.id || WinJS.Utilities._uniqueID(this._element);
                this._writeProfilerMark("constructor,StartTM");

                // validate that if they didn't set commands, but want command
                // layout that the HTML only contains commands.  Do this first
                // so that we don't leave partial AppBars in the DOM.
                if (options.layout !== appBarLayoutCustom && !options.commands && this._element) {
                    // Shallow copy object so we can modify it.
                    options = WinJS.Utilities._shallowCopy(options);
                    options.commands = this._verifyCommandsOnly(this._element, "WinJS.UI.AppBarCommand");
                }

                // Call the base overlay constructor helper
                this._baseOverlayConstructor(this._element, options);

                this._initializing = false;

                // Make a click eating div
                thisWinUI._Overlay._createClickEatingDivAppBar();

                // Attach our css class,
                WinJS.Utilities.addClass(this._element, appBarClass);
                // Also may need a command class if not a custom layout appbar
                if (options.layout !== appBarLayoutCustom) {
                    WinJS.Utilities.addClass(this._element, commandClass);
                }

                if (!options.placement) {
                    // Make sure we have default placement
                    this.placement = appBarPlacementBottom;
                }

                // Make sure we have an ARIA role
                var role = this._element.getAttribute("role");
                if (!role) {
                    this._element.setAttribute("role", "menubar");
                }
                var label = this._element.getAttribute("aria-label");
                if (!label) {
                    this._element.setAttribute("aria-label", strings.ariaLabel);
                }

                // Handle key down (esc) and key pressed (left & right)
                this._element.addEventListener("keydown", this._handleKeyDown.bind(this), false);

                // Attach event handler
                if (!appBarCommandEvent) {
                    // We'll trigger on invoking.  Could also have invoked or canceled
                    // Eventually we may want click up on invoking and drop back on invoked.
                    // Check for namespace so it'll behave in the designer.
                    if (WinJS.Utilities.hasWinRT) {
                        var commandUI = Windows.UI.Input.EdgeGesture.getForCurrentView();
                        commandUI.addEventListener("starting", _startingEdgy);
                        commandUI.addEventListener("completed", _completedEdgy);
                        commandUI.addEventListener("canceled", _canceledEdgy);
                    }

                    // Need to know if the IHM is done scrolling
                    document.addEventListener("MSManipulationStateChanged", _allManipulationChanged, false);

                    appBarCommandEvent = true;
                }

                // Make sure _Overlay event handlers are hooked up (this aids light dismiss)
                this._addOverlayEventHandlers(false);

                // Need to store what had focus before
                WinJS.Utilities._addEventListener(this._element, "focusin", function (event) { _checkStorePreviousFocus(event); }, false);

                // Need to hide ourselves if we lose focus
                WinJS.Utilities._addEventListener(this._element, "focusout", function (event) { _hideIfAllAppBarsLostFocus(); }, false);

                // Commands layout AppBar measures and caches its content synchronously in setOptions through the .commands property setter.
                // Remove the commands layout AppBar from the layout tree at this point so we don't cause unnecessary layout costs whenever
                // the window resizes or when CSS changes are applied to the commands layout AppBar's parent element.
                if (this.layout === appBarLayoutCommands) {
                    this._element.style.display = "none";
                }

                this._writeProfilerMark("constructor,StopTM");

                return this;
            }, {
                // Public Properties

                /// <field type="String" defaultValue="bottom" oamOptionsDatatype="WinJS.UI.AppBar.placement" locid="WinJS.UI.AppBar.placement" helpKeyword="WinJS.UI.AppBar.placement">The placement of the AppBar on the display.  Values are "top" or "bottom".</field>
                placement: {
                    get: function () {
                        return this._placement;
                    },
                    set: function (value) {
                        // In designer we may have to move it
                        var wasShown = false;
                        if (window.Windows && Windows.ApplicationModel && Windows.ApplicationModel.DesignMode && Windows.ApplicationModel.DesignMode.designModeEnabled && !this.hidden) {
                            this._hide();
                            wasShown = true;
                        }

                        if (!this.hidden) {
                            throw new WinJS.ErrorFromName("WinJS.UI.AppBar.CannotChangePlacementWhenVisible", strings.cannotChangePlacementWhenVisible);
                        }

                        // Set placement
                        this._placement = value;

                        // Clean up win-top, win-bottom styles
                        if (this._placement === appBarPlacementTop) {
                            WinJS.Utilities.addClass(this._element, topClass);
                            WinJS.Utilities.removeClass(this._element, bottomClass);
                        } else if (this._placement === appBarPlacementBottom) {
                            WinJS.Utilities.removeClass(this._element, topClass);
                            WinJS.Utilities.addClass(this._element, bottomClass);
                        } else {
                            WinJS.Utilities.removeClass(this._element, topClass);
                            WinJS.Utilities.removeClass(this._element, bottomClass);
                        }

                        // Make sure our animations are correct
                        this._assignAnimations();

                        // Show again if we hid ourselves for the designer
                        if (wasShown) {
                            this._show();
                        }
                    }
                },

                /// <field type="String" defaultValue="commands" oamOptionsDatatype="WinJS.UI.AppBar.layout" locid="WinJS.UI.AppBar.layout" helpKeyword="WinJS.UI.AppBar.layout">
                /// Gets or sets the layout of the AppBar contents to either "commands" or "custom".
                /// </field>
                layout: {
                    get: function () {
                        // Defaults to commands if not set
                        return this._layout ? this._layout : appBarLayoutCommands;
                    },
                    set: function (value) {
                        if (value !== appBarLayoutCommands && value !== appBarLayoutCustom) {
                            throw new WinJS.ErrorFromName("WinJS.UI.AppBar.BadLayout", strings.badLayout);
                        }

                        // In designer we may have to redraw it
                        var wasShown = false;
                        if (window.Windows && Windows.ApplicationModel && Windows.ApplicationModel.DesignMode && Windows.ApplicationModel.DesignMode.designModeEnabled && !this.hidden) {
                            this._hide();
                            wasShown = true;
                        }

                        if (!this.hidden) {
                            throw new WinJS.ErrorFromName("WinJS.UI.AppBar.CannotChangeLayoutWhenVisible", strings.cannotChangeLayoutWhenVisible);
                        }

                        // Set layout
                        this._layout = value;

                        // Update our classes
                        if (this._layout === appBarLayoutCommands) {
                            // Add the appbar css class back
                            WinJS.Utilities.addClass(this._element, commandClass);
                        } else {
                            // Remove the appbar css class
                            WinJS.Utilities.removeClass(this._element, commandClass);
                        }

                        // Show again if we hid ourselves for the designer
                        if (wasShown) {
                            this._show();
                        }
                    },
                    configurable: true
                },

                /// <field type="Boolean" locid="WinJS.UI.AppBar.sticky" isAdvanced="true" helpKeyword="WinJS.UI.AppBar.sticky">
                /// Gets or sets value that indicates whether the AppBar is sticky.
                /// This value is true if the AppBar is sticky; otherwise, it's false.
                /// </field>
                sticky: {
                    get: function () {
                        return this._sticky;
                    },
                    set: function (value) {
                        // If it doesn't change, do nothing
                        if (this._sticky === !!value) {
                            return;
                        }

                        this._sticky = !!value;

                        // Note: caller has to call .show() if they also want it visible

                        // Show or hide the click eating div based on sticky value
                        if (!this.hidden && this._element.style.visibility === "visible") {
                            // May have changed sticky state for keyboard navigation
                            _updateAllAppBarsFirstAndFinalDiv();

                            // Ensure that the click eating div is in the correct state
                            if (this._sticky) {
                                if (!_isThereVisibleNonStickyBar()) {
                                    thisWinUI._Overlay._hideClickEatingDivAppBar();
                                }
                            } else {
                                thisWinUI._Overlay._showClickEatingDivAppBar();

                                if (this._shouldStealFocus()) {
                                    _storePreviousFocus(document.activeElement);
                                    this._setFocusToAppBar();
                                }
                            }
                        }
                    }
                },

                /// <field type="Array" locid="WinJS.UI.AppBar.commands" helpKeyword="WinJS.UI.AppBar.commands" isAdvanced="true">
                /// Sets the AppBarCommands in the AppBar. This property accepts an array of AppBarCommand objects.
                /// </field>
                commands: {                  
                    set: function (value) {
                        // Fail if trying to set when visible
                        if (!this.hidden) {
                            throw new WinJS.ErrorFromName("WinJS.UI.AppBar.CannotChangeCommandsWhenVisible", WinJS.Resources._formatString(thisWinUI._Overlay.commonstrings.cannotChangeCommandsWhenVisible, "AppBar"));
                        }

                        // Start from scratch
                        if (!this._initializing) {
                            // AppBarCommands defined in markup don't want to be disposed during initialization.
                            this._disposeChildren();
                        }
                        WinJS.Utilities.empty(this._element);

                        // In case they had only one...
                        if (!Array.isArray(value)) {
                            value = [value];
                        }

                        // Add commands
                        var len = value.length;
                        for (var i = 0; i < len; i++) {                        
                            this._addCommand(value[i]);
                        }

                        // Need to measure all content commands after they have been added to the AppBar to make sure we allow 
                        // user defined CSS rules based on the ancestor of the content command to take affect.                     
                        this._needToMeasure = true;

                        // In case this is called from the constructor we wait for the AppBar to get added to the DOM. 
                        // It should be added in the synchronous block in which the constructor was called.
                        WinJS.Utilities.Scheduler.schedule(this._layoutCommands, WinJS.Utilities.Scheduler.Priority.idle, this, "WinJS.AppBar._layoutCommands");
                    }
                },

                getCommandById: function (id) {
                    /// <signature helpKeyword="WinJS.UI.AppBar.getCommandById">
                    /// <summary locid="WinJS.UI.AppBar.getCommandById">
                    /// Retrieves the command with the specified ID from this AppBar.
                    /// If more than one command is found, this method returns them all.
                    /// </summary>
                    /// <param name="id" type="String" locid="WinJS.UI.AppBar.getCommandById_p:id">Id of the command to return.</param>
                    /// <returns type="object" locid="WinJS.UI.AppBar.getCommandById_returnValue">
                    /// The command found, an array of commands if more than one have the same ID, or null if no command is found.
                    /// </returns>
                    /// </signature>
                    var commands = this.element.querySelectorAll("#" + id);
                    var newCommands = [];
                    for (var count = 0, len = commands.length; count < len; count++) {
                        if (commands[count].winControl) {
                            newCommands.push(commands[count].winControl);
                        }
                    }

                    if (newCommands.length === 1) {
                        return newCommands[0];
                    } else if (newCommands.length === 0) {
                        return null;
                    }

                    return newCommands;
                },


                showCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI.AppBar.showCommands">
                    /// <summary locid="WinJS.UI.AppBar.showCommands">
                    /// Show the specified commands of the AppBar.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.AppBar.showCommands_p:commands">
                    /// An array of the commands to show. The array elements may be AppBarCommand objects, or the string identifiers (IDs) of commands.
                    /// </param>
                    /// </signature>
                    if (!commands) {
                        throw new WinJS.ErrorFromName("WinJS.UI.AppBar.RequiresCommands", strings.requiresCommands);
                    }

                    this._showCommands(commands);
                },


                hideCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI.AppBar.hideCommands">
                    /// <summary locid="WinJS.UI.AppBar.hideCommands">
                    /// Hides the specified commands of the AppBar.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.AppBar.hideCommands_p:commands">Required. Command or Commands to hide, either String, DOM elements, or WinJS objects.</param>
                    /// </signature>
                    if (!commands) {
                        throw new WinJS.ErrorFromName("WinJS.UI.AppBar.RequiresCommands", strings.requiresCommands);
                    }

                    this._hideCommands(commands);
                },


                showOnlyCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI.AppBar.showOnlyCommands">
                    /// <summary locid="WinJS.UI.AppBar.showOnlyCommands">
                    /// Show the specified commands, hiding all of the others in the AppBar.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.AppBar.showOnlyCommands_p:commands">
                    /// An array of the commands to show. The array elements may be AppBarCommand objects, or the string identifiers (IDs) of commands.
                    /// </param>
                    /// </signature>
                    if (!commands) {
                        throw new WinJS.ErrorFromName("WinJS.UI.AppBar.RequiresCommands", strings.requiresCommands);
                    }

                    this._showOnlyCommands(commands);
                },


                show: function () {
                    /// <signature helpKeyword="WinJS.UI.AppBar.show">
                    /// <summary locid="WinJS.UI.AppBar.show">
                    /// Shows the AppBar, if hidden, regardless of other state
                    /// </summary>
                    /// </signature>
                    // Just wrap the private one, turning off keyboard invoked flag
                    this._writeProfilerMark("show,StartTM"); // The corresponding "stop" profiler mark is handled in _Overlay._baseEndShow().
                    this._keyboardInvoked = false;
                    this._doNotFocus = !!this.sticky;
                    this._show();
                },

                _show: function AppBar_show() {
                    // Don't do anything if disabled
                    if (this.disabled) {
                        return;
                    }

                    // Make sure everything fits before showing
                    this._layoutCommands();

                    this._scaleAppBar();

                    // If we're covered by a keyboard we look hidden, so we may have to jump up
                    if (this._keyboardObscured) {
                        // just make us look hidden so that show() gets called.
                        this._fakeHide = true;
                        this._keyboardObscured = false;
                    }

                    // Regardless we're going to be in a CED state
                    if (!this.sticky) {
                        // Need click-eating div to be visible ASAP.
                        thisWinUI._Overlay._showClickEatingDivAppBar();
                    }

                    // If we are already animating, just remember this for later
                    if (this._element.winAnimating) {
                        this._doNext = "show";
                        return false;
                    }

                    // We call our base _baseShow because AppBar may need to override show
                    // "hiding" would need to cancel.
                    this._baseShow();

                    // Clean up tabbing behavior by making sure first and final divs are correct after showing.
                    if (!this.sticky && _isThereVisibleNonStickyBar()) {
                        _updateAllAppBarsFirstAndFinalDiv();
                    } else {
                        this._updateFirstAndFinalDiv();
                    }

                    // Check if we should steal focus
                    if (!this._doNotFocus && this._shouldStealFocus()) {
                        // Store what had focus if nothing currently is stored
                        if (!thisWinUI.AppBar._ElementWithFocusPreviousToAppBar) {
                            _storePreviousFocus(document.activeElement);
                        }

                        this._setFocusToAppBar();
                    }
                },

                hide: function () {
                    /// <signature helpKeyword="WinJS.UI.AppBar.hide">
                    /// <summary locid="WinJS.UI.AppBar.hide">
                    /// Hides the AppBar.
                    /// </summary>
                    /// </signature>
                    // Just wrap the private one
                    this._writeProfilerMark("hide,StartTM"); // The corresponding "stop" profiler mark is handled in _Overlay._baseEndHide().
                    this._hide();
                },

                _hide: function AppBar_hide() {
                    // If we're covered by a keyboard we already look hidden
                    if (this._keyboardObscured && !this._animating) {
                        this._keyboardObscured = false;
                        this._baseEndHide();
                    } else {
                        // We call our base "_baseHide" because AppBar may need to override hide
                        this._baseHide();
                    }

                    // Determine if there are any AppBars that are visible.
                    // Set the focus to the next visible AppBar.
                    // If there are none, set the focus to the control stored in the cache, which
                    //   is what had focus before the AppBars were given focus.
                    var appBars = document.querySelectorAll("." + appBarClass);
                    var areOtherAppBars = false;
                    var areOtherNonStickyAppBars = false;
                    var i;
                    for (i = 0; i < appBars.length; i++) {
                        var appBarControl = appBars[i].winControl;
                        if (appBarControl && !appBarControl.hidden && (appBarControl !== this)) {
                            areOtherAppBars = true;

                            if (!appBarControl.sticky) {
                                areOtherNonStickyAppBars = true;
                                break;
                            }
                        }
                    }

                    var settingsFlyouts = document.querySelectorAll("." + settingsFlyoutClass);
                    var areVisibleSettingsFlyouts = false;
                    for (i = 0; i < settingsFlyouts.length; i++) {
                        var settingsFlyoutControl = settingsFlyouts[i].winControl;
                        if (settingsFlyoutControl && !settingsFlyoutControl.hidden) {
                            areVisibleSettingsFlyouts = true;
                            break;
                        }
                    }

                    if (!areOtherNonStickyAppBars && !areVisibleSettingsFlyouts) {
                        // Hide the click eating div because there are no other AppBars showing
                        thisWinUI._Overlay._hideClickEatingDivAppBar();
                    }

                    var that = this;
                    if (!areOtherAppBars) {
                        // Set focus to what had focus before showing the AppBar
                        if (thisWinUI.AppBar._ElementWithFocusPreviousToAppBar &&
                            (!document.activeElement || thisWinUI.AppBar._isAppBarOrChild(document.activeElement))) {
                            _restorePreviousFocus();
                        }
                        // Always clear the previous focus (to prevent temporary leaking of element)
                        thisWinUI.AppBar._ElementWithFocusPreviousToAppBar = null;
                    } else if (thisWinUI.AppBar._isWithinAppBarOrChild(document.activeElement, that.element)) {
                        // Set focus to next visible AppBar in DOM

                        var foundCurrentAppBar = false;
                        for (i = 0; i <= appBars.length; i++) {
                            if (i === appBars.length) {
                                i = 0;
                            }

                            var appBar = appBars[i];
                            if (appBar === this.element) {
                                foundCurrentAppBar = true;
                            } else if (foundCurrentAppBar && !appBar.winControl.hidden) {
                                appBar.winControl._keyboardInvoked = !!this._keyboardInvoked;
                                appBar.winControl._setFocusToAppBar();
                                break;
                            }
                        }
                    }

                    // If we are hiding the last lightDismiss AppBar, 
                    //   then we need to update the tabStops of the other AppBars
                    if (!this.sticky && !_isThereVisibleNonStickyBar()) {
                        _updateAllAppBarsFirstAndFinalDiv();
                    }

                    // Reset these values
                    this._keyboardInvoked = false;
                    this._doNotFocus = false;
                },

                _dispose: function AppBar_dispose() {
                    WinJS.Utilities.disposeSubTree(this.element);
                    this._hide();
                },

                _disposeChildren: function AppBar_disposeChildren() {
                    var appBarFirstDiv = this._element.querySelectorAll("." + firstDivClass);
                    appBarFirstDiv = appBarFirstDiv.length >= 1 ? appBarFirstDiv[0] : null;
                    var appBarFinalDiv = this._element.querySelectorAll("." + finalDivClass);
                    appBarFinalDiv = appBarFinalDiv.length >= 1 ? appBarFinalDiv[0] : null;

                    var children = this.element.children;
                    var length = children.length;
                    for (var i = 0; i < length; i++) {
                        var element = children[i];
                        if (element === appBarFirstDiv || element === appBarFinalDiv) {
                            continue;
                        }
                        if (this.layout === appBarLayoutCommands) {
                            element.winControl.dispose();
                        } else {
                            WinJS.Utilities.disposeSubTree(element);
                        }
                    }
                },

                _handleKeyDown: function AppBar_handleKeyDown(event) {
                    // On Left/Right arrow keys, moves focus to previous/next AppbarCommand element.
                    // On "Esc" key press hide all flyouts and light dismiss AppBars.

                    // Esc closes light-dismiss AppBars in all layouts but if the user has a text box with an IME 
                    // candidate window open, we want to skip the ESC key event since it is handled by the IME.
                    // When the IME handles a key it sets event.keyCode === Key.IME for an easy check.
                    if (event.keyCode === Key.escape && event.keyCode !== Key.IME) {
                        event.preventDefault();
                        event.stopPropagation();
                        thisWinUI._Overlay._hideAllFlyouts();
                        thisWinUI.AppBar._hideLightDismissAppBars(null, true);
                    }

                    // Commands layout only.
                    if (this.layout === appBarLayoutCommands && !event.altKey) {
                        if (WinJS.Utilities._matchesSelector(event.target, ".win-interactive, .win-interactive *")) {
                            return; //ignore left, right, home & end keys if focused element has win-interactive class.
                        }
                        var rtl = getComputedStyle(this._element).direction === "rtl";
                        var leftKey = rtl ? Key.rightArrow : Key.leftArrow;
                        var rightKey = rtl ? Key.leftArrow : Key.rightArrow;

                        if (event.keyCode === leftKey || event.keyCode == rightKey || event.keyCode === Key.home || event.keyCode === Key.end) {

                            var focusableCommands = this._getFocusableCommandsInLogicalOrder();
                            var targetCommand;

                            if (focusableCommands.length) {
                                switch (event.keyCode) {
                                    case leftKey:
                                        // Arrowing past the last command wraps back around to the first command.
                                        var index = Math.max(-1, focusableCommands.focusedIndex - 1) + focusableCommands.length;
                                        targetCommand = focusableCommands[index % focusableCommands.length].winControl.lastElementFocus;
                                        break;

                                    case rightKey:
                                        // Arrowing previous to the first command wraps back around to the last command.
                                        var index = focusableCommands.focusedIndex + 1 + focusableCommands.length;
                                        targetCommand = focusableCommands[index % focusableCommands.length].winControl.firstElementFocus;
                                        break;

                                    case Key.home:
                                        var index = 0;
                                        targetCommand = focusableCommands[index].winControl.firstElementFocus;
                                        break;

                                    case Key.end:
                                        var index = focusableCommands.length - 1;
                                        targetCommand = focusableCommands[index].winControl.lastElementFocus;
                                        break;
                                }
                            }

                            if (targetCommand) {
                                targetCommand.focus();
                                // Prevent default so that Trident doesn't resolve the keydown event on the newly focused element.
                                event.preventDefault();
                            }
                        }
                    }
                },

                _getFocusableCommandsInLogicalOrder: function AppBar_getCommandsInLogicalOrder() {
                    // Function returns an array of all the contained AppBarCommands which are reachable by left/right arrows.
                    //
                    if (this.layout === appBarLayoutCommands) {
                        var selectionCommands = [],
                            globalCommands = [],
                            children = this._element.children,
                            globalCommandHasFocus = false,
                            focusedIndex = -1;

                        var categorizeCommand = function (element, isGlobalCommand, containsFocus) {
                            // Helper function to categorize the element by AppBarCommand's section property. The passed in element could be the
                            // AppBarCommand, or the element referenced by a content AppBarCommands's firstElementFocus/lastElementFocus property.
                            //
                            if (isGlobalCommand) {
                                globalCommands.push(element);
                                if (containsFocus) {
                                    focusedIndex = globalCommands.length - 1;
                                    globalCommandHasFocus = true;
                                }
                            } else {
                                selectionCommands.push(element);
                                if (containsFocus) {
                                    focusedIndex = selectionCommands.length - 1;
                                }
                            }
                        }

                        // Separate commands into global and selection arrays. Find the current command with focus. 
                        // Skip the first and last indices to avoid "firstDiv" and "finalDiv".
                        for (var i = 1, len = children.length; i < len - 1; i++) {
                            var element = children[i];
                            if (element && element.winControl) {
                                var containsFocus = element.contains(document.activeElement);
                                // With the inclusion of content type commands, it may be possible to tab to elements in AppBarCommands that are not reachable by arrow keys.
                                // Regardless, when an AppBarCommand contains the element with focus, we just include the whole command so that we can determine which
                                // Commands are adjacent to it when looking for the next focus destination.
                                if (element.winControl._isFocusable() || containsFocus) {
                                    var isGlobalCommand = (element.winControl.section === "global");
                                    categorizeCommand(element, isGlobalCommand, containsFocus);
                                }
                            }
                        }

                        var focusableCommands = selectionCommands.concat(globalCommands);
                        focusableCommands.focusedIndex = globalCommandHasFocus ? focusedIndex + selectionCommands.length : focusedIndex;
                        return focusableCommands;
                    }
                },

                _assignAnimations: function AppBar_assignAnimations() {
                    // Make sure the animations are correct for our current placement
                    if (this._placement === appBarPlacementTop || this._placement === appBarPlacementBottom) {
                        // Top or Bottom
                        this._currentAnimateIn = this._animateSlideIn;
                        this._currentAnimateOut = this._animateSlideOut;
                    } else {
                        // Default for in the middle of nowhere
                        this._currentAnimateIn = this._baseAnimateIn;
                        this._currentAnimateOut = this._baseAnimateOut;
                    }
                },

                // AppBar animations
                _animateSlideIn: function AppBar_animateSlideIn() {
                    var where,
                        height = this._element.offsetHeight;
                    // Get top/bottoms
                    this._checkPosition();
                    // Get animation direction and clear other value
                    if (this._placement === appBarPlacementTop) {
                        // Top Bar
                        where = { top: "-" + height + "px", left: "0px" };
                        this._element.style.bottom = "auto";
                    } else {
                        // Bottom Bar
                        where = { top: height + "px", left: "0px" };
                        this._element.style.top = "auto";
                    }

                    this._element.style.opacity = 1;
                    this._element.style.visibility = "visible";
                    return WinJS.UI.Animation.showEdgeUI(this._element, where, { mechanism: "transition" });
                },

                _animateSlideOut: function AppBar_animateSlideOut() {
                    var where,
                        height = this._element.offsetHeight;
                    if (this._placement === appBarPlacementTop) {
                        // Top Bar
                        where = { top: "-" + height + "px", left: "0px" };
                        // Adjust for scrolling or soft keyboard positioning
                        this._element.style.top = (this._getTopOfVisualViewport()) + "px";
                    } else {
                        // Bottom Bar
                        where = { top: height + "px", left: "0px" };
                        // Adjust for scrolling or soft keyboard positioning
                        this._element.style.bottom = (this._getAdjustedBottom()) + "px";
                    }

                    return WinJS.UI.Animation.hideEdgeUI(this._element, where, { mechanism: "transition" });
                },

                _isABottomAppBarInTheProcessOfShowing: function AppBar_isABottomAppBarInTheProcessOfShowing() {
                    var appbars = document.querySelectorAll("." + appBarClass + "." + bottomClass);
                    for (var i = 0; i < appbars.length; i++) {
                        if (appbars[i].winAnimating === "showing") {
                            return true;
                        }
                    }

                    return false;
                },

                // Returns true if
                //   1) This is a bottom appbar
                //   2) No appbar has focus and a bottom appbar is not in the process of showing
                //   3) What currently has focus is neither a bottom appbar nor a top appbar
                //      AND a bottom appbar is not in the process of showing.
                // Otherwise Returns false
                _shouldStealFocus: function AppBar_shouldStealFocus() {
                    var activeElementAppBar = thisWinUI.AppBar._isAppBarOrChild(document.activeElement);
                    if (this._element === activeElementAppBar) {
                        // This appbar already has focus and we don't want to move focus 
                        // from where it currently is in this appbar.
                        return false;
                    }
                    if (this._placement === appBarPlacementBottom) {
                        // This is a bottom appbar
                        return true;
                    }

                    var isBottomAppBarShowing = this._isABottomAppBarInTheProcessOfShowing();
                    if (!activeElementAppBar) {
                        // Currently no appbar has focus.
                        // Return true if a bottom appbar is not in the process of showing.
                        return !isBottomAppBarShowing;
                    }
                    if (!activeElementAppBar.winControl) {
                        // This should not happen, but if it does we want to make sure
                        // that an AppBar ends up with focus.
                        return true;
                    }
                    if ((activeElementAppBar.winControl._placement !== appBarPlacementBottom)
                     && (activeElementAppBar.winControl._placement !== appBarPlacementTop)
                     && !isBottomAppBarShowing) {
                        // What currently has focus is neither a bottom appbar nor a top appbar
                        // -and-
                        // a bottom appbar is not in the process of showing.
                        return true;
                    }
                    return false
                },

                // Set focus to the passed in AppBar
                _setFocusToAppBar: function AppBar_setFocusToAppBar() {
                    if (this._focusOnFirstFocusableElement()) {
                        // Prevent what is gaining focus from showing that it has focus,
                        // but only in the non-keyboard scenario.
                        if (!this._keyboardInvoked) {
                            thisWinUI._Overlay._addHideFocusClass(document.activeElement);
                        }
                    } else {
                        // No first element, set it to appbar itself
                        thisWinUI._Overlay._trySetActive(this._element);
                    }
                },

                _contentChanged: function AppBar_contentChanged() {
                    this._updateCommandsWidth();
                    this._scaleAppBar();
                },

                _scaleAppBar: function AppBar_scaleAppBar() {
                    // For commands layout AppBars only. If the total width of all AppBarCommands is greater than the
                    // width of the AppBar, add the win-reduced class to the AppBar element.

                    if (this.layout === appBarLayoutCommands) {
                        //  Measure AppBar's contents width, AppBar offsetWidth and AppBar padding:   
                        var widthOfVisibleContent = this._getCommandsWidth();
                        if (this._appBarTotalKnownWidth !== +this._appBarTotalKnownWidth) {
                            this._appBarTotalKnownWidth = this._scaleAppBarHelper();
                        }

                        if (widthOfVisibleContent <= this._appBarTotalKnownWidth) {
                            // Full size commands
                            WinJS.Utilities.removeClass(this._element, reducedClass);
                        }
                        else {
                            // Reduced size commands
                            WinJS.Utilities.addClass(this._element, reducedClass);
                        }
                    }
                },

                _scaleAppBarHelper: function AppBar_scaleAppBarHelper() {
                    // This exists as a single line function so that unit tests can 
                    // overwrite it since they can't resize the WWA window.
                    return document.documentElement.clientWidth;
                },

                _updateCommandsWidth: function AppBar_updateCommandsWidth(commandSubSet) {
                    // Whenever Commands are hidden/shown in the Commands layout AppBar, this function is called 
                    // to update the cached width measurement of all visible AppBarCommands in the AppBar.
                    if (this.layout === appBarLayoutCommands) {
                        var buttonsCount = 0;
                        var separatorsCount = 0;
                        var command;
                        var commands = commandSubSet;

                        this._widthOfAllCommands = 0;
                        if (!commands) {
                            // Crawl the AppBar's inner HTML for the commands.
                            commands = this._getVisibleCommands();
                        }
                        this._widthOfAllCommands = this._getCommandsWidth(commands);
                    }
                },

                _getCommandsWidth: function AppBar_getCommandsWidth(commandSubSet) {
                    if (!commandSubSet) {
                        // Return the cached width of all previously visible commands in the AppBar.
                        return this._widthOfAllCommands;
                    } else {
                        // Return the width of the specified subset.
                        var separatorsCount = 0;
                        var buttonsCount = 0;
                        var widthOfCommandSubSet = 0;
                        var command;
                        for (var i = 0, len = commandSubSet.length; i < len; i++) {
                            command = commandSubSet[i].winControl || commandSubSet[i];
                            if (command._type === typeSeparator) {
                                separatorsCount++
                            } else if (command._type !== typeContent) {
                                // button, toggle, and flyout types all have the same width.
                                buttonsCount++;
                            } else {
                                widthOfCommandSubSet += command._fullSizeWidth;
                            }
                        }
                    }
                    return widthOfCommandSubSet += (separatorsCount * separatorWidth) + (buttonsCount * buttonWidth);
                },

                _beginAnimateCommands: function AppBar_beginAnimateCommands(showCommands, hideCommands, otherVisibleCommands) {
                    // The parameters are 3 mutually exclusive arrays of win-command elements contained in this Overlay.
                    // 1) showCommands[]: All of the HIDDEN win-command elements that ARE scheduled to show. 
                    // 2) hideCommands[]: All of the VISIBLE win-command elements that ARE scheduled to hide.
                    // 3) otherVisibleCommands[]: All VISIBLE win-command elements that ARE NOT scheduled to hide.                               
                    if (this.layout === appBarLayoutCommands) {
                        this._scaleCommandsAfterAnimations = false;
                        // Update our command counts now, to what they will be after we complete the animations.
                        var visibleCommandsAfterAnimations = otherVisibleCommands.concat(showCommands);
                        this._updateCommandsWidth(visibleCommandsAfterAnimations)
                        var changeInWidth = this._getCommandsWidth(showCommands) - this._getCommandsWidth(hideCommands);
                        if (changeInWidth > 0) {
                            // Width of contents is going to increase. If there won't be enough room to fit them all on a single row,
                            // reduce size of commands before the new content appears.
                            this._scaleAppBar();
                        } else if (changeInWidth < 0) {
                            // Width of contents is going to decrease. Once animations are complete, check if 
                            // there is enough available space to make the remaining commands full size.
                            this._scaleCommandsAfterAnimations = true;
                        }
                    }
                },

                _endAnimateCommands: function AppBar_endAnimateCommands() {
                    if (this._scaleCommandsAfterAnimations) {
                        this._scaleAppBar();
                    }
                },

                _addCommand: function AppBar_addCommand(command) {
                    if (!command) {
                        throw new WinJS.ErrorFromName("WinJS.UI.AppBar.NullCommand", strings.nullCommand);
                    }
                    // See if it's a command already
                    if (!command._element) {
                        // Not a command, so assume it is options for the command's constructor.
                        command = new WinJS.UI.AppBarCommand(null, command);
                    }
                    // If we were attached somewhere else, detach us
                    if (command._element.parentElement) {
                        command._element.parentElement.removeChild(command._element);
                    }
                    // Reattach us
                    this._element.appendChild(command._element);
                },

                _measureContentCommands: function AppBar_measureContentCommands() {
                    // AppBar measures the width of content commands when they are first added
                    // and then caches that value to avoid additional layouts in the future.     

                    // Can't measure unless We're in the document body     
                    if (document.body.contains(this.element)) {
                        this._needToMeasure = false;

                        // Remove the reducedClass from AppBar to ensure fullsize measurements
                        var hadReducedClass = WinJS.Utilities.hasClass(this.element, reducedClass);
                        WinJS.Utilities.removeClass(this._element, reducedClass);

                        // Make sure AppBar and children have width dimensions.
                        var prevAppBarDisplay = this.element.style.display;
                        var prevCommandDisplay;
                        this.element.style.display = "";

                        var commandElements = this._element.children;
                        var element;
                        for (var i = 0, len = commandElements.length; i < len; i++) {
                            element = commandElements[i];
                            if (element.winControl && element.winControl._type === typeContent) {
                                // Make sure command has width dimensions before we measure.
                                prevCommandDisplay = element.style.display;
                                element.style.display = "";
                                element.winControl._fullSizeWidth = WinJS.Utilities.getTotalWidth(element) || 0;
                                element.style.display = prevCommandDisplay;
                            }
                        }

                        // Restore state to AppBar.
                        this.element.display = prevAppBarDisplay;
                        if (hadReducedClass) {
                            WinJS.Utilities.addClass(this._element, reducedClass);
                        }
                    }
                },

                // Performs any pending measurements on "content" type AppBarCommands and scales the AppBar to fit all AppBarCommand types accordingly.
                _layoutCommands: function AppBar_layoutCommands() {
                    if (this._needToMeasure && this.layout === appBarLayoutCommands) {
                        this._measureContentCommands();
                        this._contentChanged();
                    }
                },

                // Get the top of the top appbars, this is always 0 because appbar uses
                // -ms-device-fixed positioning.
                _getTopOfVisualViewport: function AppBar_getTopOfVisualViewPort() {
                    return 0;
                },

                // Get the bottom of the bottom appbars, Bottom is just 0, if there's no IHM.
                // When the IHM appears, the default behavior is to resize the view. If a resize
                // happens, we can rely on -ms-device-fixed positioning and leave the bottom
                // at 0. However if resize doesn't happen, then the keyboard obscures the appbar
                // and we will need to adjust the bottom of the appbar by distance of the keyboard.
                _getAdjustedBottom: function AppBar_getAdjustedBottom() {
                    // Need the distance the IHM moved as well.
                    return thisWinUI._Overlay._keyboardInfo._visibleDocBottomOffset;
                },

                _showingKeyboard: function AppBar_showingKeyboard(event) {
                    // Remember keyboard showing state.
                    this._keyboardObscured = false;
                    this._keyboardHiding = false;

                    // If we're already moved, then ignore the whole thing
                    if (thisWinUI._Overlay._keyboardInfo._visible && this._alreadyInPlace()) {
                        return;
                    }

                    this._keyboardShowing = true;
                    // If focus is in the appbar, don't cause scrolling.
                    if (!this.hidden && this._element.contains(document.activeElement)) {
                        event.ensuredFocusedElementInView = true;
                    }

                    // Check if appbar moves or is obscured
                    if (!this.hidden && this._placement !== appBarPlacementTop && thisWinUI._Overlay._isFlyoutVisible()) {
                        // Remember that we're obscured
                        this._keyboardObscured = true;
                    } else {
                        // If not obscured, tag as showing and set timeout to restore us.
                        this._scrollHappened = false;
                    }

                    // Also set timeout regardless, so we can clean up our _keyboardShowing flag.
                    var that = this;
                    setTimeout(function (e) { that._checkKeyboardTimer(e); }, thisWinUI._Overlay._keyboardInfo._animationShowLength + thisWinUI._Overlay._scrollTimeout);
                },

                _hidingKeyboard: function AppBar_hidingKeyboard(event) {
                    // We won't be obscured
                    this._keyboardObscured = false;
                    this._keyboardShowing = false;
                    this._keyboardHiding = true;

                    // We'll either just reveal the current space or resize the window
                    if (!thisWinUI._Overlay._keyboardInfo._isResized) {
                        // If we're visible or only fake hiding under keyboard, or already animating,
                        // then snap us to our final position.
                        if (!this.hidden || this._fakeHide || this._animating) {
                            // Not resized, update our final position immediately
                            this._checkScrollPosition();
                            this._element.style.display = "";
                            this._fakeHide = false;
                        }
                        this._keyboardHiding = false;
                    }
                    // Else resize should clear keyboardHiding.
                },

                _resize: function AppBar_resize(event) {
                    // If we're hidden by the keyboard, then hide bottom appbar so it doesn't pop up twice when it scrolls
                    if (this._keyboardShowing) {
                        // Top is allowed to scroll off the top, but we don't want bottom to peek up when
                        // scrolled into view since we'll show it ourselves and don't want a stutter effect.
                        if (!this.hidden) {
                            if (this._placement !== appBarPlacementTop && !this._keyboardObscured) {
                                // If viewport doesn't match window, need to vanish momentarily so it doesn't scroll into view,
                                // however we don't want to toggle the visibility="hidden" hidden flag.
                                this._element.style.display = "none";
                            }
                        }
                        // else if we're top we stay, and if there's a flyout, stay obscured by the keyboard.
                    } else if (this._keyboardHiding) {
                        this._keyboardHiding = false;
                        if (!this.hidden || this._animating) {
                            // Snap to final position
                            this._checkScrollPosition();
                            this._element.style.display = "";
                            this._fakeHide = false;
                        }
                    }

                    // Check for horizontal window resizes.
                    this._appBarTotalKnownWidth = null;
                    if (!this.hidden) {
                        this._scaleAppBar();
                    }
                },

                _checkKeyboardTimer: function AppBar_checkKeyboardTimer() {
                    if (!this._scrollHappened) {
                        this._mayEdgeBackIn();
                    }
                },

                _manipulationChanged: function AppBar_manipulationChanged(event) {
                    // See if we're at the not manipulating state, and we had a scroll happen,
                    // which is implicitly after the keyboard animated.
                    if (event.currentState === 0 && this._scrollHappened) {
                        this._mayEdgeBackIn();
                    }
                },

                _mayEdgeBackIn: function AppBar_mayEdgeBackIn(event) {
                    // May need to react to IHM being resized event
                    if (this._keyboardShowing) {
                        // If not top appbar or viewport isn't still at top, then need to show again
                        this._keyboardShowing = false;
                        // If obscured (flyout showing), don't change.
                        // If hidden, may be because _fakeHide was set in _resize.
                        // If bottom we have to move, or if top scrolled off screen.
                        if (!this._keyboardObscured && (!this.hidden || this._fakeHide) &&
                            (this._placement !== appBarPlacementTop || thisWinUI._Overlay._keyboardInfo._visibleDocTop !== 0)) {
                            this._doNotFocus = true;
                            this._fakeHide = true;
                            this._show();
                        } else {
                            // Ensure any animation dropped during the showing keyboard are caught up.
                            this._checkDoNext();
                        }
                    }
                    this._scrollHappened = false;
                },

                // _checkPosition repositions the AppBar when the soft keyboard shows up
                _checkPosition: function AppBar_checkPosition() {
                    // Bottom's the only one needing movement
                    if (this._placement === appBarPlacementBottom) {
                        this._element.style.bottom = this._getAdjustedBottom() + "px";
                    } else if (this._placement === appBarPlacementTop) {
                        this._element.style.top = this._getTopOfVisualViewport() + "px";
                    }
                    // else we don't touch custom positions
                },

                _checkScrollPosition: function AppBar_checkScrollPosition(event) {
                    // If keyboard's animating, then remember we may come in
                    if (this._keyboardShowing) {
                        // Tag that it's OK to edge back in.
                        this._scrollHappened = true;
                        return;
                    }

                    // We only need to update if we're visible
                    if (!this.hidden || this._animating) {
                        this._checkPosition();
                        // Ensure any animation dropped during the showing keyboard are caught up.
                        this._checkDoNext();
                    }
                },

                _alreadyInPlace: function AppBar_alreadyInPlace() {
                    // See if we're already where we're supposed to be.
                    if (this._placement === appBarPlacementBottom) {
                        if (parseInt(this._element.style.bottom) === this._getAdjustedBottom()) {
                            return true;
                        }
                    } else if (this._placement === appBarPlacementTop) {
                        if (parseInt(this._element.style.top) === this._getTopOfVisualViewport()) {
                            return true;
                        }
                    }
                    // else we don't understand custom positioning
                    return false;
                },

                // If there is a visible non-sticky AppBar then it sets the firstDiv tabIndex to
                //   the minimum tabIndex found in the AppBars and finalDiv to the max found.
                // Otherwise sets their tabIndex to -1 so they are not tab stops.
                _updateFirstAndFinalDiv: function AppBar_updateFirstAndFinalDiv() {
                    var appBarFirstDiv = this._element.querySelectorAll("." + firstDivClass);
                    appBarFirstDiv = appBarFirstDiv.length >= 1 ? appBarFirstDiv[0] : null;

                    var appBarFinalDiv = this._element.querySelectorAll("." + finalDivClass);
                    appBarFinalDiv = appBarFinalDiv.length >= 1 ? appBarFinalDiv[0] : null;

                    // Remove the firstDiv & finalDiv if they are not at the appropriate locations
                    if (appBarFirstDiv && (this._element.children[0] != appBarFirstDiv)) {
                        appBarFirstDiv.parentNode.removeChild(appBarFirstDiv);
                        appBarFirstDiv = null;
                    }
                    if (appBarFinalDiv && (this._element.children[this._element.children.length - 1] != appBarFinalDiv)) {
                        appBarFinalDiv.parentNode.removeChild(appBarFinalDiv);
                        appBarFinalDiv = null;
                    }

                    // Create and add the firstDiv & finalDiv if they don't already exist
                    if (!appBarFirstDiv) {
                        // Add a firstDiv that will be the first child of the appBar.
                        // On focus set focus to the previous appBar.
                        // The div should only be focusable if there are visible non-sticky AppBars.
                        appBarFirstDiv = document.createElement("div");
                        // display: inline is needed so that the div doesn't take up space and cause the page to scroll on focus
                        appBarFirstDiv.style.display = "inline";
                        appBarFirstDiv.className = firstDivClass;
                        appBarFirstDiv.tabIndex = -1;
                        appBarFirstDiv.setAttribute("aria-hidden", "true");
                        WinJS.Utilities._addEventListener(appBarFirstDiv, "focusin", _setFocusToPreviousAppBar, false);
                        // add to beginning
                        if (this._element.children[0]) {
                            this._element.insertBefore(appBarFirstDiv, this._element.children[0]);
                        } else {
                            this._element.appendChild(appBarFirstDiv);
                        }
                    }
                    if (!appBarFinalDiv) {
                        // Add a finalDiv that will be the last child of the appBar.
                        // On focus set focus to the next appBar.
                        // The div should only be focusable if there are visible non-sticky AppBars.
                        appBarFinalDiv = document.createElement("div");
                        // display: inline is needed so that the div doesn't take up space and cause the page to scroll on focus
                        appBarFinalDiv.style.display = "inline";
                        appBarFinalDiv.className = finalDivClass;
                        appBarFinalDiv.tabIndex = -1;
                        appBarFinalDiv.setAttribute("aria-hidden", "true");
                        WinJS.Utilities._addEventListener(appBarFinalDiv, "focusin", _setFocusToNextAppBar, false);
                        this._element.appendChild(appBarFinalDiv);
                    }

                    // Update the tabIndex of the firstDiv & finalDiv
                    if (_isThereVisibleNonStickyBar()) {
                        var elms = this._element.getElementsByTagName("*");

                        if (appBarFirstDiv) {
                            appBarFirstDiv.tabIndex = WinJS.Utilities._getLowestTabIndexInList(elms);
                        }
                        if (appBarFinalDiv) {
                            appBarFinalDiv.tabIndex = WinJS.Utilities._getHighestTabIndexInList(elms);
                        }
                    } else {
                        if (appBarFirstDiv) {
                            appBarFirstDiv.tabIndex = -1;
                        }
                        if (appBarFinalDiv) {
                            appBarFinalDiv.tabIndex = -1;
                        }
                    }
                },

                _writeProfilerMark: function AppBar_writeProfilerMark(text) {
                    WinJS.Utilities._writeProfilerMark("WinJS.UI.AppBar:" + this._id + ":" + text);
                }
            });

            // Statics
            AppBar._ElementWithFocusPreviousToAppBar = null;

            // Returns appbar element (or CED/sentinal) if the element or what had focus before the element (if a Flyout) is either:
            //   1) an AppBar,
            //   2) OR in the subtree of an AppBar,
            //   3) OR an AppBar click eating div.
            // Returns null otherwise.
            AppBar._isAppBarOrChild = function (element) {
                // If it's null, we can't do this
                if (!element) {
                    return null;
                }

                // click eating divs and sentinals should not have children
                if (WinJS.Utilities.hasClass(element, thisWinUI._Overlay._clickEatingAppBarClass) ||
                    WinJS.Utilities.hasClass(element, thisWinUI._Overlay._clickEatingFlyoutClass) ||
                    WinJS.Utilities.hasClass(element, firstDivClass) ||
                    WinJS.Utilities.hasClass(element, finalDivClass)) {
                    return element;
                }

                while (element && element !== document) {
                    if (WinJS.Utilities.hasClass(element, appBarClass)) {
                        return element;
                    }
                    if (WinJS.Utilities.hasClass(element, "win-flyout")
                     && element != element.winControl._previousFocus) {
                        var flyoutControl = element.winControl;
                        // If _previousFocus was in a light dismissable AppBar, then this Flyout is considered of an extension of it and that AppBar will not close.
                        // Hook up a 'focusout' listener to this Flyout element to make sure that light dismiss AppBars close if focus moves anywhere other than back to an AppBar.
                        var appBarElement = thisWinUI.AppBar._isAppBarOrChild(flyoutControl._previousFocus);
                        if (appBarElement) {
                            WinJS.Utilities._addEventListener(flyoutControl.element, 'focusout', function focusOut(event) {
                                // Hides any open AppBars if the new activeElement is not in an AppBar.
                                _hideIfAllAppBarsLostFocus();
                                WinJS.Utilities._removeEventListener(flyoutControl.element, 'focusout', focusOut, false);
                            }, false);
                        }
                        return appBarElement;
                    }

                    element = element.parentNode;
                }

                return null;
            };

            // Returns true if the element or what had focus before the element (if a Flyout) is either:
            //   1) the appBar or subtree
            //   2) OR in a flyout spawned by the appBar
            // Returns false otherwise.
            AppBar._isWithinAppBarOrChild = function (element, appBar) {
                if (!element || !appBar) {
                    return false;
                }
                if (appBar.contains(element)) {
                    return true;
                }
                var flyout = thisWinUI._Overlay._getParentControlUsingClassName(element, "win-flyout");
                return (flyout && appBar.contains(flyout._previousFocus));
            };

            // Overlay class calls this for global light dismiss events
            AppBar._hideLightDismissAppBars = function (event, keyboardInvoked) {
                var elements = document.querySelectorAll("." + appBarClass);
                var len = elements.length;
                var AppBars = [];
                for (var i = 0; i < len; i++) {
                    var AppBar = elements[i].winControl;
                    if (AppBar && !AppBar.sticky && !AppBar.hidden) {
                        AppBars.push(AppBar);
                    }
                }

                _hideAllBars(AppBars, keyboardInvoked);
            };

            var appBarSynchronizationPromise = WinJS.Promise.as();

            // Callback for AppBar Edgy Event Command   
            AppBar._toggleAppBarEdgy = function (keyboardInvoked) {
                var bars = _getDynamicBarsForEdgy();

                // If they're all visible hide them, otherwise show them all
                if (bars._visible && !bars._hidden) {
                    appBarSynchronizationPromise = appBarSynchronizationPromise.then(function () {
                        return _hideAllBars(bars, keyboardInvoked);
                    });
                    return "hiding";
                } else {
                    appBarSynchronizationPromise = appBarSynchronizationPromise.then(function () {
                        return _showAllBars(bars, keyboardInvoked);
                    });
                    return "showing";
                }
            };

            return AppBar;
        })
    });

})(WinJS);

