// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// AppBar
/// <dictionary>appbar,appBars,Flyout,Flyouts,iframe,Statics,unfocus,WinJS</dictionary>
define([
    'exports',
    '../Core/_Global',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations',
    '../Promise',
    '../Scheduler',
    '../Utilities/_Control',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    '../Utilities/_KeyboardBehavior',
    './AppBar/_Constants',
    './AppBar/_Layouts',
    './AppBar/_Command',
    './AppBar/_Icon',
    './Flyout/_Overlay',
    'require-style!less/controls'
], function appBarInit(exports, _Global, _WinRT, _Base, _BaseUtils, _ErrorFromName, _Resources, _WriteProfilerMark, Animations, Promise, Scheduler, _Control, _Dispose, _ElementUtilities, _Hoverable, _KeyboardBehavior, _Constants, _Layouts, _Command, _Icon, _Overlay) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.AppBar">
        /// Represents an application toolbar for display commands.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.appbar.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.appbar.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.AppBar">
        /// <button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{id:'',label:'example',icon:'back',type:'button',onclick:null,section:'primary'}"></button>
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
        AppBar: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            // Enum of known constant pixel values for display modes.
            var knownVisibleHeights = {
                disabled: 0,
                none: 0,
                hidden: 0,
                minimal: 25,
            };

            // Maps each notion of a display modes to the corresponding visible position
            var displayModeVisiblePositions = {
                disabled: "hidden",
                none: "hidden",
                hidden: "hidden",
                minimal: "minimal",
                shown: "shown",
            };

            // Enum of closedDisplayMode constants
            var closedDisplayModes = {
                none: "none",
                minimal: "minimal",
            };

            // Constants shown/hidden states
            var appbarShownState = "shown",
                appbarHiddenState = "hidden";

            // Hook into event
            var globalEventsInitialized = false;
            var edgyHappening = null;

            // Handler for the edgy starting/completed/cancelled events
            function _completedEdgy(e) {
                // If we had a right click on a flyout, ignore it.
                if (_Overlay._Overlay._containsRightMouseClick &&
                    e.kind === _WinRT.Windows.UI.Input.EdgeGestureKind.mouse) {
                    return;
                }
                if (edgyHappening) {
                    // Edgy was happening, just skip it
                    edgyHappening = null;
                } else {
                    // Edgy wasn't happening, so toggle
                    var keyboardInvoked = e.kind === _WinRT.Windows.UI.Input.EdgeGestureKind.keyboard;
                    AppBar._toggleAllAppBarsState(keyboardInvoked);
                }
            }

            function _startingEdgy() {
                if (!edgyHappening) {
                    // Edgy wasn't happening, so toggle & start it
                    edgyHappening = AppBar._toggleAllAppBarsState(false);
                }
            }

            function _canceledEdgy() {
                // Shouldn't get here unless edgy was happening.
                // Undo whatever we were doing.
                var bars = _getDynamicBarsForEdgy();
                if (edgyHappening === "showing") {
                    _Overlay._Overlay._hideAppBars(bars, false);
                } else if (edgyHappening === "hiding") {
                    _Overlay._Overlay._showAppBars(bars, false);
                }
                edgyHappening = null;
            }

            function _allManipulationChanged(event) {
                var elements = _Global.document.querySelectorAll("." + _Constants.appBarClass);
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
            // The array also has _hidden and/or _shown set if ANY are hidden or shown.
            function _getDynamicBarsForEdgy() {
                var elements = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                var len = elements.length;
                var AppBars = [];
                AppBars._shown = false;
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
                        if (_ElementUtilities.hasClass(AppBar._element, _Constants.hiddenClass) || _ElementUtilities.hasClass(AppBar._element, _Constants.hidingClass)) {
                            AppBars._hidden = true;
                        } else {
                            AppBars._shown = true;
                        }
                    }
                }

                return AppBars;
            }

            // Sets focus to the last AppBar in the provided appBars array with given placement.
            // Returns true if focus was set.  False otherwise.
            function _setFocusToPreviousAppBarHelper(startIndex, appBarPlacement, appBars) {
                var appBar;
                for (var i = startIndex; i >= 0; i--) {
                    appBar = appBars[i].winControl;
                    if (appBar
                     && appBar.placement === appBarPlacement
                     && !appBar.hidden
                     && appBar._focusOnLastFocusableElement
                     && appBar._focusOnLastFocusableElement()) {
                        return true;
                    }
                }
                return false;
            }

            // Sets focus to the last tab stop of the previous AppBar
            // AppBar tabbing order:
            //    1) Bottom AppBars
            //    2) Top AppBars
            // DOM order is respected, because an AppBar should not have a defined tabIndex
            function _setFocusToPreviousAppBar() {
                /*jshint validthis: true */
                var appBars = _Global.document.querySelectorAll("." + _Constants.appBarClass);
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
                if (appBarControl.placement === _Constants.appBarPlacementBottom) {
                    // Bottom appBar: Focus order: (1)previous bottom appBars (2)top appBars (3)bottom appBars
                    if (thisAppBarIndex && _setFocusToPreviousAppBarHelper(thisAppBarIndex - 1, _Constants.appBarPlacementBottom, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelper(appBars.length - 1, _Constants.appBarPlacementTop, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelper(appBars.length - 1, _Constants.appBarPlacementBottom, appBars)) { return; }
                } else if (appBarControl.placement === _Constants.appBarPlacementTop) {
                    // Top appBar: Focus order: (1)previous top appBars (2)bottom appBars (3)top appBars
                    if (thisAppBarIndex && _setFocusToPreviousAppBarHelper(thisAppBarIndex - 1, _Constants.appBarPlacementTop, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelper(appBars.length - 1, _Constants.appBarPlacementBottom, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelper(appBars.length - 1, _Constants.appBarPlacementTop, appBars)) { return; }
                }
            }

            // Sets focus to the first AppBar in the provided appBars array with given placement.
            // Returns true if focus was set.  False otherwise.
            function _setFocusToNextAppBarHelper(startIndex, appBarPlacement, appBars) {
                var appBar;
                for (var i = startIndex; i < appBars.length; i++) {
                    appBar = appBars[i].winControl;
                    if (appBar
                     && appBar.placement === appBarPlacement
                     && !appBar.hidden
                     && appBar._focusOnFirstFocusableElement
                     && appBar._focusOnFirstFocusableElement()) {
                        return true;
                    }
                }
                return false;
            }

            // Sets focus to the first tab stop of the next AppBar
            // AppBar tabbing order:
            //    1) Bottom AppBars
            //    2) Top AppBars
            // DOM order is respected, because an AppBar should not have a defined tabIndex
            function _setFocusToNextAppBar() {
                /*jshint validthis: true */
                var appBars = _Global.document.querySelectorAll("." + _Constants.appBarClass);

                var thisAppBarIndex = 0;
                for (var i = 0; i < appBars.length; i++) {
                    if (appBars[i] === this.parentElement) {
                        thisAppBarIndex = i;
                        break;
                    }
                }

                if (this.parentElement.winControl.placement === _Constants.appBarPlacementBottom) {
                    // Bottom appBar: Focus order: (1)next bottom appBars (2)top appBars (3)bottom appBars
                    if (_setFocusToNextAppBarHelper(thisAppBarIndex + 1, _Constants.appBarPlacementBottom, appBars)) { return; }
                    if (_setFocusToNextAppBarHelper(0, _Constants.appBarPlacementTop, appBars)) { return; }
                    if (_setFocusToNextAppBarHelper(0, _Constants.appBarPlacementBottom, appBars)) { return; }
                } else if (this.parentElement.winControl.placement === _Constants.appBarPlacementTop) {
                    // Top appBar: Focus order: (1)next top appBars (2)bottom appBars (3)top appBars
                    if (_setFocusToNextAppBarHelper(thisAppBarIndex + 1, _Constants.appBarPlacementTop, appBars)) { return; }
                    if (_setFocusToNextAppBarHelper(0, _Constants.appBarPlacementBottom, appBars)) { return; }
                    if (_setFocusToNextAppBarHelper(0, _Constants.appBarPlacementTop, appBars)) { return; }
                }
            }

            // Updates the firstDiv & finalDiv of all shown AppBars
            function _updateAllAppBarsFirstAndFinalDiv() {
                var appBars = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                var appBar;
                for (var i = 0; i < appBars.length; i++) {
                    appBar = appBars[i].winControl;
                    if (appBar
                     && !appBar.hidden
                     && appBar._updateFirstAndFinalDiv) {
                        appBar._updateFirstAndFinalDiv();
                    }
                }
            }

            // Returns true if a visible non-sticky (light dismiss) AppBar is found in the document
            function _isThereVisibleNonStickyBar() {
                var appBars = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                for (var i = 0; i < appBars.length; i++) {
                    var appBarControl = appBars[i].winControl;
                    if (appBarControl && !appBarControl.sticky &&
                        (!appBarControl.hidden || appBarControl._element.winAnimating === displayModeVisiblePositions.shown)) {
                        return true;
                    }
                }
                return false;
            }

            // If the previous focus was not a AppBar or CED, store it in the cache
            // (_isAppBarOrChild tests CED for us).
            function _checkStorePreviousFocus(focusEvent) {
                if (focusEvent.relatedTarget
                 && focusEvent.relatedTarget.focus
             && !_Overlay._Overlay._isAppBarOrChild(focusEvent.relatedTarget)) {
                    _storePreviousFocus(focusEvent.relatedTarget);
                }
            }

            // Cache the previous focus information
            function _storePreviousFocus(element) {
                if (element) {
                    _Overlay._Overlay._ElementWithFocusPreviousToAppBar = element;
                }
            }

            // Try to return focus to what had focus before.
            // If successfully return focus to a textbox, restore the selection too.
            function _restorePreviousFocus() {
                _Overlay._Overlay._trySetActive(_Overlay._Overlay._ElementWithFocusPreviousToAppBar);
            }

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/appBarAriaLabel").value; },
                get requiresCommands() { return "Invalid argument: commands must not be empty"; },
                get cannotChangePlacementWhenVisible() { return "Invalid argument: The placement property cannot be set when the AppBar is visible, call hide() first"; },
                get badLayout() { return "Invalid argument: The layout property must be 'custom', 'drawer' or 'commands'"; },
                get cannotChangeLayoutWhenVisible() { return "Invalid argument: The layout property cannot be set when the AppBar is visible, call hide() first"; }
            };

            var AppBar = _Base.Class.derive(_Overlay._Overlay, function AppBar_ctor(element, options) {
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

                // Make sure there's an element
                this._element = element || _Global.document.createElement("div");
                this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
                this._writeProfilerMark("constructor,StartTM");

                // Attach our css class.
                _ElementUtilities.addClass(this._element, _Constants.appBarClass);

                // Make sure we have an ARIA role
                var role = this._element.getAttribute("role");
                if (!role) {
                    this._element.setAttribute("role", "menubar");
                }
                var label = this._element.getAttribute("aria-label");
                if (!label) {
                    this._element.setAttribute("aria-label", strings.ariaLabel);
                }

                // Call the _Overlay constructor helper to finish setting up our element.
                // Don't pass constructor options, AppBar needs to set those itself specific order.
                this._baseOverlayConstructor(this._element);

                // Start off hidden
                this._lastPositionVisited = displayModeVisiblePositions.none;
                _ElementUtilities.addClass(this._element, _Constants.hiddenClass);

                // validate that if they didn't set commands, but want command
                // layout that the HTML only contains commands.  Do this first
                // so that we don't leave partial AppBars in the DOM.
                if (options.layout !== _Constants.appBarLayoutCustom && !options.commands && this._element) {
                    // Shallow copy object so we can modify it.
                    options = _BaseUtils._shallowCopy(options);
                    options.commands = this._verifyCommandsOnly(this._element, "WinJS.UI.AppBarCommand");
                }

                // Add Invoke button.
                this._invokeButton = _Global.document.createElement("button");
                this._invokeButton.tabIndex = 0;
                this._invokeButton.innerHTML = "<span class='" + _Constants.ellipsisClass + "'></span>";
                _ElementUtilities.addClass(this._invokeButton, _Constants.invokeButtonClass);
                this._element.appendChild(this._invokeButton);
                var that = this;
                _ElementUtilities._addEventListener(this._invokeButton, "pointerdown", function () { _Overlay._Overlay._addHideFocusClass(that._invokeButton); }, false);
                this._invokeButton.addEventListener("click", function () { AppBar._toggleAllAppBarsState(_KeyboardBehavior._keyboardSeenLast, that); }, false);

                // Run layout setter immediately. We need to know our layout in order to correctly
                // position any commands that may be getting set through the constructor.
                this.layout = options.layout || _Constants.appBarLayoutCommands;
                delete options.layout;

                // Need to set placement before closedDisplayMode, closedDisplayMode sets our starting position, which is dependant on placement.
                this.placement = options.placement || _Constants.appBarPlacementBottom;
                this.closedDisplayMode = options.closedDisplayMode || closedDisplayModes.minimal;

                _Control.setOptions(this, options);

                var commandsUpdatedBound = this._commandsUpdated.bind(this);
                this._element.addEventListener(_Constants.commandVisibilityChanged, function (ev) {
                    if (that._disposed) {
                        return;
                    }
                    if (!that.hidden) {
                        ev.preventDefault();
                    }
                    commandsUpdatedBound();
                });

                this._initializing = false;

                this._setFocusToAppBarBound = this._setFocusToAppBar.bind(this);

                // Make a click eating div
                _Overlay._Overlay._createClickEatingDivAppBar();

                // Handle key down (esc) and (left & right)
                this._element.addEventListener("keydown", this._handleKeyDown.bind(this), false);

                // Attach global event handlers
                if (!globalEventsInitialized) {
                    // We'll trigger on invoking.  Could also have invoked or canceled
                    // Eventually we may want click up on invoking and drop back on invoked.
                    // Check for namespace so it'll behave in the designer.
                    if (_WinRT.Windows.UI.Input.EdgeGesture) {
                        var edgy = _WinRT.Windows.UI.Input.EdgeGesture.getForCurrentView();
                        edgy.addEventListener("starting", _startingEdgy);
                        edgy.addEventListener("completed", _completedEdgy);
                        edgy.addEventListener("canceled", _canceledEdgy);
                    }

                    // Need to know if the IHM is done scrolling
                    _Global.document.addEventListener("MSManipulationStateChanged", _allManipulationChanged, false);

                    globalEventsInitialized = true;
                }

                // Need to store what had focus before
                _ElementUtilities._addEventListener(this._element, "focusin", function (event) { _checkStorePreviousFocus(event); }, false);

                // Need to hide ourselves if we lose focus
                _ElementUtilities._addEventListener(this._element, "focusout", function () { _Overlay._Overlay._hideIfAllAppBarsLostFocus(); }, false);


                if (this.closedDisplayMode === closedDisplayModes.none && this.layout === _Constants.appBarLayoutCommands) {
                    // Remove the commands layout AppBar from the layout tree at this point so we don't cause unnecessary layout costs whenever
                    // the window resizes or when CSS changes are applied to the commands layout AppBar's parent element.
                    this._element.style.display = "none";
                }

                this._writeProfilerMark("constructor,StopTM");

                return this;
            }, {
                // Public Properties

                /// <field type="String" defaultValue="bottom" oamOptionsDatatype="WinJS.UI.AppBar.placement" locid="WinJS.UI.AppBar.placement" helpKeyword="WinJS.UI.AppBar.placement">The placement of the AppBar on the display.  Values are "top" or "bottom".</field>
                placement: {
                    get: function AppBar_get_placement() {
                        return this._placement;
                    },
                    set: function AppBar_set_placement(value) {
                        // In designer we may have to move it
                        var wasShown = false;
                        if (_WinRT.Windows.ApplicationModel.DesignMode.designModeEnabled) {
                            this._hide();
                            wasShown = true;
                        }

                        if (!this.hidden) {
                            throw new _ErrorFromName("WinJS.UI.AppBar.CannotChangePlacementWhenVisible", strings.cannotChangePlacementWhenVisible);
                        }

                        // Set placement, coerce invalid values to 'bottom'
                        this._placement = (value === _Constants.appBarPlacementTop) ? _Constants.appBarPlacementTop : _Constants.appBarPlacementBottom;

                        // Clean up win-top, win-bottom styles
                        if (this._placement === _Constants.appBarPlacementTop) {
                            _ElementUtilities.addClass(this._element, _Constants.topClass);
                            _ElementUtilities.removeClass(this._element, _Constants.bottomClass);
                        } else if (this._placement === _Constants.appBarPlacementBottom) {
                            _ElementUtilities.removeClass(this._element, _Constants.topClass);
                            _ElementUtilities.addClass(this._element, _Constants.bottomClass);
                        }

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
                    get: function AppBar_get_layout() {
                        return this._layout.type;
                    },
                    set: function (layout) {
                        if (layout !== _Constants.appBarLayoutCommands &&
                            layout !== _Constants.appBarLayoutCustom && 
                            layout !== _Constants.appBarLayoutDrawer) {
                            throw new _ErrorFromName("WinJS.UI.AppBar.BadLayout", strings.badLayout);
                        }

                        // In designer we may have to redraw it
                        var wasShown = false;
                        if (_WinRT.Windows.ApplicationModel.DesignMode.designModeEnabled) {
                            this._hide();
                            wasShown = true;
                        }

                        if (!this.hidden) {
                            throw new _ErrorFromName("WinJS.UI.AppBar.CannotChangeLayoutWhenVisible", strings.cannotChangeLayoutWhenVisible);
                        }

                        var commands;
                        if (!this._initializing) {
                            // Gather commands in preparation for hand off to new layout.
                            // We expect prev layout to return commands in the order they were set in,
                            // not necessarily the current DOM order the layout is using.
                            commands = this._layout.commandsInOrder;
                            this._layout.disconnect();
                        }

                        // Set layout
                        if (layout === _Constants.appBarLayoutCommands) {
                            this._layout = new _Layouts._AppBarCommandsLayout();
                        } else if (layout === _Constants.appBarLayoutDrawer) {
                            this._layout = new _Layouts._AppBarDrawerLayout();
                        } else {
                            // Custom layout uses Base AppBar Layout class.
                            this._layout = new _Layouts._AppBarBaseLayout();
                        }
                        this._layout.connect(this._element);

                        if (commands && commands.length) {
                            // Reset AppBar since layout changed.
                            this._layoutCommands(commands);
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
                    get: function AppBar_get_sticky() {
                        return this._sticky;
                    },
                    set: function AppBar_set_sticky(value) {
                        // If it doesn't change, do nothing
                        if (this._sticky === !!value) {
                            return;
                        }

                        this._sticky = !!value;

                        // Note: caller still has to call .show() if also want it shown.

                        // Show or hide the click eating div based on sticky value
                        if (!this.hidden && this._element.style.visibility === "visible") {
                            // May have changed sticky state for keyboard navigation
                            _updateAllAppBarsFirstAndFinalDiv();

                            // Ensure that the click eating div is in the correct state
                            if (this._sticky) {
                                if (!_isThereVisibleNonStickyBar()) {
                                    _Overlay._Overlay._hideClickEatingDivAppBar();
                                }
                            } else {
                                _Overlay._Overlay._showClickEatingDivAppBar();

                                if (this._shouldStealFocus()) {
                                    _storePreviousFocus(_Global.document.activeElement);
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
                    set: function AppBar_set_commands(commands) {
                        // Fail if trying to set when shown
                        if (!this.hidden) {
                            throw new _ErrorFromName("WinJS.UI.AppBar.CannotChangeCommandsWhenVisible", _Resources._formatString(_Overlay._Overlay.commonstrings.cannotChangeCommandsWhenVisible, "AppBar"));
                        }

                        // Dispose old commands before tossing them out.
                        if (!this._initializing) {
                            // AppBarCommands defined in markup don't want to be disposed during initialization.
                            this._disposeChildren();
                        }
                        this._layoutCommands(commands);
                    }
                },

                _layoutCommands: function AppBar_layoutCommands(commands) {
                    // Function precondition: AppBar must not be shown.

                    // Empties AppBar HTML and repopulates with passed in commands.
                    _ElementUtilities.empty(this._element);
                    this._element.appendChild(this._invokeButton); // Keep our Show/Hide button.

                    // In case they had only one command to set...
                    if (!Array.isArray(commands)) {
                        commands = [commands];
                    }

                    this._layout.layout(commands);
                },

                /// <field type="String" defaultValue="minimal" locid="WinJS.UI.AppBar.closedDisplayMode" helpKeyword="WinJS.UI.AppBar.closedDisplayMode" isAdvanced="true">
                /// Gets/Sets how AppBar will display itself while hidden. Values are "none" and "minimal".
                /// </field>
                closedDisplayMode: {
                    get: function AppBar_get_closedDisplayMode() {
                        return this._closedDisplayMode;
                    },
                    set: function AppBar_set_closedDisplayMode(value) {
                        var oldValue = this._closedDisplayMode;

                        if (oldValue !== value) {
                            if (value === closedDisplayModes.none) {
                                this._closedDisplayMode = closedDisplayModes.none;
                                _ElementUtilities.removeClass(this._element, _Constants.minimalClass);
                            } else {
                                // Minimal is default fallback.
                                this._closedDisplayMode = closedDisplayModes.minimal;
                                _ElementUtilities.addClass(this._element, _Constants.minimalClass);
                            }

                            // The invoke button has changed the amount of available space in the AppBar. Layout might need to scale.
                            this._layout.resize();

                            if (_ElementUtilities.hasClass(this._element, _Constants.hiddenClass) || _ElementUtilities.hasClass(this._element, _Constants.hidingClass)) {
                                // If the value is being set while we are not showing, change to our new position.
                                this._changeVisiblePosition(displayModeVisiblePositions[this._closedDisplayMode]);
                            }
                        }
                    },
                },

                /// <field type="Boolean" locid="WinJS.UI.AppBar.disabled" helpKeyword="WinJS.UI.AppBar.disabled">
                /// Disable an AppBar, setting or getting the HTML disabled attribute. While disabled, the AppBar is hidden completely, and will not respond to attempts to show it.
                /// </field>
                disabled: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return !!this._element.disabled;
                    },
                    set: function (disable) {
                        var disable = !!disable;
                        if (this.disabled !== disable) {
                            this._element.disabled = disable;
                            var toPosition;
                            if (disable) {
                                // Disabling. Move to the position mapped to the disabled state.
                                toPosition = displayModeVisiblePositions.disabled;
                            } else {
                                // Enabling. Move to the position mapped to our closedDisplayMode.
                                toPosition = displayModeVisiblePositions[this.closedDisplayMode];
                            }
                            this._hide(toPosition);
                        }
                    },
                },

                /// <field type="Boolean" hidden="true" locid="WinJS.UI._AppBar.hidden" helpKeyword="WinJS.UI._AppBar.hidden">Read only, true if an AppBar is 'hidden'.</field>
                hidden: {
                    get: function () {
                        // Returns true if AppBar is 'hidden'.
                        return _ElementUtilities.hasClass(this._element, _Constants.hiddenClass) ||
                            _ElementUtilities.hasClass(this._element, _Constants.hidingClass) ||
                            this._doNext === displayModeVisiblePositions.minimal ||
                            this._doNext === displayModeVisiblePositions.none;
                    },
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
                        throw new _ErrorFromName("WinJS.UI.AppBar.RequiresCommands", strings.requiresCommands);
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
                        throw new _ErrorFromName("WinJS.UI.AppBar.RequiresCommands", strings.requiresCommands);
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
                        throw new _ErrorFromName("WinJS.UI.AppBar.RequiresCommands", strings.requiresCommands);
                    }

                    this._showOnlyCommands(commands);
                },

                show: function () {
                    /// <signature helpKeyword="WinJS.UI.AppBar.show">
                    /// <summary locid="WinJS.UI.AppBar.show">
                    /// Shows the AppBar, if hidden and not disabled, regardless of other state.
                    /// </summary>
                    /// </signature>
                    // Just wrap the private one, turning off keyboard invoked flag
                    this._writeProfilerMark("show,StartTM");
                    this._keyboardInvoked = false;
                    this._doNotFocus = !!this.sticky;
                    this._show();
                },

                _show: function AppBar_show() {

                    var toPosition = displayModeVisiblePositions.shown;
                    var showing = null;

                    // If we're already shown, we are just going to animate our position, not fire events or manage focus.
                    if (!this.disabled && (_ElementUtilities.hasClass(this._element, _Constants.hiddenClass) || _ElementUtilities.hasClass(this._element, _Constants.hidingClass))) {
                        showing = appbarShownState;
                    }

                    this._changeVisiblePosition(toPosition, showing);

                    if (showing) {
                        // Configure shown state for lightdismiss & sticky appbars.
                        if (!this.sticky) {
                            // Need click-eating div to be visible ASAP.
                            _Overlay._Overlay._showClickEatingDivAppBar();
                        }

                        // Clean up tabbing behavior by making sure first and final divs are correct after showing.
                        if (!this.sticky && _isThereVisibleNonStickyBar()) {
                            _updateAllAppBarsFirstAndFinalDiv();
                        } else {
                            this._updateFirstAndFinalDiv();
                        }

                        // Check if we should steal focus
                        if (!this._doNotFocus && this._shouldStealFocus()) {
                            // Store what had focus if nothing currently is stored
                            if (!_Overlay._Overlay._ElementWithFocusPreviousToAppBar) {
                                _storePreviousFocus(_Global.document.activeElement);
                            }

                            this._positionChangingPromise.then(this._setFocusToAppBarBound, this._setFocusToAppBarBound);
                        }
                    }
                },

                hide: function () {
                    /// <signature helpKeyword="WinJS.UI.AppBar.hide">
                    /// <summary locid="WinJS.UI.AppBar.hide">
                    /// Hides the AppBar.
                    /// </summary>
                    /// </signature>
                    // Just wrap the private one
                    this._writeProfilerMark("hide,StartTM");
                    this._hide();
                },

                _hide: function AppBar_hide(toPosition) {

                    var toPosition = toPosition || displayModeVisiblePositions[this.closedDisplayMode];
                    var hiding = null;

                    // If were already hidden, we are just going to animate our position, not fire events or manage focus again.
                    if (!_ElementUtilities.hasClass(this._element, _Constants.hiddenClass) && !_ElementUtilities.hasClass(this._element, _Constants.hidingClass)) {
                        hiding = appbarHiddenState;
                    }

                    this._changeVisiblePosition(toPosition, hiding);
                    if (hiding) {
                        // Determine if there are any AppBars that are shown.
                        // Set the focus to the next shown AppBar.
                        // If there are none, set the focus to the control stored in the cache, which
                        //   is what had focus before the AppBars were given focus.
                        var appBars = _Global.document.querySelectorAll("." + _Constants.appBarClass);
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

                        var settingsFlyouts = _Global.document.querySelectorAll("." + _Constants.settingsFlyoutClass);
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
                            _Overlay._Overlay._hideClickEatingDivAppBar();
                        }

                        var that = this;
                        if (!areOtherAppBars) {
                            // Set focus to what had focus before showing the AppBar
                            if (_Overlay._Overlay._ElementWithFocusPreviousToAppBar &&
                                (!_Global.document.activeElement || _Overlay._Overlay._isAppBarOrChild(_Global.document.activeElement))) {
                                _restorePreviousFocus();
                            }
                            // Always clear the previous focus (to prevent temporary leaking of element)
                            _Overlay._Overlay._ElementWithFocusPreviousToAppBar = null;
                        } else if (AppBar._isWithinAppBarOrChild(_Global.document.activeElement, that.element)) {
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
                    }
                },

                _dispose: function AppBar_dispose() {
                    _Dispose.disposeSubTree(this.element);
                    this._layout.dispose();
                    this.disabled = true;
                },

                _disposeChildren: function AppBar_disposeChildren() {
                    // Be purposeful about what we dispose.
                    this._layout.disposeChildren();
                },

                _isLightDismissible: function AppBar_isLightDismissible() {
                    // An AppBar is considered light dismissible if there is at least one visible non sticky AppBar.
                    return _Overlay._Overlay.prototype._isLightDismissible.call(this) || _isThereVisibleNonStickyBar();
                },

                _handleKeyDown: function AppBar_handleKeyDown(event) {
                    // On Left/Right arrow keys, moves focus to previous/next AppbarCommand element.
                    // On "Esc" key press hide flyouts and hide light dismiss AppBars.

                    // Esc hides light-dismiss AppBars in all layouts but if the user has a text box with an IME
                    // candidate window open, we want to skip the ESC key event since it is handled by the IME.
                    // When the IME handles a key it sets event.keyCode === Key.IME for an easy check.
                    if (event.keyCode === Key.escape && event.keyCode !== Key.IME) {
                        event.preventDefault();
                        event.stopPropagation();
                        this._lightDismiss(true);
                    }

                    // If the current active element isn't an intrinsic part of the AppBar,
                    // Layout might want to handle additional keys.
                    if (!this._invokeButton.contains(_Global.document.activeElement)) {
                        this._layout.handleKeyDown(event);
                    }
                },

                _visiblePixels: {
                    get: function () {
                        // Returns object containing pixel height of each visible position
                        return {
                            hidden: knownVisibleHeights.hidden,
                            minimal: knownVisibleHeights.minimal,
                            // Element can change size as content gets added or removed or if it
                            // experinces style changes. We have to look this up at run time.
                            shown: this._element.offsetHeight,
                        };
                    }
                },

                _visiblePosition: {
                    // Returns string value of our nearest, stationary, visible position.
                    get: function () {
                        // If we're animating into a new posistion, return the position we're animating into.
                        if (this._animating && displayModeVisiblePositions[this._element.winAnimating]) {
                            return this._element.winAnimating;
                        } else {
                            return this._lastPositionVisited;
                        }
                    }
                },

                _visible: {
                    // Returns true if our visible position is not completely hidden, else false.
                    get: function () {
                        return (this._visiblePosition !== displayModeVisiblePositions.none);
                    }
                },

                _changeVisiblePosition: function (toPosition, newState) {
                    /// <signature helpKeyword="WinJS.UI.AppBar._changeVisiblePosition">
                    /// <summary locid="WinJS.UI.AppBar._changeVisiblePosition">
                    /// Changes the visible position of the AppBar.
                    /// </summary>
                    /// <param name="toPosition" type="String" locid="WinJS.UI.AppBar._changeVisiblePosition_p:toPosition">
                    /// Name of the visible position we want to move to.
                    /// </param>
                    /// <param name="newState" type="String" locid="WinJS.UI.AppBar._changeVisiblePosition_p:newState">
                    /// Name of the state we are entering. Values can be "showing", "hiding" or null.
                    /// If the value is null, then we are not changing states, only changing visible position.
                    /// </param>
                    /// </signature>

                    if ((this._visiblePosition === toPosition && !this._keyboardObscured) ||
                        (this.disabled && toPosition !== displayModeVisiblePositions.disabled)) {
                        // If we want to go where we already are, or we're disabled, return false.
                        this._afterPositionChange(null);
                    } else if (this._animating || this._needToHandleShowingKeyboard || this._needToHandleHidingKeyboard) {
                        // Only do one thing at a time. If we are already animating,
                        // or the IHM is animating, schedule this for later.
                        this._doNext = toPosition;
                        this._afterPositionChange(null);
                    } else {
                        // Begin position changing sequence.

                        // Set the animating flag to block any queued position changes until we're done.
                        this._element.winAnimating = toPosition;
                        var performAnimation = this._initializing ? false : true;

                        // Assume we are animating from the last position visited.
                        var fromPosition = this._lastPositionVisited;

                        // We'll need to measure our element to determine how far we need to animate.
                        // Make sure we have accurate dimensions.
                        this._element.style.display = "";

                        // Are we hiding completely, or about to become visible?
                        var hidingCompletely = (toPosition === displayModeVisiblePositions.hidden);

                        if (this._keyboardObscured) {
                            // We're changing position while covered by the IHM.
                            if (hidingCompletely) {
                                // If we're covered by the IHM we already look hidden.
                                // We can skip our animation and just hide.
                                performAnimation = false;
                            } else {
                                // Some portion of the AppBar should be visible to users after its position changes.

                                // Un-obscure ourselves and become visible to the user again.
                                // Need to animate to our desired position as if we were coming up from behind the keyboard.
                                fromPosition = displayModeVisiblePositions.hidden;
                            }
                            this._keyboardObscured = false;
                        }

                        // Fire "before" event if we are changing state.
                        if (newState === appbarShownState) {
                            this._beforeShow();
                        } else if (newState === appbarHiddenState) {
                            this._beforeHide();
                        }

                        // Position our element into the correct "end of animation" position,
                        // also accounting for any viewport scrolling or soft keyboard positioning.
                        this._ensurePosition();

                        this._element.style.opacity = 1;
                        this._element.style.visibility = "visible";

                        this._animationPromise = (performAnimation) ? this._animatePositionChange(fromPosition, toPosition) : Promise.wrap();
                        this._animationPromise.then(
                            function () { this._afterPositionChange(toPosition, newState); }.bind(this),
                            function () { this._afterPositionChange(toPosition, newState); }.bind(this)
                        );
                    }
                },

                _afterPositionChange: function AppBar_afterPosiitonChange(newPosition, newState) {
                    // Defines body of work to perform after changing positions.
                    if (this._disposed) {
                        return;
                    }

                    if (newPosition) {
                        // Clear animation flag and record having visited this position.
                        this._element.winAnimating = "";
                        this._lastPositionVisited = newPosition;

                        if (this._doNext === this._lastPositionVisited) {
                            this._doNext = "";
                        }

                        if (newPosition === displayModeVisiblePositions.hidden) {
                            // Make sure animation is finished.
                            this._element.style.visibility = "hidden";
                            this._element.style.display = "none";
                        }

                        // Clean up animation transforms.
                        var transformProperty = _BaseUtils._browserStyleEquivalents["transform"].scriptName;
                        this._element.style[transformProperty] = "";

                        // Fire "after" event if we changed state.
                        if (newState === appbarShownState) {
                            this._afterShow();
                        } else if (newState === appbarHiddenState) {
                            this._afterHide();
                        }

                        // If we had something queued, do that
                        Scheduler.schedule(this._checkDoNext, Scheduler.Priority.normal, this, "WinJS.UI.AppBar._checkDoNext");
                    }

                    this._afterPositionChangeCallBack();
                },

                _afterPositionChangeCallBack: function () {
                    // Leave this blank for unit tests to overwrite.
                },

                _beforeShow: function AppBar_beforeShow() {
                    // Each overlay tracks the size of the <HTML> element for triggering light-dismiss in the window resize handler.
                    this._cachedDocumentSize = this._cachedDocumentSize || _Overlay._Overlay._sizeOfDocument();

                    // In case their event 'beforeshow' event listener is going to manipulate commands,
                    // first see if there are any queued command animations we can handle while we're still hidden.
                    if (this._queuedCommandAnimation) {
                        this._showAndHideFast(this._queuedToShow, this._queuedToHide);
                        this._queuedToShow = [];
                        this._queuedToHide = [];
                    }

                    // Make sure everything fits before showinging
                    this._layout.scale();

                    _ElementUtilities.removeClass(this._element, _Constants.hiddenClass);
                    _ElementUtilities.addClass(this._element, _Constants.showingClass);

                    // Send our "beforeShow" event
                    this._sendEvent(_Overlay._Overlay.beforeShow);
                },

                _afterShow: function AppBar_afterShow() {
                    _ElementUtilities.removeClass(this._element, _Constants.showingClass);
                    _ElementUtilities.addClass(this._element, _Constants.shownClass);

                    // Send our "afterShow" event
                    this._sendEvent(_Overlay._Overlay.afterShow);
                    this._writeProfilerMark("show,StopTM");
                },

                _beforeHide: function AppBar_beforeHide() {

                    _ElementUtilities.removeClass(this._element, _Constants.shownClass);
                    _ElementUtilities.addClass(this._element, _Constants.hidingClass);

                    // Send our "beforeHide" event
                    this._sendEvent(_Overlay._Overlay.beforeHide);
                },

                _afterHide: function AppBar_afterHide() {

                    // In case their 'afterhide' event handler is going to manipulate commands,
                    // first see if there are any queued command animations we can handle now we're hidden.
                    if (this._queuedCommandAnimation) {
                        this._showAndHideFast(this._queuedToShow, this._queuedToHide);
                        this._queuedToShow = [];
                        this._queuedToHide = [];
                    }

                    _ElementUtilities.removeClass(this._element, _Constants.hidingClass);
                    _ElementUtilities.addClass(this._element, _Constants.hiddenClass);

                    // Send our "afterHide" event
                    this._sendEvent(_Overlay._Overlay.afterHide);
                    this._writeProfilerMark("hide,StopTM");
                },

                _animatePositionChange: function AppBar_animatePositionChange(fromPosition, toPosition) {
                    // Determines and executes the proper transition between visible positions

                    this._positionChangingPromise = this._layout.positionChanging(fromPosition, toPosition);

                    // Get values in terms of pixels to perform animation.
                    var beginningVisiblePixelHeight = this._visiblePixels[fromPosition],
                        endingVisiblePixelHeight = this._visiblePixels[toPosition],
                        distance = Math.abs(endingVisiblePixelHeight - beginningVisiblePixelHeight),
                        offsetTop = (this._placement === _Constants.appBarPlacementTop) ? -distance : distance;

                    // Animate
                    if (endingVisiblePixelHeight > beginningVisiblePixelHeight) {
                        var fromOffset = { top: offsetTop + "px", left: "0px" };
                        return Animations.showEdgeUI(this._element, fromOffset, { mechanism: "transition" });
                    } else {
                        var toOffset = { top: offsetTop + "px", left: "0px" };
                        return Animations.hideEdgeUI(this._element, toOffset, { mechanism: "transition" });
                    }
                },

                _checkDoNext: function AppBar_checkDoNext() {
                    // Do nothing if we're still animating
                    if (this._animating || this._needToHandleShowingKeyboard || this._needToHandleHidingKeyboard || this._disposed) {
                        return;
                    }

                    if (this._doNext === displayModeVisiblePositions.disabled ||
                        this._doNext === displayModeVisiblePositions.hidden ||
                        this._doNext === displayModeVisiblePositions.minimal) {
                        // Do hide first because animating commands would be easier
                        this._hide(this._doNext);
                        this._doNext = "";
                    } else if (this._queuedCommandAnimation) {
                        // Do queued commands before showing if possible
                        this._showAndHideQueue();
                    } else if (this._doNext === displayModeVisiblePositions.shown) {
                        // Show last so that we don't unnecessarily animate commands
                        this._show();
                        this._doNext = "";
                    }
                },

                _isABottomAppBarInTheProcessOfShowing: function AppBar_isABottomAppBarInTheProcessOfShowing() {
                    var appbars = _Global.document.querySelectorAll("." + _Constants.appBarClass + "." + _Constants.bottomClass);
                    for (var i = 0; i < appbars.length; i++) {
                        if (appbars[i].winAnimating === displayModeVisiblePositions.shown) {
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
                    var activeElementAppBar = _Overlay._Overlay._isAppBarOrChild(_Global.document.activeElement);
                    if (this._element === activeElementAppBar) {
                        // This appbar already has focus and we don't want to move focus
                        // from where it currently is in this appbar.
                        return false;
                    }
                    if (this._placement === _Constants.appBarPlacementBottom) {
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
                    if ((activeElementAppBar.winControl._placement !== _Constants.appBarPlacementBottom)
                     && (activeElementAppBar.winControl._placement !== _Constants.appBarPlacementTop)
                     && !isBottomAppBarShowing) {
                        // What currently has focus is neither a bottom appbar nor a top appbar
                        // -and-
                        // a bottom appbar is not in the process of showing.
                        return true;
                    }
                    return false;
                },

                // Set focus to the passed in AppBar
                _setFocusToAppBar: function AppBar_setFocusToAppBar() {
                    if (this._focusOnFirstFocusableElement()) {
                        // Prevent what is gaining focus from showing that it has focus,
                        // but only in the non-keyboard scenario.
                        if (!this._keyboardInvoked) {
                            _Overlay._Overlay._addHideFocusClass(_Global.document.activeElement);
                        }
                    } else {
                        // No first element, set it to appbar itself
                        _Overlay._Overlay._trySetActive(this._element);
                    }
                },

                _commandsUpdated: function AppBar_commandsUpdated() {
                    // If we are still initializing then we don't have a layout yet so it doesn't need updating.
                    if (!this._initializing) {
                        this._layout.commandsUpdated();
                        this._layout.scale();
                    }
                },

                _beginAnimateCommands: function AppBar_beginAnimateCommands(showCommands, hideCommands, otherVisibleCommands) {
                    // The parameters are 3 mutually exclusive arrays of win-command elements contained in this Overlay.
                    // 1) showCommands[]: All of the HIDDEN win-command elements that ARE scheduled to show.
                    // 2) hideCommands[]: All of the VISIBLE win-command elements that ARE scheduled to hide.
                    // 3) otherVisibleCommands[]: All VISIBLE win-command elements that ARE NOT scheduled to hide.
                    this._layout.beginAnimateCommands(showCommands, hideCommands, otherVisibleCommands);
                },

                _endAnimateCommands: function AppBar_endAnimateCommands() {
                    this._layout.endAnimateCommands();
                    this._endAnimateCommandsCallBack();
                },

                _endAnimateCommandsCallBack: function AppBar_endAnimateCommandsCallBack() {
                    // Leave this blank for unit tests to overwrite.
                },

                // Get the top offset for top appbars.
                _getTopOfVisualViewport: function AppBar_getTopOfVisualViewPort() {
                    return _Overlay._Overlay._keyboardInfo._visibleDocTop;
                },

                // Get the bottom offset for bottom appbars.
                _getAdjustedBottom: function AppBar_getAdjustedBottom() {
                    // Need the distance the IHM moved as well.
                    return _Overlay._Overlay._keyboardInfo._visibleDocBottomOffset;
                },

                _showingKeyboard: function AppBar_showingKeyboard(event) {
                    // Remember keyboard showing state.
                    this._keyboardObscured = false;
                    this._needToHandleHidingKeyboard = false;

                    // If we're already moved, then ignore the whole thing
                    if (_Overlay._Overlay._keyboardInfo._visible && this._alreadyInPlace()) {
                        return;
                    }

                    this._needToHandleShowingKeyboard = true;
                    // If focus is in the appbar, don't cause scrolling.
                    if (!this.hidden && this._element.contains(_Global.document.activeElement)) {
                        event.ensuredFocusedElementInView = true;
                    }

                    // Check if appbar moves or if we're ok leaving it obscured instead.
                    if (this._visible && this._placement !== _Constants.appBarPlacementTop && _Overlay._Overlay._isFlyoutVisible()) {
                        // Remember that we're obscured
                        this._keyboardObscured = true;
                    } else {
                        // Don't be obscured, clear _scrollHappened flag to give us inference later on when to re-show ourselves.
                        this._scrollHappened = false;
                    }

                    // Also set timeout regardless, so we can clean up our _keyboardShowing flag.
                    var that = this;
                    _Global.setTimeout(function (e) { that._checkKeyboardTimer(e); }, _Overlay._Overlay._keyboardInfo._animationShowLength + _Overlay._Overlay._scrollTimeout);
                },

                _hidingKeyboard: function AppBar_hidingKeyboard() {
                    // We'll either just reveal the current space under the IHM or restore the window height.

                    // We won't be obscured
                    this._keyboardObscured = false;
                    this._needToHandleShowingKeyboard = false;
                    this._needToHandleHidingKeyboard = true;

                    // We'll either just reveal the current space or resize the window
                    if (!_Overlay._Overlay._keyboardInfo._isResized) {
                        // If we're not completely hidden, only fake hiding under keyboard, or already animating,
                        // then snap us to our final position.
                        if (this._visible || this._animating) {
                            // Not resized, update our final position immediately
                            this._checkScrollPosition();
                            this._element.style.display = "";
                        }
                        this._needToHandleHidingKeyboard = false;
                    }
                    // Else resize should clear keyboardHiding.
                },

                _resize: function AppBar_resize(event) {
                    // If we're hidden by the keyboard, then hide bottom appbar so it doesn't pop up twice when it scrolls
                    if (this._needToHandleShowingKeyboard) {
                        // Top is allowed to scroll off the top, but we don't want bottom to peek up when
                        // scrolled into view since we'll show it ourselves and don't want a stutter effect.
                        if (this._visible) {
                            if (this._placement !== _Constants.appBarPlacementTop && !this._keyboardObscured) {
                                // If viewport doesn't match window, need to vanish momentarily so it doesn't scroll into view,
                                // however we don't want to toggle the visibility="hidden" hidden flag.
                                this._element.style.display = "none";
                            }
                        }
                        // else if we're top we stay, and if there's a flyout, stay obscured by the keyboard.
                    } else if (this._needToHandleHidingKeyboard) {
                        this._needToHandleHidingKeyboard = false;
                        if (this._visible || this._animating) {
                            // Snap to final position
                            this._checkScrollPosition();
                            this._element.style.display = "";
                        }
                    }

                    // Make sure everything still fits.
                    if (!this._initializing) {
                        this._layout.resize(event);
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

                _mayEdgeBackIn: function AppBar_mayEdgeBackIn() {
                    // May need to react to IHM being resized event
                    if (this._needToHandleShowingKeyboard) {
                        // If not top appbar or viewport isn't still at top, then need to show again
                        this._needToHandleShowingKeyboard = false;
                        // If obscured (IHM + flyout showing), it's ok to stay obscured.
                        // If bottom we have to move, or if top scrolled off screen.
                        if (!this._keyboardObscured &&
                            (this._placement !== _Constants.appBarPlacementTop || _Overlay._Overlay._keyboardInfo._visibleDocTop !== 0)) {
                            var toPosition = this._visiblePosition;
                            this._lastPositionVisited = displayModeVisiblePositions.hidden;
                            this._changeVisiblePosition(toPosition, false);
                        } else {
                            // Ensure any animations dropped during the showing keyboard are caught up.
                            this._checkDoNext();
                        }
                    }
                    this._scrollHappened = false;
                },

                _ensurePosition: function AppBar_ensurePosition() {
                    // Position the AppBar element relative to the top or bottom edge of the visible
                    // document, based on the the visible position we think we need to be in.
                    var offSet = this._computePositionOffset();
                    this._element.style.bottom = offSet.bottom;
                    this._element.style.top = offSet.top;

                },

                _computePositionOffset: function AppBar_computePositionOffset() {
                    // Calculates and returns top and bottom offsets for the AppBar element, relative to the top or bottom edge of the visible
                    // document.
                    var positionOffSet = {};

                    if (this._placement === _Constants.appBarPlacementBottom) {
                        // If the IHM is open, the bottom of the visual viewport may or may not be obscured
                        // Use _getAdjustedBottom to account for the IHM if it is covering the bottom edge.
                        positionOffSet.bottom = this._getAdjustedBottom() + "px";
                        positionOffSet.top = "";
                    } else if (this._placement === _Constants.appBarPlacementTop) {
                        positionOffSet.bottom = "";
                        positionOffSet.top = this._getTopOfVisualViewport() + "px";
                    }

                    return positionOffSet;
                },

                _checkScrollPosition: function AppBar_checkScrollPosition() {
                    // If IHM has appeared, then remember we may come in
                    if (this._needToHandleShowingKeyboard) {
                        // Tag that it's OK to edge back in.
                        this._scrollHappened = true;
                        return;
                    }

                    // We only need to update if we're not completely hidden.
                    if (this._visible || this._animating) {
                        this._ensurePosition();
                        // Ensure any animations dropped during the showing keyboard are caught up.
                        this._checkDoNext();
                    }
                },

                _alreadyInPlace: function AppBar_alreadyInPlace() {
                    // See if we're already where we're supposed to be.
                    var offSet = this._computePositionOffset();
                    return (offSet.top === this._element.style.top && offSet.bottom === this._element.style.bottom);
                },

                // If there is a shown non-sticky AppBar then it sets the firstDiv tabIndex to
                //   the minimum tabIndex found in the AppBars and finalDiv to the max found.
                // Otherwise sets their tabIndex to -1 so they are not tab stops.
                _updateFirstAndFinalDiv: function AppBar_updateFirstAndFinalDiv() {
                    var appBarFirstDiv = this._element.querySelectorAll("." + _Constants.firstDivClass);
                    appBarFirstDiv = appBarFirstDiv.length >= 1 ? appBarFirstDiv[0] : null;

                    var appBarFinalDiv = this._element.querySelectorAll("." + _Constants.finalDivClass);
                    appBarFinalDiv = appBarFinalDiv.length >= 1 ? appBarFinalDiv[0] : null;

                    // Remove the firstDiv & finalDiv if they are not at the appropriate locations
                    if (appBarFirstDiv && (this._element.children[0] !== appBarFirstDiv)) {
                        appBarFirstDiv.parentNode.removeChild(appBarFirstDiv);
                        appBarFirstDiv = null;
                    }
                    if (appBarFinalDiv && (this._element.children[this._element.children.length - 1] !== appBarFinalDiv)) {
                        appBarFinalDiv.parentNode.removeChild(appBarFinalDiv);
                        appBarFinalDiv = null;
                    }

                    // Create and add the firstDiv & finalDiv if they don't already exist
                    if (!appBarFirstDiv) {
                        // Add a firstDiv that will be the first child of the appBar.
                        // On focus set focus to the previous appBar.
                        // The div should only be focusable if there are shown non-sticky AppBars.
                        appBarFirstDiv = _Global.document.createElement("div");
                        // display: inline is needed so that the div doesn't take up space and cause the page to scroll on focus
                        appBarFirstDiv.style.display = "inline";
                        appBarFirstDiv.className = _Constants.firstDivClass;
                        appBarFirstDiv.tabIndex = -1;
                        appBarFirstDiv.setAttribute("aria-hidden", "true");
                        _ElementUtilities._addEventListener(appBarFirstDiv, "focusin", _setFocusToPreviousAppBar, false);
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
                        // The div should only be focusable if there are shown non-sticky AppBars.
                        appBarFinalDiv = _Global.document.createElement("div");
                        // display: inline is needed so that the div doesn't take up space and cause the page to scroll on focus
                        appBarFinalDiv.style.display = "inline";
                        appBarFinalDiv.className = _Constants.finalDivClass;
                        appBarFinalDiv.tabIndex = -1;
                        appBarFinalDiv.setAttribute("aria-hidden", "true");
                        _ElementUtilities._addEventListener(appBarFinalDiv, "focusin", _setFocusToNextAppBar, false);
                        this._element.appendChild(appBarFinalDiv);
                    }


                    // invokeButton should be the second to last element in the AppBar's tab order. Second to the finalDiv.
                    if (this._element.children[this._element.children.length - 2] !== this._invokeButton) {
                        this._element.insertBefore(this._invokeButton, appBarFinalDiv);
                    }
                    var elms = this._element.getElementsByTagName("*");
                    var highestTabIndex = _ElementUtilities._getHighestTabIndexInList(elms);
                    this._invokeButton.tabIndex = highestTabIndex;

                    // Update the tabIndex of the firstDiv & finalDiv
                    if (_isThereVisibleNonStickyBar()) {

                        if (appBarFirstDiv) {
                            appBarFirstDiv.tabIndex = _ElementUtilities._getLowestTabIndexInList(elms);
                        }
                        if (appBarFinalDiv) {
                            appBarFinalDiv.tabIndex = highestTabIndex;
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
                    _WriteProfilerMark("WinJS.UI.AppBar:" + this._id + ":" + text);
                }
            }, {
                // Statics
                _appBarsSynchronizationPromise: Promise.as(),

                // Returns true if the element or what had focus before the element (if a Flyout) is either:
                //   1) the appBar or subtree
                //   2) OR in a flyout spawned by the appBar
                // Returns false otherwise.
                _isWithinAppBarOrChild: function (element, appBar) {
                    if (!element || !appBar) {
                        return false;
                    }
                    if (appBar.contains(element)) {
                        return true;
                    }
                    var flyout = _Overlay._Overlay._getParentControlUsingClassName(element, _Constants.flyoutClass);
                    return (flyout && appBar.contains(flyout._previousFocus));
                },

                // Callback for AppBar invokeButton and Edgy Event Command
                _toggleAllAppBarsState: function (keyboardInvoked, sourceAppBar) {
                    var bars = _getDynamicBarsForEdgy();

                    var hiding;
                    if (sourceAppBar) {
                        // If the sourceAppBar is shown, hide all AppBars, else show all AppBars.
                        hiding = _ElementUtilities.hasClass(sourceAppBar._element, _Constants.showingClass) || _ElementUtilities.hasClass(sourceAppBar._element, _Constants.shownClass);
                    } else {
                        // EDGY event behavior. No sourceAppBar specified.
                        // If every AppBar is shown, hide them. Otherwise show them all.
                        hiding = bars._shown && !bars._hidden;
                    }

                    if (hiding) {
                        AppBar._appBarsSynchronizationPromise = AppBar._appBarsSynchronizationPromise.then(function () {
                            return _Overlay._Overlay._hideAppBars(bars, keyboardInvoked);
                        });
                        return "hiding";
                    } else {
                        AppBar._appBarsSynchronizationPromise = AppBar._appBarsSynchronizationPromise.then(function () {
                            return _Overlay._Overlay._showAppBars(bars, keyboardInvoked);
                        });
                        return "showing";
                    }
                },
            });

            return AppBar;
        })
    });

});
